-- =============================================================================
-- Stub do schema `auth` do Supabase, só para validar as migrations localmente.
-- NÃO faz parte das migrations: o Supabase real já provê auth.users e auth.uid().
-- =============================================================================
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at         timestamptz default now()
);

-- auth.uid() do Supabase lê o claim `sub` do JWT em request.jwt.claims.
-- Aqui basta ler um GUC que os testes definem à mão.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Roles são globais ao cluster, não ao banco: só cria se faltar.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
end $$;

-- No Supabase real, anon/authenticated têm usage em `auth` e execute em auth.uid().
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select on auth.users to authenticated;
