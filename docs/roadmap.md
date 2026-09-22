# VISIO — Plataforma de Gestão e Inteligência para Óticas

## Context

Este repositório (`willopes2025/ponto-dia-amigo`) hoje hospeda o **Ponto Seguro**, um app de
controle de ponto gerado no Lovable: React 18 + Vite + TypeScript + Tailwind + shadcn/ui +
Supabase, ~6,6k linhas, 12 tabelas, 23 migrations. Não há testes nem CI, e três dependências
já instaladas — React Query, react-hook-form e zod — **nunca são usadas**: todo o
data-fetching é `useState` + `useEffect` + chamada inline ao Supabase (`src/pages/*.tsx`), e
todo formulário é `useState` manual ou `FormData` cru (`src/pages/Auth.tsx:25`).

O objetivo agora é outro produto: a **VISIO**, plataforma multi-tenant de gestão *e
inteligência comercial* para óticas, descrita em dois documentos:

- **Esqueleto Funcional** — escopo de ERP vertical completo: clientes, receitas ópticas,
  produtos com preço/estoque por filial, orçamentos, vendas, Ordens de Serviço em Kanban com
  SLA, estoque, financeiro (crediário/cheque/cartão/boleto), marketing, comissões, 13
  relatórios, ~20 cadastros auxiliares, permissões granulares (~176 toggles), add-ons como
  assinaturas independentes.
- **VISIO Addendum v1.3** — a camada que nenhum concorrente tem: **atendimento sem venda**,
  **objeção** estruturada, **experimentação** de armação bipada, funil com **fórmula honesta
  de oportunidade em aberto**, motor de segundo par, próxima melhor oferta ordenada por
  **margem** com veto do motor óptico, CRM familiar, painel proativo do dono e — a assinatura
  do produto — **atribuição com grupo de controle**, que mede o incremental real em vez de
  creditar à IA toda venda que aconteceu depois de uma mensagem.

Decisões do dono do produto nesta sessão:

1. **Onde**: a VISIO substitui o app deste repositório (telas de ponto saem do caminho e
   ficam no histórico do git; o schema antigo não é tocado).
2. **Backend**: **novo projeto Supabase**, schema limpo; todas as migrations escritas aqui.
3. **Ordem**: **núcleo ERP primeiro, camada VISIO depois** — captura e inteligência precisam
   do cadastro, do estoque e da venda reais para não serem genéricas.
4. **Integrações**: fiscal (NF-e/NFC-e), boleto/CNAB, adquirente, WhatsApp e IA são
   **modelados por completo no banco** e ligados por **adapters com mock** — trocar por
   Focus NF-e / Asaas / Z-API depois é plugar credencial, não refatorar.

Resultado pretendido: plataforma completa, entregue em fases, cada fase deixando o app em
estado funcional e demonstrável — não um esqueleto de telas vazias.

> **Nota de tamanho, dita de frente:** o escopo somado dos dois documentos é trabalho de
> meses, não de uma sessão. O plano abaixo é a plataforma inteira, fatiada em 10 fases
> independentemente demonstráveis. Vou executar em sequência e commitar por fase na branch
> `claude/modest-carson-fwghpa`; ao fim de cada fase o app roda, e você decide se segue.

---

## Arquitetura de dados

### Tenancy em dois níveis (o que o schema atual não tem)

Hoje há um nível só: `companies` → `profiles.company_id`. A VISIO precisa de dois, porque
preço, estoque, caixa e venda são **por filial**, enquanto cliente e produto são cadastrados
**uma vez por rede**:

- `tenants` — a rede de óticas (plano, slug, ativo).
- `stores` — a filial: razão social, CNPJ, IE/IM, endereço, timezone, `dias_uteis int[]`,
  validade de certificado, status de licença.
- `profiles` — usuário ↔ `tenant_id`, vínculo com `funcionarios`.
- `user_stores` — a quais filiais o usuário tem acesso (base do seletor de loja).

Convenção: toda tabela carrega `tenant_id`; as store-scoped carregam também `store_id`.

### RBAC como matriz módulo × ação

