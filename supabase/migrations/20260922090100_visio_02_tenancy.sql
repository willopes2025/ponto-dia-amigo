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
