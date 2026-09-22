-- =============================================================================
-- VISIO · 05b · Cadastros de partida de uma rede nova
-- =============================================================================
-- Um ERP de ótica com todas as tabelas de apoio vazias é inusável: não dá para
-- lançar uma venda sem forma de pagamento, nem calcular prazo de O.S. sem
-- feriado. A rede nasce com um conjunto mínimo e editável.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Páscoa — e daí os feriados móveis
-- -----------------------------------------------------------------------------
-- Carnaval, Sexta-feira Santa e Corpus Christi mudam de data todo ano, em função
-- da Páscoa. Sem calcular, o prazo da O.S. erra em três semanas do ano — e erra
-- justamente na semana em que o laboratório não produz.
create or replace function public.calcular_pascoa(p_ano integer)
returns date
language plpgsql
immutable
parallel safe
as $$
declare
  -- Algoritmo de Meeus/Jones/Butcher para o calendário gregoriano.
  a integer := p_ano % 19;
  b integer := p_ano / 100;
  c integer := p_ano % 100;
  d integer := b / 4;
  e integer := b % 4;
  f integer := (b + 8) / 25;
  g integer := (b - f + 1) / 3;
  h integer := (19 * a + b - d - g + 15) % 30;
  i integer := c / 4;
  k integer := c % 4;
  l integer := (32 + 2 * e + 2 * i - h - k) % 7;
  m integer := (a + 11 * h + 22 * l) / 451;
  mes integer := (h + l - 7 * m + 114) / 31;
  dia integer := ((h + l - 7 * m + 114) % 31) + 1;
begin
  return make_date(p_ano, mes, dia);
end;
$$;

comment on function public.calcular_pascoa(integer) is
  'Domingo de Páscoa do ano, por Meeus/Jones/Butcher. Base dos feriados móveis.';

