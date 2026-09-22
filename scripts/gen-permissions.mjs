/**
 * Gera, a partir de scripts/permissions-source.mjs:
 *   · src/lib/permissions/catalog.ts
 *   · supabase/migrations/20260922090300_visio_03b_permissoes_seed.sql
 *
 * Rode com: npm run gen:permissions
 */
import { writeFileSync } from 'node:fs';
import { modules, modelosPadrao } from './permissions-source.mjs';

const CATALOG_PATH = 'src/lib/permissions/catalog.ts';
const SEED_PATH = 'supabase/migrations/20260922090300_visio_03b_permissoes_seed.sql';

/** Todas as chaves, em ordem de módulo e de ação. */
const entries = modules.flatMap((mod, mi) =>
  mod.acoes.map(([acao, label, descricao = null, sensivel = false], ai) => ({
    key: `${mod.key}.${acao}`,
    modulo: mod.key,
    acao,
    label,
    descricao,
    sensivel: Boolean(sensivel),
    ordem: mi * 100 + ai,
  })),
);

const allKeys = new Set(entries.map((e) => e.key));

// Chaves duplicadas seriam um erro silencioso: o catálogo passaria, o SQL falharia
// no primary key. Melhor quebrar aqui.
if (allKeys.size !== entries.length) {
  const vistas = new Set();
  const dup = entries.map((e) => e.key).filter((k) => (vistas.has(k) ? true : (vistas.add(k), false)));
  throw new Error(`Chaves duplicadas no catálogo: ${[...new Set(dup)].join(', ')}`);
}

/** Expande `modulo.*` e subtrai `-modulo.acao`. */
function expandir(padroes, nomeModelo) {
  const incluir = new Set();
  const remover = new Set();

  for (const padrao of padroes) {
    const negado = padrao.startsWith('-');
    const p = negado ? padrao.slice(1) : padrao;
    const destino = negado ? remover : incluir;

    if (p.endsWith('.*')) {
      const mod = p.slice(0, -2);
      const doModulo = entries.filter((e) => e.modulo === mod);
      if (doModulo.length === 0) {
        throw new Error(`Modelo "${nomeModelo}": módulo inexistente em "${padrao}"`);
      }
      doModulo.forEach((e) => destino.add(e.key));
    } else {
      if (!allKeys.has(p)) {
        throw new Error(`Modelo "${nomeModelo}": chave inexistente "${padrao}"`);
      }
      destino.add(p);
    }
  }

  return [...incluir].filter((k) => !remover.has(k)).sort();
}

const modelos = modelosPadrao.map((m) => ({
  ...m,
  chavesExpandidas: expandir(m.chaves, m.nome),
}));

// ---------------------------------------------------------------------------
// catalog.ts
// ---------------------------------------------------------------------------
const ts = `/**
 * GERADO AUTOMATICAMENTE — não edite.
 * Fonte: scripts/permissions-source.mjs · Regenere com: npm run gen:permissions
 *
 * Espelho em TypeScript do catálogo semeado no banco. Ter o tipo \`PermissionKey\`
 * aqui é o que faz \`can('vendas.cancelar')\` errar em tempo de compilação quando a
 * chave não existe, em vez de silenciosamente retornar false em produção.
 */

export type PermissionKey =
${entries.map((e) => `  | '${e.key}'`).join('\n')};

export interface PermissionAction {
  key: PermissionKey;
  acao: string;
  label: string;
  descricao: string | null;
  /** Checada também na leitura (no RLS), não só na escrita. */
  sensivel: boolean;
}

export interface PermissionModule {
  key: string;
  label: string;
  /** Nome do ícone em lucide-react. */
  icon: string;
  acoes: PermissionAction[];
}

export const PERMISSION_MODULES: PermissionModule[] = ${JSON.stringify(
  modules.map((mod) => ({
    key: mod.key,
    label: mod.label,
    icon: mod.icon,
    acoes: mod.acoes.map(([acao, label, descricao = null, sensivel = false]) => ({
      key: `${mod.key}.${acao}`,
      acao,
      label,
      descricao,
      sensivel: Boolean(sensivel),
    })),
  })),
  null,
  2,
)};

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_MODULES.flatMap((m) =>
  m.acoes.map((a) => a.key),
);

const LABELS = new Map<string, string>(
  PERMISSION_MODULES.flatMap((m) => m.acoes.map((a) => [a.key, \`\${m.label} · \${a.label}\`])),
);

/** Rótulo legível de uma chave, para mensagens de erro e telas de 403. */
export function permissionLabel(key: string): string {
  return LABELS.get(key) ?? key;
}

/** Modelos de permissão criados junto com a rede (espelho de criar_modelos_padrao). */
export const MODELOS_PADRAO: { nome: string; descricao: string; chaves: PermissionKey[] }[] = ${JSON.stringify(
  modelos.map((m) => ({ nome: m.nome, descricao: m.descricao, chaves: m.chavesExpandidas })),
  null,
  2,
)};
`;

