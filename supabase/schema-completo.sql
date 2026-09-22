-- =============================================================================
-- VISIO — schema completo
-- =============================================================================
-- Todas as migrations em ordem, num arquivo só, para colar no SQL Editor do
-- Supabase (Database → SQL Editor → New query → colar → Run).
--
-- Use isto quando não quiser instalar o Supabase CLI. Quem usa o CLI deve rodar
-- `supabase db push`, que aplica os mesmos arquivos e registra o histórico de
-- migrations — este arquivo NÃO registra, então prefira o CLI se ele estiver à
-- mão.
--
-- Aplicar num projeto NOVO e vazio. Rodar sobre um projeto que já tem dados da
-- VISIO vai falhar em "already exists" — e falhar é o comportamento certo aqui.
--
-- GERADO POR scripts/gen-schema-completo.mjs — não edite à mão.
-- Gerado em: 2026-09-22
-- 13 migrations
-- =============================================================================

begin;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090000_visio_01_extensoes_e_helpers.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 01 · Extensões, helpers genéricos e trilha de auditoria
-- =============================================================================
-- Base de que todas as migrations seguintes dependem. Nada de domínio aqui.
-- =============================================================================

-- No Supabase as extensões vivem no schema `extensions`, não em `public`.
-- Por isso toda função que as usa declara `search_path = public, extensions` e
-- chama sem qualificar o schema: resolve onde a extensão estiver instalada.
create schema if not exists extensions;

create extension if not exists "pgcrypto" with schema extensions;  -- digest, gen_random_uuid
create extension if not exists "unaccent" with schema extensions;  -- busca sem acento
create extension if not exists "pg_trgm"  with schema extensions;  -- busca por similaridade

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: mantém updated_at. Aplicar em toda tabela que tenha a coluna.';

-- -----------------------------------------------------------------------------
-- Busca textual normalizada (sem acento, minúscula) — IMMUTABLE para uso em índice
-- -----------------------------------------------------------------------------
create or replace function public.normalizar_texto(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select lower(unaccent(coalesce(p_texto, '')));
$$;

comment on function public.normalizar_texto(text) is
  'Normaliza para busca: minúscula e sem acento. IMMUTABLE, pode indexar com gin_trgm_ops.';

-- -----------------------------------------------------------------------------
-- Dígitos apenas — usado em CPF/CNPJ/CEP/telefone
-- -----------------------------------------------------------------------------
create or replace function public.somente_digitos(p_texto text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(coalesce(p_texto, ''), '[^0-9]', '', 'g');
$$;

-- -----------------------------------------------------------------------------
-- Trilha de auditoria
-- -----------------------------------------------------------------------------
-- Toda alteração relevante (quem, quando, de → para) fica registrada. É requisito
-- para permissões granulares fazerem sentido: sem trilha, "quem cancelou a venda"
-- não tem resposta.
create table public.audit_log (
  id           bigserial primary key,
  tenant_id    uuid,
  store_id     uuid,
  tabela       text        not null,
  registro_id  text        not null,
  operacao     text        not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  dados_antes  jsonb,
  dados_depois jsonb,
  campos       text[],
  auth_user_id uuid,
  criado_em    timestamptz not null default now()
);

create index audit_log_tabela_registro_idx on public.audit_log (tabela, registro_id, criado_em desc);
create index audit_log_tenant_idx          on public.audit_log (tenant_id, criado_em desc);

comment on table public.audit_log is
  'Trilha imutável de alterações. Escrita só por trigger SECURITY DEFINER; ninguém escreve direto.';

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes   jsonb;
  v_depois  jsonb;
  v_campos  text[];
  v_id      text;
  v_tenant  uuid;
  v_store   uuid;
begin
  if tg_op = 'DELETE' then
    v_antes := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_depois := to_jsonb(new);
  else
    v_antes  := to_jsonb(old);
    v_depois := to_jsonb(new);
    -- só os campos que realmente mudaram
    select array_agg(key)
      into v_campos
      from jsonb_each(v_depois) d
     where d.value is distinct from (v_antes -> d.key);

    -- UPDATE que não muda nada não gera linha de auditoria
    if v_campos is null or array_length(v_campos, 1) = 0 then
      return new;
    end if;
  end if;

  v_id     := coalesce(v_depois ->> 'id', v_antes ->> 'id', '');
  v_tenant := nullif(coalesce(v_depois ->> 'tenant_id', v_antes ->> 'tenant_id'), '')::uuid;
  v_store  := nullif(coalesce(v_depois ->> 'store_id',  v_antes ->> 'store_id'),  '')::uuid;

  insert into public.audit_log
    (tenant_id, store_id, tabela, registro_id, operacao, dados_antes, dados_depois, campos, auth_user_id)
  values
    (v_tenant, v_store, tg_table_name, v_id, tg_op, v_antes, v_depois, v_campos, auth.uid());

  return coalesce(new, old);
end;
$$;

comment on function public.audit_trigger() is
  'Trigger AFTER INSERT/UPDATE/DELETE: grava em audit_log. Em UPDATE registra só os campos alterados.';

alter table public.audit_log enable row level security;

-- Auditoria é somente leitura, e só do próprio tenant. A política de SELECT é
-- criada na migration 03, quando has_permission() já existe.


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090100_visio_02_tenancy.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 02 · Tenancy em dois níveis: rede (tenant) e filial (store)
-- =============================================================================
-- Decisão central da arquitetura: cliente e produto são cadastrados UMA VEZ por
-- rede; preço, estoque, caixa, venda e O.S. são POR FILIAL. Toda tabela de
-- domínio carrega tenant_id; as de operação carregam também store_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tenants — a rede de óticas
-- -----------------------------------------------------------------------------
create table public.tenants (
  id          uuid        primary key default gen_random_uuid(),
  nome        text        not null,
  slug        text        not null unique,
  documento   text,                                   -- CNPJ da holding, opcional
  timezone    text        not null default 'America/Sao_Paulo',
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint tenants_slug_formato check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

comment on table public.tenants is 'Rede de óticas. Fronteira de isolamento de dados.';
comment on column public.tenants.slug is 'Identificador público (vitrine online, links de pré-atendimento).';

-- -----------------------------------------------------------------------------
-- stores — a filial
-- -----------------------------------------------------------------------------
create table public.stores (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  codigo              integer     not null,            -- sequencial legível dentro da rede
  nome_fantasia       text        not null,
  razao_social        text,
  cnpj                text,
  inscricao_estadual  text,
  inscricao_municipal text,
  suframa             text,
  contribuinte_icms   boolean     not null default true,
  crt                 smallint    default 1 check (crt between 1 and 3),  -- 1 Simples, 2 Simples excesso, 3 Regime normal
  cep                 text,
  endereco            text,
  numero              text,
  complemento         text,
  bairro              text,
  cidade              text,
  uf                  char(2),
  telefone            text,
  email               text,
  timezone            text        not null default 'America/Sao_Paulo',
  -- Dias da semana considerados úteis (ISO: 1=segunda … 7=domingo).
  -- Usado pelo cálculo de SLA das Ordens de Serviço.
  dias_uteis          smallint[]  not null default '{1,2,3,4,5}',
  certificado_validade date,                           -- validade do certificado digital DESTA filial
  licenca_status      text        not null default 'ativa'
                        check (licenca_status in ('ativa', 'suspensa', 'cancelada')),
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, codigo),
  constraint stores_dias_uteis_validos check (
    dias_uteis <@ '{1,2,3,4,5,6,7}'::smallint[] and array_length(dias_uteis, 1) >= 1
  )
);

create index stores_tenant_idx on public.stores (tenant_id) where ativo;

comment on table public.stores is
  'Filial. Certificado digital e status de licença são por filial, não globais.';
comment on column public.stores.dias_uteis is
  'Dias úteis em ISO (1=seg … 7=dom). Entra no cálculo de SLA em dias úteis das O.S.';

-- -----------------------------------------------------------------------------
-- profiles — o usuário da plataforma
-- -----------------------------------------------------------------------------
-- Estende auth.users. O vínculo com `funcionarios` é adicionado na migration 05,
-- quando aquela tabela existe.
create table public.profiles (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null unique references auth.users (id) on delete cascade,
  tenant_id        uuid        not null references public.tenants (id) on delete cascade,
  nome             text        not null,
  email            text        not null,
  telefone         text,
  avatar_url       text,
  limite_desconto  numeric(5, 2) not null default 0
                     check (limite_desconto >= 0 and limite_desconto <= 100),
  ultima_store_id  uuid        references public.stores (id) on delete set null,
  ativo            boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index profiles_tenant_idx on public.profiles (tenant_id);

comment on column public.profiles.limite_desconto is
  'Teto de desconto que este usuário concede sem autorização de terceiro.';
comment on column public.profiles.ultima_store_id is
  'Última filial selecionada — o seletor de loja abre onde o usuário parou.';

-- -----------------------------------------------------------------------------
-- user_stores — a quais filiais o usuário tem acesso
-- -----------------------------------------------------------------------------
create table public.user_stores (
  profile_id uuid        not null references public.profiles (id) on delete cascade,
  store_id   uuid        not null references public.stores (id)   on delete cascade,
  is_padrao  boolean     not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, store_id)
);

create index user_stores_store_idx on public.user_stores (store_id);

comment on table public.user_stores is
  'Acesso por filial. Base do seletor de loja e de todo escopo store_id no RLS.';

-- -----------------------------------------------------------------------------
-- Helpers de escopo — SECURITY DEFINER para não recursar no RLS
-- -----------------------------------------------------------------------------
-- Por que SECURITY DEFINER: uma política em `profiles` que consultasse `profiles`
-- recursa infinitamente. A função roda com os privilégios do dono, fora do RLS.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_store_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select us.store_id
    from public.user_stores us
    join public.profiles p on p.id = us.profile_id
   where p.user_id = auth.uid()
     and p.ativo;
$$;

comment on function public.current_store_ids() is
  'Filiais que o usuário corrente pode acessar. Usada em TODA política de tabela store-scoped.';

-- -----------------------------------------------------------------------------
-- Triggers de updated_at
-- -----------------------------------------------------------------------------
create trigger tenants_set_updated_at  before update on public.tenants  for each row execute function public.set_updated_at();
create trigger stores_set_updated_at   before update on public.stores   for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Auditoria nas tabelas de tenancy (mudança de filial ou de usuário é sensível)
create trigger stores_audit   after insert or update or delete on public.stores   for each row execute function public.audit_trigger();
create trigger profiles_audit after insert or update or delete on public.profiles for each row execute function public.audit_trigger();

-- RLS é habilitado aqui; as políticas entram na migration 03, onde
-- has_permission() já existe. Até lá, nenhuma linha é visível ao cliente —
-- que é o padrão seguro.
alter table public.tenants     enable row level security;
alter table public.stores      enable row level security;
alter table public.profiles    enable row level security;
alter table public.user_stores enable row level security;

-- -----------------------------------------------------------------------------
-- Grants explícitos
-- -----------------------------------------------------------------------------
-- O Supabase concede privilégios a anon/authenticated por default privileges,
-- mas depender disso é frágil: se o default mudar, o app quebra em produção com
-- "permission denied" e não fica claro por quê. Declaramos aqui. O RLS continua
-- decidindo QUAIS linhas — o grant só diz que a tabela é alcançável.
grant usage on schema public to anon, authenticated;

grant select                         on public.tenants     to authenticated;
grant update                         on public.tenants     to authenticated;
grant select, insert, update, delete on public.stores      to authenticated;
grant select, insert, update, delete on public.profiles    to authenticated;
grant select, insert, update, delete on public.user_stores to authenticated;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_tenant_id()  to authenticated;
grant execute on function public.current_store_ids()  to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090200_visio_03_rbac.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 03 · RBAC granular: matriz módulo × ação
-- =============================================================================
-- Não é um RBAC de "leitura/escrita por módulo". É uma permissão por AÇÃO DE
-- NEGÓCIO: dentro de "Vendas" existem consultar, consultar_proprias, incluir,
-- cancelar, excluir, alterar_valor_unitario, autorizar_desconto_distancia,
-- ver_margem… cada uma independente. É o que permite dar a um vendedor "só
-- consulta das próprias vendas" e a um gerente "gestão completa".
--
-- O catálogo de chaves é semeado na migration 03b, gerada a partir da mesma
-- fonte que src/lib/permissions/catalog.ts (npm run gen:permissions), para SQL
-- e TypeScript não divergirem com o tempo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- permissions — catálogo global de chaves (metadado do software, não do tenant)
-- -----------------------------------------------------------------------------
create table public.permissions (
  key       text     primary key,
  modulo    text     not null,
  acao      text     not null,
  label     text     not null,
  descricao text,
  -- `sensivel` marca o que exige checagem também na LEITURA (custo, margem,
  -- financeiro), não só na escrita.
  sensivel  boolean  not null default false,
  ordem     integer  not null default 0,
  constraint permissions_key_formato check (key ~ '^[a-z_]+\.[a-z0-9_]+$'),
  constraint permissions_key_coerente check (key = modulo || '.' || acao)
);

create index permissions_modulo_idx on public.permissions (modulo, ordem);

comment on table public.permissions is
  'Catálogo de chaves de permissão. Global: é metadado do software. Gerado por npm run gen:permissions.';

-- -----------------------------------------------------------------------------
-- permission_profiles — o "Modelo de Permissões" do tenant
-- -----------------------------------------------------------------------------
create table public.permission_profiles (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  nome       text        not null,
  descricao  text,
  -- is_owner ignora o catálogo e concede tudo. Existe para que a rede nunca se
  -- tranque fora do próprio sistema ao editar permissões.
  is_owner   boolean     not null default false,
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

create index permission_profiles_tenant_idx on public.permission_profiles (tenant_id) where ativo;

-- Garante que sempre exista exatamente uma trilha de proprietário viva por rede.
create unique index permission_profiles_um_owner_por_tenant
  on public.permission_profiles (tenant_id)
  where is_owner and ativo;

-- -----------------------------------------------------------------------------
-- permission_profile_permissions — as chaves de cada modelo
-- -----------------------------------------------------------------------------
-- Tabela de junção em vez de JSONB: é queryável ("quem pode cancelar venda?"),
-- validada por FK contra o catálogo, e não silencia chave digitada errado.
create table public.permission_profile_permissions (
  permission_profile_id uuid not null references public.permission_profiles (id) on delete cascade,
  permission_key        text not null references public.permissions (key)        on delete cascade,
  primary key (permission_profile_id, permission_key)
);

create index ppp_key_idx on public.permission_profile_permissions (permission_key);

-- -----------------------------------------------------------------------------
-- user_permission_profiles — o usuário pode acumular vários modelos
-- -----------------------------------------------------------------------------
-- É o "Grupo de Permissões": um usuário recebe N modelos e a permissão efetiva
-- é a UNIÃO das chaves.
create table public.user_permission_profiles (
  profile_id            uuid        not null references public.profiles (id)            on delete cascade,
  permission_profile_id uuid        not null references public.permission_profiles (id) on delete cascade,
  created_at            timestamptz not null default now(),
  primary key (profile_id, permission_profile_id)
);

-- -----------------------------------------------------------------------------
-- has_permission / current_permissions
-- -----------------------------------------------------------------------------
create or replace function public.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles pr
      join public.user_permission_profiles upp on upp.profile_id = pr.id
      join public.permission_profiles pp        on pp.id = upp.permission_profile_id
     where pr.user_id = auth.uid()
       and pr.ativo
       and pp.ativo
       and (
         pp.is_owner
         or exists (
           select 1
             from public.permission_profile_permissions ppp
            where ppp.permission_profile_id = pp.id
              and ppp.permission_key = p_key
         )
       )
  );
$$;

comment on function public.has_permission(text) is
  'Permissão efetiva do usuário corrente. Perfil is_owner concede tudo.';

create or replace function public.current_permissions()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select p.key
    from public.permissions p
   where exists (
     select 1
       from public.profiles pr
       join public.user_permission_profiles upp on upp.profile_id = pr.id
       join public.permission_profiles pp        on pp.id = upp.permission_profile_id
      where pr.user_id = auth.uid()
        and pr.ativo
        and pp.ativo
        and pp.is_owner
   )
  union
  select ppp.permission_key
    from public.profiles pr
    join public.user_permission_profiles upp on upp.profile_id = pr.id
    join public.permission_profiles pp        on pp.id = upp.permission_profile_id and pp.ativo
    join public.permission_profile_permissions ppp on ppp.permission_profile_id = pp.id
   where pr.user_id = auth.uid()
     and pr.ativo;
$$;

comment on function public.current_permissions() is
  'Todas as chaves do usuário corrente, de uma vez. O cliente carrega isto no login em vez de N chamadas.';

-- -----------------------------------------------------------------------------
-- Cadastro inicial: um signup cria rede + primeira filial + proprietário
-- -----------------------------------------------------------------------------
create or replace function public.gerar_slug_tenant(p_nome text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_base   text;
  v_slug   text;
  v_sufixo integer := 0;
begin
  v_base := regexp_replace(public.normalizar_texto(p_nome), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_base := left(nullif(v_base, ''), 40);
  if v_base is null or length(v_base) < 3 then
    v_base := 'otica-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  v_slug := v_base;
  while exists (select 1 from public.tenants where slug = v_slug) loop
    v_sufixo := v_sufixo + 1;
    v_slug := v_base || '-' || v_sufixo;
  end loop;

  return v_slug;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_store_id  uuid;
  v_profile_id uuid;
  v_owner_id  uuid;
  v_nome      text;
  v_nome_rede text;
  v_nome_loja text;
begin
  v_nome      := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), '');
  v_nome_rede := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_rede', '')), '');
  v_nome_loja := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_loja', '')), '');

  v_nome      := coalesce(v_nome, split_part(new.email, '@', 1));
  v_nome_rede := coalesce(v_nome_rede, 'Ótica ' || v_nome);
  v_nome_loja := coalesce(v_nome_loja, v_nome_rede);

  insert into public.tenants (nome, slug)
  values (v_nome_rede, public.gerar_slug_tenant(v_nome_rede))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, codigo, nome_fantasia)
  values (v_tenant_id, 1, v_nome_loja)
  returning id into v_store_id;

  insert into public.profiles (user_id, tenant_id, nome, email, limite_desconto, ultima_store_id)
  values (new.id, v_tenant_id, v_nome, new.email, 100, v_store_id)
  returning id into v_profile_id;

  insert into public.user_stores (profile_id, store_id, is_padrao)
  values (v_profile_id, v_store_id, true);

  -- Perfil de proprietário: acesso total, garantido sem depender do catálogo.
  insert into public.permission_profiles (tenant_id, nome, descricao, is_owner)
  values (v_tenant_id, 'Proprietário', 'Acesso total à rede. Não pode ser removido.', true)
  returning id into v_owner_id;

  insert into public.user_permission_profiles (profile_id, permission_profile_id)
  values (v_profile_id, v_owner_id);

  -- Modelos de partida que a rede pode editar livremente.
  perform public.criar_modelos_padrao(v_tenant_id);

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger em auth.users: um signup cria rede + primeira filial + proprietário + modelos padrão.';

-- Implementação provisória: a migration 03b, que semeia o catálogo, substitui
-- esta função por uma que monta os modelos a partir das chaves reais.
create or replace function public.criar_modelos_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  return;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Guarda de colunas sensíveis em profiles
-- -----------------------------------------------------------------------------
-- O RLS decide a linha, não a coluna. Um usuário pode editar o próprio perfil,
-- mas não pode se promover: nem trocar de rede, nem elevar o próprio limite de
-- desconto, nem se reativar. Isso é enforced aqui, não na UI.
create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'Não é permitido mover um usuário entre redes.';
  end if;

  if (new.limite_desconto is distinct from old.limite_desconto
      or new.ativo is distinct from old.ativo
      or new.email is distinct from old.email)
     and not public.has_permission('usuarios.alterar')
  then
    raise exception 'Alterar limite de desconto, e-mail ou situação exige a permissão usuarios.alterar.';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profiles_update();

-- -----------------------------------------------------------------------------
-- Triggers utilitários
-- -----------------------------------------------------------------------------
create trigger permission_profiles_set_updated_at
  before update on public.permission_profiles
  for each row execute function public.set_updated_at();

create trigger permission_profiles_audit
  after insert or update or delete on public.permission_profiles
  for each row execute function public.audit_trigger();

create trigger ppp_audit
  after insert or delete on public.permission_profile_permissions
  for each row execute function public.audit_trigger();

create trigger upp_audit
  after insert or delete on public.user_permission_profiles
  for each row execute function public.audit_trigger();

-- =============================================================================
-- Políticas RLS
-- =============================================================================
-- Padrão do projeto, e a razão dele:
--   · Isolamento rede/filial vale em TODA tabela, sem exceção. É a garantia que
--     não pode depender do cliente.
--   · has_permission() entra nas ESCRITAS e nas leituras sensíveis. Fora disso,
--     a leitura é aberta ao escopo e o bloqueio acontece na UI — porque
--     has_permission em SELECT comum transforma falta de permissão em "lista
--     vazia", que é indistinguível de "não há dados" no suporte.
-- =============================================================================

alter table public.permissions                    enable row level security;
alter table public.permission_profiles            enable row level security;
alter table public.permission_profile_permissions enable row level security;
alter table public.user_permission_profiles       enable row level security;

-- Catálogo: metadado público para quem está autenticado.
create policy permissions_select on public.permissions
  for select to authenticated using (true);

-- tenants
create policy tenants_select on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

create policy tenants_update on public.tenants
  for update to authenticated
  using (id = public.current_tenant_id() and public.has_permission('configuracoes.dados_empresa'))
  with check (id = public.current_tenant_id());

-- stores: leitura de todas as filiais da rede (o seletor e os cadastros
-- precisam listar), escrita só com permissão de cadastro de filial.
create policy stores_select on public.stores
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy stores_insert on public.stores
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('cadastros.filiais'));

