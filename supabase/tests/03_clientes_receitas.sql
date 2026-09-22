-- =============================================================================
-- VISIO · teste de cadastros, clientes e receitas
-- =============================================================================
\set ON_ERROR_STOP on
set client_min_messages to notice;
\o /dev/null

create schema if not exists teste;
grant usage on schema teste to authenticated;

create or replace function teste.assert(p_cond boolean, p_msg text)
returns void language plpgsql
security definer set search_path = public as $$
begin
  if p_cond is not true then raise exception 'FALHOU: %', p_msg; end if;
  raise notice '  ok · %', p_msg;
end;
$$;
grant execute on function teste.assert(boolean, text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'dono@alfa.com',
   '{"nome":"Alice Alfa","nome_rede":"Ótica Alfa"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'dono@beta.com',
   '{"nome":"Bento Beta","nome_rede":"Ótica Beta"}');

\warn ''
\warn '── 1. A rede nasce usável ────────────────────────────────────────────'

select teste.assert(count(*) = 8, 'oito formas de pagamento, com natureza e prazo de crédito')
  from public.formas_pagamento fp
  join public.tenants t on t.id = fp.tenant_id where t.nome = 'Ótica Alfa';
select teste.assert(count(*) = 17, 'dezessete subgrupos ligados aos grupos certos')
  from public.subgrupos s join public.tenants t on t.id = s.tenant_id where t.nome = 'Ótica Alfa';
select teste.assert(count(*) = 18, 'plano de contas com dois sintéticos e dezesseis analíticos')
  from public.plano_contas p join public.tenants t on t.id = p.tenant_id where t.nome = 'Ótica Alfa';
select teste.assert(count(*) = 91, 'feriados de sete anos (13 por ano)')
  from public.feriados f join public.tenants t on t.id = f.tenant_id where t.nome = 'Ótica Alfa';

-- A Páscoa é a base dos três feriados móveis; errá-la desloca o prazo de O.S.
-- justamente na semana em que o laboratório não produz.
select teste.assert(public.calcular_pascoa(2026) = '2026-04-05', 'Páscoa de 2026 em 05/04');
select teste.assert(public.calcular_pascoa(2027) = '2027-03-28', 'Páscoa de 2027 em 28/03');
select teste.assert(
  (select data from public.feriados f join public.tenants t on t.id = f.tenant_id
    where t.nome = 'Ótica Alfa' and f.nome = 'Sexta-feira Santa'
      and extract(year from f.data) = 2026) = '2026-04-03',
  'Sexta-feira Santa de 2026 derivada da Páscoa');

\warn ''
\warn '── 2. Plano de contas não aceita árvore incoerente ───────────────────'

do $$
declare v_receita uuid; v_tenant uuid;
begin
  select t.id into v_tenant from public.tenants t where t.nome = 'Ótica Alfa';
  select id into v_receita from public.plano_contas
   where tenant_id = v_tenant and codigo = '1';

  begin
    insert into public.plano_contas (tenant_id, parent_id, codigo, nome, natureza)
    values (v_tenant, v_receita, '1.99', 'Despesa dentro de receita', 'despesa');
    raise exception 'FALHOU: aceitou despesa como filha de receita';
  exception when raise_exception then
    if position('não pode ter filho' in sqlerrm) = 0 then raise; end if;
    raise notice '  ok · recusou conta de despesa dentro de receita';
  end;

  begin
    insert into public.plano_contas (tenant_id, parent_id, codigo, nome, natureza)
    values (v_tenant,
            (select id from public.plano_contas where tenant_id = v_tenant and codigo = '1.1'),
            '1.1.1', 'Subconta de analítica', 'receita');
    raise exception 'FALHOU: aceitou subconta de conta analítica';
  exception when raise_exception then
    if position('analítica' in sqlerrm) = 0 then raise; end if;
    raise notice '  ok · recusou subconta de conta analítica';
  end;
end $$;

\warn ''
\warn '── 3. Cliente: numeração por rede e métricas automáticas ─────────────'

insert into public.clientes (tenant_id, nome, cpf_cnpj, data_nascimento)
select t.id, v.nome, v.doc, v.nasc
  from public.tenants t,
       (values ('Ana Maria Souza', '52998224725', '1985-03-12'::date),
               ('Bruno Lima',      '11144477735', '1990-07-30'::date)) as v(nome, doc, nasc)
 where t.nome = 'Ótica Alfa';

insert into public.clientes (tenant_id, nome)
select t.id, 'Cliente da Beta' from public.tenants t where t.nome = 'Ótica Beta';

select teste.assert(
  array(select codigo from public.clientes c join public.tenants t on t.id = c.tenant_id
         where t.nome = 'Ótica Alfa' order by codigo) = array[1::bigint, 2::bigint],
  'códigos 1 e 2 na Alfa');
select teste.assert(
  (select codigo from public.clientes c join public.tenants t on t.id = c.tenant_id
    where t.nome = 'Ótica Beta') = 1,
  'a Beta começa do 1 também — o contador é por rede');
select teste.assert(count(*) = 3, 'métrica criada junto com cada cliente')
  from public.cliente_metricas;

\warn ''
\warn '── 4. Negativação mantém o sinalizador do cliente em dia ─────────────'