O `positions.permissoes` atual é um JSONB de 6 chaves que a UI escreve e **ninguém lê**
(`src/components/employees/PositionManager.tsx:26`). A VISIO troca por catálogo real:

- `permissions` — catálogo semeado: `key` (`vendas.cancelar`), `modulo`, `acao`, `label`,
  `descricao`, `sensivel bool`. ~180 chaves, na granularidade do documento (dentro de
  "Vendas": `consultar`, `consultar_proprias`, `incluir`, `cancelar`, `excluir`,
  `data_retroativa`, `alterar_valor_unitario`, `autorizar_desconto_distancia`,
  `alterar_funcionario`, `duplicar`, `imprimir`, `ver_margem`…).
- `permission_profiles` — o "Modelo de Permissões" (por tenant, `is_owner bool`).
- `permission_profile_permissions` — join profile ↔ key (queryável, versionável).
- `user_permission_profiles` — usuário pode ter vários modelos (é o "Grupo de Permissões").

### Helpers de RLS (SECURITY DEFINER, padrão já validado neste repo)

O repo atual já usa o padrão certo em
`supabase/migrations/20250902202237_*.sql:4` (`get_user_company_id()`) e
`supabase/migrations/20250908170657_*.sql` (`is_admin()`). Generalizo para:

```sql
create or replace function public.current_tenant_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where user_id = auth.uid() limit 1 $$;

create or replace function public.current_store_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select us.store_id from public.user_stores us
  join public.profiles p on p.id = us.profile_id
  where p.user_id = auth.uid() $$;

create or replace function public.has_permission(p_key text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles pr
    join public.user_permission_profiles upp on upp.profile_id = pr.id
    join public.permission_profiles pp on pp.id = upp.permission_profile_id and pp.ativo
    left join public.permission_profile_permissions ppp
           on ppp.permission_profile_id = pp.id and ppp.permission_key = p_key
    where pr.user_id = auth.uid() and (pp.is_owner or ppp.permission_key is not null)
  ) $$;
```

**Política de uso, decidida de propósito:** o isolamento tenant/filial é enforced por RLS em
*todas* as tabelas, sem exceção — é a garantia que não pode depender do cliente. A checagem
de permissão entra no RLS apenas nas escritas e nas leituras sensíveis (custo, margem,
financeiro); as leituras comuns são gated na UI. Motivo: `has_permission` dentro de um
`SELECT` transforma falta de permissão em "lista vazia", que é um bug difícil de diagnosticar
em suporte. Template por tabela store-scoped:

```sql
alter table public.vendas enable row level security;
create policy "vendas_select" on public.vendas for select
  using (store_id in (select public.current_store_ids()));
create policy "vendas_insert" on public.vendas for insert
  with check (store_id in (select public.current_store_ids())
              and public.has_permission('vendas.incluir'));
create policy "vendas_update" on public.vendas for update
  using (store_id in (select public.current_store_ids())
         and public.has_permission('vendas.alterar'));
create policy "vendas_delete" on public.vendas for delete
  using (store_id in (select public.current_store_ids())
         and public.has_permission('vendas.excluir'));
```

### Migrations (arquivos em `supabase/migrations/`, ordem obrigatória)