create policy stores_update on public.stores
  for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('cadastros.filiais'))
  with check (tenant_id = public.current_tenant_id());

create policy stores_delete on public.stores
  for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('cadastros.filiais'));

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.has_permission('usuarios.incluir'));

-- Cada um edita o próprio cadastro; editar o de outro exige permissão.
-- Quais colunas podem mudar é decidido por guard_profiles_update().
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (user_id = auth.uid() or public.has_permission('usuarios.alterar'))
  )
  with check (tenant_id = public.current_tenant_id());

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('usuarios.excluir'));

-- user_stores
create policy user_stores_select on public.user_stores
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = user_stores.profile_id
         and p.tenant_id = public.current_tenant_id()
    )
  );

create policy user_stores_write on public.user_stores
  for all to authenticated
  using (
    public.has_permission('usuarios.alterar')
    and exists (
      select 1 from public.profiles p
       where p.id = user_stores.profile_id
         and p.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.has_permission('usuarios.alterar')
    and exists (
      select 1 from public.profiles p
       where p.id = user_stores.profile_id
         and p.tenant_id = public.current_tenant_id()
    )
    and exists (
      select 1 from public.stores s
       where s.id = user_stores.store_id
         and s.tenant_id = public.current_tenant_id()
    )
  );

-- permission_profiles
create policy permission_profiles_select on public.permission_profiles
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy permission_profiles_write on public.permission_profiles
  for all to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.has_permission('permissoes.gerenciar_modelos')
    -- O perfil de proprietário não é editável por ninguém: é a trava que impede
    -- a rede de se trancar fora do próprio sistema.
    and not is_owner
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.has_permission('permissoes.gerenciar_modelos')
    and not is_owner
  );

create policy ppp_select on public.permission_profile_permissions
  for select to authenticated
  using (
    exists (
      select 1 from public.permission_profiles pp
       where pp.id = permission_profile_permissions.permission_profile_id
         and pp.tenant_id = public.current_tenant_id()
    )
  );

create policy ppp_write on public.permission_profile_permissions
  for all to authenticated
  using (
    public.has_permission('permissoes.gerenciar_modelos')
    and exists (
      select 1 from public.permission_profiles pp
       where pp.id = permission_profile_permissions.permission_profile_id
         and pp.tenant_id = public.current_tenant_id()
         and not pp.is_owner
    )
  )
  with check (
    public.has_permission('permissoes.gerenciar_modelos')
    and exists (
      select 1 from public.permission_profiles pp
       where pp.id = permission_profile_permissions.permission_profile_id
         and pp.tenant_id = public.current_tenant_id()
         and not pp.is_owner
    )
  );

-- user_permission_profiles
create policy upp_select on public.user_permission_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = user_permission_profiles.profile_id
         and p.tenant_id = public.current_tenant_id()
    )
  );

create policy upp_write on public.user_permission_profiles
  for all to authenticated
  using (
    public.has_permission('permissoes.atribuir_modelos')
    and exists (
      select 1 from public.profiles p
       where p.id = user_permission_profiles.profile_id
         and p.tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.has_permission('permissoes.atribuir_modelos')
    and exists (
      select 1 from public.profiles p
       where p.id = user_permission_profiles.profile_id
         and p.tenant_id = public.current_tenant_id()
    )
    and exists (
      select 1 from public.permission_profiles pp
       where pp.id = user_permission_profiles.permission_profile_id
         and pp.tenant_id = public.current_tenant_id()
    )
  );

-- audit_log: leitura sensível — escopo + permissão. Ninguém escreve direto.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('auditoria.consultar'));

-- -----------------------------------------------------------------------------
-- Grants explícitos
-- -----------------------------------------------------------------------------
grant select                         on public.permissions                    to authenticated;
grant select, insert, update, delete on public.permission_profiles            to authenticated;
grant select, insert, update, delete on public.permission_profile_permissions to authenticated;
grant select, insert, update, delete on public.user_permission_profiles       to authenticated;

-- Auditoria é somente leitura para o app: quem escreve é o trigger, que roda
-- como dono do schema.
grant select on public.audit_log to authenticated;

grant execute on function public.has_permission(text)   to authenticated;
grant execute on function public.current_permissions()  to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090300_visio_03b_permissoes_seed.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 03b · Seed do catálogo de permissões e dos modelos padrão
-- =============================================================================
-- GERADO AUTOMATICAMENTE — não edite à mão.
-- Fonte: scripts/permissions-source.mjs · Regenere com: npm run gen:permissions
--
-- 268 chaves em 31 módulos · 5 modelos padrão
-- =============================================================================

