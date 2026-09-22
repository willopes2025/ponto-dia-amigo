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
