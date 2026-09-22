/**
 * Verificação visual rápida: abre as telas principais num navegador real,
 * tira print e reprova se algum erro de JavaScript aparecer no console.
 *
 * Não substitui teste de fluxo (isso vem com Playwright a partir da fase 3);
 * serve para pegar o que `tsc` e `vitest` não pegam: tela que quebra ao montar,
 * provider faltando, import circular.
 *
 * Uso: npm run dev  (noutro terminal)  &&  node scripts/smoke.mjs
 *
 * Em ambiente que já traz o Chromium instalado (e possivelmente numa versão
 * diferente da que o Playwright espera), aponte o binário:
 *   VISIO_CHROMIUM=/caminho/para/chrome node scripts/smoke.mjs
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

/**
 * Descobre um Chromium já presente na máquina antes de exigir download.
 *
 * O Playwright casa cada versão sua com um build específico do navegador; quando
 * o ambiente traz outro build, ele recusa em vez de usar o que existe. Preferir
 * o binário local evita baixar 150 MB só para tirar seis prints.
 */
function acharChromium() {
  if (process.env.VISIO_CHROMIUM) return process.env.VISIO_CHROMIUM;

  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !existsSync(raiz)) return undefined;

  for (const pasta of readdirSync(raiz)) {
    for (const relativo of [
      'chrome-linux/chrome',
      'chrome-linux/headless_shell',
      'chrome-headless-shell-linux64/chrome-headless-shell',
    ]) {
      const caminho = join(raiz, pasta, relativo);
      if (existsSync(caminho)) return caminho;
    }
  }
  return undefined;
}

const BASE = process.env.VISIO_SMOKE_URL ?? 'http://localhost:8080';
const SAIDA = process.env.VISIO_SMOKE_OUT ?? '.smoke';

const TELAS = [
  { nome: 'landing-claro', rota: '/', tema: 'light', inteira: true },
  { nome: 'landing-escuro', rota: '/', tema: 'dark', inteira: true },
  { nome: 'entrar', rota: '/entrar', tema: 'light' },
  { nome: 'cadastrar', rota: '/cadastrar', tema: 'dark' },
  { nome: 'rota-protegida', rota: '/vendas', tema: 'light' },
  { nome: 'nao-encontrado', rota: '/rota-inexistente', tema: 'light' },
  { nome: 'landing-mobile', rota: '/', tema: 'light', largura: 390, altura: 780 },
];

/**
 * Dois erros são esperados e NÃO reprovam a verificação. Estão listados um a um
 * de propósito: um filtro amplo do tipo "ignore Failed to load resource"
 * esconderia exatamente o tipo de falha que esta verificação existe para pegar.
 *
 *  1. Consultas ao Supabase, quando o projeto apontado no .env ainda não tem as
 *     migrations da VISIO aplicadas.
 *  2. A fonte do Google Fonts, em ambiente sem saída direta para a internet.
 */
const ERROS_ESPERADOS = [
  /profiles|current_permissions|user_stores|permission_profiles/i,
  /fonts\.googleapis\.com|fonts\.gstatic\.com/i,
  /ERR_CERT_AUTHORITY_INVALID|ERR_NAME_NOT_RESOLVED|ERR_PROXY/i,
];

mkdirSync(SAIDA, { recursive: true });

const executablePath = acharChromium();
if (executablePath) console.log(`navegador: ${executablePath}\n`);

const navegador = await chromium.launch(executablePath ? { executablePath } : {});
const problemas = [];

for (const tela of TELAS) {
  const contexto = await navegador.newContext({
    viewport: { width: tela.largura ?? 1280, height: tela.altura ?? 900 },
    colorScheme: tela.tema,
    locale: 'pt-BR',
  });
  const pagina = await contexto.newPage();
  const errosDaTela = [];

  pagina.on('console', (msg) => {
    if (msg.type() === 'error') errosDaTela.push(`console: ${msg.text()}`);
  });
  pagina.on('pageerror', (erro) => errosDaTela.push(`pageerror: ${erro.message}`));

  await pagina.goto(`${BASE}${tela.rota}`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(500);
  await pagina.screenshot({
    path: `${SAIDA}/${tela.nome}.png`,
    fullPage: Boolean(tela.inteira),
  });

  const titulo = await pagina.title();
  const texto = (await pagina.locator('body').innerText()).replace(/\s+/g, ' ');

  if (!titulo.includes('VISIO')) {
    problemas.push(`${tela.nome}: título inesperado "${titulo}"`);
  }
  if (texto.trim().length < 20) {
    problemas.push(`${tela.nome}: a tela renderizou praticamente vazia`);
  }

  const inesperados = errosDaTela.filter((e) => !ERROS_ESPERADOS.some((r) => r.test(e)));
  inesperados.forEach((e) => problemas.push(`${tela.nome}: ${e}`));

  console.log(
    `${tela.nome.padEnd(17)} ${String(errosDaTela.length).padStart(2)} erro(s) · ${texto.slice(0, 80)}`,
  );

  await contexto.close();
}

await navegador.close();

if (problemas.length > 0) {
  console.log('\n✗ problemas encontrados:');
  problemas.forEach((p) => console.log(`   ${p}`));
  process.exit(1);
}

console.log(`\n✓ ${TELAS.length} telas renderizaram sem erro inesperado · prints em ${SAIDA}/`);
