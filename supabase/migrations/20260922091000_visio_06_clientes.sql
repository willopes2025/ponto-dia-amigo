-- =============================================================================
-- VISIO · 06 · Clientes, contatos e núcleo familiar
-- =============================================================================
-- O cliente é cadastrado UMA VEZ na rede, com a filial de origem registrada.
-- Contato é multi-valorado — cada telefone tem opt-in próprio de WhatsApp e SMS,
-- porque consentimento é por canal, não por pessoa.
-- =============================================================================

create type public.tipo_pessoa as enum ('pf', 'pj');
create type public.sexo_cliente as enum ('feminino', 'masculino', 'outro', 'nao_informado');
create type public.tipo_telefone as enum ('movel', 'fixo', 'comercial', 'recado');

-- -----------------------------------------------------------------------------
-- clientes
-- -----------------------------------------------------------------------------
create table public.clientes (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  -- Filial em que o cliente foi cadastrado. Não restringe acesso (o cliente é
  -- da rede), mas responde "de qual loja veio" em relatório e comissão.
  store_id            uuid        references public.stores (id) on delete set null,
  codigo              bigint      not null,

  tipo                public.tipo_pessoa not null default 'pf',
  nome                text        not null,
  apelido             text,
  cpf_cnpj            text,
  rg                  text,
  data_nascimento     date,
  sexo                public.sexo_cliente not null default 'nao_informado',
  estado_civil        text,

  -- Dados fiscais de pessoa jurídica
  razao_social        text,
  inscricao_estadual  text,
  inscricao_municipal text,
  suframa             text,
  contribuinte_icms   boolean     not null default false,

  -- Endereço
  cep                 text,
  endereco            text,
  numero              text,
  complemento         text,
  bairro              text,
  cidade              text,
  uf                  char(2),
  pais                text        not null default 'Brasil',

  -- Família e perfil social. `responsavel_id` aponta para outro cliente: é como
  -- um menor de idade ou um dependente fica ligado a quem responde por ele.
  responsavel_id      uuid        references public.clientes (id) on delete set null,
  grau_parentesco     text,
  nome_pai            text,
  nome_mae            text,
  profissao_id        uuid        references public.profissoes (id) on delete set null,
  escolaridade        text,
  renda_familiar      numeric(12, 2) check (renda_familiar is null or renda_familiar >= 0),

  -- Comercial
  origem_id           uuid        references public.origens_cliente (id) on delete set null,
  convenio_id         uuid        references public.convenios (id) on delete set null,
  vendedor_preferencia_id uuid    references public.funcionarios (id) on delete set null,
  codigo_externo      text,
  desconto_padrao     numeric(5, 2) not null default 0
                        check (desconto_padrao >= 0 and desconto_padrao <= 100),
  acrescimo_padrao    numeric(5, 2) not null default 0
                        check (acrescimo_padrao >= 0 and acrescimo_padrao <= 100),
  limite_crediario    numeric(12, 2) check (limite_crediario is null or limite_crediario >= 0),

  -- LGPD: consentimento é registrado com data e origem, não presumido. Sem
  -- data, nenhuma régua de marketing dispara para este cliente.
  consentimento_contato_em timestamptz,
  consentimento_origem     text,

  observacoes         text,
  -- Mantido por trigger a partir de cliente_negativacoes: é o que a listagem
  -- filtra e o que bloqueia crediário, então precisa ser barato de consultar.
  negativado          boolean     not null default false,
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint clientes_nome_nao_vazio check (length(btrim(nome)) > 0),
  -- Pessoa jurídica precisa de razão social; pessoa física, não.
  constraint clientes_pj_razao_social check (tipo <> 'pj' or razao_social is not null),
  constraint clientes_responsavel_nao_circular check (responsavel_id is null or responsavel_id <> id)
);

create unique index clientes_codigo_unico on public.clientes (tenant_id, codigo);

-- CPF/CNPJ único por rede, quando informado. Muita ótica cadastra cliente sem
-- documento (a venda à vista não exige), então o índice é parcial.
create unique index clientes_documento_unico
  on public.clientes (tenant_id, public.somente_digitos(cpf_cnpj))
  where cpf_cnpj is not null and btrim(cpf_cnpj) <> '';

-- Busca por nome sem acento e por parte do nome: é como o balcão procura.
create index clientes_nome_trgm_idx
  on public.clientes using gin (public.normalizar_texto(nome) extensions.gin_trgm_ops);
create index clientes_aniversario_idx
  on public.clientes (tenant_id, extract(month from data_nascimento), extract(day from data_nascimento))
  where data_nascimento is not null and ativo;
create index clientes_store_idx     on public.clientes (tenant_id, store_id) where ativo;
create index clientes_negativados_idx on public.clientes (tenant_id) where negativado and ativo;
create index clientes_responsavel_idx on public.clientes (responsavel_id) where responsavel_id is not null;

