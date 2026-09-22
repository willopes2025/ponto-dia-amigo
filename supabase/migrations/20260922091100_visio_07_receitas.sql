-- =============================================================================
-- VISIO · 07 · Receitas ópticas (prescrições)
-- =============================================================================
-- A receita é entidade de primeira classe, não um campo no cliente. É ela que
-- dispara o recall de recompra (receita vencida), que alimenta o Livro de
-- Receitas e que o motor óptico consulta para vetar lente incompatível.
--
-- Os graus ficam em colunas por olho, não numa tabela filha. São exatamente dois
-- olhos, para sempre, e toda consulta útil precisa dos dois ao mesmo tempo —
-- normalizar aqui só acrescentaria um join a cada leitura.
-- =============================================================================

create type public.tipo_receita as enum ('oculos', 'lente_contato');

create table public.receitas (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null references public.tenants (id) on delete cascade,
  store_id      uuid        references public.stores (id) on delete set null,
  cliente_id    uuid        not null references public.clientes (id) on delete cascade,
  codigo        bigint      not null,

  tipo          public.tipo_receita not null default 'oculos',
  medico_id     uuid        references public.medicos (id) on delete set null,
  -- Nome livre para quando o prescritor não está cadastrado — acontece com
  -- receita trazida de fora, e exigir cadastro antes travaria o atendimento.
  medico_nome   text,
  data_receita  date        not null default current_date,
  validade      date        not null,

  -- Olho direito
  od_esferico   numeric(5, 2),
  od_cilindrico numeric(5, 2),
  od_eixo       smallint    check (od_eixo is null or od_eixo between 0 and 180),
  od_adicao     numeric(4, 2),
  od_dnp        numeric(5, 2) check (od_dnp is null or od_dnp between 20 and 45),
  od_altura     numeric(5, 2) check (od_altura is null or od_altura between 10 and 40),
  od_prisma     numeric(4, 2),
  od_base       text,
  od_curva_base numeric(4, 2),
  od_diametro   numeric(4, 2),

  -- Olho esquerdo
  oe_esferico   numeric(5, 2),
  oe_cilindrico numeric(5, 2),
  oe_eixo       smallint    check (oe_eixo is null or oe_eixo between 0 and 180),
  oe_adicao     numeric(4, 2),
  oe_dnp        numeric(5, 2) check (oe_dnp is null or oe_dnp between 20 and 45),
  oe_altura     numeric(5, 2) check (oe_altura is null or oe_altura between 10 and 40),
  oe_prisma     numeric(4, 2),
  oe_base       text,
  oe_curva_base numeric(4, 2),
  oe_diametro   numeric(4, 2),

  -- Derivada: a regra de segundo par ("multifocal sem solar com grau") e o veto
  -- do motor óptico consultam isto o tempo todo. Coluna gerada não desatualiza.
  multifocal    boolean     generated always as (
                  coalesce(od_adicao, 0) <> 0 or coalesce(oe_adicao, 0) <> 0
                ) stored,

  observacoes   text,
  arquivo_url   text,
  criado_por    uuid        references public.profiles (id) on delete set null,
  ativo         boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint receitas_validade_posterior check (validade >= data_receita),
  constraint receitas_prescritor_informado
    check (medico_id is not null or nullif(btrim(coalesce(medico_nome, '')), '') is not null),

  -- A grade real de lentes anda de 0,25 em 0,25 dioptria. Aceitar 1,37 deixa
  -- entrar uma receita que nenhum laboratório monta — e o erro só aparece na
  -- O.S. travada, dias depois.
  constraint receitas_od_esferico_grade   check (od_esferico   is null or (od_esferico   * 100)::integer % 25 = 0),
  constraint receitas_oe_esferico_grade   check (oe_esferico   is null or (oe_esferico   * 100)::integer % 25 = 0),
  constraint receitas_od_cilindrico_grade check (od_cilindrico is null or (od_cilindrico * 100)::integer % 25 = 0),
  constraint receitas_oe_cilindrico_grade check (oe_cilindrico is null or (oe_cilindrico * 100)::integer % 25 = 0),
  constraint receitas_od_adicao_grade     check (od_adicao     is null or ((od_adicao * 100)::integer % 25 = 0 and od_adicao between 0 and 4)),
  constraint receitas_oe_adicao_grade     check (oe_adicao     is null or ((oe_adicao * 100)::integer % 25 = 0 and oe_adicao between 0 and 4)),
  constraint receitas_od_faixa            check (od_esferico   is null or od_esferico   between -30 and 30),
  constraint receitas_oe_faixa            check (oe_esferico   is null or oe_esferico   between -30 and 30),

  -- Cilindro sem eixo é receita incompleta: a lente não pode ser montada.
  constraint receitas_od_eixo_obrigatorio
    check (coalesce(od_cilindrico, 0) = 0 or od_eixo is not null),
  constraint receitas_oe_eixo_obrigatorio
    check (coalesce(oe_cilindrico, 0) = 0 or oe_eixo is not null),

  -- Curva base e diâmetro são de lente de contato; DNP e altura, de óculos.
  constraint receitas_lc_sem_dnp
    check (tipo <> 'lente_contato' or (od_dnp is null and oe_dnp is null))
);

create unique index receitas_codigo_unico on public.receitas (tenant_id, codigo);
create index receitas_cliente_idx on public.receitas (cliente_id, data_receita desc);
-- O índice que sustenta o recall: receitas vencidas, por rede, em ordem de
-- vencimento. É a consulta mais repetida da camada de inteligência.
create index receitas_validade_idx on public.receitas (tenant_id, validade) where ativo;
create index receitas_medico_idx on public.receitas (medico_id) where medico_id is not null;
create index receitas_multifocal_idx on public.receitas (tenant_id) where multifocal and ativo;