| # | Arquivo | Conteúdo |
|---|---|---|
| 01 | `..._extensoes_e_helpers.sql` | `pgcrypto`, `unaccent`, `pg_trgm`; `set_updated_at()`; `audit_log` + `audit_trigger()` |
| 02 | `..._tenancy.sql` | `tenants`, `stores`, `profiles`, `user_stores`, `handle_new_user()` (cria tenant + 1ª loja + perfil Proprietário), `current_tenant_id`, `current_store_ids` |
| 03 | `..._rbac.sql` | `permissions` (+seed ~180 chaves), `permission_profiles`, `permission_profile_permissions`, `user_permission_profiles`, `has_permission()`, RLS das tabelas de tenancy |
| 04 | `..._cadastros_auxiliares.sql` | `unidades`, `grupos`, `subgrupos`, `grifes`, `cores`, `tamanhos`, `formatos`, `generos`, `tipos_lente`, `convenios`, `formas_pagamento`, `medicos`, `responsaveis_tecnicos`, `tipos_documento`, `plano_contas` (árvore), `situacoes_conta_receber`, `origens_cliente`, `motivos_cancelamento`, `feriados` |
| 05 | `..._fornecedores_funcionarios.sql` | `fornecedores` (+`is_laboratorio`), `fornecedor_contatos`, `funcionarios`, `funcionario_stores`, `equipes`, `equipe_membros` |
| 06 | `..._clientes.sql` | `clientes`, `cliente_telefones`, `cliente_emails`, `cliente_referencias`, `nucleos_familiares`, `cliente_nucleo` (+grau de parentesco), `cliente_negativacoes` |
| 07 | `..._receitas.sql` | `receitas` (OD/OE: esférico, cilíndrico, eixo, adição, DNP, altura; médico, data, validade), `receita_historico` |
| 08 | `..._produtos.sql` | `produtos`, `produto_fornecedores`, `produto_stores` (custo, %lucro, preço, qtd atual/mínima — **por filial**), `produto_fiscal` (NCM/CEST + matriz operação × dentro/fora do estado), `produto_imagens`, `tabelas_lentes`, `tabela_lentes_itens`, `tabela_lentes_conferencias` |
| 09 | `..._vendas_os.sql` | `orcamentos(+itens)`, `vendas(+itens, +pagamentos)`, `os_tipos`, `os_etapas` (ordem, `sla_dias_uteis`, `is_final`), `ordens_servico(+itens)`, `os_etapa_historico`, `add_business_days()`, `business_days_between()`, RPC `mover_os_etapa()` |
| 10 | `..._estoque.sql` | `estoque_movimentos` (livro único), `entradas_nf` + `entrada_nf_itens` (XML), `transferencias(+itens)`, `inventarios(+itens)`, `etiqueta_lotes(+itens)` |
| 11 | `..._financeiro.sql` | `contas`, `caixa_sessoes`, `caixa_lancamentos`, `contas_pagar`, `contas_receber`, `crediarios(+parcelas)`, `recebimentos`, `recebimentos_cartao` (taxa/líquido), `antecipacoes`, `cheques(+historico)`, `boletos`, `cnab_remessas`, `cnab_retornos`, `renegociacoes`, `trocas`, `troca_creditos`, `pedidos_fornecedor(+itens)`, `dre_config` |
| 12 | `..._comissoes.sql` | `comissao_parametros`, `comissao_regras` (geral/grupo/produto), `comissao_apuracoes(+itens)`, variante gerente/equipe |
| 13 | `..._marketing.sql` | `mensagem_templates`, `campanhas(+destinatarios)`, `eventos_automacao`, `evento_execucoes`, `message_logs`, `cashback_contas(+movimentos)`, `indicacoes`, `vitrine_config` |
| 14 | `..._visio_captura.sql` | `atendimentos`, `objecoes_catalogo`, `atendimento_objecoes`, `experimentacoes`, `contra_argumentos`, `contra_argumento_usos` |
| 15 | `..._visio_inteligencia.sql` | `filas`(+`fila_versoes`), `fila_itens` (grupo tratamento/controle), `fila_acoes`, `fila_resultados`, `oportunidades`, `oportunidade_catalogo`, `nbo_ofertas(+opcoes)`, `metricas_historicas`, `planogramas(+posicoes)`, `vitrine_auditorias` |
| 16 | `..._planos_assinaturas_clube.sql` | `planos`, `plano_features`, `assinaturas` (add-on = assinatura própria), `clube_planos`, `clube_beneficios` (+custo modelado), `clube_membros`, `cobrancas_recorrentes(+tentativas)` |
| 17 | `..._views_relatorios.sql` | views/matviews: `vw_vendas`, `vw_posicao_estoque`, `vw_extrato_financeiro`, `mv_kpis_diarios` + refresh |
| 18 | `..._seed_demo.sql` | dados de demonstração (opcional, atrás de flag) |

---

## As três peças difíceis de lógica

### a. Kanban de O.S. com SLA em dias úteis

- Etapas são **dados**, não enum: `os_etapas(tenant_id, os_tipo_id, nome, ordem,
  sla_dias_uteis, is_final, cor)` — cada ótica adapta o pipeline (laboratório próprio vs.
  terceirizado), como o documento exige.
