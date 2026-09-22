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
  using (tenant_id = (select public.current_tenant_id()) and (select public.has_permission('usuarios.consultar')));

create policy user_invites_insert on public.user_invites
  for insert to authenticated
  with check (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission('usuarios.incluir'))
    -- As filiais do convite têm de ser da própria rede.
    and not exists (
      select 1 from unnest(store_ids) sid
       where sid not in (select id from public.stores where tenant_id = (select public.current_tenant_id()))
    )
    -- E os modelos também.
    and not exists (
      select 1 from unnest(permission_profile_ids) ppid
       where ppid not in (
         select id from public.permission_profiles
          where tenant_id = (select public.current_tenant_id()) and not is_owner
       )
    )
  );

create policy user_invites_delete on public.user_invites
  for delete to authenticated
  using (
    tenant_id = (select public.current_tenant_id())
    and (select public.has_permission('usuarios.incluir'))
    and aceito_em is null
  );

create trigger user_invites_audit
  after insert or update or delete on public.user_invites
  for each row execute function public.audit_trigger();

grant select, insert, delete on public.user_invites to authenticated;
