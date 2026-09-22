# VISIO

Plataforma multi-tenant de **gestão e inteligência comercial para óticas**.

Duas coisas num produto só:

1. **O ERP vertical** — clientes e receitas ópticas, produtos com preço e estoque
   por filial, orçamentos, vendas, Ordens de Serviço em Kanban com SLA em dias
   úteis, financeiro completo (crediário, cheque, cartão, boleto), estoque,
   comissões e relatórios.
2. **A camada que mede** — registro do atendimento que *não* virou venda, objeção
   estruturada, experimentação de armação, funil com fórmula explícita de
   oportunidade em aberto e **atribuição contra grupo de controle**, que separa o
   que a ação trouxe de novo do que teria acontecido de qualquer forma.

> **Estado atual: fase 0 concluída.** A fundação está de pé — rede e filiais,
> permissões granulares, auditoria, casca da aplicação, cadastro e login. Os
> módulos de negócio têm rota, permissão e auditoria funcionando, e uma tela que
> diz o que farão e em que fase entram. O roadmap completo está em
> [`docs/roadmap.md`](docs/roadmap.md).

---

## Arquitetura

### Tenancy em dois níveis

A decisão que atravessa todo o schema: **cliente e produto são cadastrados uma
vez por rede; preço, estoque, caixa, venda e O.S. são por filial.**

| Nível | Tabela | O que guarda |
|---|---|---|
| Rede | `tenants` | a rede de óticas — fronteira de isolamento de dados |
| Filial | `stores` | CNPJ, IE, endereço, dias úteis, certificado digital e licença **por loja** |
| Usuário | `profiles` | vínculo com a rede, limite de desconto, última filial usada |
| Acesso | `user_stores` | a quais filiais cada usuário entra |

Toda tabela de domínio carrega `tenant_id`; as de operação carregam também
`store_id`.

### Permissão por ação de negócio

Não é um RBAC de "leitura/escrita por módulo". São **268 permissões em 31
módulos**, uma por ação: dentro de Vendas existem `consultar`,
`consultar_proprias`, `incluir`, `cancelar`, `excluir`, `data_retroativa`,
`alterar_valor_unitario`, `autorizar_desconto_distancia`, `ver_margem` — cada uma
independente. É o que permite dar a um vendedor "só consulta das próprias
vendas" e a um gerente gestão completa sem inventar cargos no código.

O catálogo tem **fonte única**, `scripts/permissions-source.mjs`, que gera:

- `src/lib/permissions/catalog.ts` — o tipo `PermissionKey`, para
  `can('vendas.cancelar')` errar em tempo de compilação se a chave não existir;
- `supabase/migrations/*_visio_03b_permissoes_seed.sql` — o seed e os modelos
  padrão (Proprietário, Gerente, Vendedor, Financeiro, Laboratório, Estoquista).

O CI reprova se os dois saírem de sincronia.

### Isolamento por RLS, permissão nas escritas

O recorte de rede e filial vale em **toda** tabela, sem exceção — é a garantia
que não pode depender do cliente. A checagem de permissão entra no RLS nas
escritas e nas leituras sensíveis (custo, margem, financeiro); nas leituras
comuns, o bloqueio é na interface.

A razão de não usar `has_permission()` em todo `SELECT`: falta de permissão
viraria "lista vazia", indistinguível de "não há dados" — e o suporte perderia
uma hora atrás de um bug que não existe. Onde a permissão falta, a tela diz
**qual** chave falta.

---

## Rodando o projeto

### 1. Dependências

```bash
npm install
```

### 2. Projeto Supabase

Crie um projeto novo no Supabase e aplique as migrations em ordem:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

> As migrations são independentes do Supabase CLI — são SQL puro em
> `supabase/migrations/`, aplicáveis por `psql` em qualquer Postgres 15+.

### 3. Ambiente

```bash
cp .env.example .env
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A configuração é
validada na inicialização (`src/lib/env.ts`): se faltar algo, a aplicação não
sobe e diz o que falta, em vez de quebrar na primeira consulta com "Invalid API
key".

### 4. Subir

```bash
npm run dev     # http://localhost:8080
```

No primeiro cadastro, o gatilho `handle_new_user()` cria a rede, a primeira
filial, o seu perfil de proprietário e os cinco modelos de permissão padrão.

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint, reprovando em qualquer aviso |
| `npm run typecheck` | `tsc` em modo estrito |
| `npm test` | testes unitários (vitest) |
| `npm run test:db` | aplica as migrations num Postgres limpo e roda a suíte de RLS |
| `npm run types:gen` | regera `database.types.ts` a partir do schema |
| `npm run gen:permissions` | regera o catálogo de permissões (TS + SQL) |
| `npm run verificar` | lint + tipos + testes + build, de uma vez |
| `node scripts/smoke.mjs` | abre as telas num navegador real e reprova em erro de console |

### A suíte de banco

`npm run test:db` sobe um PostgreSQL local, aplica todas as migrations e roda
`supabase/tests/`. Prova, contra um banco real:

- um cadastro cria rede + filial + proprietário + modelos padrão;
- um **convite** anexa o usuário à rede que convidou, em vez de criar uma rede
  nova para ele;
- um usuário **não vê nada** de outra rede;
- o Vendedor não cancela venda, não vê custo, não fecha caixa, não cria filial —
  e o RLS recusa a escrita, não só a interface;
- ninguém eleva o próprio limite de desconto;
- o perfil de proprietário não é alterável por ninguém;
- **toda** tabela de `public` tem RLS, ao menos uma política, e nenhuma política
  esquece o recorte de rede ou filial.

Essa última verificação varre o schema em vez de testar casos: uma tabela que
entrar em qualquer migration futura sem RLS reprova o CI no dia em que for
criada, sem ninguém precisar lembrar de escrever um teste para ela.

---

## Estrutura

```
src/
  app/            App, providers, RotaProtegida, routes.ts (registry único)
  shell/          AppShell, Sidebar, TopBar, StoreSwitcher, CommandPalette
  features/       um diretório por módulo de negócio
  components/
    ui/           shadcn/ui vendorizado
    comum/        Logo, PageHeader, Carregando
  lib/
    supabase/     client (por env) + database.types.ts (gerado)
    auth/         AuthProvider, useAuth, useCan, <Can>
    permissions/  catalog.ts (gerado)
    query/        fábrica de chaves do React Query
    format/       moeda, CPF/CNPJ, telefone, grau óptico — pt-BR
    validators/   CPF, CNPJ, EAN-13, CEP, UF, grau e eixo (zod)
scripts/          geradores e a suíte de banco
supabase/
  migrations/     SQL, em ordem
  tests/          suíte de RLS e de tenancy
```

**`src/app/routes.ts` é o registry único de módulos.** O router *e* o menu lateral
*e* a paleta de comandos leem o mesmo array — um módulo novo aparece nos três
porque foi declarado uma vez.

---

## Integrações

Fiscal (NF-e/NFC-e), boleto, adquirente de cartão, WhatsApp e IA são **modelados
por completo no banco** e ligados por adapters com implementação simulada. Trocar
por um provedor real é mudar uma variável de ambiente
(`VITE_FISCAL_PROVIDER=mock|focus`), não refatorar.

Duas coisas nunca são simuladas, porque são formato aberto e funcionam offline: o
**parser de XML de NF-e** para entrada de estoque e a **geração e leitura de
arquivo CNAB**.