- `ordens_servico` guarda `etapa_id`, `etapa_entrada_em`, `previsao_saida`. Atraso é
  derivado, não persistido (`previsao_saida < current_date and not entregue`).
- Dias úteis no banco, com feriados por rede/filial e `stores.dias_uteis int[]`:
  `add_business_days(p_start date, p_days int, p_store uuid)` e
  `business_days_between(a, b, p_store)` em PL/pgSQL. Feriados nacionais semeados; a ótica
  adiciona os locais.
- Transição por **uma RPC** `mover_os_etapa(p_os_id, p_etapa_id, p_observacao)`: valida
  permissão, grava `os_etapa_historico` (etapa de/para, quem, quando, duração em dias úteis),
  recalcula `previsao_saida` pelo SLA da nova etapa e devolve a linha. O drag-and-drop
  (`@dnd-kit`, a adicionar) faz update otimista no React Query e reverte no erro — a verdade
  é sempre a RPC.
- O botão "Entregar" existe em qualquer etapa (pular direto), como no documento.

### b. Atribuição com grupo de controle — a assinatura do produto

O risco declarado no addendum (C3) é contar como recuperada toda venda que aconteceu depois
de qualquer mensagem. O desenho evita isso por construção:

- `filas(key, nome, regra, holdout_pct, janela_atribuicao_dias, seed, ativa)`; mudanças
  geram `fila_versoes` — alterar o holdout **não reescreve história**.
- `fila_itens(fila_id, fila_versao_id, cliente_id, store_id, coorte date, bucket int,
  grupo enum('tratamento','controle'), motivo, status)`.
- **Holdout determinístico e auditável**: `bucket` vem de um hash estável de
  `fila_id || cliente_id || coorte || seed` → inteiro em [0,10000); `grupo = 'controle'`
  quando `bucket < holdout_pct * 100`. O bucket é **persistido** (auditável) e um trigger
  impede alterar `grupo` depois de criado — sem re-randomização, que é o que destruiria a
  medição.
- `fila_acoes` registra o que foi enviado; um trigger **bloqueia ação em item de controle** —
  a integridade do controle é garantida pelo banco, não pela disciplina de quem codifica.
- `fila_resultados` (job noturno): para cada item, houve venda daquele cliente naquela loja
  dentro de `janela_atribuicao_dias` a partir de `gerado_em`, e qual o valor.
- Cálculo: `lift = conv_tratamento − conv_controle`;
  `incremental = n_tratamento × lift × ticket_medio_tratamento`. O painel mostra **os dois
  números lado a lado** ("R$ 11.420 recuperados, dos quais R$ 7.900 incrementais"), com
  tamanho do holdout, janela e **intervalo de confiança** (teste z de duas proporções); e
  quando `n` é pequeno, escreve "amostra insuficiente" em vez de um número bonito. Um número
  menor e verificável é o ponto (bloco G do addendum).

### c. Oportunidade em aberto — fórmula reprodutível

Implemento **exatamente** a fórmula conservadora do bloco C2, e não a versão ingênua:

```
Oportunidade em aberto =
    Σ orçamentos abertos dentro da validade                              -- orcamentos
  + atendimentos sem orçamento × ticket_medio × taxa_conv_atendimento    -- atendimentos
  + receitas vencidas elegíveis × ticket_medio × taxa_recompra           -- receitas
```

- Termo 1: `orcamentos` com `status='aberto' and validade >= current_date`, por filial.
- Termo 2: `atendimentos` no período sem orçamento nem venda vinculados; `ticket_medio` de
  `vendas` (90d); `taxa_conv_atendimento` = atendimentos com venda ÷ atendimentos (180d).
- Termo 3: `receitas` vencidas de clientes ativos e não negativados sem compra recente;
  `taxa_recompra` = share de clientes com receita vencida que compraram em 180d (12 meses).
- As taxas vivem em `metricas_historicas(tenant_id, store_id, metrica, janela, valor,
  amostra_n, calculado_em)`, recalculadas à noite. O card do dashboard tem um popover que
  mostra **cada termo, a taxa usada e o tamanho da amostra** — reprodutibilidade é o
  requisito, porque um número grande e mal calculado destrói a credibilidade na primeira
  conferência do lojista.

