-- =============================================================================
-- VISIO · 04 · Cadastros auxiliares
-- =============================================================================
-- As tabelas de apoio que servem de dimensão para produto, venda, financeiro e
-- relatório. A maioria tem a mesma forma (nome, descrição, ativo, ordem) e é
-- criada por um laço; as que têm regra própria vêm declaradas uma a uma.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabelas de forma simples
-- -----------------------------------------------------------------------------
-- Criadas em laço porque são idênticas: repetir 60 linhas oito vezes é onde
-- aparece a que ficou sem RLS ou sem o índice único.
do $$
declare
  -- `foreach ... slice 1` percorre linhas da matriz, então a variável é um array.
  v_tabela  text[];
  v_tabelas text[][] := array[
    ['unidades',               'Unidade de medida do produto (UN, PAR, CX).'],
    ['cores',                  'Cor da armação ou da lente.'],
    ['tamanhos',               'Tamanho da armação.'],
    ['formatos',               'Formato da armação (redonda, quadrada, gatinho).'],
    ['generos',                'Gênero a que o produto se destina.'],
    ['tipos_lente',            'Tipo de lente (monofocal, multifocal, ocupacional).'],
    ['grifes',                 'Marca do produto.'],
    ['origens_cliente',        'Origem do lead: indicação, loja, evento, Instagram, convênio.'],
    ['tipos_documento',        'Tipo de documento financeiro (nota, recibo, duplicata).'],
    ['profissoes',             'Profissão do cliente.']
  ];
begin
  foreach v_tabela slice 1 in array v_tabelas loop
    execute format($fmt$
      create table public.%I (
        id         uuid        primary key default gen_random_uuid(),
        tenant_id  uuid        not null references public.tenants (id) on delete cascade,
        nome       text        not null,
        descricao  text,
        ordem      integer     not null default 0,
        ativo      boolean     not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint %I check (length(btrim(nome)) > 0)
      )
    $fmt$, v_tabela[1], v_tabela[1] || '_nome_nao_vazio');

    -- Nome único por rede, ignorando acento e caixa: "Ray-Ban" e "ray ban" são
    -- a mesma grife, e deixar as duas entrarem estraga todo relatório por grife.
    execute format(
      'create unique index %I on public.%I (tenant_id, public.normalizar_texto(nome))',
      v_tabela[1] || '_nome_unico', v_tabela[1]);
    execute format(
      'create index %I on public.%I (tenant_id, ordem, nome) where ativo',
      v_tabela[1] || '_ativos_idx', v_tabela[1]);

    execute format('comment on table public.%I is %L', v_tabela[1], v_tabela[2]);

    perform public.aplicar_rls_padrao(
      v_tabela[1], 'tenant',
      null,                            -- leitura: basta ser da rede
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares'
    );
    perform public.aplicar_triggers_padrao(v_tabela[1]);
  end loop;
end $$;

-- Contrato das tabelas de apoio: TODAS têm nome, ordem e ativo. A tela genérica
-- de cadastros escreve essas três colunas em qualquer uma delas, e o seletor de
-- opções ordena por `ordem`. A suíte de banco confere que nenhuma escapou.

