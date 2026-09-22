-- =============================================================================
-- VISIO · 05 · Fornecedores, laboratórios, funcionários e equipes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fornecedores
-- -----------------------------------------------------------------------------
create table public.fornecedores (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  nome_fantasia       text        not null,
  razao_social        text,
  cpf_cnpj            text,
  -- Um fornecedor pode ser laboratório óptico: é o que faz ele aparecer no
  -- seletor de laboratório da O.S. e na conciliação de pedidos faturados.
  is_laboratorio      boolean     not null default false,
  -- Prazo médio de produção do laboratório, em dias úteis. Alimenta a previsão
  -- de entrega da O.S. quando a etapa não tem SLA próprio.
  prazo_producao_dias smallint    check (prazo_producao_dias is null or prazo_producao_dias >= 0),
  inscricao_estadual  text,
  inscricao_municipal text,
  suframa             text,
  contribuinte_icms   boolean     not null default false,
  cep                 text,
  endereco            text,
  numero              text,
  complemento         text,
  bairro              text,
  cidade              text,
  uf                  char(2),
  telefone            text,
  email               text,
  website             text,
  observacoes         text,
  ativo               boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index fornecedores_documento_unico
  on public.fornecedores (tenant_id, public.somente_digitos(cpf_cnpj))
  where cpf_cnpj is not null and btrim(cpf_cnpj) <> '';
create index fornecedores_nome_idx
  on public.fornecedores (tenant_id, public.normalizar_texto(nome_fantasia));
create index fornecedores_laboratorios_idx
  on public.fornecedores (tenant_id) where is_laboratorio and ativo;

comment on column public.fornecedores.is_laboratorio is
  'Marca o fornecedor como laboratório óptico — aparece no seletor de laboratório da O.S.';

-- Um fornecedor tem várias pessoas de contato, cada uma com telefone próprio:
-- o vendedor da conta não é quem resolve problema de montagem.
create table public.fornecedor_contatos (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  fornecedor_id  uuid        not null references public.fornecedores (id) on delete cascade,
  nome           text        not null,
  cargo          text,
  email          text,
  telefone_fixo  text,
  telefone_movel text,
  observacao     text,
  principal      boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index fornecedor_contatos_fornecedor_idx
  on public.fornecedor_contatos (fornecedor_id);
-- No máximo um contato principal por fornecedor.
create unique index fornecedor_contatos_um_principal
  on public.fornecedor_contatos (fornecedor_id) where principal;

-- -----------------------------------------------------------------------------
-- funcionarios
-- -----------------------------------------------------------------------------
-- Separado de `profiles` de propósito: existe funcionário sem acesso ao sistema
-- (o montador do laboratório), e a comissão é do funcionário, não do login.
create table public.funcionarios (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  store_id       uuid        references public.stores (id) on delete set null,
  nome           text        not null,
  funcao         text,
  cpf            text,
  rg             text,
  data_nascimento date,
  data_admissao  date,
  data_demissao  date,
  telefone_fixo  text,
  telefone_movel text,
  email          text,
  cep            text,
  endereco       text,
  numero         text,
  complemento    text,
  bairro         text,
  cidade         text,
  uf             char(2),
  foto_url       text,
  observacoes    text,
  ativo          boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint funcionarios_demissao_posterior
    check (data_demissao is null or data_admissao is null or data_demissao >= data_admissao)
);

create unique index funcionarios_cpf_unico
  on public.funcionarios (tenant_id, public.somente_digitos(cpf))
  where cpf is not null and btrim(cpf) <> '';
create index funcionarios_nome_idx
  on public.funcionarios (tenant_id, public.normalizar_texto(nome));
create index funcionarios_store_idx on public.funcionarios (store_id) where ativo;

comment on table public.funcionarios is
  'Funcionário da rede. Pode existir sem login: comissão e vínculo de venda são do funcionário, não do usuário.';

-- Vínculo do login com o funcionário. Existe agora porque `profiles` foi criado
-- na migration 02, antes desta tabela.
alter table public.profiles
  add column funcionario_id uuid references public.funcionarios (id) on delete set null;

create unique index profiles_funcionario_unico
  on public.profiles (funcionario_id) where funcionario_id is not null;

comment on column public.profiles.funcionario_id is
  'Funcionário que este login representa. Um funcionário tem no máximo um login.';

-- -----------------------------------------------------------------------------
-- equipes — a hierarquia de vendas, base da comissão de gerente
-- -----------------------------------------------------------------------------
create table public.equipes (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references public.tenants (id) on delete cascade,
  store_id    uuid        references public.stores (id) on delete cascade,
  nome        text        not null,
  gerente_id  uuid        references public.funcionarios (id) on delete set null,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index equipes_nome_unico
  on public.equipes (tenant_id, public.normalizar_texto(nome));

create table public.equipe_membros (
  equipe_id      uuid        not null references public.equipes (id) on delete cascade,
  funcionario_id uuid        not null references public.funcionarios (id) on delete cascade,
  tenant_id      uuid        not null references public.tenants (id) on delete cascade,
  desde          date        not null default current_date,
  ate            date,
  primary key (equipe_id, funcionario_id),
  constraint equipe_membros_periodo check (ate is null or ate >= desde)
);

create index equipe_membros_funcionario_idx on public.equipe_membros (funcionario_id);

-- Um funcionário em duas equipes ao mesmo tempo faria a comissão de gerente ser
-- paga duas vezes sobre a mesma venda.
create or replace function public.guard_equipe_membros()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
      from public.equipe_membros em
      join public.equipes e on e.id = em.equipe_id
     where em.funcionario_id = new.funcionario_id
       and em.equipe_id <> new.equipe_id
       and e.ativo
       and em.ate is null
  ) then
    raise exception 'Este funcionário já está em outra equipe ativa. Encerre o vínculo anterior primeiro.';
  end if;
  return new;
end;
$$;

create trigger equipe_membros_guard
  before insert or update on public.equipe_membros
  for each row execute function public.guard_equipe_membros();

-- -----------------------------------------------------------------------------
-- RLS e triggers
-- -----------------------------------------------------------------------------
do $$
begin
  perform public.aplicar_rls_padrao('fornecedores',        'tenant', null, 'cadastros.fornecedores', 'cadastros.fornecedores', 'cadastros.fornecedores');
  perform public.aplicar_rls_padrao('fornecedor_contatos', 'tenant', null, 'cadastros.fornecedores', 'cadastros.fornecedores', 'cadastros.fornecedores');
  perform public.aplicar_rls_padrao('funcionarios',        'tenant', null, 'cadastros.funcionarios', 'cadastros.funcionarios', 'cadastros.funcionarios');
  perform public.aplicar_rls_padrao('equipes',             'tenant', null, 'cadastros.equipes',      'cadastros.equipes',      'cadastros.equipes');
  perform public.aplicar_rls_padrao('equipe_membros',      'tenant', null, 'cadastros.equipes',      'cadastros.equipes',      'cadastros.equipes');

  perform public.aplicar_triggers_padrao('fornecedores');
  perform public.aplicar_triggers_padrao('fornecedor_contatos');
  perform public.aplicar_triggers_padrao('funcionarios');
  perform public.aplicar_triggers_padrao('equipes');
  perform public.aplicar_triggers_padrao('equipe_membros');
end $$;