---

## Arquitetura de frontend

Feature-first, para o app não virar uma pasta `pages/` com 60 arquivos:

```
src/
  app/            App.tsx, providers, routes.tsx (registry único)
  shell/          AppShell, Sidebar (filtrada por permissão), StoreSwitcher, CommandPalette
  features/<modulo>/   pages/ components/ api.ts schemas.ts hooks.ts types.ts
                  dashboard clientes receitas produtos tabelas-lentes orcamentos vendas
                  ordens-servico estoque financeiro comissoes marketing relatorios
                  cadastros atendimento inteligencia clube configuracoes
  components/ui/       shadcn (mantido como está)
  components/data/     DataTable (server-side), FilterBar, ExportButton, PageHeader, EmptyState
  lib/
    supabase/     client.ts (via env, não hardcoded), types.ts (gerado)
    auth/         AuthProvider (tenant, stores, currentStore, permissions), useCan, <Can>
    query/        keys.ts (query key factory)
    permissions/  catalog.ts (espelho TS do catálogo do banco)
    integrations/ fiscal/ boleto/ adquirente/ mensageria/ ia/ — interface + mock
    format/       moeda, cpf/cnpj, telefone, data pt-BR
    validators/   zod: cpf, cnpj, cep, receita óptica
```

Convenções, todas rupturas deliberadas com o código atual:

- **Route registry único** (`src/app/routes.tsx`): array de
  `{ path, element, permission, nav: { label, icon, grupo } }`. O router *e* a sidebar leem o
  mesmo array — hoje o menu é um literal separado com um booleano `adminOnly`
  (`src/components/layouts/AppLayout.tsx:25`), o que garante divergência com o tempo.
- **React Query de verdade**, com key factory e `staleTime` por domínio. Nenhum `supabase`
  inline em componente: toda query/mutation passa pelo `api.ts` da feature.
- **RHF + zod** em todo formulário, schema colocado em `schemas.ts`, reaproveitando
  `src/components/ui/form.tsx` (já existe, nunca usado).
- **Listas grandes server-side** (`vendas`, `produtos`, `contas`, `clientes`): `.range()` +
  `count: 'exact'`, com `@tanstack/react-table` só para o modelo de colunas.
- **`ProtectedRoute` com permissão**: hoje só checa autenticação
  (`src/components/auth/ProtectedRoute.tsx:19`); passa a aceitar `permission` e a renderizar
  um 403 explícito — nunca uma tela vazia.
- **`companyId` no contexto**, uma vez: hoje é re-consultado inline antes de quase toda
  escrita (`src/pages/Locations.tsx:88`, `PositionManager.tsx:107`, e mais 4 lugares).
- **Dark mode ligado**: os tokens já existem completos em `src/index.css:72`, falta só o
  `ThemeProvider` do `next-themes`, que já é dependência.

### Dependências a adicionar

Já estão no `package.json` e vou finalmente usar: `@tanstack/react-query`, `react-hook-form`,
`zod`, `@hookform/resolvers`, `recharts`, `next-themes`, `date-fns`.
Faltam e entram: `@dnd-kit/core` + `@dnd-kit/sortable` (Kanban de O.S., fase 3),
`@tanstack/react-table` (modelo de colunas das listas grandes, fase 1),
`xlsx` (import/export Excel, fase 1), `fast-xml-parser` (NF-e, fase 2),
`vitest` + `@testing-library/react` + `jsdom` (fase 0),
`@playwright/test` (fase 3 — o Chromium do ambiente é reaproveitado).

### Adapters de integração (a decisão nº 4, concretizada)

```ts
// src/lib/integrations/fiscal/types.ts
export interface FiscalProvider {
  emitirNFCe(input: VendaFiscalInput): Promise<NotaFiscalResult>;
  cancelarNota(chave: string, motivo: string): Promise<void>;
  consultarNota(chave: string): Promise<NotaFiscalStatus>;
}
```

