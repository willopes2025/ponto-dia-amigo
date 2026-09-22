/**
 * Gera src/lib/supabase/database.types.ts lendo o schema de um Postgres real.
 *
 * Por que não `supabase gen types`: aquele comando exige baixar a imagem
 * postgres-meta, o que não funciona em todo ambiente. Este gerador fala com o
 * banco por psql e não depende de Docker.
 *
 * Uso:
 *   npm run types:gen                     # usa o cluster de teste local
 *   VISIO_DB_URL=postgres://... npm run types:gen
 *   npm run types:gen -- --check          # falha se o arquivo estiver desatualizado
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = 'src/lib/supabase/database.types.ts';
const CHECK = process.argv.includes('--check');

const DB_URL =
  process.env.VISIO_DB_URL ?? 'postgresql://postgres@127.0.0.1:55432/visio_test';

function sql(query) {
  return execFileSync('psql', [DB_URL, '-tAF\u001f', '-c', query], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => l.split('\u001f'));
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
const enums = new Map();
for (const [nome, valor] of sql(`
  select t.typname, e.enumlabel
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
   where n.nspname = 'public'
   order by t.typname, e.enumsortorder
`)) {
  if (!enums.has(nome)) enums.set(nome, []);
  enums.get(nome).push(valor);
}

/** Mapa tipo Postgres → tipo TypeScript. */
function tsType(udt, isArray) {
  // Enum do banco vira referência ao bloco Enums, não `unknown`. Sem isto, um
  // campo `tipo: 'pf' | 'pj'` chega ao formulário como `unknown` e a checagem
  // desaparece justamente onde ela mais vale.
  if (enums.has(udt)) {
    const nome = `Database['public']['Enums']['${udt}']`;
    return isArray ? `${nome}[]` : nome;
  }

  const base = {
    uuid: 'string',
    text: 'string',
    varchar: 'string',
    bpchar: 'string',
    citext: 'string',
    name: 'string',
    int2: 'number',
    int4: 'number',
    int8: 'number',
    float4: 'number',
    float8: 'number',
    numeric: 'number',
    bool: 'boolean',
    json: 'Json',
    jsonb: 'Json',
    date: 'string',
    time: 'string',
    timetz: 'string',
    timestamp: 'string',
    timestamptz: 'string',
    interval: 'string',
    bytea: 'string',
    void: 'undefined',
    record: 'unknown',
  }[udt] ?? 'unknown';
  return isArray ? `${base}[]` : base;
}

// ---------------------------------------------------------------------------
// Tabelas e colunas
// ---------------------------------------------------------------------------
const colunas = sql(`
  select c.relname                                        as tabela,
         a.attname                                        as coluna,
         case when t.typcategory = 'A'
              then (select tt.typname from pg_type tt where tt.oid = t.typelem)
              else t.typname end                          as udt,
         (t.typcategory = 'A')::text                      as is_array,
         (not a.attnotnull)::text                         as nullable,
         (pg_get_expr(d.adbin, d.adrelid) is not null)::text as tem_default,
         a.attidentity <> ''                              as is_identity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    join pg_type t      on t.oid = a.atttypid
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
   order by c.relname, a.attnum
`);

const relkinds = new Map(
  sql(`select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','v','m')`).map(([n, k]) => [n, k]),
);

// ---------------------------------------------------------------------------
// Chaves estrangeiras
// ---------------------------------------------------------------------------
// O supabase-js usa estes metadados para tipar `select('*, outra!inner(*)')`.
// Sem eles, todo select com join volta como `never` e o tsc reprova o código
// correto — foi exatamente o que aconteceu antes de este bloco existir.
const fks = sql(`
  select c.relname                                               as tabela,
         con.conname                                             as nome,
         (select string_agg(a.attname, ',' order by k.ord)
            from unnest(con.conkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as colunas,
         refc.relname                                            as ref_tabela,
         (select string_agg(a.attname, ',' order by k.ord)
            from unnest(con.confkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as ref_colunas,
         exists (
           select 1
             from pg_index i
            where i.indrelid = con.conrelid
              and i.indisunique
              and i.indpred is null
              and i.indkey::int2[] @> con.conkey
              and array_length(i.indkey::int2[], 1) = array_length(con.conkey, 1)
         )::text                                                 as um_para_um
    from pg_constraint con
    join pg_class c      on c.oid = con.conrelid
    join pg_class refc   on refc.oid = con.confrelid
    join pg_namespace n  on n.oid = c.relnamespace
   where con.contype = 'f' and n.nspname = 'public'
   order by c.relname, con.conname
`);

const fksPorTabela = new Map();
for (const [tabela, nome, colunas, refTabela, refColunas, umParaUm] of fks) {
  if (!fksPorTabela.has(tabela)) fksPorTabela.set(tabela, []);
  fksPorTabela.get(tabela).push({
    nome,
    colunas: colunas.split(','),
    refTabela,
    refColunas: refColunas.split(','),
    umParaUm: umParaUm === 'true',
  });
}

// ---------------------------------------------------------------------------
// Funções chamáveis por RPC (exclui triggers e funções internas)
// ---------------------------------------------------------------------------
const funcoes = sql(`
  select p.proname,
         pg_get_function_arguments(p.oid),
         t.typname,
         (t.typcategory = 'A')::text,
         p.proretset::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type t on t.oid = p.prorettype
   where n.nspname = 'public'
     and t.typname <> 'trigger'
     and p.prokind = 'f'
   order by p.proname
`);

