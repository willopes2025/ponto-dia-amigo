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