`providers/index.ts` escolhe por env (`VITE_FISCAL_PROVIDER=mock|focus`). O mock grava nas
tabelas fiscais reais e devolve chave plausível — o fluxo de tela fica pronto.

Duas coisas **não** são mock, porque são formato aberto e funcionam offline: o **parser de XML
de NF-e** para entrada de estoque, e a **geração/leitura de arquivo CNAB**. Elas são reais
desde a fase em que entram.

---

## Fases de entrega

Cada fase termina com o app rodando, migrations aplicáveis e commit na branch.

| Fase | Entrega | Stub nesta fase | Esforço |
|---|---|---|---|
| **0 · Fundação** | Remove o app de ponto; rebranding VISIO (tokens, `index.html`, README); `client.ts` por env + `.env.example`; migrations 01–03 (tenancy, RBAC, ~180 chaves); signup cria tenant + 1ª loja + perfil Proprietário; `AuthProvider` com `can()`; shell com sidebar por permissão, seletor de loja, command palette, dark mode; vitest + seed script + CI (lint, typecheck, test, build) | Todos os módulos como placeholder com 403/em breve | Alto |
| **1 · Cadastros e Clientes** | Migrations 04–07. CRUD genérico dirigido por config para os ~20 cadastros simples; fornecedores/laboratórios, funcionários, usuários, **Modelo de Permissões com a matriz real**, grupos de permissão, filiais; clientes completos (multi-contato, núcleo familiar, negativação, import/export Excel); receitas ópticas + Livro de Receitas + Receitas Vencidas | — | Alto |
| **2 · Produtos e Estoque** | Migrations 08, 10. Produtos com preço/estoque por filial, matriz fiscal, regras ópticas ("venda somente com O.S.", validade); tabelas de lentes + conferência; entrada por **XML de NF-e (real)**, posição atual com os filtros ricos, transferência entre filiais, inventário/acerto, etiquetas, histórico | — | Alto |
| **3 · Venda e O.S.** | Migration 09. Orçamento → Venda → O.S.; itens, descontos, múltiplos pagamentos, cadastro rápido de cliente; **Kanban dnd-kit com etapas configuráveis e SLA em dias úteis**, alerta de atraso, histórico | NFC-e via mock | Muito alto |
| **4 · Financeiro** | Migration 11. Caixa (abertura/fechamento/suprimento/sangria/transferência); contas a pagar/receber; crediário com parcelas e baixa; cartão com taxa da adquirente; antecipações; cheques com máquina de status; **CNAB real**; renegociação; trocas com crédito; plano de contas, DRE, fluxo semanal | Boleto e adquirente via mock | Muito alto |
| **5 · Comissões, Relatórios e Dashboard** | Migrations 12, 17. Comissões individual + gerente/equipe com apuração; os 13 relatórios com filtros/agrupamento/export; **dashboard acionável** (cada card é uma fila com CTA) + gráfico comparativo de vendas | — | Médio |
| **6 · Marketing e CRM** | Migration 13. Templates, campanhas, **motor de eventos automáticos** (pg_cron + Edge Function), cashback, indicação, vitrine online pública por slug | WhatsApp/SMS via mock | Médio |
| **7 · VISIO captura** | Migration 14. App tablet-first: **atendimento inclusive sem venda**, **objeção em dois toques**, **experimentação por leitura de código de barras**, biblioteca de contra-argumento; KPI experimentação → venda por armação | — | Médio-alto |
| **8 · VISIO inteligência** | Migration 15. Funil + **oportunidade em aberto com fórmula honesta e popover reprodutível**; filas de trabalho e recuperação calibrada por objeção; **atribuição com grupo de controle**; segundo par; NBO por margem com veto óptico; CRM familiar; painel do dono proativo | Áudio/PDF do painel na borda da fase | Alto |
| **9 · Add-ons, clube e planograma** | Migration 16. Planos e **assinaturas por add-on com feature flags**, paywall in-app; clube com **custo modelado por benefício**; cobrança recorrente com régua de falha/suspensão/reativação; planograma + auditoria de vitrine por foto; pré-atendimento (link → recomendação do estoque real → reserva → agenda) | Tokenização de cartão via mock | Médio |

---

## Onde eu puxo o freio

