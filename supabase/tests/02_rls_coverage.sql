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
\warn '── Nenhuma função privilegiada exposta por RPC ────────────────────────'

-- O Postgres concede EXECUTE a PUBLIC em toda função nova. Numa função
-- SECURITY DEFINER isso é escalada de privilégio: o app poderia chamar por RPC
-- algo que roda como dono do schema. Esta lista é o contrato — função nova
-- exposta sem estar aqui reprova o teste.
create temp table _execucao_permitida (nome text primary key);
insert into _execucao_permitida (nome) values
  ('current_profile_id'), ('current_tenant_id'), ('current_store_ids'),
  ('has_permission'), ('current_permissions'),
  ('normalizar_texto'), ('somente_digitos'), ('calcular_pascoa');

do $$
declare
  v_indevidas text[];
begin
  select coalesce(array_agg(p.proname order by p.proname), '{}')
    into v_indevidas
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     and p.proname not in (select nome from _execucao_permitida);

  if array_length(v_indevidas, 1) > 0 then
    raise exception 'FALHOU: funções executáveis por authenticated fora do contrato: %',
      array_to_string(v_indevidas, ', ');
  end if;
  raise notice '  ok · só as % funções do contrato são executáveis pelo app',
    (select count(*) from _execucao_permitida);
end $$;

-- E o contrário: se uma função do contrato deixar de ser executável, o app
-- quebra em produção com "permission denied for function".
do $$
declare
  v_faltando text[];
begin
  select coalesce(array_agg(e.nome order by e.nome), '{}')
    into v_faltando
    from _execucao_permitida e
   where not exists (
     select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = e.nome
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
   );

  if array_length(v_faltando, 1) > 0 then
    raise exception 'FALHOU: o app precisa destas funções e perdeu o EXECUTE: %',
      array_to_string(v_faltando, ', ');
  end if;
  raise notice '  ok · todas as funções do contrato seguem executáveis';
end $$;

\warn ''
\warn '✓ cobertura de RLS em ordem'

\warn ''
\warn '── Contrato das tabelas de apoio ─────────────────────────────────────'

-- A tela genérica de cadastros escreve nome, ordem e ativo em qualquer tabela
-- de apoio, e o seletor de opções ordena por `ordem`. Uma tabela sem essas
-- colunas quebra a tela com "column does not exist" — erro que só aparece ao
-- abrir aquele cadastro específico.
do $$
declare
  v_faltando text[] := '{}';
  v_tabela   text;
  v_coluna   text;
begin
  foreach v_tabela in array array[
    'unidades', 'cores', 'tamanhos', 'formatos', 'generos', 'tipos_lente',
    'grifes', 'origens_cliente', 'tipos_documento', 'profissoes',
    'grupos', 'subgrupos', 'convenios', 'formas_pagamento', 'medicos',
    'responsaveis_tecnicos', 'situacoes_conta_receber', 'motivos_cancelamento',
    'feriados'
  ] loop
    foreach v_coluna in array array['nome', 'ordem', 'ativo'] loop
      if not exists (
        select 1 from pg_attribute a
          join pg_class c on c.oid = a.attrelid
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = v_tabela
           and a.attname = v_coluna and a.attnum > 0 and not a.attisdropped
      ) then
        v_faltando := v_faltando || format('%s.%s', v_tabela, v_coluna);
      end if;
    end loop;
  end loop;

  if array_length(v_faltando, 1) > 0 then
    raise exception 'FALHOU: tabelas de apoio sem as colunas do contrato: %',
      array_to_string(v_faltando, ', ');
  end if;
  raise notice '  ok · as 19 tabelas de apoio têm nome, ordem e ativo';
end $$;
