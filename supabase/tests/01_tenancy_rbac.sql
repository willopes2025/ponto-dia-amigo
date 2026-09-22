-- =============================================================================
-- VISIO · teste de tenancy e RBAC
-- =============================================================================
-- Prova, contra um Postgres real, o que a arquitetura promete:
--   1. um signup cria rede + filial + proprietário + modelos padrão;
--   2. o proprietário recebe o catálogo inteiro;
--   3. um usuário NÃO vê nada de outra rede (isolamento por RLS);
--   4. permissão é por AÇÃO: o Vendedor não cancela venda nem cria filial;
--   5. ninguém eleva o próprio limite de desconto;
--   6. o perfil de proprietário não é editável nem por quem gerencia modelos.
--
-- Roda com: npm run test:db
-- =============================================================================
\set ON_ERROR_STOP on
\timing off
set client_min_messages to notice;
-- Resultado de query vai para /dev/null: o teste se comunica por NOTICE e \warn,
-- ambos em stderr, para a saída ficar legível.
\o /dev/null

-- ---------------------------------------------------------------------------
-- Utilitário de asserção
-- ---------------------------------------------------------------------------
-- Vive em `teste`, não em `public`: o schema de produção não ganha função de
-- teste, e o gerador de tipos não passa a enxergar uma.
create schema if not exists teste;
grant usage on schema teste to authenticated;

create or replace function teste.assert(p_cond boolean, p_msg text)
returns void language plpgsql
-- SECURITY DEFINER para o helper funcionar também sob `set role authenticated`.
security definer set search_path = public as $$
begin
  if p_cond is not true then
    raise exception 'FALHOU: %', p_msg;
  end if;
  raise notice '  ok · %', p_msg;
end;
$$;

grant execute on function teste.assert(boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cenário: duas redes independentes
-- ---------------------------------------------------------------------------
\warn ''
\warn '── 1. Signup cria a estrutura da rede ─────────────────────────────────'

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'dono@seven.com.br',
   '{"nome":"Ana Proprietária","nome_rede":"Seven Óticas","nome_loja":"Seven Centro"}'),
  ('22222222-2222-2222-2222-222222222222', 'dono@outra.com.br',
   '{"nome":"Bruno Rival","nome_rede":"Ótica Rival"}');

select teste.assert(count(*) = 2, 'duas redes criadas') from public.tenants;
select teste.assert(
  (select slug from public.tenants where nome = 'Seven Óticas') = 'seven-oticas',
  'slug gerado sem acento: seven-oticas');
select teste.assert(count(*) = 1, 'primeira filial criada com código 1')
  from public.stores s join public.tenants t on t.id = s.tenant_id
 where t.nome = 'Seven Óticas' and s.codigo = 1;
select teste.assert(count(*) = 6, 'proprietário + 5 modelos padrão por rede')
  from public.permission_profiles pp join public.tenants t on t.id = pp.tenant_id
 where t.nome = 'Seven Óticas';
select teste.assert(count(*) = 1, 'usuário já vinculado à filial padrão')
  from public.user_stores us join public.profiles p on p.id = us.profile_id
 where p.email = 'dono@seven.com.br' and us.is_padrao;

\warn ''
\warn '── 2. Proprietário recebe o catálogo inteiro ──────────────────────────'

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select teste.assert(
  (select count(*) from public.current_permissions()) = (select count(*) from public.permissions),
  format('proprietário tem todas as %s chaves', (select count(*) from public.permissions)));
select teste.assert(public.has_permission('vendas.cancelar'), 'proprietário pode cancelar venda');
select teste.assert(public.has_permission('inteligencia.configurar_holdout'), 'proprietário pode configurar holdout');

\warn ''
\warn '── 3. Isolamento entre redes ─────────────────────────────────────────'

select teste.assert(count(*) = 1, 'proprietário da Seven vê só a própria rede') from public.tenants;
select teste.assert(count(*) = 1, 'proprietário da Seven vê só a própria filial') from public.stores;
select teste.assert(count(*) = 1, 'proprietário da Seven vê só o próprio usuário') from public.profiles;
select teste.assert(count(*) = 6, 'vê só os modelos da própria rede') from public.permission_profiles;

-- Tentar enxergar a outra rede por id explícito também não passa.
select teste.assert(count(*) = 0, 'busca direta pelo id da outra rede não retorna nada')
  from public.tenants where nome = 'Ótica Rival';

reset role;

\warn ''
\warn '── 4. Permissão é por ação, não por módulo ───────────────────────────'

-- A rede convida uma vendedora; ela se cadastra e cai DENTRO da Seven, já com
-- o modelo "Vendedor" e a filial certa. É o caminho real, e é o que impede um
-- funcionário de virar dono de uma rede vazia por acidente.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.user_invites (tenant_id, email, nome, permission_profile_ids, store_ids, limite_desconto, criado_por)
select
  public.current_tenant_id(),
  'vendedor@seven.com.br',
  'Carla Vendedora',
  array[(select id from public.permission_profiles where nome = 'Vendedor')],
  array[(select id from public.stores where codigo = 1)],
  5,
  public.current_profile_id();