insert into public.permissions (key, modulo, acao, label, descricao, sensivel, ordem) values
  ('dashboard.acessar', 'dashboard', 'acessar', 'Acessar o painel', null, false, 0),
  ('dashboard.card_vendas_mes', 'dashboard', 'card_vendas_mes', 'Card: vendas do mês', null, false, 1),
  ('dashboard.card_vendas_12m', 'dashboard', 'card_vendas_12m', 'Card: últimos 12 meses', null, false, 2),
  ('dashboard.card_comparativo_ano', 'dashboard', 'card_comparativo_ano', 'Card: mesmo mês do ano anterior', null, false, 3),
  ('dashboard.card_contas_pagar', 'dashboard', 'card_contas_pagar', 'Card: contas a pagar em aberto', null, true, 4),
  ('dashboard.card_contas_receber', 'dashboard', 'card_contas_receber', 'Card: contas a receber em aberto', null, true, 5),
  ('dashboard.card_aniversariantes', 'dashboard', 'card_aniversariantes', 'Card: aniversariantes da semana', null, false, 6),
  ('dashboard.card_receitas_vencidas', 'dashboard', 'card_receitas_vencidas', 'Card: receitas vencidas', null, false, 7),
  ('dashboard.card_os_entregar', 'dashboard', 'card_os_entregar', 'Card: O.S. a entregar', null, false, 8),
  ('dashboard.card_validade_produtos', 'dashboard', 'card_validade_produtos', 'Card: validade de produtos', null, false, 9),
  ('dashboard.card_estoque_minimo', 'dashboard', 'card_estoque_minimo', 'Card: produtos abaixo do estoque mínimo', null, false, 10),
  ('dashboard.card_negativados', 'dashboard', 'card_negativados', 'Card: clientes negativados', null, false, 11),
  ('dashboard.card_oportunidade_aberto', 'dashboard', 'card_oportunidade_aberto', 'Card: oportunidade em aberto', null, false, 12),
  ('clientes.acessar', 'clientes', 'acessar', 'Acessar o menu Clientes', null, false, 100),
  ('clientes.consultar', 'clientes', 'consultar', 'Consultar clientes', null, false, 101),
  ('clientes.incluir', 'clientes', 'incluir', 'Incluir cliente', null, false, 102),
  ('clientes.alterar', 'clientes', 'alterar', 'Alterar cliente', null, false, 103),
  ('clientes.alterar_nome', 'clientes', 'alterar_nome', 'Alterar o nome de um cliente já cadastrado', null, false, 104),
  ('clientes.excluir', 'clientes', 'excluir', 'Excluir cliente', null, false, 105),
  ('clientes.importar', 'clientes', 'importar', 'Importar clientes em massa', null, false, 106),
  ('clientes.exportar', 'clientes', 'exportar', 'Exportar clientes', null, false, 107),
  ('clientes.exportar_receitas', 'clientes', 'exportar_receitas', 'Exportar receitas', null, false, 108),
  ('clientes.negativar', 'clientes', 'negativar', 'Negativar e remover negativação', null, false, 109),
  ('clientes.ver_credito', 'clientes', 'ver_credito', 'Ver situação de crédito e parcelas em atraso', null, true, 110),
  ('clientes.analise_credito', 'clientes', 'analise_credito', 'Efetuar análise de crédito', 'Exige consentimento do titular; a decisão é sempre revisável por humano.', true, 111),
  ('clientes.gerenciar_nucleo_familiar', 'clientes', 'gerenciar_nucleo_familiar', 'Gerenciar núcleo familiar', null, false, 112),
  ('receitas.consultar', 'receitas', 'consultar', 'Consultar receitas', null, false, 200),
  ('receitas.incluir', 'receitas', 'incluir', 'Incluir receita', null, false, 201),
  ('receitas.alterar', 'receitas', 'alterar', 'Alterar receita', null, false, 202),
  ('receitas.excluir', 'receitas', 'excluir', 'Excluir receita', null, false, 203),
  ('receitas.imprimir', 'receitas', 'imprimir', 'Imprimir receita', null, false, 204),
  ('receitas.livro_receitas', 'receitas', 'livro_receitas', 'Acessar o Livro de Receitas', null, false, 205),
  ('produtos.acessar', 'produtos', 'acessar', 'Acessar o menu Produtos', null, false, 300),
  ('produtos.consultar', 'produtos', 'consultar', 'Consultar produtos', null, false, 301),
  ('produtos.incluir', 'produtos', 'incluir', 'Incluir produto', null, false, 302),
  ('produtos.alterar', 'produtos', 'alterar', 'Alterar dados do produto', null, false, 303),
  ('produtos.excluir', 'produtos', 'excluir', 'Excluir ou arquivar produto', null, false, 304),
  ('produtos.ver_custo', 'produtos', 'ver_custo', 'Ver preço de custo', null, true, 305),
  ('produtos.alterar_custo', 'produtos', 'alterar_custo', 'Alterar preço de custo', null, true, 306),
  ('produtos.alterar_preco', 'produtos', 'alterar_preco', 'Alterar preço de venda', null, false, 307),
  ('produtos.alterar_estoque', 'produtos', 'alterar_estoque', 'Alterar quantidade em estoque', null, false, 308),
  ('produtos.alterar_validade', 'produtos', 'alterar_validade', 'Alterar validade', null, false, 309),
  ('produtos.alterar_fiscal', 'produtos', 'alterar_fiscal', 'Alterar configuração fiscal (NCM, CEST, tributação)', null, false, 310),
  ('produtos.importar', 'produtos', 'importar', 'Importar produtos em massa', null, false, 311),
  ('produtos.exportar', 'produtos', 'exportar', 'Exportar produtos', null, false, 312),
  ('produtos.gerenciar_vitrine', 'produtos', 'gerenciar_vitrine', 'Incluir e remover da vitrine online', null, false, 313),
  ('tabelas_lentes.acessar', 'tabelas_lentes', 'acessar', 'Acessar o menu Tabelas de Lentes', null, false, 400),
  ('tabelas_lentes.consultar', 'tabelas_lentes', 'consultar', 'Consultar tabelas', null, false, 401),
  ('tabelas_lentes.salvar_conferencia', 'tabelas_lentes', 'salvar_conferencia', 'Salvar conferência de produtos', null, false, 402),
  ('tabelas_lentes.concluir_conferencia', 'tabelas_lentes', 'concluir_conferencia', 'Concluir conferência', null, false, 403),
  ('tabelas_lentes.ver_custo_fornecedor', 'tabelas_lentes', 'ver_custo_fornecedor', 'Ver preço de custo do fornecedor', null, true, 404),
  ('tabelas_lentes.excluir_em_conferencia', 'tabelas_lentes', 'excluir_em_conferencia', 'Excluir tabela em conferência', null, false, 405),
  ('orcamentos.consultar', 'orcamentos', 'consultar', 'Consultar todos os orçamentos', null, false, 500),
  ('orcamentos.consultar_proprios', 'orcamentos', 'consultar_proprios', 'Consultar somente os próprios orçamentos', null, false, 501),
  ('orcamentos.incluir', 'orcamentos', 'incluir', 'Incluir orçamento', null, false, 502),
  ('orcamentos.alterar', 'orcamentos', 'alterar', 'Alterar orçamento', null, false, 503),
  ('orcamentos.excluir', 'orcamentos', 'excluir', 'Excluir orçamento', null, false, 504),
  ('orcamentos.imprimir', 'orcamentos', 'imprimir', 'Imprimir orçamento', null, false, 505),
  ('orcamentos.converter_venda', 'orcamentos', 'converter_venda', 'Converter orçamento em venda', null, false, 506),
  ('orcamentos.prorrogar_validade', 'orcamentos', 'prorrogar_validade', 'Prorrogar a validade de um orçamento', null, false, 507),
  ('vendas.consultar', 'vendas', 'consultar', 'Consultar todas as vendas', null, false, 600),
  ('vendas.consultar_proprias', 'vendas', 'consultar_proprias', 'Consultar somente as próprias vendas', null, false, 601),
  ('vendas.incluir', 'vendas', 'incluir', 'Incluir venda', null, false, 602),
  ('vendas.alterar', 'vendas', 'alterar', 'Alterar venda', null, false, 603),
  ('vendas.cancelar', 'vendas', 'cancelar', 'Cancelar venda', 'Exige motivo obrigatório e fica na trilha de auditoria.', false, 604),
  ('vendas.excluir', 'vendas', 'excluir', 'Excluir venda', 'Exige motivo obrigatório e fica na trilha de auditoria.', false, 605),
  ('vendas.duplicar', 'vendas', 'duplicar', 'Duplicar venda', null, false, 606),
  ('vendas.imprimir', 'vendas', 'imprimir', 'Imprimir venda e relatórios', null, false, 607),
  ('vendas.ver_paineis', 'vendas', 'ver_paineis', 'Ver painéis de resumo', null, false, 608),
  ('vendas.ver_margem', 'vendas', 'ver_margem', 'Ver margem de lucro', null, true, 609),
  ('vendas.data_retroativa', 'vendas', 'data_retroativa', 'Lançar com data retroativa', null, false, 610),
  ('vendas.alterar_valor_unitario', 'vendas', 'alterar_valor_unitario', 'Alterar valor unitário do item', null, false, 611),
  ('vendas.autorizar_desconto_distancia', 'vendas', 'autorizar_desconto_distancia', 'Autorizar desconto à distância', null, false, 612),
  ('vendas.alterar_funcionario', 'vendas', 'alterar_funcionario', 'Alterar o funcionário vinculado', null, false, 613),
  ('vendas.alterar_convenio', 'vendas', 'alterar_convenio', 'Alterar o convênio vinculado', null, false, 614),
  ('vendas.alterar_origem', 'vendas', 'alterar_origem', 'Alterar a origem do cliente vinculada', null, false, 615),
  ('vendas.gerenciar_garantia', 'vendas', 'gerenciar_garantia', 'Gerenciar validade do termo de garantia', null, false, 616),
  ('vendas.emitir_nfce', 'vendas', 'emitir_nfce', 'Emitir NFC-e', null, false, 617),
  ('ordens_servico.consultar', 'ordens_servico', 'consultar', 'Consultar todas as O.S.', null, false, 700),
  ('ordens_servico.consultar_proprias', 'ordens_servico', 'consultar_proprias', 'Consultar somente as próprias O.S.', null, false, 701),
  ('ordens_servico.incluir', 'ordens_servico', 'incluir', 'Incluir O.S.', null, false, 702),
  ('ordens_servico.alterar', 'ordens_servico', 'alterar', 'Alterar qualquer O.S.', null, false, 703),
  ('ordens_servico.alterar_proprias', 'ordens_servico', 'alterar_proprias', 'Alterar somente as próprias O.S.', null, false, 704),
  ('ordens_servico.alterar_somente_abertas', 'ordens_servico', 'alterar_somente_abertas', 'Alterar somente O.S. abertas', null, false, 705),
  ('ordens_servico.cancelar', 'ordens_servico', 'cancelar', 'Cancelar O.S.', null, false, 706),
  ('ordens_servico.confirmar_perda', 'ordens_servico', 'confirmar_perda', 'Confirmar O.S. em perda', null, false, 707),
  ('ordens_servico.mover_etapa', 'ordens_servico', 'mover_etapa', 'Mover O.S. entre etapas do Kanban', null, false, 708),
  ('ordens_servico.entregar', 'ordens_servico', 'entregar', 'Entregar O.S.', null, false, 709),
  ('ordens_servico.retornar_entregue', 'ordens_servico', 'retornar_entregue', 'Retornar O.S. entregue para não entregue', null, false, 710),
  ('ordens_servico.alterar_funcionario', 'ordens_servico', 'alterar_funcionario', 'Alterar o funcionário vinculado', null, false, 711),
  ('ordens_servico.imprimir', 'ordens_servico', 'imprimir', 'Imprimir O.S.', null, false, 712),
  ('ordens_servico.ver_paineis', 'ordens_servico', 'ver_paineis', 'Ver painéis de resumo', null, false, 713),
  ('ordens_servico.data_retroativa', 'ordens_servico', 'data_retroativa', 'Abrir ou lançar com data retroativa', null, false, 714),
  ('ordens_servico.gerenciar_etapas', 'ordens_servico', 'gerenciar_etapas', 'Configurar tipos e etapas de O.S. (SLA por etapa)', null, false, 715),
  ('trocas.consultar', 'trocas', 'consultar', 'Consultar trocas', null, false, 800),
  ('trocas.iniciar', 'trocas', 'iniciar', 'Iniciar troca', null, false, 801),
  ('trocas.cancelar', 'trocas', 'cancelar', 'Cancelar troca', null, false, 802),
  ('trocas.utilizar_credito', 'trocas', 'utilizar_credito', 'Utilizar crédito de troca dentro do limite', null, false, 803),
  ('trocas.utilizar_credito_acima_limite', 'trocas', 'utilizar_credito_acima_limite', 'Utilizar crédito de troca acima do limite', null, false, 804),
  ('trocas.devolver_credito', 'trocas', 'devolver_credito', 'Devolver crédito de troca', null, false, 805),
  ('trocas.inutilizar_credito', 'trocas', 'inutilizar_credito', 'Inutilizar crédito de troca', null, false, 806),
  ('estoque.acessar', 'estoque', 'acessar', 'Acessar o menu Estoque', null, false, 900),
  ('estoque.posicao_atual', 'estoque', 'posicao_atual', 'Consultar posição atual', null, false, 901),
  ('estoque.posicao_todas_filiais', 'estoque', 'posicao_todas_filiais', 'Consultar a posição de todas as filiais', null, false, 902),
  ('estoque.entrada_nf', 'estoque', 'entrada_nf', 'Dar entrada por XML de NF-e', null, false, 903),
  ('estoque.entrada_manual', 'estoque', 'entrada_manual', 'Dar entrada manual', null, false, 904),
  ('estoque.transferir', 'estoque', 'transferir', 'Solicitar transferência entre filiais', null, false, 905),
  ('estoque.confirmar_transferencia', 'estoque', 'confirmar_transferencia', 'Confirmar recebimento de transferência', null, false, 906),
  ('estoque.inventario', 'estoque', 'inventario', 'Realizar inventário', null, false, 907),
  ('estoque.acerto', 'estoque', 'acerto', 'Fazer acerto de estoque', null, false, 908),
  ('estoque.etiquetas', 'estoque', 'etiquetas', 'Montar e imprimir etiquetas', null, false, 909),
  ('estoque.historico', 'estoque', 'historico', 'Consultar histórico de movimentação', null, false, 910),
  ('estoque.zerar', 'estoque', 'zerar', 'Zerar estoque', null, false, 911),
  ('estoque.exportar', 'estoque', 'exportar', 'Exportar posição de estoque', null, false, 912),
  ('caixa.consultar', 'caixa', 'consultar', 'Consultar posição atual do caixa', null, true, 1000),
  ('caixa.abrir', 'caixa', 'abrir', 'Abrir caixa', null, false, 1001),
  ('caixa.fechar', 'caixa', 'fechar', 'Fechar caixa', null, false, 1002),
  ('caixa.reabrir', 'caixa', 'reabrir', 'Reabrir caixa fechado', null, false, 1003),
  ('caixa.pagar_despesa', 'caixa', 'pagar_despesa', 'Pagar despesas pelo caixa', null, false, 1004),
  ('caixa.transferir', 'caixa', 'transferir', 'Transferir entre contas', null, false, 1005),
  ('caixa.suprimento', 'caixa', 'suprimento', 'Lançar suprimento', null, false, 1006),
  ('caixa.sangria', 'caixa', 'sangria', 'Lançar sangria', null, false, 1007),
  ('caixa.excluir_lancamento', 'caixa', 'excluir_lancamento', 'Apagar lançamentos', null, false, 1008),
  ('caixa.alterar_saldo_inicial', 'caixa', 'alterar_saldo_inicial', 'Alterar saldo inicial', null, false, 1009),
  ('contas_pagar.consultar', 'contas_pagar', 'consultar', 'Consultar contas a pagar', null, true, 1100),
  ('contas_pagar.incluir', 'contas_pagar', 'incluir', 'Incluir conta a pagar', null, false, 1101),
  ('contas_pagar.alterar', 'contas_pagar', 'alterar', 'Alterar conta a pagar', null, false, 1102),
  ('contas_pagar.baixar', 'contas_pagar', 'baixar', 'Baixar conta a pagar', null, false, 1103),
  ('contas_pagar.estornar', 'contas_pagar', 'estornar', 'Estornar baixa', null, false, 1104),
  ('contas_pagar.cancelar', 'contas_pagar', 'cancelar', 'Cancelar conta a pagar', null, false, 1105),
  ('contas_pagar.imprimir', 'contas_pagar', 'imprimir', 'Imprimir', null, false, 1106),
  ('contas_pagar.data_retroativa', 'contas_pagar', 'data_retroativa', 'Lançar ou baixar com data retroativa', null, false, 1107),
  ('contas_receber.consultar', 'contas_receber', 'consultar', 'Consultar contas a receber', null, true, 1200),
  ('contas_receber.incluir', 'contas_receber', 'incluir', 'Incluir conta a receber', null, false, 1201),
  ('contas_receber.alterar', 'contas_receber', 'alterar', 'Alterar conta a receber', null, false, 1202),
  ('contas_receber.receber', 'contas_receber', 'receber', 'Receber / baixar', null, false, 1203),
  ('contas_receber.estornar', 'contas_receber', 'estornar', 'Estornar recebimento', null, false, 1204),
  ('contas_receber.cancelar', 'contas_receber', 'cancelar', 'Cancelar conta a receber', null, false, 1205),
  ('contas_receber.imprimir', 'contas_receber', 'imprimir', 'Imprimir', null, false, 1206),
  ('contas_receber.data_retroativa', 'contas_receber', 'data_retroativa', 'Lançar ou receber com data retroativa', null, false, 1207),
  ('contas_receber.alterar_situacao', 'contas_receber', 'alterar_situacao', 'Alterar situação', null, false, 1208),
  ('contas_receber.renegociar', 'contas_receber', 'renegociar', 'Renegociar dívida', null, false, 1209),
  ('contas_receber.autorizar_desconto_distancia', 'contas_receber', 'autorizar_desconto_distancia', 'Autorizar desconto à distância', null, false, 1210),
  ('contas_receber.baixar_outras_filiais', 'contas_receber', 'baixar_outras_filiais', 'Baixar títulos de outras filiais da rede', null, false, 1211),
  ('crediario.consultar', 'crediario', 'consultar', 'Consultar crediários', null, true, 1300),
  ('crediario.conceder', 'crediario', 'conceder', 'Conceder crediário', null, false, 1301),
  ('crediario.alterar_limite', 'crediario', 'alterar_limite', 'Alterar limite do cliente', null, false, 1302),
  ('crediario.baixar', 'crediario', 'baixar', 'Baixar parcela de crediário', null, false, 1303),
  ('crediario.ver_score', 'crediario', 'ver_score', 'Ver score e histórico de análise de crédito', null, true, 1304),
  ('cartao.consultar', 'cartao', 'consultar', 'Consultar recebimentos de cartão', null, true, 1400),
  ('cartao.conciliar', 'cartao', 'conciliar', 'Conciliar com a adquirente', null, false, 1401),
  ('cartao.gerenciar_antecipacoes', 'cartao', 'gerenciar_antecipacoes', 'Gerenciar antecipações', null, false, 1402),
  ('cartao.alterar_taxa', 'cartao', 'alterar_taxa', 'Alterar taxa', null, false, 1403),
  ('cartao.ver_liquido', 'cartao', 'ver_liquido', 'Ver valor líquido e taxa descontada', null, true, 1404),
  ('cheques.consultar', 'cheques', 'consultar', 'Consultar cheques', null, true, 1500),
  ('cheques.incluir', 'cheques', 'incluir', 'Incluir cheque', null, false, 1501),
  ('cheques.alterar_status', 'cheques', 'alterar_status', 'Alterar status (depositado, compensado, devolvido)', null, false, 1502),
  ('cheques.devolver', 'cheques', 'devolver', 'Registrar devolução', null, false, 1503),
  ('cheques.imprimir', 'cheques', 'imprimir', 'Imprimir', null, false, 1504),
  ('boletos.consultar', 'boletos', 'consultar', 'Consultar boletos', null, true, 1600),
  ('boletos.emitir', 'boletos', 'emitir', 'Emitir boleto', null, false, 1601),
  ('boletos.cancelar', 'boletos', 'cancelar', 'Cancelar boleto', null, false, 1602),
  ('boletos.baixar', 'boletos', 'baixar', 'Baixar boleto', null, false, 1603),
  ('boletos.ver_taxas', 'boletos', 'ver_taxas', 'Ver taxas de emissão', null, true, 1604),
  ('cobranca_bancaria.consultar', 'cobranca_bancaria', 'consultar', 'Consultar remessas e retornos', null, true, 1700),
  ('cobranca_bancaria.gerar_remessa', 'cobranca_bancaria', 'gerar_remessa', 'Gerar arquivo de remessa (CNAB)', null, false, 1701),
  ('cobranca_bancaria.processar_retorno', 'cobranca_bancaria', 'processar_retorno', 'Processar arquivo de retorno (CNAB)', null, false, 1702),
  ('cobranca_bancaria.configurar', 'cobranca_bancaria', 'configurar', 'Configurar convênio de cobrança', null, false, 1703),
  ('financeiro.fluxo_financeiro', 'financeiro', 'fluxo_financeiro', 'Consultar fluxo financeiro (previsto e realizado)', null, true, 1800),
  ('financeiro.dre', 'financeiro', 'dre', 'Consultar Resultado (DRE)', null, true, 1801),
  ('financeiro.configurar_dre', 'financeiro', 'configurar_dre', 'Configurar o DRE', null, false, 1802),
  ('financeiro.plano_contas', 'financeiro', 'plano_contas', 'Gerenciar plano de contas', null, false, 1803),
  ('financeiro.contas_bancarias', 'financeiro', 'contas_bancarias', 'Gerenciar contas bancárias e caixas', null, false, 1804),
  ('financeiro.documentos_fiscais', 'financeiro', 'documentos_fiscais', 'Consultar documentos fiscais', null, false, 1805),
  ('financeiro.pedidos_fornecedor', 'financeiro', 'pedidos_fornecedor', 'Consultar pedidos faturados por fornecedor', null, true, 1806),
  ('financeiro.pagamento_pedidos', 'financeiro', 'pagamento_pedidos', 'Gerenciar pagamento de pedidos', null, false, 1807),
  ('financeiro.extrato', 'financeiro', 'extrato', 'Consultar extrato financeiro', null, true, 1808),
  ('comissoes.consultar_proprias', 'comissoes', 'consultar_proprias', 'Consultar somente a própria comissão', null, false, 1900),
  ('comissoes.consultar_todas', 'comissoes', 'consultar_todas', 'Consultar a comissão de todos os funcionários', null, true, 1901),
  ('comissoes.configurar_parametros', 'comissoes', 'configurar_parametros', 'Configurar parâmetros de comissão', null, false, 1902),
  ('comissoes.configurar_equipes', 'comissoes', 'configurar_equipes', 'Configurar gerentes e equipes', null, false, 1903),
  ('comissoes.configurar_parametros_equipe', 'comissoes', 'configurar_parametros_equipe', 'Configurar comissão por gerente/equipe', null, false, 1904),
  ('comissoes.apurar', 'comissoes', 'apurar', 'Apurar comissões do período', null, false, 1905),
  ('comissoes.pagar', 'comissoes', 'pagar', 'Registrar pagamento de comissão', null, false, 1906),
  ('marketing.acessar', 'marketing', 'acessar', 'Acessar o menu Marketing', null, false, 2000),
  ('marketing.gerenciar_campanhas', 'marketing', 'gerenciar_campanhas', 'Gerenciar campanhas', null, false, 2001),
  ('marketing.disparar_campanha', 'marketing', 'disparar_campanha', 'Disparar campanha', null, false, 2002),
  ('marketing.consultar_envios', 'marketing', 'consultar_envios', 'Consultar histórico de envios', null, false, 2003),
  ('marketing.gerenciar_templates', 'marketing', 'gerenciar_templates', 'Gerenciar modelos de mensagem', null, false, 2004),
  ('marketing.gerenciar_eventos', 'marketing', 'gerenciar_eventos', 'Gerenciar eventos automáticos', null, false, 2005),
  ('marketing.gerenciar_promocoes', 'marketing', 'gerenciar_promocoes', 'Gerenciar promoções', null, false, 2006),
  ('marketing.gerenciar_cashback', 'marketing', 'gerenciar_cashback', 'Gerenciar cashback', null, false, 2007),
  ('marketing.gerenciar_indicacoes', 'marketing', 'gerenciar_indicacoes', 'Gerenciar indicações', null, false, 2008),
  ('marketing.gerenciar_vitrine', 'marketing', 'gerenciar_vitrine', 'Configurar a vitrine online', null, false, 2009),
  ('relatorios.vendas', 'relatorios', 'vendas', 'Relatório de vendas', null, false, 2100),
  ('relatorios.produtos_vendidos', 'relatorios', 'produtos_vendidos', 'Relatório de produtos vendidos', null, false, 2101),
  ('relatorios.produtos_sem_giro', 'relatorios', 'produtos_sem_giro', 'Relatório de produtos sem giro', null, false, 2102),
  ('relatorios.receitas_vencidas', 'relatorios', 'receitas_vencidas', 'Relatório de receitas vencidas', null, false, 2103),
  ('relatorios.aniversarios', 'relatorios', 'aniversarios', 'Relatório de aniversários', null, false, 2104),
  ('relatorios.extrato_financeiro', 'relatorios', 'extrato_financeiro', 'Relatório de extrato financeiro', null, true, 2105),
  ('relatorios.posicao_estoque', 'relatorios', 'posicao_estoque', 'Relatório de posição atual do estoque', null, false, 2106),
  ('relatorios.caixas', 'relatorios', 'caixas', 'Relatório de caixas', null, true, 2107),
  ('relatorios.contas_pagar', 'relatorios', 'contas_pagar', 'Relatório de contas a pagar', null, true, 2108),
  ('relatorios.contas_receber', 'relatorios', 'contas_receber', 'Relatório de contas a receber', null, true, 2109),
  ('relatorios.livro_receitas', 'relatorios', 'livro_receitas', 'Livro de receitas', null, false, 2110),
  ('relatorios.comissoes', 'relatorios', 'comissoes', 'Relatório de comissões', null, true, 2111),
  ('relatorios.comissoes_equipe', 'relatorios', 'comissoes_equipe', 'Relatório de comissões por gerente/equipe', null, true, 2112),
  ('relatorios.validade_produtos', 'relatorios', 'validade_produtos', 'Relatório de validade de produtos', null, false, 2113),
  ('relatorios.exportar_excel', 'relatorios', 'exportar_excel', 'Exportar relatórios para Excel', null, false, 2114),
  ('atendimento.acessar', 'atendimento', 'acessar', 'Acessar o registro de atendimento', null, false, 2200),
  ('atendimento.registrar', 'atendimento', 'registrar', 'Registrar atendimento (inclusive sem venda)', null, false, 2201),
  ('atendimento.alterar', 'atendimento', 'alterar', 'Alterar atendimento', null, false, 2202),
  ('atendimento.excluir', 'atendimento', 'excluir', 'Excluir atendimento', null, false, 2203),
  ('atendimento.registrar_objecao', 'atendimento', 'registrar_objecao', 'Registrar objeção', null, false, 2204),
  ('atendimento.registrar_experimentacao', 'atendimento', 'registrar_experimentacao', 'Registrar experimentação de armação', null, false, 2205),
  ('atendimento.ver_contra_argumentos', 'atendimento', 'ver_contra_argumentos', 'Ver a biblioteca de contra-argumento', null, false, 2206),
  ('atendimento.gerenciar_contra_argumentos', 'atendimento', 'gerenciar_contra_argumentos', 'Gerenciar a biblioteca de contra-argumento', null, false, 2207),
  ('atendimento.ver_kpis', 'atendimento', 'ver_kpis', 'Ver KPIs de atendimento e de experimentação → venda', null, false, 2208),
  ('inteligencia.acessar', 'inteligencia', 'acessar', 'Acessar o menu Inteligência', null, false, 2300),
  ('inteligencia.funil', 'inteligencia', 'funil', 'Ver o funil', null, false, 2301),
  ('inteligencia.oportunidade_aberto', 'inteligencia', 'oportunidade_aberto', 'Ver oportunidade em aberto', null, true, 2302),
  ('inteligencia.filas_trabalho', 'inteligencia', 'filas_trabalho', 'Ver filas de trabalho', null, false, 2303),
  ('inteligencia.trabalhar_fila', 'inteligencia', 'trabalhar_fila', 'Trabalhar uma fila (disparar ação)', null, false, 2304),
  ('inteligencia.configurar_filas', 'inteligencia', 'configurar_filas', 'Configurar filas', null, false, 2305),
  ('inteligencia.configurar_holdout', 'inteligencia', 'configurar_holdout', 'Configurar o grupo de controle', 'Mexer no holdout afeta a medição de incremental; a mudança é versionada e não reescreve histórico.', false, 2306),
  ('inteligencia.ver_atribuicao', 'inteligencia', 'ver_atribuicao', 'Ver a atribuição com grupo de controle', null, true, 2307),
  ('inteligencia.segundo_par', 'inteligencia', 'segundo_par', 'Ver e trabalhar oportunidades de segundo par', null, false, 2308),
  ('inteligencia.nbo', 'inteligencia', 'nbo', 'Usar a próxima melhor oferta', null, false, 2309),
  ('inteligencia.crm_familiar', 'inteligencia', 'crm_familiar', 'Ver e trabalhar o CRM familiar', null, false, 2310),
  ('inteligencia.painel_dono', 'inteligencia', 'painel_dono', 'Receber o painel proativo do dono', null, true, 2311),
  ('inteligencia.planograma', 'inteligencia', 'planograma', 'Gerenciar planograma', null, false, 2312),
  ('inteligencia.auditar_vitrine', 'inteligencia', 'auditar_vitrine', 'Auditar vitrine por foto', null, false, 2313),
  ('cadastros.acessar', 'cadastros', 'acessar', 'Acessar o menu Cadastros', null, false, 2400),
  ('cadastros.tabelas_auxiliares', 'cadastros', 'tabelas_auxiliares', 'Gerenciar tabelas auxiliares', null, false, 2401),
  ('cadastros.fornecedores', 'cadastros', 'fornecedores', 'Gerenciar fornecedores e laboratórios', null, false, 2402),
  ('cadastros.funcionarios', 'cadastros', 'funcionarios', 'Gerenciar funcionários', null, false, 2403),
  ('cadastros.equipes', 'cadastros', 'equipes', 'Gerenciar equipes', null, false, 2404),
  ('cadastros.filiais', 'cadastros', 'filiais', 'Gerenciar filiais', null, false, 2405),
  ('cadastros.medicos', 'cadastros', 'medicos', 'Gerenciar médicos e optometristas', null, false, 2406),
  ('cadastros.feriados', 'cadastros', 'feriados', 'Gerenciar feriados', null, false, 2407),
  ('cadastros.integracoes', 'cadastros', 'integracoes', 'Gerenciar integrações', null, false, 2408),
  ('cadastros.aliquota_automatica', 'cadastros', 'aliquota_automatica', 'Configurar alíquota automática', null, false, 2409),
  ('usuarios.consultar', 'usuarios', 'consultar', 'Consultar usuários', null, false, 2500),
  ('usuarios.incluir', 'usuarios', 'incluir', 'Incluir usuário', null, false, 2501),
  ('usuarios.alterar', 'usuarios', 'alterar', 'Alterar usuário (inclusive limite de desconto e situação)', null, false, 2502),
  ('usuarios.excluir', 'usuarios', 'excluir', 'Excluir usuário', null, false, 2503),
  ('usuarios.resetar_senha', 'usuarios', 'resetar_senha', 'Resetar senha de usuário', null, false, 2504),
  ('permissoes.consultar', 'permissoes', 'consultar', 'Consultar modelos de permissão', null, false, 2600),
  ('permissoes.gerenciar_modelos', 'permissoes', 'gerenciar_modelos', 'Criar e editar modelos de permissão', null, false, 2601),
  ('permissoes.atribuir_modelos', 'permissoes', 'atribuir_modelos', 'Atribuir modelos a usuários', null, false, 2602),
  ('permissoes.ver_catalogo', 'permissoes', 'ver_catalogo', 'Ver o catálogo completo de permissões', null, false, 2603),
  ('clube.acessar', 'clube', 'acessar', 'Acessar o menu Clube', null, false, 2700),
  ('clube.gerenciar_planos', 'clube', 'gerenciar_planos', 'Gerenciar planos do clube', null, false, 2701),
  ('clube.gerenciar_beneficios', 'clube', 'gerenciar_beneficios', 'Gerenciar benefícios e o custo de cada um', null, false, 2702),
  ('clube.gerenciar_membros', 'clube', 'gerenciar_membros', 'Gerenciar membros', null, false, 2703),
  ('clube.gerenciar_cobrancas', 'clube', 'gerenciar_cobrancas', 'Gerenciar cobrança recorrente', null, false, 2704),
  ('clube.ver_custos', 'clube', 'ver_custos', 'Ver o custo modelado por benefício', null, true, 2705),
  ('assinaturas.consultar', 'assinaturas', 'consultar', 'Consultar assinaturas', null, false, 2800),
  ('assinaturas.ver_plano', 'assinaturas', 'ver_plano', 'Ver o plano atual', null, false, 2801),
  ('assinaturas.ativar_addon', 'assinaturas', 'ativar_addon', 'Ativar um add-on', null, false, 2802),
  ('assinaturas.cancelar_addon', 'assinaturas', 'cancelar_addon', 'Cancelar um add-on', null, false, 2803),
  ('configuracoes.acessar', 'configuracoes', 'acessar', 'Acessar o menu Configurações', null, false, 2900),
  ('configuracoes.dados_empresa', 'configuracoes', 'dados_empresa', 'Alterar dados da rede', null, false, 2901),
  ('configuracoes.politicas', 'configuracoes', 'politicas', 'Alterar políticas de operação', null, false, 2902),
  ('configuracoes.seguranca', 'configuracoes', 'seguranca', 'Alterar configurações de segurança', null, false, 2903),
  ('configuracoes.integracoes', 'configuracoes', 'integracoes', 'Alterar credenciais de integração', null, false, 2904),
  ('auditoria.consultar', 'auditoria', 'consultar', 'Consultar a trilha de auditoria', null, true, 3000),
  ('auditoria.exportar', 'auditoria', 'exportar', 'Exportar a trilha de auditoria', null, false, 3001)
on conflict (key) do update set
  modulo    = excluded.modulo,
  acao      = excluded.acao,
  label     = excluded.label,
  descricao = excluded.descricao,
  sensivel  = excluded.sensivel,
  ordem     = excluded.ordem;