comment on column public.clientes.negativado is
  'Derivado de cliente_negativacoes por trigger. Informação de crédito do consumidor: nunca exibir ao próprio cliente nem enviar em mensagem.';
comment on column public.clientes.consentimento_contato_em is
  'Quando o cliente consentiu receber contato. Sem isto, nenhuma régua de marketing dispara.';

-- Numeração automática do código legível.
create or replace function public.clientes_definir_codigo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null then
    new.codigo := public.proximo_numero(new.tenant_id, 'cliente');
  end if;
  return new;
end;
$$;

-- BEFORE INSERT roda antes da checagem de NOT NULL, então `codigo` pode seguir
-- obrigatório na coluna e ainda ser preenchido pelo trigger.
create trigger clientes_codigo
  before insert on public.clientes
  for each row execute function public.clientes_definir_codigo();

-- -----------------------------------------------------------------------------
-- cliente_telefones
-- -----------------------------------------------------------------------------
create table public.cliente_telefones (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants (id) on delete cascade,
  cliente_id      uuid        not null references public.clientes (id) on delete cascade,
  ddi             text        not null default '55',
  numero          text        not null,
  tipo            public.tipo_telefone not null default 'movel',
  -- Opt-in por canal. Um cliente pode aceitar WhatsApp e recusar SMS; tratar
  -- isso como uma única permissão é o que gera reclamação de spam.
  aceita_whatsapp boolean     not null default false,
  aceita_sms      boolean     not null default false,
  aceita_ligacao  boolean     not null default true,
  principal       boolean     not null default false,
  observacao      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint cliente_telefones_numero_valido
    check (length(public.somente_digitos(numero)) between 8 and 15)
);

create index cliente_telefones_cliente_idx on public.cliente_telefones (cliente_id);
create unique index cliente_telefones_um_principal
  on public.cliente_telefones (cliente_id) where principal;
-- Mesmo número duas vezes no mesmo cliente é erro de digitação.
create unique index cliente_telefones_numero_unico
  on public.cliente_telefones (cliente_id, ddi, public.somente_digitos(numero));
-- Busca reversa: quem é o dono deste número? (atendimento por WhatsApp)
create index cliente_telefones_busca_idx
  on public.cliente_telefones (tenant_id, public.somente_digitos(numero));

