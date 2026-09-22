-- =============================================================================
-- VISIO · 05c · Numeração sequencial por rede e por filial
-- =============================================================================
-- Cliente, orçamento, venda e O.S. precisam de número legível — "O.S. 1042", não
-- um UUID. E o número é por rede ou por filial, não global: a loja 2 tem a sua
-- venda nº 1.
--
-- Por que não uma sequence do Postgres por escopo: seriam centenas de objetos
-- criados em tempo de execução, um por rede × escopo, impossíveis de versionar
-- em migration. Uma tabela de contadores com UPSERT atômico resolve, e o
-- `returning` do UPDATE serializa os concorrentes na própria linha.
-- =============================================================================

create table public.contadores (
  id        uuid    primary key default gen_random_uuid(),
  tenant_id uuid    not null references public.tenants (id) on delete cascade,
  -- NULL = contador da rede inteira. Preenchido = contador daquela filial.
  store_id  uuid    references public.stores (id) on delete cascade,
  escopo    text    not null,
  valor     bigint  not null default 0 check (valor >= 0)
);

comment on table public.contadores is
  'Contadores de numeração legível. Incrementados só por proximo_numero(), que serializa na linha.';

-- Chave natural em dois índices parciais, não numa PK composta: o Postgres não
-- aceita NULL em coluna de chave primária, e o contador de rede é justamente o
-- que tem store_id nulo. Os índices parciais garantem a unicidade nos dois
-- casos e ainda dão o alvo que o ON CONFLICT precisa.
create unique index contadores_rede_unico
  on public.contadores (tenant_id, escopo)
  where store_id is null;
create unique index contadores_filial_unico
  on public.contadores (tenant_id, escopo, store_id)
  where store_id is not null;

create or replace function public.proximo_numero(
  p_tenant_id uuid,
  p_escopo    text,
  p_store_id  uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor bigint;
begin
  if p_tenant_id is null then
    raise exception 'proximo_numero exige tenant_id';
  end if;

  -- O UPDATE ... RETURNING trava a linha: dois caixas emitindo venda ao mesmo
  -- tempo pegam números diferentes, sem buraco e sem repetição.
  if p_store_id is null then
    update public.contadores
       set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id is null
    returning valor into v_valor;
  else
    update public.contadores
       set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id = p_store_id
    returning valor into v_valor;
  end if;

  if v_valor is not null then
    return v_valor;
  end if;

  -- Primeiro número deste escopo. O ON CONFLICT cobre a corrida entre dois
  -- inserts simultâneos do mesmo contador.
  insert into public.contadores (tenant_id, store_id, escopo, valor)
  values (p_tenant_id, p_store_id, p_escopo, 1)
  on conflict do nothing
  returning valor into v_valor;

  if v_valor is not null then
    return v_valor;
  end if;

  -- Alguém criou a linha entre o UPDATE e o INSERT: tenta de novo.
  if p_store_id is null then
    update public.contadores set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id is null
    returning valor into v_valor;
  else
    update public.contadores set valor = valor + 1
     where tenant_id = p_tenant_id and escopo = p_escopo and store_id = p_store_id
    returning valor into v_valor;
  end if;

  return v_valor;
end;
$$;

comment on function public.proximo_numero(uuid, text, uuid) is
  'Próximo número de um escopo (cliente, venda, os…), por rede ou por filial. Atômico.';

-- Contadores não são editáveis pelo app: quem mexe é a função, que roda como
-- dono. A leitura é liberada ao escopo da rede para a tela poder mostrar
-- "próximo número".
alter table public.contadores enable row level security;

create policy contadores_select on public.contadores
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

grant select on public.contadores to authenticated;