Coisas que vou construir de forma diferente do que os documentos sugerem, ou deixar de fora
do v1 — cada uma com o motivo:

1. **"Exame periódico" dentro do clube pago** — o próprio addendum já sinaliza (C1): plano
   mensal que inclui exame aproxima o produto de assistência à saúde, terreno regulado.
   Modelo como *desconto/parceria com profissional habilitado*, e a tela não deixa configurar
   "exame incluso" sem um aviso explícito. Não sou advogado; é ponto para o jurídico.
2. **A conta do clube** — a UI calcula com adesão de 5–15% da base ativa e **custo por
   benefício** (tempo de balcão, parafuso/plaqueta, sinistro de garantia), nunca com a
   projeção de 100% que aparece na pesquisa.
3. **Pupilômetro virtual** — medir DNP por foto sem referência calibrada tem precisão
   duvidosa e implicação clínica. Fora do v1; se entrar, entra rotulado como auxiliar, que
   não substitui medição profissional.
4. **Custódia de certificado digital A1** — não guardo certificado de cliente. Delego ao
   provedor fiscal. Guardar chave privada de terceiro no nosso banco é risco que não paga.
5. **Selfie do pré-atendimento (B6)** — foto de rosto é dado pessoal sensível na LGPD.
   Consentimento explícito na tela, retenção definida, e não alimenta treino de modelo.
6. **Análise de crédito** — exige contrato com bureau e consentimento; decisão automatizada
   dá ao titular direito a revisão (LGPD art. 20). Entra como tela com registro de
   consentimento e decisão sempre revisável por humano.
7. **API Consultiva do concorrente (bloco E)** — a decisão tomada foi ERP próprio primeiro,
   então essa dependência não entra. Se entrar depois: espelho local incremental desde o
   primeiro dia e nada prometido ao cliente que dependa de endpoint que não controlamos.
8. **`has_permission` em política de SELECT** — evitado nas leituras comuns, pelo motivo
   explicado acima: transforma falta de permissão em lista vazia.

---

## Verificação

Nada disso existe hoje no repo (`node_modules` está vazio, não há test runner nem CI), então
a fase 0 monta a infraestrutura de verificação junto com a fundação:

- **Build e tipos**: `npm install`, `npm run lint`, `npx tsc --noEmit`, `npm run build` —
  entram no CI (GitHub Actions) na fase 0 e rodam em toda fase.
- **Unitários (vitest)** para a lógica que não pode errar em silêncio: dias úteis com
  feriado, os três termos da fórmula de oportunidade, o hash de holdout (mesma entrada →
  mesmo bucket, sempre), cálculo de comissão sobre líquido vs. bruto, parser de XML de NF-e,
  geração de CNAB.
- **RLS de verdade**: `supabase start` local (Docker está disponível no ambiente) aplica as
  migrations e um script SQL prova o que precisa ser provado — usuário da loja A não lê nada
  da loja B; usuário sem `vendas.cancelar` não cancela; item de controle não aceita ação.
  Esse teste é a diferença entre "multi-tenant" e "multi-tenant de verdade".
- **Fluxos críticos (Playwright)**, a partir da fase 3: venda → O.S. → Kanban → entrega; e
  venda a prazo → crediário → baixa → caixa. Chromium já está instalado no ambiente.
- **Seed realista** (`scripts/seed.ts`), porque relatório e taxa histórica só fazem sentido
  com volume: 1 rede, 3 lojas, 12 funcionários, ~400 clientes com receitas em vários estágios
  de validade, ~1.200 produtos (armações, lentes, lentes de contato), ~2.000 atendimentos
  (com objeções e experimentações), ~800 vendas, ~600 O.S. espalhadas pelas etapas e 18 meses
  de movimento financeiro.

### O que preciso de você

- Criar o **novo projeto Supabase** e me passar `VITE_SUPABASE_URL` e a anon key (vão para
  `.env`, que já está no `.gitignore`). Sem isso eu escrevo e valido as migrations no
  Supabase local via Docker, mas não consigo apontar o app para o banco de produção.
- Confirmar se as migrations serão aplicadas por você (`supabase db push`) ou pelo Lovable.