-- -----------------------------------------------------------------------------
-- cliente_emails
-- -----------------------------------------------------------------------------
create table public.cliente_emails (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  cliente_id     uuid        not null references public.clientes (id) on delete cascade,
  email          text        not null,
  aceita_contato boolean     not null default true,
  principal      boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cliente_emails_formato check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index cliente_emails_cliente_idx on public.cliente_emails (cliente_id);
create unique index cliente_emails_um_principal
  on public.cliente_emails (cliente_id) where principal;
create unique index cliente_emails_unico
  on public.cliente_emails (cliente_id, lower(email));

-- -----------------------------------------------------------------------------
-- cliente_referencias — referências pessoais, usadas na análise de crediário
-- -----------------------------------------------------------------------------
create table public.cliente_referencias (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references public.tenants (id) on delete cascade,
  cliente_id uuid        not null references public.clientes (id) on delete cascade,
  nome       text        not null,
  telefone   text,
  relacao    text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cliente_referencias_cliente_idx on public.cliente_referencias (cliente_id);

-- -----------------------------------------------------------------------------
-- nucleos_familiares — o CRM familiar
-- -----------------------------------------------------------------------------
-- Duas fontes independentes apontaram para isto: o cadastro já pedia responsável
-- legal e grau de parentesco, e a pesquisa de mercado levantou a campanha
-- familiar. O núcleo é entidade própria porque a pergunta interessante é
-- "quantos da casa têm receita vencendo neste trimestre", e isso não se responde
-- com um campo no cliente.
create table public.nucleos_familiares (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  nome        text        not null,
  titular_id  uuid        references public.clientes (id) on delete set null,
  observacoes text,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index nucleos_familiares_tenant_idx on public.nucleos_familiares (tenant_id) where ativo;

create table public.cliente_nucleo (
  nucleo_id       uuid        not null references public.nucleos_familiares (id) on delete cascade,
  cliente_id      uuid        not null references public.clientes (id) on delete cascade,
  tenant_id       uuid        not null references public.tenants (id) on delete cascade,
  grau_parentesco text,
  created_at      timestamptz not null default now(),
  primary key (nucleo_id, cliente_id)
);

-- Um cliente em dois núcleos faria a campanha familiar contá-lo duas vezes.
create unique index cliente_nucleo_um_por_cliente on public.cliente_nucleo (cliente_id);

-- -----------------------------------------------------------------------------
-- cliente_negativacoes
-- -----------------------------------------------------------------------------
create table public.cliente_negativacoes (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  cliente_id     uuid        not null references public.clientes (id) on delete cascade,
  motivo         text        not null,
  valor          numeric(12, 2) check (valor is null or valor >= 0),
  data_inclusao  date        not null default current_date,
  data_baixa     date,
  incluido_por   uuid        references public.profiles (id) on delete set null,
  baixado_por    uuid        references public.profiles (id) on delete set null,
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cliente_negativacoes_baixa_posterior
    check (data_baixa is null or data_baixa >= data_inclusao)
);

create index cliente_negativacoes_cliente_idx on public.cliente_negativacoes (cliente_id);
-- Uma negativação aberta por cliente basta; a segunda seria ruído no quadro.
create unique index cliente_negativacoes_uma_aberta
  on public.cliente_negativacoes (cliente_id) where data_baixa is null;

-- Mantém clientes.negativado em sincronia com as negativações abertas.
create or replace function public.sincronizar_negativado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := coalesce(new.cliente_id, old.cliente_id);
begin
  update public.clientes c
     set negativado = exists (
       select 1 from public.cliente_negativacoes n
        where n.cliente_id = v_cliente and n.data_baixa is null
     )
   where c.id = v_cliente;
  return coalesce(new, old);
end;
$$;

create trigger cliente_negativacoes_sincroniza
  after insert or update or delete on public.cliente_negativacoes
  for each row execute function public.sincronizar_negativado();

-- -----------------------------------------------------------------------------
-- cliente_metricas — agregados que a listagem mostra
-- -----------------------------------------------------------------------------
-- A listagem de clientes mostra contagem de vendas, O.S., receitas, crediários e
-- parcelas em atraso. Calcular isso em cada abertura de tela, com cinco
-- subconsultas por linha, não escala. Estas colunas são mantidas por trigger
-- pelas migrations que criam venda, O.S., receita e crediário.
create table public.cliente_metricas (
  cliente_id          uuid        primary key references public.clientes (id) on delete cascade,
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  vendas_qtd          integer     not null default 0,
  vendas_valor        numeric(14, 2) not null default 0,
  ticket_medio        numeric(14, 2) not null default 0,
  primeira_compra_em  date,
  ultima_compra_em    date,
  os_qtd              integer     not null default 0,
  receitas_qtd        integer     not null default 0,
  receita_mais_recente date,
  crediarios_qtd      integer     not null default 0,
  parcelas_atraso_qtd integer     not null default 0,
  parcelas_atraso_valor numeric(14, 2) not null default 0,
  atendimentos_qtd    integer     not null default 0,
  atualizado_em       timestamptz not null default now()
);

create index cliente_metricas_atraso_idx
  on public.cliente_metricas (tenant_id) where parcelas_atraso_qtd > 0;

-- Toda linha de cliente tem uma de métricas, criada junto: evita LEFT JOIN e
-- coalesce em toda consulta de listagem.
create or replace function public.criar_metricas_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cliente_metricas (cliente_id, tenant_id)
  values (new.id, new.tenant_id)
  on conflict (cliente_id) do nothing;
  return new;
end;
$$;

create trigger clientes_cria_metricas
  after insert on public.clientes
  for each row execute function public.criar_metricas_cliente();

-- -----------------------------------------------------------------------------
-- RLS e triggers
-- -----------------------------------------------------------------------------
do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'clientes', 'cliente_telefones', 'cliente_emails', 'cliente_referencias',
    'nucleos_familiares', 'cliente_nucleo'
  ] loop
    perform public.aplicar_rls_padrao(
      v_tabela, 'tenant', null,
      'clientes.incluir', 'clientes.alterar', 'clientes.excluir'
    );
    perform public.aplicar_triggers_padrao(v_tabela);
  end loop;

  -- Negativação é informação de crédito do consumidor: leitura também exige
  -- permissão, e a inclusão tem chave própria.
  perform public.aplicar_rls_padrao(
    'cliente_negativacoes', 'tenant',
    'clientes.ver_credito', 'clientes.negativar', 'clientes.negativar', 'clientes.negativar'
  );
  perform public.aplicar_triggers_padrao('cliente_negativacoes');

  perform public.aplicar_rls_padrao('cliente_nucleo', 'tenant', null,
    'clientes.gerenciar_nucleo_familiar',
    'clientes.gerenciar_nucleo_familiar',
    'clientes.gerenciar_nucleo_familiar');
end $$;

-- Métricas são derivadas: o app lê, quem escreve são os triggers de domínio.
alter table public.cliente_metricas enable row level security;

create policy cliente_metricas_select on public.cliente_metricas
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

grant select on public.cliente_metricas to authenticated;