writeFileSync(CATALOG_PATH, ts);

// ---------------------------------------------------------------------------
// seed SQL
// ---------------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

const insertLines = entries
  .map((e) => `  (${q(e.key)}, ${q(e.modulo)}, ${q(e.acao)}, ${q(e.label)}, ${q(e.descricao)}, ${e.sensivel}, ${e.ordem})`)
  .join(',\n');

const modelosSql = modelos
  .map(
    (m) => `  -- ${m.nome}: ${m.chavesExpandidas.length} chaves
  insert into public.permission_profiles (tenant_id, nome, descricao)
  values (p_tenant_id, ${q(m.nome)}, ${q(m.descricao)})
  returning id into v_profile_id;

  insert into public.permission_profile_permissions (permission_profile_id, permission_key)
  select v_profile_id, k
    from unnest(array[
${m.chavesExpandidas.map((k) => `      ${q(k)}`).join(',\n')}
    ]::text[]) as k;
`,
  )
  .join('\n');

const sql = `-- =============================================================================
-- VISIO · 03b · Seed do catálogo de permissões e dos modelos padrão
-- =============================================================================
-- GERADO AUTOMATICAMENTE — não edite à mão.
-- Fonte: scripts/permissions-source.mjs · Regenere com: npm run gen:permissions
--
-- ${entries.length} chaves em ${modules.length} módulos · ${modelos.length} modelos padrão
-- =============================================================================

insert into public.permissions (key, modulo, acao, label, descricao, sensivel, ordem) values
${insertLines}
on conflict (key) do update set
  modulo    = excluded.modulo,
  acao      = excluded.acao,
  label     = excluded.label,
  descricao = excluded.descricao,
  sensivel  = excluded.sensivel,
  ordem     = excluded.ordem;

-- Chaves que saíram do catálogo em uma versão nova do software deixam de existir;
-- o ON DELETE CASCADE da FK limpa as atribuições que as referenciavam.
delete from public.permissions
 where key not in (
${entries.map((e) => `   ${q(e.key)}`).join(',\n')}
 );

-- -----------------------------------------------------------------------------
-- criar_modelos_padrao — agora com as chaves reais
-- -----------------------------------------------------------------------------
-- Substitui a versão vazia declarada na migration 03, que existia só para o
-- trigger de signup poder referenciá-la antes de o catálogo existir.
create or replace function public.criar_modelos_padrao(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_profile_id uuid;
begin
${modelosSql}
end;
$fn$;

comment on function public.criar_modelos_padrao(uuid) is
  'Cria os modelos de permissão de partida da rede. Editáveis pela ótica; o perfil de proprietário não.';
`;

writeFileSync(SEED_PATH, sql);

console.log(
  `gen:permissions · ${entries.length} chaves · ${modules.length} módulos · ${modelos.length} modelos\n` +
    `  → ${CATALOG_PATH}\n  → ${SEED_PATH}`,
);
modelos.forEach((m) => console.log(`    ${m.nome}: ${m.chavesExpandidas.length} chaves`));