-- -----------------------------------------------------------------------------
-- grupos e subgrupos de produto
-- -----------------------------------------------------------------------------
-- Ganham coeficiente e índice porque são usados no cálculo de preço sugerido
-- por categoria — e alterá-los é permissão própria no catálogo.
create table public.grupos (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  nome        text        not null,
  descricao   text,
  coeficiente numeric(10, 4),
  indice      numeric(10, 4),
  ordem       integer     not null default 0,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index grupos_nome_unico on public.grupos (tenant_id, public.normalizar_texto(nome));

create table public.subgrupos (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  grupo_id   uuid        not null references public.grupos (id) on delete cascade,
  nome       text        not null,
  descricao  text,
  ordem      integer     not null default 0,
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subgrupos_nome_unico
  on public.subgrupos (grupo_id, public.normalizar_texto(nome));
create index subgrupos_grupo_idx on public.subgrupos (grupo_id) where ativo;

-- -----------------------------------------------------------------------------
-- convenios
-- -----------------------------------------------------------------------------
create table public.convenios (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  nome                text        not null,
  descricao           text,
  cnpj                text,
  contato             text,
  telefone            text,
  email               text,
  desconto_percentual numeric(5, 2) not null default 0
                        check (desconto_percentual >= 0 and desconto_percentual <= 100),
  -- Convênio de consignação fatura para a empresa parceira; o de desconto só
  -- abate no ato da venda. A diferença muda o destino do recebível.
  tipo                text        not null default 'desconto'
                        check (tipo in ('desconto', 'consignacao', 'permuta')),
  ordem               integer     not null default 0,
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index convenios_nome_unico
  on public.convenios (tenant_id, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- formas_pagamento
-- -----------------------------------------------------------------------------
create type public.natureza_pagamento as enum (
  'dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto',
  'crediario', 'cheque', 'transferencia', 'credito_troca', 'cashback', 'permuta'
);

create table public.formas_pagamento (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null references public.tenants (id) on delete cascade,
  nome                  text        not null,
  natureza              public.natureza_pagamento not null,
  permite_parcelamento  boolean     not null default false,
  max_parcelas          smallint    not null default 1 check (max_parcelas between 1 and 48),
  -- Taxa da adquirente e prazo de crédito: é o que permite conciliar o valor
  -- líquido que cai na conta com o valor bruto da venda.
  taxa_percentual       numeric(6, 3) not null default 0 check (taxa_percentual >= 0),
  taxa_fixa             numeric(10, 2) not null default 0 check (taxa_fixa >= 0),
  dias_credito          smallint    not null default 0 check (dias_credito >= 0),
  -- Entra no caixa da loja (dinheiro) ou vai direto para conta bancária?
  movimenta_caixa       boolean     not null default true,
  ordem                 integer     not null default 0,
  ativo                 boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint formas_pagamento_parcelas_coerentes
    check (permite_parcelamento or max_parcelas = 1)
);

create unique index formas_pagamento_nome_unico
  on public.formas_pagamento (tenant_id, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- medicos (e optometristas) e responsaveis_tecnicos
-- -----------------------------------------------------------------------------
create table public.medicos (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants (id) on delete cascade,
  nome            text        not null,
  -- Conselho varia: CRM para oftalmologista, CRO/registro para optometrista.
  conselho        text        not null default 'CRM'
                    check (conselho in ('CRM', 'CRO', 'OUTRO')),
  registro        text,
  uf_registro     char(2),
  especialidade   text,
  telefone        text,
  email           text,
  observacoes     text,
  ordem           integer     not null default 0,
  ativo           boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index medicos_registro_unico
  on public.medicos (tenant_id, conselho, public.somente_digitos(registro))
  where registro is not null and btrim(registro) <> '';
create index medicos_nome_idx
  on public.medicos (tenant_id, public.normalizar_texto(nome));

create table public.responsaveis_tecnicos (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  store_id    uuid        references public.stores (id) on delete set null,
  nome        text        not null,
  registro    text,
  cpf         text,
  ordem       integer     not null default 0,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- plano_contas — árvore de categorias de receita e despesa
-- -----------------------------------------------------------------------------
create type public.natureza_conta as enum ('receita', 'despesa');

create table public.plano_contas (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  parent_id  uuid        references public.plano_contas (id) on delete restrict,
  -- Código hierárquico legível (3.1.02). É o que o contador espera ver.
  codigo     text        not null,
  nome       text        not null,
  natureza   public.natureza_conta not null,
  -- Conta sintética agrupa; só a analítica recebe lançamento.
  analitica  boolean     not null default true,
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plano_contas_codigo_formato check (codigo ~ '^[0-9]+(\.[0-9]+)*$')
);

create unique index plano_contas_codigo_unico on public.plano_contas (tenant_id, codigo);
create index plano_contas_parent_idx on public.plano_contas (parent_id);

-- Um pai sintético não pode ter natureza diferente do filho, senão o DRE soma
-- receita dentro de despesa.
create or replace function public.guard_plano_contas()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_pai public.plano_contas;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'Uma conta não pode ser pai de si mesma.';
  end if;

  select * into v_pai from public.plano_contas where id = new.parent_id;

  if v_pai.tenant_id <> new.tenant_id then
    raise exception 'A conta pai pertence a outra rede.';
  end if;
  if v_pai.natureza <> new.natureza then
    raise exception 'A conta "%" é de % e não pode ter filho de %.',
      v_pai.nome, v_pai.natureza, new.natureza;
  end if;
  if v_pai.analitica then
    raise exception 'A conta "%" é analítica e não aceita subconta. Marque-a como sintética primeiro.',
      v_pai.nome;
  end if;

  return new;
end;
$$;

create trigger plano_contas_guard
  before insert or update on public.plano_contas
  for each row execute function public.guard_plano_contas();

-- -----------------------------------------------------------------------------
-- situacoes_conta_receber
-- -----------------------------------------------------------------------------
create table public.situacoes_conta_receber (
  id                     uuid        primary key default gen_random_uuid(),
  tenant_id              uuid        not null references public.tenants (id) on delete cascade,
  nome                   text        not null,
  descricao              text,
  -- Cor no quadro de cobrança. HSL, como todo token do design system.
  cor                    text,
  considera_inadimplente boolean     not null default false,
  ordem                  integer     not null default 0,
  ativo                  boolean     not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index situacoes_conta_receber_nome_unico
  on public.situacoes_conta_receber (tenant_id, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- motivos_cancelamento
-- -----------------------------------------------------------------------------
create table public.motivos_cancelamento (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  nome       text        not null,
  -- Cancelar venda, O.S. e orçamento são decisões diferentes; o motivo
  -- oferecido precisa refletir isso.
  aplica_a   text        not null default 'venda'
               check (aplica_a in ('venda', 'os', 'orcamento', 'troca', 'todos')),
  ordem      integer     not null default 0,
  ativo      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index motivos_cancelamento_nome_unico
  on public.motivos_cancelamento (tenant_id, aplica_a, public.normalizar_texto(nome));

-- -----------------------------------------------------------------------------
-- feriados — entram no cálculo de SLA das Ordens de Serviço
-- -----------------------------------------------------------------------------
create table public.feriados (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  -- Feriado municipal ou fechamento de uma loja só valem para aquela filial.
  store_id    uuid        references public.stores (id) on delete cascade,
  data        date        not null,
  nome        text        not null,
  abrangencia text        not null default 'nacional'
                check (abrangencia in ('nacional', 'estadual', 'municipal', 'loja')),
  uf          char(2),
  -- Feriado de data fixa repete todo ano; Carnaval e Corpus Christi, não.
  recorrente  boolean     not null default false,
  ordem       integer     not null default 0,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint feriados_loja_coerente check (abrangencia <> 'loja' or store_id is not null),
  constraint feriados_uf_coerente   check (abrangencia <> 'estadual' or uf is not null)
);

create unique index feriados_unico
  on public.feriados (tenant_id, data, coalesce(store_id, '00000000-0000-0000-0000-000000000000'::uuid), nome);
create index feriados_data_idx on public.feriados (tenant_id, data) where ativo;

comment on table public.feriados is
  'Feriados por rede e filial. Usados por add_business_days() no cálculo de SLA das O.S.';

-- -----------------------------------------------------------------------------
-- RLS e triggers das tabelas declaradas uma a uma
-- -----------------------------------------------------------------------------
do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'grupos', 'subgrupos', 'convenios', 'formas_pagamento', 'medicos',
    'responsaveis_tecnicos', 'plano_contas', 'situacoes_conta_receber',
    'motivos_cancelamento', 'feriados'
  ] loop
    perform public.aplicar_rls_padrao(
      v_tabela, 'tenant', null,
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares',
      'cadastros.tabelas_auxiliares'
    );
    perform public.aplicar_triggers_padrao(v_tabela);
  end loop;
end $$;

-- Três têm permissão própria no catálogo; sobrescrevem o padrão acima.
do $$
begin
  perform public.aplicar_rls_padrao('medicos',      'tenant', null, 'cadastros.medicos',       'cadastros.medicos',       'cadastros.medicos');
  perform public.aplicar_rls_padrao('feriados',     'tenant', null, 'cadastros.feriados',      'cadastros.feriados',      'cadastros.feriados');
  perform public.aplicar_rls_padrao('plano_contas', 'tenant', null, 'financeiro.plano_contas', 'financeiro.plano_contas', 'financeiro.plano_contas');
end $$;