-- -----------------------------------------------------------------------------
-- Feriados nacionais de um ano
-- -----------------------------------------------------------------------------
create or replace function public.semear_feriados_nacionais(
  p_tenant_id uuid,
  p_ano       integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pascoa date := public.calcular_pascoa(p_ano);
begin
  insert into public.feriados (tenant_id, data, nome, abrangencia, recorrente)
  values
    (p_tenant_id, make_date(p_ano,  1,  1), 'Confraternização Universal',       'nacional', true),
    (p_tenant_id, make_date(p_ano,  4, 21), 'Tiradentes',                        'nacional', true),
    (p_tenant_id, make_date(p_ano,  5,  1), 'Dia do Trabalho',                   'nacional', true),
    (p_tenant_id, make_date(p_ano,  9,  7), 'Independência do Brasil',           'nacional', true),
    (p_tenant_id, make_date(p_ano, 10, 12), 'Nossa Senhora Aparecida',           'nacional', true),
    (p_tenant_id, make_date(p_ano, 11,  2), 'Finados',                           'nacional', true),
    (p_tenant_id, make_date(p_ano, 11, 15), 'Proclamação da República',          'nacional', true),
    (p_tenant_id, make_date(p_ano, 11, 20), 'Consciência Negra',                 'nacional', true),
    (p_tenant_id, make_date(p_ano, 12, 25), 'Natal',                             'nacional', true),
    -- Móveis. Carnaval e Corpus Christi são ponto facultativo por lei, mas a
    -- ótica costuma fechar; ficam ativos e a loja desativa se abrir.
    (p_tenant_id, v_pascoa - 48, 'Carnaval (segunda)',      'nacional', false),
    (p_tenant_id, v_pascoa - 47, 'Carnaval (terça)',        'nacional', false),
    (p_tenant_id, v_pascoa -  2, 'Sexta-feira Santa',       'nacional', false),
    (p_tenant_id, v_pascoa + 60, 'Corpus Christi',          'nacional', false)
  on conflict do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Conjunto de partida
-- -----------------------------------------------------------------------------
create or replace function public.semear_cadastros_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano     integer := extract(year from current_date)::integer;
  v_receita uuid;
  v_despesa uuid;
begin
  -- Unidades
  insert into public.unidades (tenant_id, nome, descricao, ordem) values
    (p_tenant_id, 'UN',  'Unidade', 1),
    (p_tenant_id, 'PAR', 'Par (lentes, hastes)', 2),
    (p_tenant_id, 'CX',  'Caixa', 3),
    (p_tenant_id, 'SERV','Serviço', 4)
  on conflict do nothing;

  -- Tipos de lente
  insert into public.tipos_lente (tenant_id, nome, ordem) values
    (p_tenant_id, 'Monofocal', 1),
    (p_tenant_id, 'Multifocal', 2),
    (p_tenant_id, 'Bifocal', 3),
    (p_tenant_id, 'Ocupacional', 4),
    (p_tenant_id, 'Lente de contato', 5),
    (p_tenant_id, 'Sem grau', 6)
  on conflict do nothing;

  -- Formatos e gêneros de armação
  insert into public.formatos (tenant_id, nome, ordem) values
    (p_tenant_id, 'Redonda', 1), (p_tenant_id, 'Quadrada', 2),
    (p_tenant_id, 'Retangular', 3), (p_tenant_id, 'Gatinho', 4),
    (p_tenant_id, 'Aviador', 5), (p_tenant_id, 'Oval', 6),
    (p_tenant_id, 'Hexagonal', 7)
  on conflict do nothing;

  insert into public.generos (tenant_id, nome, ordem) values
    (p_tenant_id, 'Feminino', 1), (p_tenant_id, 'Masculino', 2),
    (p_tenant_id, 'Unissex', 3), (p_tenant_id, 'Infantil', 4)
  on conflict do nothing;

  insert into public.tamanhos (tenant_id, nome, ordem) values
    (p_tenant_id, 'PP', 1), (p_tenant_id, 'P', 2), (p_tenant_id, 'M', 3),
    (p_tenant_id, 'G', 4), (p_tenant_id, 'GG', 5)
  on conflict do nothing;

  -- Grupos de produto, com os subgrupos que quase toda ótica usa
  insert into public.grupos (tenant_id, nome, ordem) values
    (p_tenant_id, 'Armações', 1),
    (p_tenant_id, 'Lentes', 2),
    (p_tenant_id, 'Lentes de contato', 3),
    (p_tenant_id, 'Óculos de sol', 4),
    (p_tenant_id, 'Acessórios', 5),
    (p_tenant_id, 'Serviços', 6)
  on conflict do nothing;

  insert into public.subgrupos (tenant_id, grupo_id, nome, ordem)
  select p_tenant_id, g.id, s.nome, s.ordem
    from public.grupos g
    join (values
      ('Armações',          'Metal', 1),
      ('Armações',          'Acetato', 2),
      ('Armações',          'Balgriff', 3),
      ('Armações',          'Infantil', 4),
      ('Lentes',            'Visão simples', 1),
      ('Lentes',            'Multifocal', 2),
      ('Lentes',            'Fotossensível', 3),
      ('Lentes',            'Antirreflexo', 4),
      ('Lentes de contato', 'Diária', 1),
      ('Lentes de contato', 'Mensal', 2),
      ('Lentes de contato', 'Colorida', 3),
      ('Acessórios',        'Estojo', 1),
      ('Acessórios',        'Solução', 2),
      ('Acessórios',        'Cordão', 3),
      ('Serviços',          'Montagem', 1),
      ('Serviços',          'Ajuste', 2),
      ('Serviços',          'Limpeza', 3)
    ) as s(grupo, nome, ordem) on public.normalizar_texto(g.nome) = public.normalizar_texto(s.grupo)
   where g.tenant_id = p_tenant_id
  on conflict do nothing;

  -- Formas de pagamento, com taxa e prazo de crédito prontos para conciliação
  insert into public.formas_pagamento
    (tenant_id, nome, natureza, permite_parcelamento, max_parcelas, dias_credito, movimenta_caixa, ordem)
  values
    (p_tenant_id, 'Dinheiro',           'dinheiro',        false,  1,  0, true,  1),
    (p_tenant_id, 'PIX',                'pix',             false,  1,  0, false, 2),
    (p_tenant_id, 'Cartão de débito',   'cartao_debito',   false,  1,  1, false, 3),
    (p_tenant_id, 'Cartão de crédito',  'cartao_credito',  true,  12, 30, false, 4),
    (p_tenant_id, 'Crediário da loja',  'crediario',       true,  12,  0, false, 5),
    (p_tenant_id, 'Boleto',             'boleto',          true,   6,  2, false, 6),
    (p_tenant_id, 'Cheque',             'cheque',          true,   6,  0, false, 7),
    (p_tenant_id, 'Crédito de troca',   'credito_troca',   false,  1,  0, false, 8)
  on conflict do nothing;

  -- Origem do cliente: é a dimensão que o marketing usa para medir canal
  insert into public.origens_cliente (tenant_id, nome, ordem) values
    (p_tenant_id, 'Passou na loja', 1),
    (p_tenant_id, 'Indicação', 2),
    (p_tenant_id, 'Instagram', 3),
    (p_tenant_id, 'WhatsApp', 4),
    (p_tenant_id, 'Google', 5),
    (p_tenant_id, 'Convênio', 6),
    (p_tenant_id, 'Evento', 7),
    (p_tenant_id, 'Cliente antigo', 8)
  on conflict do nothing;

  -- Situações de conta a receber
  insert into public.situacoes_conta_receber
    (tenant_id, nome, considera_inadimplente, ordem) values
    (p_tenant_id, 'Em aberto',   false, 1),
    (p_tenant_id, 'Pago',        false, 2),
    (p_tenant_id, 'Em atraso',   true,  3),
    (p_tenant_id, 'Em cobrança', true,  4),
    (p_tenant_id, 'Negociado',   false, 5),
    (p_tenant_id, 'Perda',       true,  6)
  on conflict do nothing;

  insert into public.tipos_documento (tenant_id, nome, ordem) values
    (p_tenant_id, 'Nota fiscal', 1), (p_tenant_id, 'Recibo', 2),
    (p_tenant_id, 'Duplicata', 3), (p_tenant_id, 'Boleto', 4),
    (p_tenant_id, 'Cupom fiscal', 5), (p_tenant_id, 'Sem documento', 6)
  on conflict do nothing;

  insert into public.motivos_cancelamento (tenant_id, nome, aplica_a) values
    (p_tenant_id, 'Desistência do cliente', 'todos'),
    (p_tenant_id, 'Erro de lançamento',     'todos'),
    (p_tenant_id, 'Produto indisponível',   'venda'),
    (p_tenant_id, 'Receita incorreta',      'os'),
    (p_tenant_id, 'Prazo não aceito',       'orcamento'),
    (p_tenant_id, 'Inadimplência',          'venda')
  on conflict do nothing;

  -- Plano de contas mínimo, já com a árvore sintética/analítica correta
  insert into public.plano_contas (tenant_id, codigo, nome, natureza, analitica)
  values (p_tenant_id, '1', 'Receitas', 'receita', false)
  on conflict do nothing
  returning id into v_receita;

  if v_receita is null then
    select id into v_receita from public.plano_contas
     where tenant_id = p_tenant_id and codigo = '1';
  end if;

  insert into public.plano_contas (tenant_id, parent_id, codigo, nome, natureza) values
    (p_tenant_id, v_receita, '1.1', 'Venda de armações',          'receita'),
    (p_tenant_id, v_receita, '1.2', 'Venda de lentes',            'receita'),
    (p_tenant_id, v_receita, '1.3', 'Venda de lentes de contato', 'receita'),
    (p_tenant_id, v_receita, '1.4', 'Venda de óculos de sol',     'receita'),
    (p_tenant_id, v_receita, '1.5', 'Serviços',                   'receita'),
    (p_tenant_id, v_receita, '1.6', 'Outras receitas',            'receita')
  on conflict do nothing;

  insert into public.plano_contas (tenant_id, codigo, nome, natureza, analitica)
  values (p_tenant_id, '2', 'Despesas', 'despesa', false)
  on conflict do nothing
  returning id into v_despesa;

  if v_despesa is null then
    select id into v_despesa from public.plano_contas
     where tenant_id = p_tenant_id and codigo = '2';
  end if;

  insert into public.plano_contas (tenant_id, parent_id, codigo, nome, natureza) values
    (p_tenant_id, v_despesa, '2.1',  'Compra de mercadoria',      'despesa'),
    (p_tenant_id, v_despesa, '2.2',  'Laboratório e montagem',    'despesa'),
    (p_tenant_id, v_despesa, '2.3',  'Folha e encargos',          'despesa'),
    (p_tenant_id, v_despesa, '2.4',  'Comissões',                 'despesa'),
    (p_tenant_id, v_despesa, '2.5',  'Aluguel e condomínio',      'despesa'),
    (p_tenant_id, v_despesa, '2.6',  'Energia, água e telefone',  'despesa'),
    (p_tenant_id, v_despesa, '2.7',  'Marketing',                 'despesa'),
    (p_tenant_id, v_despesa, '2.8',  'Impostos e taxas',          'despesa'),
    (p_tenant_id, v_despesa, '2.9',  'Taxas de cartão',           'despesa'),
    (p_tenant_id, v_despesa, '2.10', 'Outras despesas',           'despesa')
  on conflict do nothing;

  -- Feriados do ano passado ao quinto ano à frente: cobre o histórico que o
  -- relatório precisa e a previsão de O.S. de longo prazo.
  for v_ano in (v_ano - 1)..(v_ano + 5) loop
    perform public.semear_feriados_nacionais(p_tenant_id, v_ano);
  end loop;
end;
$$;

comment on function public.semear_cadastros_padrao(uuid) is
  'Conjunto mínimo de cadastros de uma rede nova. Tudo editável: são pontos de partida, não regras.';

-- -----------------------------------------------------------------------------
-- Passa a rodar no cadastro de uma ótica nova
-- -----------------------------------------------------------------------------
-- Substitui a chamada de criar_modelos_padrao por ela mais a semeadura. O
-- caminho do convite não semeia nada: a rede já existe e já tem seus cadastros.
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

  -- Caminho 1: convidado para uma rede existente.
  select * into v_invite
    from public.user_invites
   where lower(email) = lower(new.email)
     and aceito_em is null
     and expira_em > now()
   order by created_at desc
   limit 1;

  if found then
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
       and not pp.is_owner;

    update public.user_invites set aceito_em = now() where id = v_invite.id;

    return new;
  end if;

  -- Caminho 2: cadastro de uma ótica nova.
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
  perform public.semear_cadastros_padrao(v_tenant_id);

  return new;
end;
$$;