comment on table public.receitas is
  'Prescrição óptica. Base do Livro de Receitas, do recall por receita vencida e do veto de compatibilidade de lente.';
comment on column public.receitas.multifocal is
  'Gerada: verdadeira quando há adição em algum olho. Usada pela regra de segundo par e pelo motor óptico.';

-- Validade padrão de um ano a partir da data da receita, quando não informada.
create or replace function public.receitas_preencher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo is null then
    new.codigo := public.proximo_numero(new.tenant_id, 'receita');
  end if;
  if new.validade is null then
    new.validade := new.data_receita + interval '1 year';
  end if;
  return new;
end;
$$;

-- BEFORE INSERT roda antes da checagem de NOT NULL, então `codigo` e `validade`
-- seguem obrigatórios na coluna e ainda são preenchidos aqui. Deixá-los
-- anuláveis "por garantia" propagaria um `| null` por todo o TypeScript, em
-- campos que na prática nunca são nulos.
create trigger receitas_preencher_trg
  before insert on public.receitas
  for each row execute function public.receitas_preencher();

-- -----------------------------------------------------------------------------
-- receita_historico — a receita é documento clínico; alteração fica registrada
-- -----------------------------------------------------------------------------
-- A trilha genérica de auditoria já guarda o diff, mas aqui o histórico é parte
-- do produto: o Livro de Receitas precisa mostrar a versão vigente em uma data.
create table public.receita_historico (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null references public.tenants (id) on delete cascade,
  receita_id   uuid        not null references public.receitas (id) on delete cascade,
  versao       integer     not null,
  dados        jsonb       not null,
  alterado_por uuid        references public.profiles (id) on delete set null,
  alterado_em  timestamptz not null default now()
);

create unique index receita_historico_versao on public.receita_historico (receita_id, versao);

create or replace function public.receitas_versionar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao integer;
begin
  select coalesce(max(versao), 0) + 1 into v_versao
    from public.receita_historico where receita_id = old.id;

  insert into public.receita_historico (tenant_id, receita_id, versao, dados, alterado_por)
  values (old.tenant_id, old.id, v_versao, to_jsonb(old), public.current_profile_id());

  return new;
end;
$$;

create trigger receitas_versionar_trg
  before update on public.receitas
  for each row execute function public.receitas_versionar();

-- -----------------------------------------------------------------------------
-- Métricas do cliente
-- -----------------------------------------------------------------------------
create or replace function public.atualizar_metricas_receita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := coalesce(new.cliente_id, old.cliente_id);
begin
  update public.cliente_metricas m
     set receitas_qtd = (
           select count(*) from public.receitas r
            where r.cliente_id = v_cliente and r.ativo
         ),
         receita_mais_recente = (
           select max(r.data_receita) from public.receitas r
            where r.cliente_id = v_cliente and r.ativo
         ),
         atualizado_em = now()
   where m.cliente_id = v_cliente;

  return coalesce(new, old);
end;
$$;

create trigger receitas_metricas
  after insert or update or delete on public.receitas
  for each row execute function public.atualizar_metricas_receita();

-- -----------------------------------------------------------------------------
-- Visões de trabalho
-- -----------------------------------------------------------------------------
-- Receitas vencidas elegíveis para recall. "Elegível" tem regra: o cliente está
-- ativo, não está negativado, consentiu contato e tem pelo menos um canal aberto.
-- Sem esse filtro, a fila de recall inclui gente para quem não se pode escrever.
create view public.vw_receitas_vencidas
with (security_invoker = true)
as
select
  r.id                         as receita_id,
  r.tenant_id,
  r.store_id,
  r.cliente_id,
  r.codigo,
  r.tipo,
  r.data_receita,
  r.validade,
  r.multifocal,
  current_date - r.validade    as dias_vencida,
  c.nome                       as cliente_nome,
  c.negativado,
  c.consentimento_contato_em is not null as consentiu_contato,
  exists (
    select 1 from public.cliente_telefones t
     where t.cliente_id = c.id and (t.aceita_whatsapp or t.aceita_sms)
  )                            as tem_canal_aberto,
  m.ultima_compra_em,
  m.ticket_medio
from public.receitas r
join public.clientes c        on c.id = r.cliente_id
left join public.cliente_metricas m on m.cliente_id = c.id
where r.ativo
  and c.ativo
  and r.validade < current_date
  -- Só a receita mais recente do cliente conta: a de três anos atrás já foi
  -- substituída, e contar as duas inflaria a fila e a oportunidade em aberto.
  and r.data_receita = (
    select max(r2.data_receita) from public.receitas r2
     where r2.cliente_id = r.cliente_id and r2.ativo and r2.tipo = r.tipo
  );

comment on view public.vw_receitas_vencidas is
  'Receitas vencidas com os sinais de elegibilidade para recall. Só a mais recente por cliente e tipo.';

-- -----------------------------------------------------------------------------
-- RLS e triggers
-- -----------------------------------------------------------------------------
do $$
begin
  perform public.aplicar_rls_padrao('receitas', 'tenant', null,
    'receitas.incluir', 'receitas.alterar', 'receitas.excluir');
  perform public.aplicar_triggers_padrao('receitas');
end $$;

-- Histórico é somente leitura para o app: quem escreve é o trigger.
alter table public.receita_historico enable row level security;

create policy receita_historico_select on public.receita_historico
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

grant select on public.receita_historico to authenticated;
grant select on public.vw_receitas_vencidas to authenticated;