do $$
declare v_cliente uuid; v_neg uuid;
begin
  select c.id into v_cliente from public.clientes c
    join public.tenants t on t.id = c.tenant_id
   where t.nome = 'Ótica Alfa' and c.nome = 'Ana Maria Souza';

  insert into public.cliente_negativacoes (tenant_id, cliente_id, motivo, valor)
  select tenant_id, id, 'Parcela 3/6 em atraso há 90 dias', 480.00
    from public.clientes where id = v_cliente
  returning id into v_neg;

  perform teste.assert(
    (select negativado from public.clientes where id = v_cliente),
    'incluir negativação marcou o cliente');

  -- Uma segunda negativação aberta seria ruído no quadro de cobrança.
  begin
    insert into public.cliente_negativacoes (tenant_id, cliente_id, motivo)
    select tenant_id, id, 'Outra' from public.clientes where id = v_cliente;
    raise exception 'FALHOU: aceitou duas negativações abertas';
  exception when unique_violation then
    raise notice '  ok · recusou segunda negativação aberta';
  end;

  update public.cliente_negativacoes set data_baixa = current_date where id = v_neg;

  perform teste.assert(
    not (select negativado from public.clientes where id = v_cliente),
    'dar baixa desmarcou o cliente');
end $$;

\warn ''
\warn '── 5. Receita: grade de 0,25 e receita incompleta ────────────────────'

do $$
declare v_cliente uuid; v_tenant uuid;
begin
  select c.id, c.tenant_id into v_cliente, v_tenant
    from public.clientes c join public.tenants t on t.id = c.tenant_id
   where t.nome = 'Ótica Alfa' and c.nome = 'Ana Maria Souza';

  insert into public.receitas (tenant_id, cliente_id, medico_nome, data_receita,
                               od_esferico, od_cilindrico, od_eixo, od_adicao,
                               oe_esferico, oe_cilindrico, oe_eixo, oe_adicao)
  values (v_tenant, v_cliente, 'Dra. Helena Prado', current_date - 400,
          -2.25, -0.75, 180, 2.00,
          -2.50, -0.50,  90, 2.00);

  perform teste.assert(
    (select multifocal from public.receitas where cliente_id = v_cliente),
    'adição em algum olho marca a receita como multifocal');
  perform teste.assert(
    (select validade from public.receitas where cliente_id = v_cliente)
      = (current_date - 400) + interval '1 year',
    'validade assumida de um ano a partir da data da receita');

  begin
    insert into public.receitas (tenant_id, cliente_id, medico_nome, od_esferico)
    values (v_tenant, v_cliente, 'X', 1.37);
    raise exception 'FALHOU: aceitou grau fora da grade';
  exception when check_violation then
    raise notice '  ok · recusou grau 1,37 (fora dos passos de 0,25)';
  end;

  begin
    insert into public.receitas (tenant_id, cliente_id, medico_nome, od_cilindrico)
    values (v_tenant, v_cliente, 'X', -1.00);
    raise exception 'FALHOU: aceitou cilindro sem eixo';
  exception when check_violation then
    raise notice '  ok · recusou cilindro sem eixo (lente não montável)';
  end;

  begin
    insert into public.receitas (tenant_id, cliente_id, od_esferico)
    values (v_tenant, v_cliente, -1.00);
    raise exception 'FALHOU: aceitou receita sem prescritor';
  exception when check_violation then
    raise notice '  ok · recusou receita sem médico nem nome de prescritor';
  end;

  perform teste.assert(
    (select receitas_qtd from public.cliente_metricas where cliente_id = v_cliente) = 1,
    'métrica do cliente contou a receita');
end $$;

\warn ''
\warn '── 6. Alteração de receita é versionada ──────────────────────────────'

do $$
declare v_receita uuid;
begin
  select id into v_receita from public.receitas limit 1;
  update public.receitas set observacoes = 'Conferido no balcão' where id = v_receita;
  update public.receitas set od_esferico = -2.50 where id = v_receita;

  perform teste.assert(
    (select count(*) from public.receita_historico where receita_id = v_receita) = 2,
    'duas alterações geraram duas versões no histórico');
  perform teste.assert(
    (select (dados ->> 'od_esferico')::numeric from public.receita_historico
      where receita_id = v_receita and versao = 2) = -2.25,
    'a versão 2 guardou o grau anterior à alteração');
end $$;

\warn ''
\warn '── 7. Isolamento: a Beta não vê nada da Alfa ─────────────────────────'

set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';

select teste.assert(count(*) = 1, 'proprietário da Beta vê só o cliente dele') from public.clientes;
select teste.assert(count(*) = 0, 'não vê receita da Alfa')                    from public.receitas;
select teste.assert(count(*) = 0, 'não vê a fila de receitas vencidas da Alfa') from public.vw_receitas_vencidas;
select teste.assert(count(*) = 0, 'não vê negativação da Alfa')                 from public.cliente_negativacoes;
select teste.assert(count(*) = 8, 'vê as próprias formas de pagamento')         from public.formas_pagamento;

reset role;

\warn ''
\warn '── 8. A fila de recall traz os sinais de elegibilidade ───────────────'

select teste.assert(count(*) = 1, 'uma receita vencida na fila') from public.vw_receitas_vencidas;
select teste.assert(
  (select not consentiu_contato and not tem_canal_aberto from public.vw_receitas_vencidas),
  'sem consentimento e sem canal: a fila diz isso, em vez de disparar mensagem');

-- Com consentimento e canal, os sinais mudam.
update public.clientes set consentimento_contato_em = now()
 where nome = 'Ana Maria Souza';
insert into public.cliente_telefones (tenant_id, cliente_id, numero, aceita_whatsapp)
select tenant_id, id, '11987654321', true from public.clientes where nome = 'Ana Maria Souza';

select teste.assert(
  (select consentiu_contato and tem_canal_aberto from public.vw_receitas_vencidas),
  'com opt-in e WhatsApp aberto, a receita fica elegível');

\warn ''
\warn '✓ cadastros, clientes e receitas em ordem'