// ---------------------------------------------------------------------------
// Montagem do arquivo
// ---------------------------------------------------------------------------
const porTabela = new Map();
for (const [tabela, coluna, udt, isArray, nullable, temDefault, isIdentity] of colunas) {
  if (!porTabela.has(tabela)) porTabela.set(tabela, []);
  porTabela.get(tabela).push({
    coluna,
    ts: tsType(udt, isArray === 'true'),
    nullable: nullable === 'true',
    // Coluna com default ou identity é opcional no Insert.
    opcional: temDefault === 'true' || isIdentity === 't',
  });
}

const enumRef = (udt) => (enums.has(udt) ? `Database['public']['Enums']['${udt}']` : null);

function blocoTabela(tabela, cols) {
  const isView = relkinds.get(tabela) !== 'r';
  const row = cols
    .map((c) => `          ${c.coluna}: ${c.ts}${c.nullable ? ' | null' : ''}`)
    .join('\n');
  const ins = cols
    .map(
      (c) =>
        `          ${c.coluna}${c.opcional || c.nullable ? '?' : ''}: ${c.ts}${c.nullable ? ' | null' : ''}`,
    )
    .join('\n');
  const upd = cols
    .map((c) => `          ${c.coluna}?: ${c.ts}${c.nullable ? ' | null' : ''}`)
    .join('\n');

  const rels = (fksPorTabela.get(tabela) ?? [])
    .map(
      (fk) =>
        `          {\n` +
        `            foreignKeyName: '${fk.nome}'\n` +
        `            columns: [${fk.colunas.map((c) => `'${c}'`).join(', ')}]\n` +
        `            isOneToOne: ${fk.umParaUm}\n` +
        `            referencedRelation: '${fk.refTabela}'\n` +
        `            referencedColumns: [${fk.refColunas.map((c) => `'${c}'`).join(', ')}]\n` +
        `          }`,
    )
    .join(',\n');
  const relsBloco = `        Relationships: [${rels ? `\n${rels}\n        ` : ''}]`;

  if (isView) {
    return `      ${tabela}: {\n        Row: {\n${row}\n        }\n${relsBloco}\n      }`;
  }
  return (
    `      ${tabela}: {\n        Row: {\n${row}\n        }\n` +
    `        Insert: {\n${ins}\n        }\n` +
    `        Update: {\n${upd}\n        }\n` +
    `${relsBloco}\n      }`
  );
}

const tabelas = [...porTabela.entries()].filter(([t]) => relkinds.get(t) === 'r');
const views = [...porTabela.entries()].filter(([t]) => relkinds.get(t) !== 'r');

const funcoesTs = funcoes
  .map(([nome, args, retTipo, retArray, retSet]) => {
    const argsObj = args
      ? args
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
          .map((a) => {
            const partes = a.split(/\s+/);
            const nomeArg = partes[0];
            const tipoArg = partes.slice(1).join(' ');
            const arr = tipoArg.includes('[]');
            const udt = tipoArg.replace('[]', '').replace(/^public\./, '').trim();
            const mapa = {
              'character varying': 'varchar',
              'timestamp with time zone': 'timestamptz',
              'timestamp without time zone': 'timestamp',
              'double precision': 'float8',
              integer: 'int4',
              smallint: 'int2',
              bigint: 'int8',
              boolean: 'bool',
            };
            return `          ${nomeArg}: ${tsType(mapa[udt] ?? udt, arr)}`;
          })
          .join('\n')
      : '';
    const ret = tsType(retTipo, retArray === 'true');
    const retFinal = retSet === 'true' ? `${ret}[]` : ret;
    const argsTipo = argsObj
      ? `{\n${argsObj}\n        }`
      : 'Record<PropertyKey, never>';
    return `      ${nome}: {\n        Args: ${argsTipo}\n        Returns: ${retFinal}\n      }`;
  })
  .join('\n');

const enumsTs = [...enums.entries()]
  .map(([nome, valores]) => `      ${nome}: ${valores.map((v) => `'${v}'`).join(' | ')}`)
  .join('\n');

const conteudo = `/**
 * GERADO AUTOMATICAMENTE — não edite.
 * Gerador: scripts/gen-db-types.mjs · Regenere com: npm run types:gen
 *
 * Reflete o schema produzido por supabase/migrations/. Se uma migration renomear
 * uma coluna, regenerar este arquivo faz o \`tsc\` apontar todos os pontos de uso
 * que precisam mudar — em vez de o erro aparecer em produção.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
${tabelas.map(([t, c]) => blocoTabela(t, c)).join('\n')}
    }
    Views: {
${views.length ? views.map(([t, c]) => blocoTabela(t, c)).join('\n') : '      [_ in never]: never'}
    }
    Functions: {
${funcoesTs || '      [_ in never]: never'}
    }
    Enums: {
${enumsTs || '      [_ in never]: never'}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public'];

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
`;

if (CHECK) {
  const atual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (atual !== conteudo) {
    console.error(
      `✗ ${OUT} está desatualizado em relação às migrations. Rode: npm run types:gen`,
    );
    process.exit(1);
  }
  console.log(`✓ ${OUT} em dia com as migrations`);
} else {
  writeFileSync(OUT, conteudo);
  console.log(
    `types:gen · ${tabelas.length} tabelas · ${views.length} views · ${funcoes.length} funções · ${enums.size} enums · ${fks.length} FKs\n  → ${OUT}`,
  );
}
