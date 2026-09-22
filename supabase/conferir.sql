-- =============================================================================
-- VISIO — conferência pós-instalação
-- =============================================================================
-- Rode no SQL Editor do Supabase depois de aplicar schema-completo.sql.
-- Toda linha deve vir com "ok". Qualquer "FALHOU" diz o que esperar e o que veio.
--
-- O item mais importante é o gatilho em auth.users: é ele que transforma um
-- cadastro em rede + filial + proprietário + modelos de permissão. Se ele não
-- existir, o cadastro cria o usuário e não cria mais nada — e o sintoma aparece
-- só na tela, como sessão sem contexto.
-- =============================================================================

with conferencias as (
  select 1 as ordem, 'Tabelas criadas' as item, 46 as esperado,
         (select count(*) from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r')::bigint as obtido

  union all select 2, 'Permissões no catálogo', 268,
         (select count(*) from public.permissions)

  union all select 3, 'Políticas de RLS', 158,
         (select count(*) from pg_policies where schemaname = 'public')

  union all select 4, 'Tabelas SEM RLS (precisa ser zero)', 0,
         (select count(*) from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity)

  union all select 5, 'Políticas na forma lenta (precisa ser zero)', 0,
         (select count(*) from pg_policies p
           where p.schemaname = 'public'
             and (
               -- chamada de função sem (select ...) em volta
               (length(coalesce(p.qual,'') || coalesce(p.with_check,''))
                - length(replace(coalesce(p.qual,'') || coalesce(p.with_check,''), 'current_tenant_id(', '')))
               / length('current_tenant_id(')
               >
               (length(coalesce(p.qual,'') || coalesce(p.with_check,''))
                - length(replace(coalesce(p.qual,'') || coalesce(p.with_check,''), 'SELECT current_tenant_id(', '')))
               / length('SELECT current_tenant_id(')
             ))

  union all select 6, 'Gatilho de cadastro em auth.users', 1,
         (select count(*) from pg_trigger
           where tgname = 'on_auth_user_created' and not tgisinternal)

  union all select 7, 'Funções executáveis pelo app (contrato)', 8,
         (select count(*) from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f'
             and has_function_privilege('authenticated', p.oid, 'EXECUTE'))

  union all select 8, 'Redes cadastradas (zero antes do 1º cadastro)', 0,
         (select count(*) from public.tenants)
)
select
  case when obtido = esperado then 'ok' else 'FALHOU' end as situacao,
  item,
  esperado,
  obtido
from conferencias
order by ordem;
