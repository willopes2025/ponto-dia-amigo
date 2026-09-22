-- =============================================================================
-- VISIO · cobertura de RLS
-- =============================================================================
-- Não testa um caso: varre o schema. Uma tabela que entrar em qualquer migration
-- futura sem RLS, ou com uma política que esqueça o recorte de rede, quebra este
-- teste no dia em que for criada — sem ninguém precisar lembrar de escrever um
-- teste para ela.
--
-- Vazamento entre redes é a única classe de defeito capaz de acabar com o
-- produto. Esta é a rede de proteção.
-- =============================================================================
\set ON_ERROR_STOP on
set client_min_messages to notice;
\o /dev/null

-- Tabelas legitimamente globais: catálogo de software, não dado de cliente.
create temp table _tabelas_globais (nome text primary key);
insert into _tabelas_globais (nome) values ('permissions');

\warn ''
\warn '── RLS habilitado em toda tabela de public ───────────────────────────'

do $$
declare
  v_faltando text[];
begin
  select coalesce(array_agg(c.relname order by c.relname), '{}')
    into v_faltando
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity;

  if array_length(v_faltando, 1) > 0 then
    raise exception 'FALHOU: tabelas sem RLS: %', array_to_string(v_faltando, ', ');
  end if;
  raise notice '  ok · todas as % tabelas de public têm RLS',
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r');
end $$;

\warn ''
\warn '── Toda tabela tem ao menos uma política ─────────────────────────────'

do $$
declare
  v_faltando text[];
begin
  select coalesce(array_agg(c.relname order by c.relname), '{}')
    into v_faltando
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not exists (select 1 from pg_policies p
                      where p.schemaname = 'public' and p.tablename = c.relname);

  if array_length(v_faltando, 1) > 0 then
    raise exception 'FALHOU: RLS ligado mas sem política nenhuma (tabela inacessível): %',
      array_to_string(v_faltando, ', ');
  end if;
  raise notice '  ok · nenhuma tabela ficou com RLS ligado e zero políticas';
end $$;

\warn ''
\warn '── Toda política recorta por rede ou por filial ──────────────────────'

do $$
declare
  r        record;
  v_erros  text[] := '{}';
  v_expr   text;
begin
  for r in
    select p.tablename, p.policyname, p.cmd,
           coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') as expr
      from pg_policies p
     where p.schemaname = 'public'
       and p.tablename not in (select nome from _tabelas_globais)
  loop
    v_expr := r.expr;
    -- A política precisa amarrar a linha à rede do usuário, direta ou
    -- indiretamente (via uma subconsulta que já faz esse recorte).
    if v_expr not like '%current_tenant_id()%'
       and v_expr not like '%current_store_ids()%'
       and v_expr not like '%current_profile_id()%'
    then
      v_erros := v_erros || format('%s.%s (%s)', r.tablename, r.policyname, r.cmd);
    end if;
  end loop;

  if array_length(v_erros, 1) > 0 then
    raise exception 'FALHOU: políticas sem recorte de rede/filial: %', array_to_string(v_erros, '; ');
  end if;
  raise notice '  ok · todas as % políticas recortam por rede ou filial',
    (select count(*) from pg_policies where schemaname = 'public');
end $$;

\warn ''
\warn '── Funções SECURITY DEFINER com search_path fixo ─────────────────────'

-- Função SECURITY DEFINER sem search_path fixo é escalada de privilégio:
-- um schema no caminho do chamador pode sequestrar a resolução de nomes.
do $$
declare
  v_faltando text[];
begin
  select coalesce(array_agg(p.proname order by p.proname), '{}')
    into v_faltando
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
        where cfg like 'search_path=%'
     );

  if array_length(v_faltando, 1) > 0 then
    raise exception 'FALHOU: SECURITY DEFINER sem search_path fixo: %', array_to_string(v_faltando, ', ');
  end if;
  raise notice '  ok · todas as funções SECURITY DEFINER fixam search_path';
end $$;

\warn ''
\warn '✓ cobertura de RLS em ordem'
