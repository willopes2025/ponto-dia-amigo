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

-- Reproduz a implementação real do Supabase.
--
-- As duas formas importam: o PostgREST 12 publica os claims como um JSON único
-- em `request.jwt.claims`, enquanto versões antigas — e os nossos testes, que
-- definem o GUC à mão — usam `request.jwt.claim.sub`. Ler só uma delas faz o
-- RLS devolver lista vazia sem erro nenhum, que é o pior modo de falhar.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
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
grant execute on function auth.uid()  to anon, authenticated;
grant execute on function auth.role() to anon, authenticated;
grant execute on function auth.jwt()  to anon, authenticated;
grant select on auth.users to authenticated;