-- Chaves que saíram do catálogo em uma versão nova do software deixam de existir;
-- o ON DELETE CASCADE da FK limpa as atribuições que as referenciavam.
delete from public.permissions
 where key not in (
   'dashboard.acessar',
   'dashboard.card_vendas_mes',
   'dashboard.card_vendas_12m',
   'dashboard.card_comparativo_ano',
   'dashboard.card_contas_pagar',
   'dashboard.card_contas_receber',
   'dashboard.card_aniversariantes',
   'dashboard.card_receitas_vencidas',
   'dashboard.card_os_entregar',
   'dashboard.card_validade_produtos',
   'dashboard.card_estoque_minimo',
   'dashboard.card_negativados',
   'dashboard.card_oportunidade_aberto',
   'clientes.acessar',
   'clientes.consultar',
   'clientes.incluir',
   'clientes.alterar',
   'clientes.alterar_nome',
   'clientes.excluir',
   'clientes.importar',
   'clientes.exportar',
   'clientes.exportar_receitas',
   'clientes.negativar',
   'clientes.ver_credito',
   'clientes.analise_credito',
   'clientes.gerenciar_nucleo_familiar',
   'receitas.consultar',
   'receitas.incluir',
   'receitas.alterar',
   'receitas.excluir',
   'receitas.imprimir',
   'receitas.livro_receitas',
   'produtos.acessar',
   'produtos.consultar',
   'produtos.incluir',
   'produtos.alterar',
   'produtos.excluir',
   'produtos.ver_custo',
   'produtos.alterar_custo',
   'produtos.alterar_preco',
   'produtos.alterar_estoque',
   'produtos.alterar_validade',
   'produtos.alterar_fiscal',
   'produtos.importar',
   'produtos.exportar',
   'produtos.gerenciar_vitrine',
   'tabelas_lentes.acessar',
   'tabelas_lentes.consultar',
   'tabelas_lentes.salvar_conferencia',
   'tabelas_lentes.concluir_conferencia',
   'tabelas_lentes.ver_custo_fornecedor',
   'tabelas_lentes.excluir_em_conferencia',
   'orcamentos.consultar',
   'orcamentos.consultar_proprios',
   'orcamentos.incluir',
   'orcamentos.alterar',
   'orcamentos.excluir',
   'orcamentos.imprimir',
   'orcamentos.converter_venda',
   'orcamentos.prorrogar_validade',
   'vendas.consultar',
   'vendas.consultar_proprias',
   'vendas.incluir',
   'vendas.alterar',
   'vendas.cancelar',
   'vendas.excluir',
   'vendas.duplicar',
   'vendas.imprimir',
   'vendas.ver_paineis',
   'vendas.ver_margem',
   'vendas.data_retroativa',
   'vendas.alterar_valor_unitario',
   'vendas.autorizar_desconto_distancia',
   'vendas.alterar_funcionario',
   'vendas.alterar_convenio',
   'vendas.alterar_origem',
   'vendas.gerenciar_garantia',
   'vendas.emitir_nfce',
   'ordens_servico.consultar',
   'ordens_servico.consultar_proprias',
   'ordens_servico.incluir',
   'ordens_servico.alterar',
   'ordens_servico.alterar_proprias',
   'ordens_servico.alterar_somente_abertas',
   'ordens_servico.cancelar',
   'ordens_servico.confirmar_perda',
   'ordens_servico.mover_etapa',
   'ordens_servico.entregar',
   'ordens_servico.retornar_entregue',
   'ordens_servico.alterar_funcionario',
   'ordens_servico.imprimir',
   'ordens_servico.ver_paineis',
   'ordens_servico.data_retroativa',
   'ordens_servico.gerenciar_etapas',
   'trocas.consultar',
   'trocas.iniciar',
   'trocas.cancelar',
   'trocas.utilizar_credito',
   'trocas.utilizar_credito_acima_limite',
   'trocas.devolver_credito',
   'trocas.inutilizar_credito',
   'estoque.acessar',
   'estoque.posicao_atual',
   'estoque.posicao_todas_filiais',
   'estoque.entrada_nf',
   'estoque.entrada_manual',
   'estoque.transferir',
   'estoque.confirmar_transferencia',
   'estoque.inventario',
   'estoque.acerto',
   'estoque.etiquetas',
   'estoque.historico',
   'estoque.zerar',
   'estoque.exportar',
   'caixa.consultar',
   'caixa.abrir',
   'caixa.fechar',
   'caixa.reabrir',
   'caixa.pagar_despesa',
   'caixa.transferir',
   'caixa.suprimento',
   'caixa.sangria',
   'caixa.excluir_lancamento',
   'caixa.alterar_saldo_inicial',
   'contas_pagar.consultar',
   'contas_pagar.incluir',
   'contas_pagar.alterar',
   'contas_pagar.baixar',
   'contas_pagar.estornar',
   'contas_pagar.cancelar',
   'contas_pagar.imprimir',
   'contas_pagar.data_retroativa',
   'contas_receber.consultar',
   'contas_receber.incluir',
   'contas_receber.alterar',
   'contas_receber.receber',
   'contas_receber.estornar',
   'contas_receber.cancelar',
   'contas_receber.imprimir',
   'contas_receber.data_retroativa',
   'contas_receber.alterar_situacao',
   'contas_receber.renegociar',
   'contas_receber.autorizar_desconto_distancia',
   'contas_receber.baixar_outras_filiais',
   'crediario.consultar',
   'crediario.conceder',
   'crediario.alterar_limite',
   'crediario.baixar',
   'crediario.ver_score',
   'cartao.consultar',
   'cartao.conciliar',
   'cartao.gerenciar_antecipacoes',
   'cartao.alterar_taxa',
   'cartao.ver_liquido',
   'cheques.consultar',
   'cheques.incluir',
   'cheques.alterar_status',
   'cheques.devolver',
   'cheques.imprimir',
   'boletos.consultar',
   'boletos.emitir',
   'boletos.cancelar',
   'boletos.baixar',
   'boletos.ver_taxas',
   'cobranca_bancaria.consultar',
   'cobranca_bancaria.gerar_remessa',
   'cobranca_bancaria.processar_retorno',
   'cobranca_bancaria.configurar',
   'financeiro.fluxo_financeiro',
   'financeiro.dre',
   'financeiro.configurar_dre',
   'financeiro.plano_contas',
   'financeiro.contas_bancarias',
   'financeiro.documentos_fiscais',
   'financeiro.pedidos_fornecedor',
   'financeiro.pagamento_pedidos',
   'financeiro.extrato',
   'comissoes.consultar_proprias',
   'comissoes.consultar_todas',
   'comissoes.configurar_parametros',
   'comissoes.configurar_equipes',
   'comissoes.configurar_parametros_equipe',
   'comissoes.apurar',
   'comissoes.pagar',
   'marketing.acessar',
   'marketing.gerenciar_campanhas',
   'marketing.disparar_campanha',
   'marketing.consultar_envios',
   'marketing.gerenciar_templates',
   'marketing.gerenciar_eventos',
   'marketing.gerenciar_promocoes',
   'marketing.gerenciar_cashback',
   'marketing.gerenciar_indicacoes',
   'marketing.gerenciar_vitrine',
   'relatorios.vendas',
   'relatorios.produtos_vendidos',
   'relatorios.produtos_sem_giro',
   'relatorios.receitas_vencidas',
   'relatorios.aniversarios',
   'relatorios.extrato_financeiro',
   'relatorios.posicao_estoque',
   'relatorios.caixas',
   'relatorios.contas_pagar',
   'relatorios.contas_receber',
   'relatorios.livro_receitas',
   'relatorios.comissoes',
   'relatorios.comissoes_equipe',
   'relatorios.validade_produtos',
   'relatorios.exportar_excel',
   'atendimento.acessar',
   'atendimento.registrar',
   'atendimento.alterar',
   'atendimento.excluir',
   'atendimento.registrar_objecao',
   'atendimento.registrar_experimentacao',
   'atendimento.ver_contra_argumentos',
   'atendimento.gerenciar_contra_argumentos',
   'atendimento.ver_kpis',
   'inteligencia.acessar',
   'inteligencia.funil',
   'inteligencia.oportunidade_aberto',
   'inteligencia.filas_trabalho',
   'inteligencia.trabalhar_fila',
   'inteligencia.configurar_filas',
   'inteligencia.configurar_holdout',
   'inteligencia.ver_atribuicao',
   'inteligencia.segundo_par',
   'inteligencia.nbo',
   'inteligencia.crm_familiar',
   'inteligencia.painel_dono',
   'inteligencia.planograma',
   'inteligencia.auditar_vitrine',
   'cadastros.acessar',
   'cadastros.tabelas_auxiliares',
   'cadastros.fornecedores',
   'cadastros.funcionarios',
   'cadastros.equipes',
   'cadastros.filiais',
   'cadastros.medicos',
   'cadastros.feriados',
   'cadastros.integracoes',
   'cadastros.aliquota_automatica',
   'usuarios.consultar',
   'usuarios.incluir',
   'usuarios.alterar',
   'usuarios.excluir',
   'usuarios.resetar_senha',
   'permissoes.consultar',
   'permissoes.gerenciar_modelos',
   'permissoes.atribuir_modelos',
   'permissoes.ver_catalogo',
   'clube.acessar',
   'clube.gerenciar_planos',
   'clube.gerenciar_beneficios',
   'clube.gerenciar_membros',
   'clube.gerenciar_cobrancas',
   'clube.ver_custos',
   'assinaturas.consultar',
   'assinaturas.ver_plano',
   'assinaturas.ativar_addon',
   'assinaturas.cancelar_addon',
   'configuracoes.acessar',
   'configuracoes.dados_empresa',
   'configuracoes.politicas',
   'configuracoes.seguranca',
   'configuracoes.integracoes',
   'auditoria.consultar',
   'auditoria.exportar'
 );

-- -----------------------------------------------------------------------------
-- criar_modelos_padrao — agora com as chaves reais
-- -----------------------------------------------------------------------------
-- Substitui a versão vazia declarada na migration 03, que existia só para o
-- trigger de signup poder referenciá-la antes de o catálogo existir.
create or replace function public.criar_modelos_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_profile_id uuid;
begin
  -- Gerente: 240 chaves
  insert into public.permission_profiles (tenant_id, nome, descricao)
  values (p_tenant_id, 'Gerente', 'Opera a loja por completo, menos o que mexe na estrutura da rede.')
  returning id into v_profile_id;

  insert into public.permission_profile_permissions (permission_profile_id, permission_key)
  select v_profile_id, k
    from unnest(array[
      'atendimento.acessar',
      'atendimento.alterar',
      'atendimento.excluir',
      'atendimento.gerenciar_contra_argumentos',
      'atendimento.registrar',
      'atendimento.registrar_experimentacao',
      'atendimento.registrar_objecao',
      'atendimento.ver_contra_argumentos',
      'atendimento.ver_kpis',
      'auditoria.consultar',
      'boletos.baixar',
      'boletos.cancelar',
      'boletos.consultar',
      'boletos.emitir',
      'boletos.ver_taxas',
      'cadastros.acessar',
      'cadastros.feriados',
      'cadastros.fornecedores',
      'cadastros.funcionarios',
      'cadastros.medicos',
      'cadastros.tabelas_auxiliares',
      'caixa.abrir',
      'caixa.alterar_saldo_inicial',
      'caixa.consultar',
      'caixa.excluir_lancamento',
      'caixa.fechar',
      'caixa.pagar_despesa',
      'caixa.reabrir',
      'caixa.sangria',
      'caixa.suprimento',
      'caixa.transferir',
      'cartao.alterar_taxa',
      'cartao.conciliar',
      'cartao.consultar',
      'cartao.gerenciar_antecipacoes',
      'cartao.ver_liquido',
      'cheques.alterar_status',
      'cheques.consultar',
      'cheques.devolver',
      'cheques.imprimir',
      'cheques.incluir',
      'clientes.acessar',
      'clientes.alterar',
      'clientes.alterar_nome',
      'clientes.analise_credito',
      'clientes.consultar',
      'clientes.excluir',
      'clientes.exportar',
      'clientes.exportar_receitas',
      'clientes.gerenciar_nucleo_familiar',
      'clientes.importar',
      'clientes.incluir',
      'clientes.negativar',
      'clientes.ver_credito',
      'clube.acessar',
      'clube.gerenciar_beneficios',
      'clube.gerenciar_cobrancas',
      'clube.gerenciar_membros',
      'clube.gerenciar_planos',
      'clube.ver_custos',
      'comissoes.apurar',
      'comissoes.configurar_equipes',
      'comissoes.configurar_parametros',
      'comissoes.configurar_parametros_equipe',
      'comissoes.consultar_todas',
      'comissoes.pagar',
      'contas_pagar.alterar',
      'contas_pagar.baixar',
      'contas_pagar.cancelar',
      'contas_pagar.consultar',
      'contas_pagar.data_retroativa',
      'contas_pagar.estornar',
      'contas_pagar.imprimir',
      'contas_pagar.incluir',
      'contas_receber.alterar',
      'contas_receber.alterar_situacao',
      'contas_receber.autorizar_desconto_distancia',
      'contas_receber.baixar_outras_filiais',
      'contas_receber.cancelar',
      'contas_receber.consultar',
      'contas_receber.data_retroativa',
      'contas_receber.estornar',
      'contas_receber.imprimir',
      'contas_receber.incluir',
      'contas_receber.receber',
      'contas_receber.renegociar',
      'crediario.alterar_limite',
      'crediario.baixar',
      'crediario.conceder',
      'crediario.consultar',
      'crediario.ver_score',
      'dashboard.acessar',
      'dashboard.card_aniversariantes',
      'dashboard.card_comparativo_ano',
      'dashboard.card_contas_pagar',
      'dashboard.card_contas_receber',
      'dashboard.card_estoque_minimo',
      'dashboard.card_negativados',
      'dashboard.card_oportunidade_aberto',
      'dashboard.card_os_entregar',
      'dashboard.card_receitas_vencidas',
      'dashboard.card_validade_produtos',
      'dashboard.card_vendas_12m',
      'dashboard.card_vendas_mes',
      'estoque.acerto',
      'estoque.acessar',
      'estoque.confirmar_transferencia',
      'estoque.entrada_manual',
      'estoque.entrada_nf',
      'estoque.etiquetas',
      'estoque.exportar',
      'estoque.historico',
      'estoque.inventario',
      'estoque.posicao_atual',
      'estoque.posicao_todas_filiais',
      'estoque.transferir',
      'estoque.zerar',
      'financeiro.contas_bancarias',
      'financeiro.documentos_fiscais',
      'financeiro.dre',
      'financeiro.extrato',
      'financeiro.fluxo_financeiro',
      'financeiro.pagamento_pedidos',
      'financeiro.pedidos_fornecedor',
      'financeiro.plano_contas',
      'inteligencia.acessar',
      'inteligencia.auditar_vitrine',
      'inteligencia.configurar_filas',
      'inteligencia.crm_familiar',
      'inteligencia.filas_trabalho',
      'inteligencia.funil',
      'inteligencia.nbo',
      'inteligencia.oportunidade_aberto',
      'inteligencia.painel_dono',
      'inteligencia.planograma',
      'inteligencia.segundo_par',
      'inteligencia.trabalhar_fila',
      'inteligencia.ver_atribuicao',
      'marketing.acessar',
      'marketing.consultar_envios',
      'marketing.disparar_campanha',
      'marketing.gerenciar_campanhas',
      'marketing.gerenciar_cashback',
      'marketing.gerenciar_eventos',
      'marketing.gerenciar_indicacoes',
      'marketing.gerenciar_promocoes',
      'marketing.gerenciar_templates',
      'marketing.gerenciar_vitrine',
      'orcamentos.alterar',
      'orcamentos.consultar',
      'orcamentos.consultar_proprios',
      'orcamentos.converter_venda',
      'orcamentos.excluir',
      'orcamentos.imprimir',
      'orcamentos.incluir',
      'orcamentos.prorrogar_validade',
      'ordens_servico.alterar',
      'ordens_servico.alterar_funcionario',
      'ordens_servico.alterar_proprias',
      'ordens_servico.alterar_somente_abertas',
      'ordens_servico.cancelar',
      'ordens_servico.confirmar_perda',
      'ordens_servico.consultar',
      'ordens_servico.consultar_proprias',
      'ordens_servico.data_retroativa',
      'ordens_servico.entregar',
      'ordens_servico.gerenciar_etapas',
      'ordens_servico.imprimir',
      'ordens_servico.incluir',
      'ordens_servico.mover_etapa',
      'ordens_servico.retornar_entregue',
      'ordens_servico.ver_paineis',
      'permissoes.consultar',
      'produtos.acessar',
      'produtos.alterar',
      'produtos.alterar_custo',
      'produtos.alterar_estoque',
      'produtos.alterar_fiscal',
      'produtos.alterar_preco',
      'produtos.alterar_validade',
      'produtos.consultar',
      'produtos.excluir',
      'produtos.exportar',
      'produtos.gerenciar_vitrine',
      'produtos.importar',
      'produtos.incluir',
      'produtos.ver_custo',
      'receitas.alterar',
      'receitas.consultar',
      'receitas.excluir',
      'receitas.imprimir',
      'receitas.incluir',
      'receitas.livro_receitas',
      'relatorios.aniversarios',
      'relatorios.caixas',
      'relatorios.comissoes',
      'relatorios.comissoes_equipe',
      'relatorios.contas_pagar',
      'relatorios.contas_receber',
      'relatorios.exportar_excel',
      'relatorios.extrato_financeiro',
      'relatorios.livro_receitas',
      'relatorios.posicao_estoque',
      'relatorios.produtos_sem_giro',
      'relatorios.produtos_vendidos',
      'relatorios.receitas_vencidas',
      'relatorios.validade_produtos',
      'relatorios.vendas',
      'tabelas_lentes.acessar',
      'tabelas_lentes.concluir_conferencia',
      'tabelas_lentes.consultar',
      'tabelas_lentes.excluir_em_conferencia',
      'tabelas_lentes.salvar_conferencia',
      'tabelas_lentes.ver_custo_fornecedor',
      'trocas.cancelar',
      'trocas.consultar',
      'trocas.devolver_credito',
      'trocas.iniciar',
      'trocas.inutilizar_credito',
      'trocas.utilizar_credito',
      'trocas.utilizar_credito_acima_limite',
      'usuarios.consultar',
      'vendas.alterar',
      'vendas.alterar_convenio',
      'vendas.alterar_funcionario',
      'vendas.alterar_origem',
      'vendas.alterar_valor_unitario',
      'vendas.autorizar_desconto_distancia',
      'vendas.cancelar',
      'vendas.consultar',
      'vendas.consultar_proprias',
      'vendas.data_retroativa',
      'vendas.duplicar',
      'vendas.emitir_nfce',
      'vendas.excluir',
      'vendas.gerenciar_garantia',
      'vendas.imprimir',
      'vendas.incluir',
      'vendas.ver_margem',
      'vendas.ver_paineis'
    ]::text[]) as k;

  -- Vendedor: 55 chaves
  insert into public.permission_profiles (tenant_id, nome, descricao)
  values (p_tenant_id, 'Vendedor', 'Atende, orça, vende e acompanha as próprias O.S.')
  returning id into v_profile_id;

  insert into public.permission_profile_permissions (permission_profile_id, permission_key)
  select v_profile_id, k
    from unnest(array[
      'atendimento.acessar',
      'atendimento.alterar',
      'atendimento.excluir',
      'atendimento.registrar',
      'atendimento.registrar_experimentacao',
      'atendimento.registrar_objecao',
      'atendimento.ver_contra_argumentos',
      'atendimento.ver_kpis',
      'clientes.acessar',
      'clientes.alterar',
      'clientes.consultar',
      'clientes.gerenciar_nucleo_familiar',
      'clientes.incluir',
      'comissoes.consultar_proprias',
      'dashboard.acessar',
      'dashboard.card_aniversariantes',
      'dashboard.card_os_entregar',
      'dashboard.card_receitas_vencidas',
      'estoque.acessar',
      'estoque.posicao_atual',
      'inteligencia.acessar',
      'inteligencia.crm_familiar',
      'inteligencia.filas_trabalho',
      'inteligencia.nbo',
      'inteligencia.segundo_par',
      'inteligencia.trabalhar_fila',
      'orcamentos.alterar',
      'orcamentos.consultar_proprios',
      'orcamentos.converter_venda',
      'orcamentos.imprimir',
      'orcamentos.incluir',
      'ordens_servico.alterar_proprias',
      'ordens_servico.consultar_proprias',
      'ordens_servico.entregar',
      'ordens_servico.imprimir',
      'ordens_servico.incluir',
      'ordens_servico.mover_etapa',
      'produtos.acessar',
      'produtos.consultar',
      'receitas.alterar',
      'receitas.consultar',
      'receitas.imprimir',
      'receitas.incluir',
      'relatorios.aniversarios',
      'relatorios.produtos_vendidos',
      'relatorios.receitas_vencidas',
      'tabelas_lentes.acessar',
      'tabelas_lentes.consultar',
      'trocas.consultar',
      'trocas.iniciar',
      'trocas.utilizar_credito',
      'vendas.consultar_proprias',
      'vendas.emitir_nfce',
      'vendas.imprimir',
      'vendas.incluir'
    ]::text[]) as k;

  -- Financeiro: 88 chaves
  insert into public.permission_profiles (tenant_id, nome, descricao)
  values (p_tenant_id, 'Financeiro', 'Cuida de caixa, títulos, cartão, cheque, boleto e resultado.')
  returning id into v_profile_id;

  insert into public.permission_profile_permissions (permission_profile_id, permission_key)
  select v_profile_id, k
    from unnest(array[
      'auditoria.consultar',
      'boletos.baixar',
      'boletos.cancelar',
      'boletos.consultar',
      'boletos.emitir',
      'boletos.ver_taxas',
      'caixa.abrir',
      'caixa.consultar',
      'caixa.fechar',
      'caixa.pagar_despesa',
      'caixa.reabrir',
      'caixa.sangria',
      'caixa.suprimento',
      'caixa.transferir',
      'cartao.alterar_taxa',
      'cartao.conciliar',
      'cartao.consultar',
      'cartao.gerenciar_antecipacoes',
      'cartao.ver_liquido',
      'cheques.alterar_status',
      'cheques.consultar',
      'cheques.devolver',
      'cheques.imprimir',
      'cheques.incluir',
      'clientes.acessar',
      'clientes.consultar',
      'clientes.negativar',
      'clientes.ver_credito',
      'cobranca_bancaria.configurar',
      'cobranca_bancaria.consultar',
      'cobranca_bancaria.gerar_remessa',
      'cobranca_bancaria.processar_retorno',
      'comissoes.apurar',
      'comissoes.consultar_todas',
      'comissoes.pagar',
      'contas_pagar.alterar',
      'contas_pagar.baixar',
      'contas_pagar.cancelar',
      'contas_pagar.consultar',
      'contas_pagar.data_retroativa',
      'contas_pagar.estornar',
      'contas_pagar.imprimir',
      'contas_pagar.incluir',
      'contas_receber.alterar',
      'contas_receber.alterar_situacao',
      'contas_receber.autorizar_desconto_distancia',
      'contas_receber.baixar_outras_filiais',
      'contas_receber.cancelar',
      'contas_receber.consultar',
      'contas_receber.data_retroativa',
      'contas_receber.estornar',
      'contas_receber.imprimir',
      'contas_receber.incluir',
      'contas_receber.receber',
      'contas_receber.renegociar',
      'crediario.alterar_limite',
      'crediario.baixar',
      'crediario.conceder',
      'crediario.consultar',
      'crediario.ver_score',
      'dashboard.acessar',
      'dashboard.card_contas_pagar',
      'dashboard.card_contas_receber',
      'dashboard.card_negativados',
      'financeiro.configurar_dre',
      'financeiro.contas_bancarias',
      'financeiro.documentos_fiscais',
      'financeiro.dre',
      'financeiro.extrato',
      'financeiro.fluxo_financeiro',
      'financeiro.pagamento_pedidos',
      'financeiro.pedidos_fornecedor',
      'financeiro.plano_contas',
      'ordens_servico.consultar',
      'relatorios.caixas',
      'relatorios.contas_pagar',
      'relatorios.contas_receber',
      'relatorios.exportar_excel',
      'relatorios.extrato_financeiro',
      'relatorios.vendas',
      'trocas.cancelar',
      'trocas.consultar',
      'trocas.devolver_credito',
      'trocas.iniciar',
      'trocas.inutilizar_credito',
      'trocas.utilizar_credito',
      'trocas.utilizar_credito_acima_limite',
      'vendas.consultar'
    ]::text[]) as k;

  -- Laboratório: 16 chaves
  insert into public.permission_profiles (tenant_id, nome, descricao)
  values (p_tenant_id, 'Laboratório', 'Trabalha o pipeline de O.S. — sem acesso comercial ou financeiro.')
  returning id into v_profile_id;

  insert into public.permission_profile_permissions (permission_profile_id, permission_key)
  select v_profile_id, k
    from unnest(array[
      'clientes.consultar',
      'dashboard.acessar',
      'dashboard.card_os_entregar',
      'estoque.acessar',
      'estoque.confirmar_transferencia',
      'estoque.historico',
      'estoque.posicao_atual',
      'ordens_servico.alterar',
      'ordens_servico.consultar',
      'ordens_servico.entregar',
      'ordens_servico.imprimir',
      'ordens_servico.mover_etapa',
      'ordens_servico.ver_paineis',
      'produtos.acessar',
      'produtos.consultar',
      'receitas.consultar'
    ]::text[]) as k;

  -- Estoquista: 28 chaves
  insert into public.permission_profiles (tenant_id, nome, descricao)
  values (p_tenant_id, 'Estoquista', 'Entrada, transferência, inventário e etiquetas.')
  returning id into v_profile_id;

  insert into public.permission_profile_permissions (permission_profile_id, permission_key)
  select v_profile_id, k
    from unnest(array[
      'cadastros.acessar',
      'cadastros.fornecedores',
      'cadastros.tabelas_auxiliares',
      'dashboard.acessar',
      'dashboard.card_estoque_minimo',
      'dashboard.card_validade_produtos',
      'estoque.acerto',
      'estoque.acessar',
      'estoque.confirmar_transferencia',
      'estoque.entrada_manual',
      'estoque.entrada_nf',
      'estoque.etiquetas',
      'estoque.exportar',
      'estoque.historico',
      'estoque.inventario',
      'estoque.posicao_atual',
      'estoque.posicao_todas_filiais',
      'estoque.transferir',
      'produtos.acessar',
      'produtos.alterar',
      'produtos.alterar_estoque',
      'produtos.alterar_validade',
      'produtos.consultar',
      'produtos.incluir',
      'relatorios.exportar_excel',
      'relatorios.posicao_estoque',
      'relatorios.produtos_sem_giro',
      'relatorios.validade_produtos'
    ]::text[]) as k;

