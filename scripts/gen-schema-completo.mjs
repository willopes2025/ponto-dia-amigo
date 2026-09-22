/**
 * Concatena as migrations num arquivo único, para colar no SQL Editor do
 * Supabase.
 *
 * Existe para o caso de quem vai aplicar o schema não ter o Supabase CLI à mão
 * — abrir o SQL Editor e colar é o caminho de menor atrito, e não exige que
 * ninguém compartilhe senha de banco.
 *
 * Quem tem o CLI deve preferir `supabase db push`: ele aplica os mesmos
 * arquivos E registra o histórico de migrations, que este arquivo não registra.
 *
 * Uso: npm run gen:schema
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ORIGEM = 'supabase/migrations';
const DESTINO = 'supabase/schema-completo.sql';

const migrations = readdirSync(ORIGEM).filter((f) => f.endsWith('.sql')).sort();

const cabecalho = `-- =============================================================================
-- VISIO — schema completo
-- =============================================================================
-- Todas as migrations em ordem, num arquivo só, para colar no SQL Editor do
-- Supabase (Database → SQL Editor → New query → colar → Run).
--
-- Use isto quando não quiser instalar o Supabase CLI. Quem usa o CLI deve rodar
-- \`supabase db push\`, que aplica os mesmos arquivos e registra o histórico de
-- migrations — este arquivo NÃO registra, então prefira o CLI se ele estiver à
-- mão.
--
-- Aplicar num projeto NOVO e vazio. Rodar sobre um projeto que já tem dados da
-- VISIO vai falhar em "already exists" — e falhar é o comportamento certo aqui.
--
-- GERADO POR scripts/gen-schema-completo.mjs — não edite à mão.
-- Gerado em: ${new Date().toISOString().slice(0, 10)}
-- ${migrations.length} migrations
-- =============================================================================

begin;
`;

const corpo = migrations
  .map(
    (nome) =>
      `\n\n-- ─────────────────────────────────────────────────────────────────────────\n` +
      `-- ${nome}\n` +
      `-- ─────────────────────────────────────────────────────────────────────────\n` +
      readFileSync(join(ORIGEM, nome), 'utf8'),
  )
  .join('');

const rodape = `

commit;

-- =============================================================================
-- Conferência rápida — rode depois, numa query separada:
--
--   select count(*) from public.permissions;        -- deve dar 268
--   select count(*) from pg_policies
--    where schemaname = 'public';                   -- deve dar 158
--   select count(*) from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r'
--      and not c.relrowsecurity;                    -- deve dar 0 (nenhuma tabela sem RLS)
-- =============================================================================
`;

writeFileSync(DESTINO, cabecalho + corpo + rodape);

const kb = Math.round(Buffer.byteLength(cabecalho + corpo + rodape) / 1024);
console.log(`gen:schema · ${migrations.length} migrations · ${kb} kB\n  → ${DESTINO}`);
