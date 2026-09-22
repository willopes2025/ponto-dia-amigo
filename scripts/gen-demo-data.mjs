/**
 * Extrai o banco de demonstração para um JSON embutido no bundle.
 *
 * A versão de demonstração roda sem backend: os dados vêm daqui. Gerá-los do
 * banco real — em vez de escrevê-los à mão — garante que a demonstração mostre
 * exatamente o que o sistema produz, inclusive as métricas e os feriados móveis.
 *
 * Uso: npm run demo:dados
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const DB = process.env.VISIO_DB_URL ?? 'postgresql://postgres@127.0.0.1:55432/visio_dev';
const SAIDA = 'src/demo/dados.json';

/** Tabelas que a demonstração precisa, com um teto de linhas por tabela. */
const TABELAS = {
  tenants: 10, stores: 50, profiles: 50, user_stores: 200,
  permissions: 400, permission_profiles: 50,
  permission_profile_permissions: 3000, user_permission_profiles: 200,
  user_invites: 50,
  unidades: 100, cores: 100, tamanhos: 100, formatos: 100, generos: 100,
  tipos_lente: 100, grifes: 200, origens_cliente: 100, tipos_documento: 100,
  profissoes: 200, grupos: 100, subgrupos: 200, convenios: 100,
  formas_pagamento: 100, medicos: 200, responsaveis_tecnicos: 100,
  plano_contas: 200, situacoes_conta_receber: 100, motivos_cancelamento: 100,
  feriados: 200,
  fornecedores: 200, fornecedor_contatos: 200, funcionarios: 200,
  equipes: 50, equipe_membros: 200,
  clientes: 500, cliente_telefones: 800, cliente_emails: 400,
  cliente_referencias: 200, nucleos_familiares: 100, cliente_nucleo: 200,
  cliente_negativacoes: 200, cliente_metricas: 500,
  receitas: 500, receita_historico: 200,
  vw_receitas_vencidas: 500,
};

const dados = {};
for (const [tabela, limite] of Object.entries(TABELAS)) {
  const json = execFileSync(
    'psql',
    [DB, '-tAc', `select coalesce(json_agg(t), '[]') from (select * from public.${tabela} limit ${limite}) t`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ).trim();
  dados[tabela] = JSON.parse(json || '[]');
}

writeFileSync(SAIDA, JSON.stringify(dados));

const total = Object.values(dados).reduce((s, linhas) => s + linhas.length, 0);
const tamanho = (JSON.stringify(dados).length / 1024).toFixed(0);
console.log(`demo:dados · ${Object.keys(dados).length} tabelas · ${total} linhas · ${tamanho} kB`);
console.log(`  → ${SAIDA}`);