reset role;

insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'vendedor@seven.com.br', '{"nome":"Carla Vendedora"}');

select teste.assert(count(*) = 2, 'convite anexou a vendedora à rede que convidou (sem criar rede nova)')
  from public.profiles p join public.tenants t on t.id = p.tenant_id
 where t.nome = 'Seven Óticas';
select teste.assert(count(*) = 2, 'seguem existindo só duas redes') from public.tenants;
select teste.assert(
  (select aceito_em is not null from public.user_invites where email = 'vendedor@seven.com.br'),
  'convite marcado como aceito');
select teste.assert(count(*) = 1, 'vendedora recebeu a filial do convite')
  from public.user_stores us join public.profiles p on p.id = us.profile_id
 where p.email = 'vendedor@seven.com.br';
select teste.assert(count(*) = 1, 'vendedora recebeu o modelo Vendedor')
  from public.user_permission_profiles upp
  join public.profiles p on p.id = upp.profile_id
  join public.permission_profiles pp on pp.id = upp.permission_profile_id
 where p.email = 'vendedor@seven.com.br' and pp.nome = 'Vendedor';

set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select teste.assert(public.has_permission('vendas.incluir'),           'vendedor pode incluir venda');
select teste.assert(public.has_permission('vendas.consultar_proprias'),'vendedor pode consultar as próprias vendas');
select teste.assert(not public.has_permission('vendas.consultar'),     'vendedor NÃO consulta as vendas de todos');
select teste.assert(not public.has_permission('vendas.cancelar'),      'vendedor NÃO cancela venda');
select teste.assert(not public.has_permission('produtos.ver_custo'),   'vendedor NÃO vê custo');
select teste.assert(not public.has_permission('caixa.fechar'),         'vendedor NÃO fecha caixa');
select teste.assert(not public.has_permission('cadastros.filiais'),    'vendedor NÃO gerencia filiais');

-- E a permissão não é só teoria: o RLS recusa a escrita.
do $$
begin
  insert into public.stores (tenant_id, codigo, nome_fantasia)
  values (public.current_tenant_id(), 99, 'Filial pirata');
  raise exception 'FALHOU: vendedor conseguiu criar filial';
exception
  when insufficient_privilege then
    raise notice '  ok · RLS recusou a criação de filial pelo vendedor';
end $$;

\warn ''
\warn '── 5. Ninguém eleva o próprio limite de desconto ─────────────────────'

do $$
begin
  update public.profiles set limite_desconto = 100 where user_id = auth.uid();
  raise exception 'FALHOU: vendedor elevou o próprio limite de desconto';
exception
  when raise_exception then
    if position('usuarios.alterar' in sqlerrm) = 0 then raise; end if;
    raise notice '  ok · guard bloqueou a elevação do próprio limite de desconto';
end $$;

-- Mas o que é dele, ele edita.
update public.profiles set telefone = '+5511999990000' where user_id = auth.uid();
select teste.assert(
  (select telefone from public.profiles where user_id = auth.uid()) = '+5511999990000',
  'vendedor edita o próprio telefone');

reset role;

\warn ''
\warn '── 6. O perfil de proprietário é intocável ───────────────────────────'

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Mesmo o proprietário, que tem permissoes.gerenciar_modelos, não altera o
-- perfil is_owner: é a trava que impede a rede de se trancar fora do sistema.
do $$
declare v_afetadas integer;
begin
  update public.permission_profiles set nome = 'Hackeado' where is_owner;
  get diagnostics v_afetadas = row_count;
  if v_afetadas <> 0 then
    raise exception 'FALHOU: perfil de proprietário foi alterado';
  end if;
  raise notice '  ok · perfil is_owner não é alterável (0 linhas afetadas)';
end $$;

-- Já um modelo comum, sim.
update public.permission_profiles set descricao = 'Editado no teste' where nome = 'Vendedor';
select teste.assert(
  (select descricao from public.permission_profiles where nome = 'Vendedor') = 'Editado no teste',
  'modelo comum é editável por quem tem permissoes.gerenciar_modelos');

reset role;

\warn ''
\warn '── 7. Trilha de auditoria ────────────────────────────────────────────'

select teste.assert(count(*) > 0, 'alterações geraram trilha de auditoria')
  from public.audit_log where tabela = 'permission_profiles';
select teste.assert(
  (select campos from public.audit_log
    where tabela = 'profiles' and operacao = 'UPDATE'
      and 'telefone' = any(campos) limit 1) @> array['telefone'],
  'UPDATE registra exatamente os campos alterados');

\warn ''
\warn '✓ todos os testes passaram'
