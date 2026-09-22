-- =============================================================================
-- VISIO · 03d · Gerador de políticas RLS
-- =============================================================================
-- Daqui para frente serão dezenas de tabelas, todas com a mesma forma de
-- política: recorte por rede ou por filial, mais permissão nas escritas.
-- Escrever isso à mão em cada uma é onde o erro aparece — basta UMA política
-- esquecer o `tenant_id` para vazar dado entre redes, e é a única classe de
-- defeito capaz de acabar com o produto.
--
-- Por isso a política é GERADA. O template fica num lugar só, e a suíte
-- 02_rls_coverage.sql confere que nenhuma tabela escapou.
-- =============================================================================

create or replace function public.aplicar_rls_padrao(
  p_tabela      text,
  -- 'tenant': a linha pertence à rede.  'store': pertence a uma filial, e o
  -- acesso segue as filiais do usuário.
  p_escopo      text default 'tenant',
  -- Permissão exigida em cada operação. NULL na leitura significa "basta estar
  -- no escopo" — o padrão do projeto, para falta de permissão não virar lista
  -- vazia. Em dado sensível (custo, margem, financeiro), passe a chave.
  p_perm_select text default null,
  p_perm_insert text default null,
  p_perm_update text default null,
  p_perm_delete text default null
)
returns void
language plpgsql
security definer
set search_path = public
-- Silencia o NOTICE de `drop ... if exists`: numa migration com 20 tabelas são
-- mais de cem linhas de ruído, e ruído esconde aviso de verdade.
set client_min_messages = warning
as $$
declare
  v_escopo_using  text;
  v_escopo_check  text;
begin
  if p_escopo not in ('tenant', 'store') then
    raise exception 'Escopo inválido: %. Use tenant ou store.', p_escopo;
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = p_tabela and c.relkind = 'r'
  ) then
    raise exception 'Tabela public.% não existe', p_tabela;
  end if;

  -- Toda tabela de domínio carrega tenant_id. As store-scoped carregam também
  -- store_id, e aí o recorte é pelas filiais do usuário — que já é um
  -- subconjunto da rede dele, então checar as duas coisas seria redundante.
  -- CADA CHAMADA VAI EMBRULHADA EM (select ...), e isso não é estilo.
  --
  -- Função chamada direto numa política é avaliada UMA VEZ POR LINHA.
  -- Embrulhada numa subconsulta, vira InitPlan: avaliada uma vez por consulta.
  -- Medido neste projeto, numa listagem de 10 mil clientes com 200 mil no
  -- banco: 173 ms na forma direta contra 6,2 ms na embrulhada.
  --
  -- A diferença cresce com o volume — aparece exatamente na rede grande, que é
  -- o cliente que mais paga. A suíte 02_rls_coverage.sql reprova qualquer
  -- política que volte à forma direta.
  if p_escopo = 'store' then
    v_escopo_using := 'store_id in (select public.current_store_ids())';
    v_escopo_check := v_escopo_using
      || ' and tenant_id = (select public.current_tenant_id())';
  else
    v_escopo_using := 'tenant_id = (select public.current_tenant_id())';
    v_escopo_check := v_escopo_using;
  end if;

  execute format('alter table public.%I enable row level security', p_tabela);

  -- Recriar é idempotente: rodar a migration duas vezes não duplica política.
  execute format('drop policy if exists %I on public.%I', p_tabela || '_select', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_insert', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_update', p_tabela);
  execute format('drop policy if exists %I on public.%I', p_tabela || '_delete', p_tabela);

  execute format(
    'create policy %I on public.%I for select to authenticated using (%s)',
    p_tabela || '_select', p_tabela,
    v_escopo_using
      || coalesce(format(' and (select public.has_permission(%L))', p_perm_select), '')
  );

  execute format(
    'create policy %I on public.%I for insert to authenticated with check (%s)',
    p_tabela || '_insert', p_tabela,
    v_escopo_check
      || coalesce(format(' and (select public.has_permission(%L))', p_perm_insert), '')
  );

  execute format(
    'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
    p_tabela || '_update', p_tabela,
    v_escopo_using
      || coalesce(format(' and (select public.has_permission(%L))', p_perm_update), ''),
    v_escopo_check
  );

  execute format(
    'create policy %I on public.%I for delete to authenticated using (%s)',
    p_tabela || '_delete', p_tabela,
    v_escopo_using
      || coalesce(format(' and (select public.has_permission(%L))', p_perm_delete), '')
  );

  execute format(
    'grant select, insert, update, delete on public.%I to authenticated', p_tabela
  );
end;
$$;

comment on function public.aplicar_rls_padrao(text, text, text, text, text, text) is
  'Gera as quatro políticas RLS padrão de uma tabela de domínio. Uma política escrita à mão é uma chance de esquecer o recorte de rede.';

-- -----------------------------------------------------------------------------
-- Conveniências aplicadas a toda tabela nova
-- -----------------------------------------------------------------------------
create or replace function public.aplicar_triggers_padrao(
  p_tabela    text,
  p_auditar   boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
set client_min_messages = warning
as $$
begin
  -- updated_at só faz sentido se a coluna existir.
  if exists (
    select 1 from pg_attribute a
     join pg_class c on c.oid = a.attrelid
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = p_tabela
      and a.attname = 'updated_at' and a.attnum > 0 and not a.attisdropped
  ) then
    execute format('drop trigger if exists %I on public.%I', p_tabela || '_updated_at', p_tabela);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      p_tabela || '_updated_at', p_tabela
    );
  end if;

  if p_auditar then
    execute format('drop trigger if exists %I on public.%I', p_tabela || '_audit', p_tabela);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()',
      p_tabela || '_audit', p_tabela
    );
  end if;
end;
$$;
