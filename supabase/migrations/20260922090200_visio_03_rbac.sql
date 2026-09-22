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
  using (id = (select public.current_tenant_id()));

create policy tenants_update on public.tenants
  for update to authenticated
  using (id = (select public.current_tenant_id()) and (select public.has_permission('configuracoes.dados_empresa')))
  with check (id = (select public.current_tenant_id()));

-- stores: leitura de todas as filiais da rede (o seletor e os cadastros
-- precisam listar), escrita só com permissão de cadastro de filial.
create policy stores_select on public.stores
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy stores_insert on public.stores
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id()) and (select public.has_permission('cadastros.filiais')));

create policy stores_update on public.stores
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission('cadastros.filiais')))
  with check (tenant_id = (select public.current_tenant_id()));

create policy stores_delete on public.stores
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission('cadastros.filiais')));

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id()) and (select public.has_permission('usuarios.incluir')));

-- Cada um edita o próprio cadastro; editar o de outro exige permissão.
-- Quais colunas podem mudar é decidido por guard_profiles_update().
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (user_id = auth.uid() or (select public.has_permission('usuarios.alterar')))
  )
  with check (tenant_id = (select public.current_tenant_id()));

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission('usuarios.excluir')));

-- user_stores
create policy user_stores_select on public.user_stores
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = user_stores.profile_id
         and p.tenant_id = (select public.current_tenant_id())
    )
  );

create policy user_stores_write on public.user_stores
  for all to authenticated
  using (
    (select public.has_permission('usuarios.alterar'))
    and exists (
      select 1 from public.profiles p
       where p.id = user_stores.profile_id
         and p.tenant_id = (select public.current_tenant_id())
    )
  )
  with check (
    (select public.has_permission('usuarios.alterar'))
    and exists (
      select 1 from public.profiles p
       where p.id = user_stores.profile_id
         and p.tenant_id = (select public.current_tenant_id())
    )
    and exists (
      select 1 from public.stores s
       where s.id = user_stores.store_id
         and s.tenant_id = (select public.current_tenant_id())
    )
  );

-- permission_profiles
create policy permission_profiles_select on public.permission_profiles
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

create policy permission_profiles_write on public.permission_profiles
  for all to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission('permissoes.gerenciar_modelos'))
    -- O perfil de proprietário não é editável por ninguém: é a trava que impede
    -- a rede de se trancar fora do próprio sistema.
    and not is_owner
  )
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission('permissoes.gerenciar_modelos'))
    and not is_owner
  );

create policy ppp_select on public.permission_profile_permissions
  for select to authenticated
  using (
    exists (
      select 1 from public.permission_profiles pp
       where pp.id = permission_profile_permissions.permission_profile_id
         and pp.tenant_id = (select public.current_tenant_id())
    )
  );

create policy ppp_write on public.permission_profile_permissions
  for all to authenticated
  using (
    (select public.has_permission('permissoes.gerenciar_modelos'))
    and exists (
      select 1 from public.permission_profiles pp
       where pp.id = permission_profile_permissions.permission_profile_id
         and pp.tenant_id = (select public.current_tenant_id())
         and not pp.is_owner
    )
  )
  with check (
    (select public.has_permission('permissoes.gerenciar_modelos'))
    and exists (
      select 1 from public.permission_profiles pp
       where pp.id = permission_profile_permissions.permission_profile_id
         and pp.tenant_id = (select public.current_tenant_id())
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
         and p.tenant_id = (select public.current_tenant_id())
    )
  );

create policy upp_write on public.user_permission_profiles
  for all to authenticated
  using (
    (select public.has_permission('permissoes.atribuir_modelos'))
    and exists (
      select 1 from public.profiles p
       where p.id = user_permission_profiles.profile_id
         and p.tenant_id = (select public.current_tenant_id())
    )
  )
  with check (
    (select public.has_permission('permissoes.atribuir_modelos'))
    and exists (
      select 1 from public.profiles p
       where p.id = user_permission_profiles.profile_id
         and p.tenant_id = (select public.current_tenant_id())
    )
    and exists (
      select 1 from public.permission_profiles pp
       where pp.id = user_permission_profiles.permission_profile_id
         and pp.tenant_id = (select public.current_tenant_id())
    )
  );

-- audit_log: leitura sensível — escopo + permissão. Ninguém escreve direto.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission('auditoria.consultar')));

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