end;
$fn$;

comment on function public.criar_modelos_padrao(uuid) is
  'Cria os modelos de permissão de partida da rede. Editáveis pela ótica; o perfil de proprietário não.';


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090400_visio_03c_convites.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 03c · Convite de usuário
-- =============================================================================
-- Sem isto, o gatilho de signup criaria uma rede nova para TODO usuário — e um
-- vendedor convidado pela ótica acabaria dono de uma rede vazia, fora da rede
-- que o convidou. O convite é o que distingue "abrir uma ótica na plataforma"
-- de "entrar na ótica de alguém".
--
-- O fluxo: um usuário com usuarios.incluir cria o convite; a pessoa se cadastra
-- com aquele e-mail; o gatilho encontra o convite e anexa o perfil à rede certa,
-- já com as filiais e os modelos de permissão definidos no convite.
-- =============================================================================

create table public.user_invites (
  id                     uuid        primary key default gen_random_uuid(),
  tenant_id              uuid        not null references public.tenants (id) on delete cascade,
  email                  text        not null,
  nome                   text,
  -- Modelos e filiais que a pessoa recebe ao aceitar. Guardados no convite para
  -- que quem convida decida o acesso antes de a pessoa existir.
  permission_profile_ids uuid[]      not null default '{}',
  store_ids              uuid[]      not null default '{}',
  limite_desconto        numeric(5, 2) not null default 0
                           check (limite_desconto >= 0 and limite_desconto <= 100),
  criado_por             uuid        references public.profiles (id) on delete set null,
  expira_em              timestamptz not null default now() + interval '14 days',
  aceito_em              timestamptz,
  created_at             timestamptz not null default now(),
  constraint user_invites_email_valido check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Um convite pendente por e-mail e por rede. Depois de aceito, o histórico fica.
create unique index user_invites_pendente_unico
  on public.user_invites (tenant_id, lower(email))
  where aceito_em is null;

create index user_invites_email_idx on public.user_invites (lower(email)) where aceito_em is null;

comment on table public.user_invites is
  'Convite para entrar numa rede existente. Consumido por handle_new_user() no cadastro.';

-- -----------------------------------------------------------------------------
-- handle_new_user, agora ciente de convites
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite     public.user_invites;
  v_tenant_id  uuid;
  v_store_id   uuid;
  v_profile_id uuid;
  v_owner_id   uuid;
  v_nome       text;
  v_nome_rede  text;
  v_nome_loja  text;
begin
  v_nome := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), '');
  v_nome := coalesce(v_nome, split_part(new.email, '@', 1));

  -- ---------------------------------------------------------------------------
  -- Caminho 1: a pessoa foi convidada para uma rede que já existe.
  -- ---------------------------------------------------------------------------
  select * into v_invite
    from public.user_invites
   where lower(email) = lower(new.email)
     and aceito_em is null
     and expira_em > now()
   order by created_at desc
   limit 1;

  if found then
    -- A filial padrão é a primeira do convite; se o convite não trouxe nenhuma,
    -- cai na filial de menor código da rede, para o usuário nunca ficar sem loja.
    v_store_id := (
      select s.id
        from public.stores s
       where s.tenant_id = v_invite.tenant_id
         and (cardinality(v_invite.store_ids) = 0 or s.id = any (v_invite.store_ids))
         and s.ativo
       order by s.codigo
       limit 1
    );

    insert into public.profiles (user_id, tenant_id, nome, email, limite_desconto, ultima_store_id)
    values (new.id, v_invite.tenant_id, coalesce(v_invite.nome, v_nome), new.email,
            v_invite.limite_desconto, v_store_id)
    returning id into v_profile_id;

    insert into public.user_stores (profile_id, store_id, is_padrao)
    select v_profile_id, s.id, s.id = v_store_id
      from public.stores s
     where s.tenant_id = v_invite.tenant_id
       and (cardinality(v_invite.store_ids) = 0 or s.id = any (v_invite.store_ids))
       and s.ativo;

    insert into public.user_permission_profiles (profile_id, permission_profile_id)
    select v_profile_id, pp.id
      from public.permission_profiles pp
     where pp.tenant_id = v_invite.tenant_id
       and pp.id = any (v_invite.permission_profile_ids)
       and pp.ativo
       -- Um convite nunca concede o perfil de proprietário, mesmo se alguém
       -- colocar o id dele no array.
       and not pp.is_owner;

    update public.user_invites set aceito_em = now() where id = v_invite.id;

    return new;
  end if;

  -- ---------------------------------------------------------------------------
  -- Caminho 2: cadastro de uma ótica nova — cria rede, filial e proprietário.
  -- ---------------------------------------------------------------------------
  v_nome_rede := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_rede', '')), '');
  v_nome_loja := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_loja', '')), '');
  v_nome_rede := coalesce(v_nome_rede, 'Ótica ' || v_nome);
  v_nome_loja := coalesce(v_nome_loja, v_nome_rede);

  insert into public.tenants (nome, slug)
  values (v_nome_rede, public.gerar_slug_tenant(v_nome_rede))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, codigo, nome_fantasia)
  values (v_tenant_id, 1, v_nome_loja)
  returning id into v_store_id;

  insert into public.profiles (user_id, tenant_id, nome, email, limite_desconto, ultima_store_id)
  values (new.id, v_tenant_id, v_nome, new.email, 100, v_store_id)
  returning id into v_profile_id;

  insert into public.user_stores (profile_id, store_id, is_padrao)
  values (v_profile_id, v_store_id, true);

  insert into public.permission_profiles (tenant_id, nome, descricao, is_owner)
  values (v_tenant_id, 'Proprietário', 'Acesso total à rede. Não pode ser removido.', true)
  returning id into v_owner_id;

  insert into public.user_permission_profiles (profile_id, permission_profile_id)
  values (v_profile_id, v_owner_id);

  perform public.criar_modelos_padrao(v_tenant_id);

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger em auth.users. Com convite pendente: anexa à rede que convidou. Sem convite: cria rede + filial + proprietário.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.user_invites enable row level security;

create policy user_invites_select on public.user_invites
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.has_permission('usuarios.consultar'));

create policy user_invites_insert on public.user_invites
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.has_permission('usuarios.incluir')
    -- As filiais do convite têm de ser da própria rede.
    and not exists (
      select 1 from unnest(store_ids) sid
       where sid not in (select id from public.stores where tenant_id = public.current_tenant_id())
    )
    -- E os modelos também.
    and not exists (
      select 1 from unnest(permission_profile_ids) ppid
       where ppid not in (
         select id from public.permission_profiles
          where tenant_id = public.current_tenant_id() and not is_owner
       )
    )
  );

create policy user_invites_delete on public.user_invites
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.has_permission('usuarios.incluir')
    and aceito_em is null
  );

create trigger user_invites_audit
  after insert or update or delete on public.user_invites
  for each row execute function public.audit_trigger();

grant select, insert, delete on public.user_invites to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090500_visio_03d_politicas.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 03d · Gerador de políticas RLS
-- =============================================================================
-- Daqui para frente serão dezenas de tabelas, todas com a mesma forma de
-- política: recorte por rede ou por filial, mais permissão nas escritas.
-- Escrever isso à mão em cada uma é onde o erro aparece — basta UMA política
-- esquecer o `tenant_id` para vazar dado entre redes, e é a única classe de
-- defeito capaz de acabar com o produto.
--
-- Por isso a política é GERADA. O template fica num lugar só, e a suíte
-- 02_rls_coverage.sql confere que nenhuma tabela escapou.
-- =============================================================================

create or replace function public.aplicar_rls_padrao(
  p_tabela      text,
  -- 'tenant': a linha pertence à rede.  'store': pertence a uma filial, e o
  -- acesso segue as filiais do usuário.
  p_escopo      text default 'tenant',
  -- Permissão exigida em cada operação. NULL na leitura significa "basta estar
  -- no escopo" — o padrão do projeto, para falta de permissão não virar lista
  -- vazia. Em dado sensível (custo, margem, financeiro), passe a chave.
  p_perm_select text default null,
  p_perm_insert text default null,
  p_perm_update text default null,
  p_perm_delete text default null
)
returns void
language plpgsql
security definer
set search_path = public
-- Silencia o NOTICE de `drop ... if exists`: numa migration com 20 tabelas são
-- mais de cem linhas de ruído, e ruído esconde aviso de verdade.
set client_min_messages = warning
as $$
declare
  v_escopo_using  text;
  v_escopo_check  text;
begin
  if p_escopo not in ('tenant', 'store') then
    raise exception 'Escopo inválido: %. Use tenant ou store.', p_escopo;
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = p_tabela and c.relkind = 'r'
  ) then
    raise exception 'Tabela public.% não existe', p_tabela;
  end if;

  -- Toda tabela de domínio carrega tenant_id. As store-scoped carregam também
  -- store_id, e aí o recorte é pelas filiais do usuário — que já é um
  -- subconjunto da rede dele, então checar as duas coisas seria redundante.
  if p_escopo = 'store' then
    v_escopo_using := 'store_id in (select public.current_store_ids())';
    v_escopo_check := v_escopo_using
      || ' and tenant_id = public.current_tenant_id()';
  else
    v_escopo_using := 'tenant_id = public.current_tenant_id()';
    v_escopo_check := v_escopo_using;
  end if;

  execute format('alter table public.%I enable row level security', p_tabela);

  -- Recriar é idempotente: rodar a migration duas vezes não duplica política.
  execute format('drop policy if exists %I on public.%I', p_tabela || '_select', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_insert', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_update', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_delete', p_tabela);

  execute format(
    'create policy %I on public.%I for select to authenticated using (%s)',
    p_tabela || '_select', p_tabela,
    v_escopo_using
      || coalesce(format(' and public.has_permission(%L)', p_perm_select), '')
  );

  execute format(
    'create policy %I on public.%I for insert to authenticated with check (%s)',
    p_tabela || '_insert', p_tabela,
    v_escopo_check
      || coalesce(format(' and public.has_permission(%L)', p_perm_insert), '')
  );

  execute format(
    'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
    p_tabela || '_update', p_tabela,
    v_escopo_using
      || coalesce(format(' and public.has_permission(%L)', p_perm_update), ''),
    v_escopo_check
  );

  execute format(
    'create policy %I on public.%I for delete to authenticated using (%s)',
    p_tabela || '_delete', p_tabela,
    v_escopo_using
      || coalesce(format(' and public.has_permission(%L)', p_perm_delete), '')
  );

  execute format(
    'grant select, insert, update, delete on public.%I to authenticated', p_tabela
  );
end;
$$;

comment on function public.aplicar_rls_padrao(text, text, text, text, text, text) is
  'Gera as quatro políticas RLS padrão de uma tabela de domínio. Uma política escrita à mão é uma chance de esquecer o recorte de rede.';

-- -----------------------------------------------------------------------------
-- Conveniências aplicadas a toda tabela nova
-- -----------------------------------------------------------------------------
create or replace function public.aplicar_triggers_padrao(
  p_tabela    text,
  p_auditar   boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
set client_min_messages = warning
as $$
begin
  -- updated_at só faz sentido se a coluna existir.
  if exists (
    select 1 from pg_attribute a
     join pg_class c on c.oid = a.attrelid
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = p_tabela
      and a.attname = 'updated_at' and a.attnum > 0 and not a.attisdropped
  ) then
    execute format('drop trigger if exists %I on public.%I', p_tabela || '_updated_at', p_tabela);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      p_tabela || '_updated_at', p_tabela
    );
  end if;

  if p_auditar then
    execute format('drop trigger if exists %I on public.%I', p_tabela || '_audit', p_tabela);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()',
      p_tabela || '_audit', p_tabela
    );
  end if;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090600_visio_04_cadastros_auxiliares.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 04 · Cadastros auxiliares
-- =============================================================================
-- As tabelas de apoio que servem de dimensão para produto, venda, financeiro e
-- relatório. A maioria tem a mesma forma (nome, descrição, ativo, ordem) e é
-- criada por um laço; as que têm regra própria vêm declaradas uma a uma.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabelas de forma simples
-- -----------------------------------------------------------------------------
-- Criadas em laço porque são idênticas: repetir 60 linhas oito vezes é onde
-- aparece a que ficou sem RLS ou sem o índice único.
do $$
declare
  -- `foreach ... slice 1` percorre linhas da matriz, então a variável é um array.
  v_tabela  text[];
  v_tabelas text[][] := array[
    ['unidades',               'Unidade de medida do produto (UN, PAR, CX).'],
    ['cores',                  'Cor da armação ou da lente.'],
    ['tamanhos',               'Tamanho da armação.'],
    ['formatos',               'Formato da armação (redonda, quadrada, gatinho).'],
    ['generos',                'Gênero a que o produto se destina.'],
    ['tipos_lente',            'Tipo de lente (monofocal, multifocal, ocupacional).'],
    ['grifes',                 'Marca do produto.'],
    ['origens_cliente',        'Origem do lead: indicação, loja, evento, Instagram, convênio.'],
    ['tipos_documento',        'Tipo de documento financeiro (nota, recibo, duplicata).'],
    ['profissoes',             'Profissão do cliente.']
  ];
begin
  foreach v_tabela slice 1 in array v_tabelas loop
    execute format($fmt$
      create table public.%I (
        id         uuid        primary key default gen_random_uuid(),
        tenant_id  uuid        not null references public.tenants (id) on delete cascade,
        nome       text        not null,
        descricao  text,
        ordem      integer     not null default 0,
        ativo      boolean     not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint %I check (length(btrim(nome)) > 0)
      )
    $fmt$, v_tabela[1], v_tabela[1] || '_nome_nao_vazio');

    -- Nome único por rede, ignorando acento e caixa: "Ray-Ban" e "ray ban" são
    -- a mesma grife, e deixar as duas entrarem estraga todo relatório por grife.
    execute format(
      'create unique index %I on public.%I (tenant_id, public.normalizar_texto(nome))',
      v_tabela[1] || '_nome_unico', v_tabela[1]);
    execute format(
      'create index %I on public.%I (tenant_id, ordem, nome) where ativo',
      v_tabela[1] || '_ativos_idx', v_tabela[1]);

    execute format('comment on table public.%I is %L', v_tabela[1], v_tabela[2]);

    perform public.aplicar_rls_padrao(
      v_tabela[1], 'tenant',
      null,                            -- leitura: basta ser da rede
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares'
    );
    perform public.aplicar_triggers_padrao(v_tabela[1]);
  end loop;
end $$;

-- Contrato das tabelas de apoio: TODAS têm nome, ordem e ativo. A tela genérica
-- de cadastros escreve essas três colunas em qualquer uma delas, e o seletor de
-- opções ordena por `ordem`. A suíte de banco confere que nenhuma escapou.

