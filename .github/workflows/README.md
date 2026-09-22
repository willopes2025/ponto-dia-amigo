# CI da VISIO

Dois jobs, deliberadamente separados:

- **aplicacao** — lint sem nenhum aviso, `tsc` em modo estrito, testes unitários
  e build. Inclui uma checagem de que os artefatos gerados
  (`src/lib/permissions/catalog.ts` e o seed SQL do catálogo) estão em dia com
  `scripts/permissions-source.mjs`. Sem essa checagem, editar a fonte e esquecer
  de regerar produziria uma permissão que existe na interface e não no banco.

- **banco** — sobe um PostgreSQL de verdade, aplica todas as migrations em ordem
  e roda `supabase/tests/`. É o único lugar onde RLS pode ser verificado: o
  isolamento entre redes não é testável com banco falso, e é a única classe de
  defeito capaz de acabar com o produto.

A suíte `02_rls_coverage.sql` varre o schema em vez de testar casos: uma tabela
que entrar em qualquer migration futura sem RLS, ou com política que esqueça o
recorte de rede, reprova o CI no dia em que for criada — sem ninguém precisar
lembrar de escrever um teste para ela.