-- -----------------------------------------------------------------------------
-- grupos e subgrupos de produto
-- -----------------------------------------------------------------------------
-- Ganham coeficiente e índice porque são usados no cálculo de preço sugerido
-- por categoria — e alterá-los é permissão própria no catálogo.
create table public.grupos (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  nome        text        not null,
  descricao   text,
  coeficiente numeric(10, 4),
  indice      numeric(10, 4),
  ordem       integer     not null default 0,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index grupos_nome_unico on public.grupos (tenant_id, public.normalizar_texto(nome));

create table public.subgrupos (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  grupo_id   uuid        not null references public.grupos (id) on delete cascade,
  nome       text        not null,
  descricao  text,
  ordem      integer     not null default 0,
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subgrupos_nome_unico
  on public.subgrupos (grupo_id, public.normalizar_texto(nome));
create index subgrupos_grupo_idx on public.subgrupos (grupo_id) where ativo;

-- -----------------------------------------------------------------------------
-- convenios
-- -----------------------------------------------------------------------------
create table public.convenios (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  nome                text        not null,
  descricao           text,
  cnpj                text,
  contato             text,
  telefone            text,
  email               text,
  desconto_percentual numeric(5, 2) not null default 0
                        check (desconto_percentual >= 0 and desconto_percentual <= 100),
  -- Convênio de consignação fatura para a empresa parceira; o de desconto só
  -- abate no ato da venda. A diferença muda o destino do recebível.
  tipo                text        not null default 'desconto'
                        check (tipo in ('desconto', 'consignacao', 'permuta')),
  ordem               integer     not null default 0,
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index convenios_nome_unico
  on public.convenios (tenant_id, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- formas_pagamento
-- -----------------------------------------------------------------------------
create type public.natureza_pagamento as enum (
  'dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto',
  'crediario', 'cheque', 'transferencia', 'credito_troca', 'cashback', 'permuta'
);

create table public.formas_pagamento (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null references public.tenants (id) on delete cascade,
  nome                  text        not null,
  natureza              public.natureza_pagamento not null,
  permite_parcelamento  boolean     not null default false,
  max_parcelas          smallint    not null default 1 check (max_parcelas between 1 and 48),
  -- Taxa da adquirente e prazo de crédito: é o que permite conciliar o valor
  -- líquido que cai na conta com o valor bruto da venda.
  taxa_percentual       numeric(6, 3) not null default 0 check (taxa_percentual >= 0),
  taxa_fixa             numeric(10, 2) not null default 0 check (taxa_fixa >= 0),
  dias_credito          smallint    not null default 0 check (dias_credito >= 0),
  -- Entra no caixa da loja (dinheiro) ou vai direto para conta bancária?
  movimenta_caixa       boolean     not null default true,
  ordem                 integer     not null default 0,
  ativo                 boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint formas_pagamento_parcelas_coerentes
    check (permite_parcelamento or max_parcelas = 1)
);

create unique index formas_pagamento_nome_unico
  on public.formas_pagamento (tenant_id, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- medicos (e optometristas) e responsaveis_tecnicos
-- -----------------------------------------------------------------------------
create table public.medicos (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants (id) on delete cascade,
  nome            text        not null,
  -- Conselho varia: CRM para oftalmologista, CRO/registro para optometrista.
  conselho        text        not null default 'CRM'
                    check (conselho in ('CRM', 'CRO', 'OUTRO')),
  registro        text,
  uf_registro     char(2),
  especialidade   text,
  telefone        text,
  email           text,
  observacoes     text,
  ordem           integer     not null default 0,
  ativo           boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index medicos_registro_unico
  on public.medicos (tenant_id, conselho, public.somente_digitos(registro))
  where registro is not null and btrim(registro) <> '';
create index medicos_nome_idx
  on public.medicos (tenant_id, public.normalizar_texto(nome));

create table public.responsaveis_tecnicos (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  store_id    uuid        references public.stores (id) on delete set null,
  nome        text        not null,
  registro    text,
  cpf         text,
  ordem       integer     not null default 0,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- plano_contas — árvore de categorias de receita e despesa
-- -----------------------------------------------------------------------------
create type public.natureza_conta as enum ('receita', 'despesa');

create table public.plano_contas (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  parent_id  uuid        references public.plano_contas (id) on delete restrict,
  -- Código hierárquico legível (3.1.02). É o que o contador espera ver.
  codigo     text        not null,
  nome       text        not null,
  natureza   public.natureza_conta not null,
  -- Conta sintética agrupa; só a analítica recebe lançamento.
  analitica  boolean     not null default true,
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plano_contas_codigo_formato check (codigo ~ '^[0-9]+(\.[0-9]+)*$')
);

create unique index plano_contas_codigo_unico on public.plano_contas (tenant_id, codigo);
create index plano_contas_parent_idx on public.plano_contas (parent_id);

-- Um pai sintético não pode ter natureza diferente do filho, senão o DRE soma
-- receita dentro de despesa.
create or replace function public.guard_plano_contas()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_pai public.plano_contas;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'Uma conta não pode ser pai de si mesma.';
  end if;

  select * into v_pai from public.plano_contas where id = new.parent_id;

  if v_pai.tenant_id <> new.tenant_id then
    raise exception 'A conta pai pertence a outra rede.';
  end if;
  if v_pai.natureza <> new.natureza then
    raise exception 'A conta "%" é de % e não pode ter filho de %.',
      v_pai.nome, v_pai.natureza, new.natureza;
  end if;
  if v_pai.analitica then
    raise exception 'A conta "%" é analítica e não aceita subconta. Marque-a como sintética primeiro.',
      v_pai.nome;
  end if;

  return new;
end;
$$;

create trigger plano_contas_guard
  before insert or update on public.plano_contas
  for each row execute function public.guard_plano_contas();

-- -----------------------------------------------------------------------------
-- situacoes_conta_receber
-- -----------------------------------------------------------------------------
create table public.situacoes_conta_receber (
  id                     uuid        primary key default gen_random_uuid(),
  tenant_id              uuid        not null references public.tenants (id) on delete cascade,
  nome                   text        not null,
  descricao              text,
  -- Cor no quadro de cobrança. HSL, como todo token do design system.
  cor                    text,
  considera_inadimplente boolean     not null default false,
  ordem                  integer     not null default 0,
  ativo                  boolean     not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index situacoes_conta_receber_nome_unico
  on public.situacoes_conta_receber (tenant_id, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- motivos_cancelamento
-- -----------------------------------------------------------------------------
create table public.motivos_cancelamento (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  nome       text        not null,
  -- Cancelar venda, O.S. e orçamento são decisões diferentes; o motivo
  -- oferecido precisa refletir isso.
  aplica_a   text        not null default 'venda'
               check (aplica_a in ('venda', 'os', 'orcamento', 'troca', 'todos')),
  ordem      integer     not null default 0,
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index motivos_cancelamento_nome_unico
  on public.motivos_cancelamento (tenant_id, aplica_a, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- feriados — entram no cálculo de SLA das Ordens de Serviço
-- -----------------------------------------------------------------------------
create table public.feriados (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  -- Feriado municipal ou fechamento de uma loja só valem para aquela filial.
  store_id    uuid        references public.stores (id) on delete cascade,
  data        date        not null,
  nome        text        not null,
  abrangencia text        not null default 'nacional'
                check (abrangencia in ('nacional', 'estadual', 'municipal', 'loja')),
  uf          char(2),
  -- Feriado de data fixa repete todo ano; Carnaval e Corpus Christi, não.
  recorrente  boolean     not null default false,
  ordem       integer     not null default 0,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint feriados_loja_coerente check (abrangencia <> 'loja' or store_id is not null),
  constraint feriados_uf_coerente   check (abrangencia <> 'estadual' or uf is not null)
);

create unique index feriados_unico
  on public.feriados (tenant_id, data, coalesce(store_id, '00000000-0000-0000-0000-000000000000'::uuid), nome);
create index feriados_data_idx on public.feriados (tenant_id, data) where ativo;

comment on table public.feriados is
  'Feriados por rede e filial. Usados por add_business_days() no cálculo de SLA das O.S.';

-- -----------------------------------------------------------------------------
-- RLS e triggers das tabelas declaradas uma a uma
-- -----------------------------------------------------------------------------
do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'grupos', 'subgrupos', 'convenios', 'formas_pagamento', 'medicos',
    'responsaveis_tecnicos', 'plano_contas', 'situacoes_conta_receber',
    'motivos_cancelamento', 'feriados'
  ] loop
    perform public.aplicar_rls_padrao(
      v_tabela, 'tenant', null,
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares'
    );
    perform public.aplicar_triggers_padrao(v_tabela);
  end loop;
end $$;

-- Três têm permissão própria no catálogo; sobrescrevem o padrão acima.
do $$
begin
  perform public.aplicar_rls_padrao('medicos',      'tenant', null, 'cadastros.medicos',       'cadastros.medicos',       'cadastros.medicos');
  perform public.aplicar_rls_padrao('feriados',     'tenant', null, 'cadastros.feriados',      'cadastros.feriados',      'cadastros.feriados');
  perform public.aplicar_rls_padrao('plano_contas', 'tenant', null, 'financeiro.plano_contas', 'financeiro.plano_contas', 'financeiro.plano_contas');
end $$;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090700_visio_05_fornecedores_funcionarios.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 05 · Fornecedores, laboratórios, funcionários e equipes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fornecedores
-- -----------------------------------------------------------------------------
create table public.fornecedores (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  nome_fantasia       text        not null,
  razao_social        text,
  cpf_cnpj            text,
  -- Um fornecedor pode ser laboratório óptico: é o que faz ele aparecer no
  -- seletor de laboratório da O.S. e na conciliação de pedidos faturados.
  is_laboratorio      boolean     not null default false,
  -- Prazo médio de produção do laboratório, em dias úteis. Alimenta a previsão
  -- de entrega da O.S. quando a etapa não tem SLA próprio.
  prazo_producao_dias smallint    check (prazo_producao_dias is null or prazo_producao_dias >= 0),
  inscricao_estadual  text,
  inscricao_municipal text,
  suframa             text,
  contribuinte_icms   boolean     not null default false,
  cep                 text,
  endereco            text,
  numero              text,
  complemento         text,
  bairro              text,
  cidade              text,
  uf                  char(2),
  telefone            text,
  email               text,
  website             text,
  observacoes         text,
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index fornecedores_documento_unico
  on public.fornecedores (tenant_id, public.somente_digitos(cpf_cnpj))
  where cpf_cnpj is not null and btrim(cpf_cnpj) <> '';
create index fornecedores_nome_idx
  on public.fornecedores (tenant_id, public.normalizar_texto(nome_fantasia));
create index fornecedores_laboratorios_idx
  on public.fornecedores (tenant_id) where is_laboratorio and ativo;

comment on column public.fornecedores.is_laboratorio is
  'Marca o fornecedor como laboratório óptico — aparece no seletor de laboratório da O.S.';

-- Um fornecedor tem várias pessoas de contato, cada uma com telefone próprio:
-- o vendedor da conta não é quem resolve problema de montagem.
create table public.fornecedor_contatos (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  fornecedor_id  uuid        not null references public.fornecedores (id) on delete cascade,
  nome           text        not null,
  cargo          text,
  email          text,
  telefone_fixo  text,
  telefone_movel text,
  observacao     text,
  principal      boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index fornecedor_contatos_fornecedor_idx
  on public.fornecedor_contatos (fornecedor_id);
-- No máximo um contato principal por fornecedor.
create unique index fornecedor_contatos_um_principal
  on public.fornecedor_contatos (fornecedor_id) where principal;

-- -----------------------------------------------------------------------------
-- funcionarios
-- -----------------------------------------------------------------------------
-- Separado de `profiles` de propósito: existe funcionário sem acesso ao sistema
-- (o montador do laboratório), e a comissão é do funcionário, não do login.
create table public.funcionarios (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  store_id       uuid        references public.stores (id) on delete set null,
  nome           text        not null,
  funcao         text,
  cpf            text,
  rg             text,
  data_nascimento date,
  data_admissao  date,
  data_demissao  date,
  telefone_fixo  text,
  telefone_movel text,
  email          text,
  cep            text,
  endereco       text,
  numero         text,
  complemento    text,
  bairro         text,
  cidade         text,
  uf             char(2),
  foto_url       text,
  observacoes    text,
  ativo          boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint funcionarios_demissao_posterior
    check (data_demissao is null or data_admissao is null or data_demissao >= data_admissao)
);

create unique index funcionarios_cpf_unico
  on public.funcionarios (tenant_id, public.somente_digitos(cpf))
  where cpf is not null and btrim(cpf) <> '';
create index funcionarios_nome_idx
  on public.funcionarios (tenant_id, public.normalizar_texto(nome));
create index funcionarios_store_idx on public.funcionarios (store_id) where ativo;

comment on table public.funcionarios is
  'Funcionário da rede. Pode existir sem login: comissão e vínculo de venda são do funcionário, não do usuário.';

-- Vínculo do login com o funcionário. Existe agora porque `profiles` foi criado
-- na migration 02, antes desta tabela.
alter table public.profiles
  add column funcionario_id uuid references public.funcionarios (id) on delete set null;

create unique index profiles_funcionario_unico
  on public.profiles (funcionario_id) where funcionario_id is not null;

comment on column public.profiles.funcionario_id is
  'Funcionário que este login representa. Um funcionário tem no máximo um login.';

-- -----------------------------------------------------------------------------
-- equipes — a hierarquia de vendas, base da comissão de gerente
-- -----------------------------------------------------------------------------
create table public.equipes (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  store_id    uuid        references public.stores (id) on delete cascade,
  nome        text        not null,
  gerente_id  uuid        references public.funcionarios (id) on delete set null,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index equipes_nome_unico
  on public.equipes (tenant_id, public.normalizar_texto(nome));

create table public.equipe_membros (
  equipe_id      uuid        not null references public.equipes (id) on delete cascade,
  funcionario_id uuid        not null references public.funcionarios (id) on delete cascade,
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  desde          date        not null default current_date,
  ate            date,
  primary key (equipe_id, funcionario_id),
  constraint equipe_membros_periodo check (ate is null or ate >= desde)
);

create index equipe_membros_funcionario_idx on public.equipe_membros (funcionario_id);

-- Um funcionário em duas equipes ao mesmo tempo faria a comissão de gerente ser
-- paga duas vezes sobre a mesma venda.
create or replace function public.guard_equipe_membros()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
      from public.equipe_membros em
      join public.equipes e on e.id = em.equipe_id
     where em.funcionario_id = new.funcionario_id
       and em.equipe_id <> new.equipe_id
       and e.ativo
       and em.ate is null
  ) then
    raise exception 'Este funcionário já está em outra equipe ativa. Encerre o vínculo anterior primeiro.';
  end if;
  return new;
end;
$$;

create trigger equipe_membros_guard
  before insert or update on public.equipe_membros
  for each row execute function public.guard_equipe_membros();

-- -----------------------------------------------------------------------------
-- RLS e triggers
-- -----------------------------------------------------------------------------
do $$
begin
  perform public.aplicar_rls_padrao('fornecedores',        'tenant', null, 'cadastros.fornecedores', 'cadastros.fornecedores', 'cadastros.fornecedores');
  perform public.aplicar_rls_padrao('fornecedor_contatos', 'tenant', null, 'cadastros.fornecedores', 'cadastros.fornecedores', 'cadastros.fornecedores');
  perform public.aplicar_rls_padrao('funcionarios',        'tenant', null, 'cadastros.funcionarios', 'cadastros.funcionarios', 'cadastros.funcionarios');
  perform public.aplicar_rls_padrao('equipes',             'tenant', null, 'cadastros.equipes',      'cadastros.equipes',      'cadastros.equipes');
  perform public.aplicar_rls_padrao('equipe_membros',      'tenant', null, 'cadastros.equipes',      'cadastros.equipes',      'cadastros.equipes');

  perform public.aplicar_triggers_padrao('fornecedores');
  perform public.aplicar_triggers_padrao('fornecedor_contatos');
  perform public.aplicar_triggers_padrao('funcionarios');
  perform public.aplicar_triggers_padrao('equipes');
  perform public.aplicar_triggers_padrao('equipe_membros');
end $$;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090800_visio_05b_cadastros_padrao.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 05b · Cadastros de partida de uma rede nova
-- =============================================================================
-- Um ERP de ótica com todas as tabelas de apoio vazias é inusável: não dá para
-- lançar uma venda sem forma de pagamento, nem calcular prazo de O.S. sem
-- feriado. A rede nasce com um conjunto mínimo e editável.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Páscoa — e daí os feriados móveis
-- -----------------------------------------------------------------------------
-- Carnaval, Sexta-feira Santa e Corpus Christi mudam de data todo ano, em função
-- da Páscoa. Sem calcular, o prazo da O.S. erra em três semanas do ano — e erra
-- justamente na semana em que o laboratório não produz.
create or replace function public.calcular_pascoa(p_ano integer)
returns date
language plpgsql
immutable
parallel safe
as $$
declare
  -- Algoritmo de Meeus/Jones/Butcher para o calendário gregoriano.
  a integer := p_ano % 19;
  b integer := p_ano / 100;
  c integer := p_ano % 100;
  d integer := b / 4;
  e integer := b % 4;
  f integer := (b + 8) / 25;
  g integer := (b - f + 1) / 3;
  h integer := (19 * a + b - d - g + 15) % 30;
  i integer := c / 4;
  k integer := c % 4;
  l integer := (32 + 2 * e + 2 * i - h - k) % 7;
  m integer := (a + 11 * h + 22 * l) / 451;
  mes integer := (h + l - 7 * m + 114) / 31;
  dia integer := ((h + l - 7 * m + 114) % 31) + 1;
begin
  return make_date(p_ano, mes, dia);
end;
$$;

comment on function public.calcular_pascoa(integer) is
  'Domingo de Páscoa do ano, por Meeus/Jones/Butcher. Base dos feriados móveis.';

-- -----------------------------------------------------------------------------
-- Feriados nacionais de um ano
-- -----------------------------------------------------------------------------
create or replace function public.semear_feriados_nacionais(
  p_tenant_id uuid,
  p_ano       integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pascoa date := public.calcular_pascoa(p_ano);
begin
  insert into public.feriados (tenant_id, data, nome, abrangencia, recorrente)
  values
    (p_tenant_id, make_date(p_ano,  1,  1), 'Confraternização Universal',       'nacional', true),
    (p_tenant_id, make_date(p_ano,  4, 21), 'Tiradentes',                        'nacional', true),
    (p_tenant_id, make_date(p_ano,  5,  1), 'Dia do Trabalho',                   'nacional', true),
    (p_tenant_id, make_date(p_ano,  9,  7), 'Independência do Brasil',           'nacional', true),
    (p_tenant_id, make_date(p_ano, 10, 12), 'Nossa Senhora Aparecida',           'nacional', true),
    (p_tenant_id, make_date(p_ano, 11,  2), 'Finados',                           'nacional', true),
    (p_tenant_id, make_date(p_ano, 11, 15), 'Proclamação da República',          'nacional', true),
    (p_tenant_id, make_date(p_ano, 11, 20), 'Consciência Negra',                 'nacional', true),
    (p_tenant_id, make_date(p_ano, 12, 25), 'Natal',                             'nacional', true),
    -- Móveis. Carnaval e Corpus Christi são ponto facultativo por lei, mas a
    -- ótica costuma fechar; ficam ativos e a loja desativa se abrir.
    (p_tenant_id, v_pascoa - 48, 'Carnaval (segunda)',      'nacional', false),
    (p_tenant_id, v_pascoa - 47, 'Carnaval (terça)',        'nacional', false),
    (p_tenant_id, v_pascoa -  2, 'Sexta-feira Santa',       'nacional', false),
    (p_tenant_id, v_pascoa + 60, 'Corpus Christi',          'nacional', false)
  on conflict do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Conjunto de partida
-- -----------------------------------------------------------------------------
create or replace function public.semear_cadastros_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano     integer := extract(year from current_date)::integer;
  v_receita uuid;
  v_despesa uuid;
begin
  -- Unidades
  insert into public.unidades (tenant_id, nome, descricao, ordem) values
    (p_tenant_id, 'UN',  'Unidade', 1),
    (p_tenant_id, 'PAR', 'Par (lentes, hastes)', 2),
    (p_tenant_id, 'CX',  'Caixa', 3),
    (p_tenant_id, 'SERV','Serviço', 4)
  on conflict do nothing;

  -- Tipos de lente
  insert into public.tipos_lente (tenant_id, nome, ordem) values
    (p_tenant_id, 'Monofocal', 1),
    (p_tenant_id, 'Multifocal', 2),
    (p_tenant_id, 'Bifocal', 3),
    (p_tenant_id, 'Ocupacional', 4),
    (p_tenant_id, 'Lente de contato', 5),
    (p_tenant_id, 'Sem grau', 6)
  on conflict do nothing;

  -- Formatos e gêneros de armação
  insert into public.formatos (tenant_id, nome, ordem) values
    (p_tenant_id, 'Redonda', 1), (p_tenant_id, 'Quadrada', 2),
    (p_tenant_id, 'Retangular', 3), (p_tenant_id, 'Gatinho', 4),
    (p_tenant_id, 'Aviador', 5), (p_tenant_id, 'Oval', 6),
    (p_tenant_id, 'Hexagonal', 7)
  on conflict do nothing;

  insert into public.generos (tenant_id, nome, ordem) values
    (p_tenant_id, 'Feminino', 1), (p_tenant_id, 'Masculino', 2),
    (p_tenant_id, 'Unissex', 3), (p_tenant_id, 'Infantil', 4)
  on conflict do nothing;

  insert into public.tamanhos (tenant_id, nome, ordem) values
    (p_tenant_id, 'PP', 1), (p_tenant_id, 'P', 2), (p_tenant_id, 'M', 3),
    (p_tenant_id, 'G', 4), (p_tenant_id, 'GG', 5)
  on conflict do nothing;

  -- Grupos de produto, com os subgrupos que quase toda ótica usa
  insert into public.grupos (tenant_id, nome, ordem) values
    (p_tenant_id, 'Armações', 1),
    (p_tenant_id, 'Lentes', 2),
    (p_tenant_id, 'Lentes de contato', 3),
    (p_tenant_id, 'Óculos de sol', 4),
    (p_tenant_id, 'Acessórios', 5),
    (p_tenant_id, 'Serviços', 6)
  on conflict do nothing;

  insert into public.subgrupos (tenant_id, grupo_id, nome, ordem)
  select p_tenant_id, g.id, s.nome, s.ordem
    from public.grupos g
    join (values
      ('Armações',          'Metal', 1),
      ('Armações',          'Acetato', 2),
      ('Armações',          'Balgriff', 3),
      ('Armações',          'Infantil', 4),
      ('Lentes',            'Visão simples', 1),
      ('Lentes',            'Multifocal', 2),
      ('Lentes',            'Fotossensível', 3),
      ('Lentes',            'Antirreflexo', 4),
      ('Lentes de contato', 'Diária', 1),
      ('Lentes de contato', 'Mensal', 2),
      ('Lentes de contato', 'Colorida', 3),
      ('Acessórios',        'Estojo', 1),
      ('Acessórios',        'Solução', 2),
      ('Acessórios',        'Cordão', 3),
      ('Serviços',          'Montagem', 1),
      ('Serviços',          'Ajuste', 2),
      ('Serviços',          'Limpeza', 3)
    ) as s(grupo, nome, ordem) on public.normalizar_texto(g.nome) = public.normalizar_texto(s.grupo)
   where g.tenant_id = p_tenant_id
  on conflict do nothing;

  -- Formas de pagamento, com taxa e prazo de crédito prontos para conciliação
  insert into public.formas_pagamento
    (tenant_id, nome, natureza, permite_parcelamento, max_parcelas, dias_credito, movimenta_caixa, ordem)
  values
    (p_tenant_id, 'Dinheiro',           'dinheiro',        false,  1,  0, true,  1),
    (p_tenant_id, 'PIX',                'pix',             false,  1,  0, false, 2),
    (p_tenant_id, 'Cartão de débito',   'cartao_debito',   false,  1,  1, false, 3),
    (p_tenant_id, 'Cartão de crédito',  'cartao_credito',  true,  12, 30, false, 4),
    (p_tenant_id, 'Crediário da loja',  'crediario',       true,  12,  0, false, 5),
    (p_tenant_id, 'Boleto',             'boleto',          true,   6,  2, false, 6),
    (p_tenant_id, 'Cheque',             'cheque',          true,   6,  0, false, 7),
    (p_tenant_id, 'Crédito de troca',   'credito_troca',   false,  1,  0, false, 8)
  on conflict do nothing;

  -- Origem do cliente: é a dimensão que o marketing usa para medir canal
  insert into public.origens_cliente (tenant_id, nome, ordem) values
    (p_tenant_id, 'Passou na loja', 1),
    (p_tenant_id, 'Indicação', 2),
    (p_tenant_id, 'Instagram', 3),
    (p_tenant_id, 'WhatsApp', 4),
    (p_tenant_id, 'Google', 5),
    (p_tenant_id, 'Convênio', 6),
    (p_tenant_id, 'Evento', 7),
    (p_tenant_id, 'Cliente antigo', 8)
  on conflict do nothing;

  -- Situações de conta a receber
  insert into public.situacoes_conta_receber
    (tenant_id, nome, considera_inadimplente, ordem) values
    (p_tenant_id, 'Em aberto',   false, 1),
    (p_tenant_id, 'Pago',        false, 2),
    (p_tenant_id, 'Em atraso',   true,  3),
    (p_tenant_id, 'Em cobrança', true,  4),
    (p_tenant_id, 'Negociado',   false, 5),
    (p_tenant_id, 'Perda',       true,  6)
  on conflict do nothing;

  insert into public.tipos_documento (tenant_id, nome, ordem) values
    (p_tenant_id, 'Nota fiscal', 1), (p_tenant_id, 'Recibo', 2),
    (p_tenant_id, 'Duplicata', 3), (p_tenant_id, 'Boleto', 4),
    (p_tenant_id, 'Cupom fiscal', 5), (p_tenant_id, 'Sem documento', 6)
  on conflict do nothing;

  insert into public.motivos_cancelamento (tenant_id, nome, aplica_a) values
    (p_tenant_id, 'Desistência do cliente', 'todos'),
    (p_tenant_id, 'Erro de lançamento',     'todos'),
    (p_tenant_id, 'Produto indisponível',   'venda'),
    (p_tenant_id, 'Receita incorreta',      'os'),
    (p_tenant_id, 'Prazo não aceito',       'orcamento'),
    (p_tenant_id, 'Inadimplência',          'venda')
  on conflict do nothing;

  -- Plano de contas mínimo, já com a árvore sintética/analítica correta
  insert into public.plano_contas (tenant_id, codigo, nome, natureza, analitica)
  values (p_tenant_id, '1', 'Receitas', 'receita', false)
  on conflict do nothing
  returning id into v_receita;

  if v_receita is null then
    select id into v_receita from public.plano_contas
     where tenant_id = p_tenant_id and codigo = '1';
  end if;

  insert into public.plano_contas (tenant_id, parent_id, codigo, nome, natureza) values
    (p_tenant_id, v_receita, '1.1', 'Venda de armações',          'receita'),
    (p_tenant_id, v_receita, '1.2', 'Venda de lentes',            'receita'),
    (p_tenant_id, v_receita, '1.3', 'Venda de lentes de contato', 'receita'),
    (p_tenant_id, v_receita, '1.4', 'Venda de óculos de sol',     'receita'),
    (p_tenant_id, v_receita, '1.5', 'Serviços',                   'receita'),
    (p_tenant_id, v_receita, '1.6', 'Outras receitas',            'receita')
  on conflict do nothing;

  insert into public.plano_contas (tenant_id, codigo, nome, natureza, analitica)
  values (p_tenant_id, '2', 'Despesas', 'despesa', false)
  on conflict do nothing
  returning id into v_despesa;

  if v_despesa is null then
    select id into v_despesa from public.plano_contas
     where tenant_id = p_tenant_id and codigo = '2';
  end if;

  insert into public.plano_contas (tenant_id, parent_id, codigo, nome, natureza) values
    (p_tenant_id, v_despesa, '2.1',  'Compra de mercadoria',      'despesa'),
    (p_tenant_id, v_despesa, '2.2',  'Laboratório e montagem',    'despesa'),
    (p_tenant_id, v_despesa, '2.3',  'Folha e encargos',          'despesa'),
    (p_tenant_id, v_despesa, '2.4',  'Comissões',                 'despesa'),
    (p_tenant_id, v_despesa, '2.5',  'Aluguel e condomínio',      'despesa'),
    (p_tenant_id, v_despesa, '2.6',  'Energia, água e telefone',  'despesa'),
    (p_tenant_id, v_despesa, '2.7',  'Marketing',                 'despesa'),
    (p_tenant_id, v_despesa, '2.8',  'Impostos e taxas',          'despesa'),
    (p_tenant_id, v_despesa, '2.9',  'Taxas de cartão',           'despesa'),
    (p_tenant_id, v_despesa, '2.10', 'Outras despesas',           'despesa')
  on conflict do nothing;

  -- Feriados do ano passado ao quinto ano à frente: cobre o histórico que o
  -- relatório precisa e a previsão de O.S. de longo prazo.
  for v_ano in (v_ano - 1)..(v_ano + 5) loop
    perform public.semear_feriados_nacionais(p_tenant_id, v_ano);
  end loop;
end;
$$;

comment on function public.semear_cadastros_padrao(uuid) is
  'Conjunto mínimo de cadastros de uma rede nova. Tudo editável: são pontos de partida, não regras.';

-- -----------------------------------------------------------------------------
-- Passa a rodar no cadastro de uma ótica nova
-- -----------------------------------------------------------------------------
-- Substitui a chamada de criar_modelos_padrao por ela mais a semeadura. O
-- caminho do convite não semeia nada: a rede já existe e já tem seus cadastros.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite     public.user_invites;
  v_tenant_id  uuid;
  v_store_id   uuid;
  v_profile_id uuid;
  v_owner_id   uuid;
  v_nome       text;
  v_nome_rede  text;
  v_nome_loja  text;
begin
  v_nome := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), '');
  v_nome := coalesce(v_nome, split_part(new.email, '@', 1));

  -- Caminho 1: convidado para uma rede existente.
  select * into v_invite
    from public.user_invites
   where lower(email) = lower(new.email)
     and aceito_em is null
     and expira_em > now()
   order by created_at desc
   limit 1;

  if found then
    v_store_id := (
      select s.id
        from public.stores s
       where s.tenant_id = v_invite.tenant_id
         and (cardinality(v_invite.store_ids) = 0 or s.id = any (v_invite.store_ids))
         and s.ativo
       order by s.codigo
       limit 1
    );

    insert into public.profiles (user_id, tenant_id, nome, email, limite_desconto, ultima_store_id)
    values (new.id, v_invite.tenant_id, coalesce(v_invite.nome, v_nome), new.email,
            v_invite.limite_desconto, v_store_id)
    returning id into v_profile_id;

    insert into public.user_stores (profile_id, store_id, is_padrao)
    select v_profile_id, s.id, s.id = v_store_id
      from public.stores s
     where s.tenant_id = v_invite.tenant_id
       and (cardinality(v_invite.store_ids) = 0 or s.id = any (v_invite.store_ids))
       and s.ativo;

    insert into public.user_permission_profiles (profile_id, permission_profile_id)
    select v_profile_id, pp.id
      from public.permission_profiles pp
     where pp.tenant_id = v_invite.tenant_id
       and pp.id = any (v_invite.permission_profile_ids)
       and pp.ativo
       and not pp.is_owner;

    update public.user_invites set aceito_em = now() where id = v_invite.id;

    return new;
  end if;

  -- Caminho 2: cadastro de uma ótica nova.
  v_nome_rede := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_rede', '')), '');
  v_nome_loja := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_loja', '')), '');
  v_nome_rede := coalesce(v_nome_rede, 'Ótica ' || v_nome);
  v_nome_loja := coalesce(v_nome_loja, v_nome_rede);

  insert into public.tenants (nome, slug)
  values (v_nome_rede, public.gerar_slug_tenant(v_nome_rede))
  returning id into v_tenant_id;

  insert into public.stores (tenant_id, codigo, nome_fantasia)
  values (v_tenant_id, 1, v_nome_loja)
  returning id into v_store_id;

  insert into public.profiles (user_id, tenant_id, nome, email, limite_desconto, ultima_store_id)
  values (new.id, v_tenant_id, v_nome, new.email, 100, v_store_id)
  returning id into v_profile_id;

  insert into public.user_stores (profile_id, store_id, is_padrao)
  values (v_profile_id, v_store_id, true);

  insert into public.permission_profiles (tenant_id, nome, descricao, is_owner)
  values (v_tenant_id, 'Proprietário', 'Acesso total à rede. Não pode ser removido.', true)
  returning id into v_owner_id;

  insert into public.user_permission_profiles (profile_id, permission_profile_id)
  values (v_profile_id, v_owner_id);

  perform public.criar_modelos_padrao(v_tenant_id);
  perform public.semear_cadastros_padrao(v_tenant_id);

  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922090900_visio_05c_contadores.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 05c · Numeração sequencial por rede e por filial
-- =============================================================================
-- Cliente, orçamento, venda e O.S. precisam de número legível — "O.S. 1042", não
-- um UUID. E o número é por rede ou por filial, não global: a loja 2 tem a sua
-- venda nº 1.
--
-- Por que não uma sequence do Postgres por escopo: seriam centenas de objetos
-- criados em tempo de execução, um por rede × escopo, impossíveis de versionar
-- em migration. Uma tabela de contadores com UPSERT atômico resolve, e o
-- `returning` do UPDATE serializa os concorrentes na própria linha.
-- =============================================================================

create table public.contadores (
  id        uuid    primary key default gen_random_uuid(),
  tenant_id uuid    not null references public.tenants (id) on delete cascade,
  -- NULL = contador da rede inteira. Preenchido = contador daquela filial.
  store_id  uuid    references public.stores (id) on delete cascade,
  escopo    text    not null,
  valor     bigint  not null default 0 check (valor >= 0)
);

comment on table public.contadores is
  'Contadores de numeração legível. Incrementados só por proximo_numero(), que serializa na linha.';

-- Chave natural em dois índices parciais, não numa PK composta: o Postgres não
-- aceita NULL em coluna de chave primária, e o contador de rede é justamente o
-- que tem store_id nulo. Os índices parciais garantem a unicidade nos dois
-- casos e ainda dão o alvo que o ON CONFLICT precisa.
create unique index contadores_rede_unico
  on public.contadores (tenant_id, escopo)
  where store_id is null;
create unique index contadores_filial_unico
  on public.contadores (tenant_id, escopo, store_id)
  where store_id is not null;

create or replace function public.proximo_numero(
  p_tenant_id uuid,
  p_escopo    text,
  p_store_id  uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor bigint;
begin
  if p_tenant_id is null then
    raise exception 'proximo_numero exige tenant_id';
  end if;

  -- O UPDATE ... RETURNING trava a linha: dois caixas emitindo venda ao mesmo
  -- tempo pegam números diferentes, sem buraco e sem repetição.
  if p_store_id is null then
    update public.contadores
       set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id is null
    returning valor into v_valor;
  else
    update public.contadores
       set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id = p_store_id
    returning valor into v_valor;
  end if;

  if v_valor is not null then
    return v_valor;
  end if;

  -- Primeiro número deste escopo. O ON CONFLICT cobre a corrida entre dois
  -- inserts simultâneos do mesmo contador.
  insert into public.contadores (tenant_id, store_id, escopo, valor)
  values (p_tenant_id, p_store_id, p_escopo, 1)
  on conflict do nothing
  returning valor into v_valor;

  if v_valor is not null then
    return v_valor;
  end if;

  -- Alguém criou a linha entre o UPDATE e o INSERT: tenta de novo.
  if p_store_id is null then
    update public.contadores set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id is null
    returning valor into v_valor;
  else
    update public.contadores set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id = p_store_id
    returning valor into v_valor;
  end if;

  return v_valor;
end;
$$;

comment on function public.proximo_numero(uuid, text, uuid) is
  'Próximo número de um escopo (cliente, venda, os…), por rede ou por filial. Atômico.';

-- Contadores não são editáveis pelo app: quem mexe é a função, que roda como
-- dono. A leitura é liberada ao escopo da rede para a tela poder mostrar
-- "próximo número".
alter table public.contadores enable row level security;

create policy contadores_select on public.contadores
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

grant select on public.contadores to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922091000_visio_06_clientes.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 06 · Clientes, contatos e núcleo familiar
-- =============================================================================
-- O cliente é cadastrado UMA VEZ na rede, com a filial de origem registrada.
-- Contato é multi-valorado — cada telefone tem opt-in próprio de WhatsApp e SMS,
-- porque consentimento é por canal, não por pessoa.
-- =============================================================================

create type public.tipo_pessoa as enum ('pf', 'pj');
create type public.sexo_cliente as enum ('feminino', 'masculino', 'outro', 'nao_informado');
create type public.tipo_telefone as enum ('movel', 'fixo', 'comercial', 'recado');

-- -----------------------------------------------------------------------------
-- clientes
-- -----------------------------------------------------------------------------
create table public.clientes (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  -- Filial em que o cliente foi cadastrado. Não restringe acesso (o cliente é
  -- da rede), mas responde "de qual loja veio" em relatório e comissão.
  store_id            uuid        references public.stores (id) on delete set null,
  codigo              bigint      not null,

  tipo                public.tipo_pessoa not null default 'pf',
  nome                text        not null,
  apelido             text,
  cpf_cnpj            text,
  rg                  text,
  data_nascimento     date,
  sexo                public.sexo_cliente not null default 'nao_informado',
  estado_civil        text,

  -- Dados fiscais de pessoa jurídica
  razao_social        text,
  inscricao_estadual  text,
  inscricao_municipal text,
  suframa             text,
  contribuinte_icms   boolean     not null default false,

  -- Endereço
  cep                 text,
  endereco            text,
  numero              text,
  complemento         text,
  bairro              text,
  cidade              text,
  uf                  char(2),
  pais                text        not null default 'Brasil',

  -- Família e perfil social. `responsavel_id` aponta para outro cliente: é como
  -- um menor de idade ou um dependente fica ligado a quem responde por ele.
  responsavel_id      uuid        references public.clientes (id) on delete set null,
  grau_parentesco     text,
  nome_pai            text,
  nome_mae            text,
  profissao_id        uuid        references public.profissoes (id) on delete set null,
  escolaridade        text,
  renda_familiar      numeric(12, 2) check (renda_familiar is null or renda_familiar >= 0),

  -- Comercial
  origem_id           uuid        references public.origens_cliente (id) on delete set null,
  convenio_id         uuid        references public.convenios (id) on delete set null,
  vendedor_preferencia_id uuid    references public.funcionarios (id) on delete set null,
  codigo_externo      text,
  desconto_padrao     numeric(5, 2) not null default 0
                        check (desconto_padrao >= 0 and desconto_padrao <= 100),
  acrescimo_padrao    numeric(5, 2) not null default 0
                        check (acrescimo_padrao >= 0 and acrescimo_padrao <= 100),
  limite_crediario    numeric(12, 2) check (limite_crediario is null or limite_crediario >= 0),

  -- LGPD: consentimento é registrado com data e origem, não presumido. Sem
  -- data, nenhuma régua de marketing dispara para este cliente.
  consentimento_contato_em timestamptz,
  consentimento_origem     text,

  observacoes         text,
  -- Mantido por trigger a partir de cliente_negativacoes: é o que a listagem
  -- filtra e o que bloqueia crediário, então precisa ser barato de consultar.
  negativado          boolean     not null default false,
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint clientes_nome_nao_vazio check (length(btrim(nome)) > 0),
  -- Pessoa jurídica precisa de razão social; pessoa física, não.
  constraint clientes_pj_razao_social check (tipo <> 'pj' or razao_social is not null),
  constraint clientes_responsavel_nao_circular check (responsavel_id is null or responsavel_id <> id)
);

create unique index clientes_codigo_unico on public.clientes (tenant_id, codigo);

-- CPF/CNPJ único por rede, quando informado. Muita ótica cadastra cliente sem
-- documento (a venda à vista não exige), então o índice é parcial.
create unique index clientes_documento_unico
  on public.clientes (tenant_id, public.somente_digitos(cpf_cnpj))
  where cpf_cnpj is not null and btrim(cpf_cnpj) <> '';

-- Busca por nome sem acento e por parte do nome: é como o balcão procura.
create index clientes_nome_trgm_idx
  on public.clientes using gin (public.normalizar_texto(nome) extensions.gin_trgm_ops);
create index clientes_aniversario_idx
  on public.clientes (tenant_id, extract(month from data_nascimento), extract(day from data_nascimento))
  where data_nascimento is not null and ativo;
create index clientes_store_idx     on public.clientes (tenant_id, store_id) where ativo;
create index clientes_negativados_idx on public.clientes (tenant_id) where negativado and ativo;
create index clientes_responsavel_idx on public.clientes (responsavel_id) where responsavel_id is not null;

comment on column public.clientes.negativado is
  'Derivado de cliente_negativacoes por trigger. Informação de crédito do consumidor: nunca exibir ao próprio cliente nem enviar em mensagem.';
comment on column public.clientes.consentimento_contato_em is
  'Quando o cliente consentiu receber contato. Sem isto, nenhuma régua de marketing dispara.';

-- Numeração automática do código legível.
create or replace function public.clientes_definir_codigo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null then
    new.codigo := public.proximo_numero(new.tenant_id, 'cliente');
  end if;
  return new;
end;
$$;

-- BEFORE INSERT roda antes da checagem de NOT NULL, então `codigo` pode seguir
-- obrigatório na coluna e ainda ser preenchido pelo trigger.
create trigger clientes_codigo
  before insert on public.clientes
  for each row execute function public.clientes_definir_codigo();

-- -----------------------------------------------------------------------------
-- cliente_telefones
-- -----------------------------------------------------------------------------
create table public.cliente_telefones (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants (id) on delete cascade,
  cliente_id      uuid        not null references public.clientes (id) on delete cascade,
  ddi             text        not null default '55',
  numero          text        not null,
  tipo            public.tipo_telefone not null default 'movel',
  -- Opt-in por canal. Um cliente pode aceitar WhatsApp e recusar SMS; tratar
  -- isso como uma única permissão é o que gera reclamação de spam.
  aceita_whatsapp boolean     not null default false,
  aceita_sms      boolean     not null default false,
  aceita_ligacao  boolean     not null default true,
  principal       boolean     not null default false,
  observacao      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint cliente_telefones_numero_valido
    check (length(public.somente_digitos(numero)) between 8 and 15)
);

create index cliente_telefones_cliente_idx on public.cliente_telefones (cliente_id);
create unique index cliente_telefones_um_principal
  on public.cliente_telefones (cliente_id) where principal;
-- Mesmo número duas vezes no mesmo cliente é erro de digitação.
create unique index cliente_telefones_numero_unico
  on public.cliente_telefones (cliente_id, ddi, public.somente_digitos(numero));
-- Busca reversa: quem é o dono deste número? (atendimento por WhatsApp)
create index cliente_telefones_busca_idx
  on public.cliente_telefones (tenant_id, public.somente_digitos(numero));

-- -----------------------------------------------------------------------------
-- cliente_emails
-- -----------------------------------------------------------------------------
create table public.cliente_emails (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  cliente_id     uuid        not null references public.clientes (id) on delete cascade,
  email          text        not null,
  aceita_contato boolean     not null default true,
  principal      boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cliente_emails_formato check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index cliente_emails_cliente_idx on public.cliente_emails (cliente_id);
create unique index cliente_emails_um_principal
  on public.cliente_emails (cliente_id) where principal;
create unique index cliente_emails_unico
  on public.cliente_emails (cliente_id, lower(email));

-- -----------------------------------------------------------------------------
-- cliente_referencias — referências pessoais, usadas na análise de crediário
-- -----------------------------------------------------------------------------
create table public.cliente_referencias (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  cliente_id uuid        not null references public.clientes (id) on delete cascade,
  nome       text        not null,
  telefone   text,
  relacao    text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cliente_referencias_cliente_idx on public.cliente_referencias (cliente_id);

-- -----------------------------------------------------------------------------
-- nucleos_familiares — o CRM familiar
-- -----------------------------------------------------------------------------
-- Duas fontes independentes apontaram para isto: o cadastro já pedia responsável
-- legal e grau de parentesco, e a pesquisa de mercado levantou a campanha
-- familiar. O núcleo é entidade própria porque a pergunta interessante é
-- "quantos da casa têm receita vencendo neste trimestre", e isso não se responde
-- com um campo no cliente.
create table public.nucleos_familiares (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  nome        text        not null,
  titular_id  uuid        references public.clientes (id) on delete set null,
  observacoes text,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index nucleos_familiares_tenant_idx on public.nucleos_familiares (tenant_id) where ativo;

create table public.cliente_nucleo (
  nucleo_id       uuid        not null references public.nucleos_familiares (id) on delete cascade,
  cliente_id      uuid        not null references public.clientes (id) on delete cascade,
  tenant_id       uuid        not null references public.tenants (id) on delete cascade,
  grau_parentesco text,
  created_at      timestamptz not null default now(),
  primary key (nucleo_id, cliente_id)
);

-- Um cliente em dois núcleos faria a campanha familiar contá-lo duas vezes.
create unique index cliente_nucleo_um_por_cliente on public.cliente_nucleo (cliente_id);

-- -----------------------------------------------------------------------------
-- cliente_negativacoes
-- -----------------------------------------------------------------------------
create table public.cliente_negativacoes (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  cliente_id     uuid        not null references public.clientes (id) on delete cascade,
  motivo         text        not null,
  valor          numeric(12, 2) check (valor is null or valor >= 0),
  data_inclusao  date        not null default current_date,
  data_baixa     date,
  incluido_por   uuid        references public.profiles (id) on delete set null,
  baixado_por    uuid        references public.profiles (id) on delete set null,
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cliente_negativacoes_baixa_posterior
    check (data_baixa is null or data_baixa >= data_inclusao)
);

create index cliente_negativacoes_cliente_idx on public.cliente_negativacoes (cliente_id);
-- Uma negativação aberta por cliente basta; a segunda seria ruído no quadro.
create unique index cliente_negativacoes_uma_aberta
  on public.cliente_negativacoes (cliente_id) where data_baixa is null;

-- Mantém clientes.negativado em sincronia com as negativações abertas.
create or replace function public.sincronizar_negativado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := coalesce(new.cliente_id, old.cliente_id);
begin
  update public.clientes c
     set negativado = exists (
       select 1 from public.cliente_negativacoes n
        where n.cliente_id = v_cliente and n.data_baixa is null
     )
   where c.id = v_cliente;
  return coalesce(new, old);
end;
$$;

create trigger cliente_negativacoes_sincroniza
  after insert or update or delete on public.cliente_negativacoes
  for each row execute function public.sincronizar_negativado();

-- -----------------------------------------------------------------------------
-- cliente_metricas — agregados que a listagem mostra
-- -----------------------------------------------------------------------------
-- A listagem de clientes mostra contagem de vendas, O.S., receitas, crediários e
-- parcelas em atraso. Calcular isso em cada abertura de tela, com cinco
-- subconsultas por linha, não escala. Estas colunas são mantidas por trigger
-- pelas migrations que criam venda, O.S., receita e crediário.
create table public.cliente_metricas (
  cliente_id          uuid        primary key references public.clientes (id) on delete cascade,
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  vendas_qtd          integer     not null default 0,
  vendas_valor        numeric(14, 2) not null default 0,
  ticket_medio        numeric(14, 2) not null default 0,
  primeira_compra_em  date,
  ultima_compra_em    date,
  os_qtd              integer     not null default 0,
  receitas_qtd        integer     not null default 0,
  receita_mais_recente date,
  crediarios_qtd      integer     not null default 0,
  parcelas_atraso_qtd integer     not null default 0,
  parcelas_atraso_valor numeric(14, 2) not null default 0,
  atendimentos_qtd    integer     not null default 0,
  atualizado_em       timestamptz not null default now()
);

create index cliente_metricas_atraso_idx
  on public.cliente_metricas (tenant_id) where parcelas_atraso_qtd > 0;

-- Toda linha de cliente tem uma de métricas, criada junto: evita LEFT JOIN e
-- coalesce em toda consulta de listagem.
create or replace function public.criar_metricas_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cliente_metricas (cliente_id, tenant_id)
  values (new.id, new.tenant_id)
  on conflict (cliente_id) do nothing;
  return new;
end;
$$;

create trigger clientes_cria_metricas
  after insert on public.clientes
  for each row execute function public.criar_metricas_cliente();

-- -----------------------------------------------------------------------------
-- RLS e triggers
-- -----------------------------------------------------------------------------
do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'clientes', 'cliente_telefones', 'cliente_emails', 'cliente_referencias',
    'nucleos_familiares', 'cliente_nucleo'
  ] loop
    perform public.aplicar_rls_padrao(
      v_tabela, 'tenant', null,
      'clientes.incluir', 'clientes.alterar', 'clientes.excluir'
    );
    perform public.aplicar_triggers_padrao(v_tabela);
  end loop;

  -- Negativação é informação de crédito do consumidor: leitura também exige
  -- permissão, e a inclusão tem chave própria.
  perform public.aplicar_rls_padrao(
    'cliente_negativacoes', 'tenant',
    'clientes.ver_credito', 'clientes.negativar', 'clientes.negativar', 'clientes.negativar'
  );
  perform public.aplicar_triggers_padrao('cliente_negativacoes');

  perform public.aplicar_rls_padrao('cliente_nucleo', 'tenant', null,
    'clientes.gerenciar_nucleo_familiar',
    'clientes.gerenciar_nucleo_familiar',
    'clientes.gerenciar_nucleo_familiar');
end $$;

-- Métricas são derivadas: o app lê, quem escreve são os triggers de domínio.
alter table public.cliente_metricas enable row level security;

create policy cliente_metricas_select on public.cliente_metricas
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

grant select on public.cliente_metricas to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922091100_visio_07_receitas.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 07 · Receitas ópticas (prescrições)
-- =============================================================================
-- A receita é entidade de primeira classe, não um campo no cliente. É ela que
-- dispara o recall de recompra (receita vencida), que alimenta o Livro de
-- Receitas e que o motor óptico consulta para vetar lente incompatível.
--
-- Os graus ficam em colunas por olho, não numa tabela filha. São exatamente dois
-- olhos, para sempre, e toda consulta útil precisa dos dois ao mesmo tempo —
-- normalizar aqui só acrescentaria um join a cada leitura.
-- =============================================================================

create type public.tipo_receita as enum ('oculos', 'lente_contato');

create table public.receitas (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants (id) on delete cascade,
  store_id      uuid        references public.stores (id) on delete set null,
  cliente_id    uuid        not null references public.clientes (id) on delete cascade,
  codigo        bigint      not null,

  tipo          public.tipo_receita not null default 'oculos',
  medico_id     uuid        references public.medicos (id) on delete set null,
  -- Nome livre para quando o prescritor não está cadastrado — acontece com
  -- receita trazida de fora, e exigir cadastro antes travaria o atendimento.
  medico_nome   text,
  data_receita  date        not null default current_date,
  validade      date        not null,

  -- Olho direito
  od_esferico   numeric(5, 2),
  od_cilindrico numeric(5, 2),
  od_eixo       smallint    check (od_eixo is null or od_eixo between 0 and 180),
  od_adicao     numeric(4, 2),
  od_dnp        numeric(5, 2) check (od_dnp is null or od_dnp between 20 and 45),
  od_altura     numeric(5, 2) check (od_altura is null or od_altura between 10 and 40),
  od_prisma     numeric(4, 2),
  od_base       text,
  od_curva_base numeric(4, 2),
  od_diametro   numeric(4, 2),

  -- Olho esquerdo
  oe_esferico   numeric(5, 2),
  oe_cilindrico numeric(5, 2),
  oe_eixo       smallint    check (oe_eixo is null or oe_eixo between 0 and 180),
  oe_adicao     numeric(4, 2),
  oe_dnp        numeric(5, 2) check (oe_dnp is null or oe_dnp between 20 and 45),
  oe_altura     numeric(5, 2) check (oe_altura is null or oe_altura between 10 and 40),
  oe_prisma     numeric(4, 2),
  oe_base       text,
  oe_curva_base numeric(4, 2),
  oe_diametro   numeric(4, 2),

  -- Derivada: a regra de segundo par ("multifocal sem solar com grau") e o veto
  -- do motor óptico consultam isto o tempo todo. Coluna gerada não desatualiza.
  multifocal    boolean     generated always as (
                  coalesce(od_adicao, 0) <> 0 or coalesce(oe_adicao, 0) <> 0
                ) stored,

  observacoes   text,
  arquivo_url   text,
  criado_por    uuid        references public.profiles (id) on delete set null,
  ativo         boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint receitas_validade_posterior check (validade >= data_receita),
  constraint receitas_prescritor_informado
    check (medico_id is not null or nullif(btrim(coalesce(medico_nome, '')), '') is not null),

  -- A grade real de lentes anda de 0,25 em 0,25 dioptria. Aceitar 1,37 deixa
  -- entrar uma receita que nenhum laboratório monta — e o erro só aparece na
  -- O.S. travada, dias depois.
  constraint receitas_od_esferico_grade   check (od_esferico   is null or (od_esferico   * 100)::integer % 25 = 0),
  constraint receitas_oe_esferico_grade   check (oe_esferico   is null or (oe_esferico   * 100)::integer % 25 = 0),
  constraint receitas_od_cilindrico_grade check (od_cilindrico is null or (od_cilindrico * 100)::integer % 25 = 0),
  constraint receitas_oe_cilindrico_grade check (oe_cilindrico is null or (oe_cilindrico * 100)::integer % 25 = 0),
  constraint receitas_od_adicao_grade     check (od_adicao     is null or ((od_adicao * 100)::integer % 25 = 0 and od_adicao between 0 and 4)),
  constraint receitas_oe_adicao_grade     check (oe_adicao     is null or ((oe_adicao * 100)::integer % 25 = 0 and oe_adicao between 0 and 4)),
  constraint receitas_od_faixa            check (od_esferico   is null or od_esferico   between -30 and 30),
  constraint receitas_oe_faixa            check (oe_esferico   is null or oe_esferico   between -30 and 30),

  -- Cilindro sem eixo é receita incompleta: a lente não pode ser montada.
  constraint receitas_od_eixo_obrigatorio
    check (coalesce(od_cilindrico, 0) = 0 or od_eixo is not null),
  constraint receitas_oe_eixo_obrigatorio
    check (coalesce(oe_cilindrico, 0) = 0 or oe_eixo is not null),

  -- Curva base e diâmetro são de lente de contato; DNP e altura, de óculos.
  constraint receitas_lc_sem_dnp
    check (tipo <> 'lente_contato' or (od_dnp is null and oe_dnp is null))
);

create unique index receitas_codigo_unico on public.receitas (tenant_id, codigo);
create index receitas_cliente_idx on public.receitas (cliente_id, data_receita desc);
-- O índice que sustenta o recall: receitas vencidas, por rede, em ordem de
-- vencimento. É a consulta mais repetida da camada de inteligência.
create index receitas_validade_idx on public.receitas (tenant_id, validade) where ativo;
create index receitas_medico_idx on public.receitas (medico_id) where medico_id is not null;
create index receitas_multifocal_idx on public.receitas (tenant_id) where multifocal and ativo;

comment on table public.receitas is
  'Prescrição óptica. Base do Livro de Receitas, do recall por receita vencida e do veto de compatibilidade de lente.';
comment on column public.receitas.multifocal is
  'Gerada: verdadeira quando há adição em algum olho. Usada pela regra de segundo par e pelo motor óptico.';

-- Validade padrão de um ano a partir da data da receita, quando não informada.
create or replace function public.receitas_preencher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null then
    new.codigo := public.proximo_numero(new.tenant_id, 'receita');
  end if;
  if new.validade is null then
    new.validade := new.data_receita + interval '1 year';
  end if;
  return new;
end;
$$;

-- BEFORE INSERT roda antes da checagem de NOT NULL, então `codigo` e `validade`
-- seguem obrigatórios na coluna e ainda são preenchidos aqui. Deixá-los
-- anuláveis "por garantia" propagaria um `| null` por todo o TypeScript, em
-- campos que na prática nunca são nulos.
create trigger receitas_preencher_trg
  before insert on public.receitas
  for each row execute function public.receitas_preencher();

-- -----------------------------------------------------------------------------
-- receita_historico — a receita é documento clínico; alteração fica registrada
-- -----------------------------------------------------------------------------
-- A trilha genérica de auditoria já guarda o diff, mas aqui o histórico é parte
-- do produto: o Livro de Receitas precisa mostrar a versão vigente em uma data.
create table public.receita_historico (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants (id) on delete cascade,
  receita_id   uuid        not null references public.receitas (id) on delete cascade,
  versao       integer     not null,
  dados        jsonb       not null,
  alterado_por uuid        references public.profiles (id) on delete set null,
  alterado_em  timestamptz not null default now()
);

create unique index receita_historico_versao on public.receita_historico (receita_id, versao);

create or replace function public.receitas_versionar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao integer;
begin
  select coalesce(max(versao), 0) + 1 into v_versao
    from public.receita_historico where receita_id = old.id;

  insert into public.receita_historico (tenant_id, receita_id, versao, dados, alterado_por)
  values (old.tenant_id, old.id, v_versao, to_jsonb(old), public.current_profile_id());

  return new;
end;
$$;

create trigger receitas_versionar_trg
  before update on public.receitas
  for each row execute function public.receitas_versionar();

-- -----------------------------------------------------------------------------
-- Métricas do cliente
-- -----------------------------------------------------------------------------
create or replace function public.atualizar_metricas_receita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := coalesce(new.cliente_id, old.cliente_id);
begin
  update public.cliente_metricas m
     set receitas_qtd = (
           select count(*) from public.receitas r
            where r.cliente_id = v_cliente and r.ativo
         ),
         receita_mais_recente = (
           select max(r.data_receita) from public.receitas r
            where r.cliente_id = v_cliente and r.ativo
         ),
         atualizado_em = now()
   where m.cliente_id = v_cliente;

  return coalesce(new, old);
end;
$$;

create trigger receitas_metricas
  after insert or update or delete on public.receitas
  for each row execute function public.atualizar_metricas_receita();

-- -----------------------------------------------------------------------------
-- Visões de trabalho
-- -----------------------------------------------------------------------------
-- Receitas vencidas elegíveis para recall. "Elegível" tem regra: o cliente está
-- ativo, não está negativado, consentiu contato e tem pelo menos um canal aberto.
-- Sem esse filtro, a fila de recall inclui gente para quem não se pode escrever.
create view public.vw_receitas_vencidas
with (security_invoker = true)
as
select
  r.id                         as receita_id,
  r.tenant_id,
  r.store_id,
  r.cliente_id,
  r.codigo,
  r.tipo,
  r.data_receita,
  r.validade,
  r.multifocal,
  current_date - r.validade    as dias_vencida,
  c.nome                       as cliente_nome,
  c.negativado,
  c.consentimento_contato_em is not null as consentiu_contato,
  exists (
    select 1 from public.cliente_telefones t
     where t.cliente_id = c.id and (t.aceita_whatsapp or t.aceita_sms)
  )                            as tem_canal_aberto,
  m.ultima_compra_em,
  m.ticket_medio
from public.receitas r
join public.clientes c        on c.id = r.cliente_id
left join public.cliente_metricas m on m.cliente_id = c.id
where r.ativo
  and c.ativo
  and r.validade < current_date
  -- Só a receita mais recente do cliente conta: a de três anos atrás já foi
  -- substituída, e contar as duas inflaria a fila e a oportunidade em aberto.
  and r.data_receita = (
    select max(r2.data_receita) from public.receitas r2
     where r2.cliente_id = r.cliente_id and r2.ativo and r2.tipo = r.tipo
  );

comment on view public.vw_receitas_vencidas is
  'Receitas vencidas com os sinais de elegibilidade para recall. Só a mais recente por cliente e tipo.';

-- -----------------------------------------------------------------------------
-- RLS e triggers
-- -----------------------------------------------------------------------------
do $$
begin
  perform public.aplicar_rls_padrao('receitas', 'tenant', null,
    'receitas.incluir', 'receitas.alterar', 'receitas.excluir');
  perform public.aplicar_triggers_padrao('receitas');
end $$;

-- Histórico é somente leitura para o app: quem escreve é o trigger.
alter table public.receita_historico enable row level security;

create policy receita_historico_select on public.receita_historico
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

grant select on public.receita_historico to authenticated;
grant select on public.vw_receitas_vencidas to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 20260922091200_visio_07b_revogar_execucao.sql
-- ─────────────────────────────────────────────────────────────────────────
-- =============================================================================
-- VISIO · 07b · Quem pode executar o quê
-- =============================================================================
-- O Postgres concede EXECUTE a PUBLIC em toda função nova. Combinado com
-- SECURITY DEFINER — que a maioria das nossas precisa ser, para não recursar no
-- RLS — isso é escalada de privilégio: um usuário autenticado poderia chamar
-- `aplicar_rls_padrao` por RPC e reescrever as políticas da própria rede, ou
-- `semear_cadastros_padrao` passando o id de outra rede.
--
-- A correção é explícita e em um lugar só: revoga tudo de PUBLIC e concede
-- apenas o que o aplicativo legitimamente chama. A suíte de testes confere que
-- nenhuma função SECURITY DEFINER fora da lista fique executável.
-- =============================================================================

do $$
declare
  r record;
begin
  -- Ponto de partida: nada de PUBLIC em função nenhuma do schema public.
  for r in
    select p.oid::regprocedure as assinatura
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public', r.assinatura);
    execute format('revoke all on function %s from anon, authenticated', r.assinatura);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- O que o aplicativo pode chamar
-- -----------------------------------------------------------------------------
-- Consultas de contexto: o cliente precisa saber quem é e o que pode.
grant execute on function public.current_profile_id()          to authenticated;
grant execute on function public.current_tenant_id()           to authenticated;
grant execute on function public.current_store_ids()           to authenticated;
grant execute on function public.has_permission(text)          to authenticated;
grant execute on function public.current_permissions()         to authenticated;

-- Funções puras, usadas em índice, view e consulta do dia a dia. Não leem nem
-- escrevem dado de ninguém.
grant execute on function public.normalizar_texto(text)        to anon, authenticated;
grant execute on function public.somente_digitos(text)         to anon, authenticated;
grant execute on function public.calcular_pascoa(integer)      to anon, authenticated;

-- -----------------------------------------------------------------------------
-- O que fica fechado, e por quê
-- -----------------------------------------------------------------------------
--   aplicar_rls_padrao / aplicar_triggers_padrao
--     alteram política e trigger — só migration chama.
--   semear_cadastros_padrao / semear_feriados_nacionais / criar_modelos_padrao
--     escrevem em nome de uma rede recebida por parâmetro; chamadas pelo
--     gatilho de cadastro, que roda como dono.
--   gerar_slug_tenant
--     idem, usada dentro do gatilho.
--   proximo_numero
--     incrementa contador. Se o aplicativo pudesse chamá-la solta, geraria
--     buracos na numeração de venda e O.S. só de alguém abrir uma tela.
--   set_updated_at / audit_trigger / guard_* / sincronizar_* / *_definir_codigo
--     são funções de trigger; ninguém chama direto.
--
-- Todas seguem funcionando: rodam como dono do schema, a partir de trigger ou
-- de outra função SECURITY DEFINER.

comment on function public.proximo_numero(uuid, text, uuid) is
  'Próximo número de um escopo, por rede ou filial. Atômico. Sem EXECUTE para o app: só trigger chama.';


commit;

-- =============================================================================
-- Conferência rápida — rode depois, numa query separada:
--
--   select count(*) from public.permissions;        -- deve dar 268
--   select count(*) from pg_policies
--    where schemaname = 'public';                   -- deve dar 158
--   select count(*) from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r'
--      and not c.relrowsecurity;                    -- deve dar 0 (nenhuma tabela sem RLS)
-- =============================================================================
