/**
 * Verificação visual das telas AUTENTICADAS, contra o backend local.
 *
 * Entra de verdade, navega pelas telas construídas e reprova se aparecer erro
 * de JavaScript no console ou resposta 4xx/5xx. É o que pega o que `tsc` e
 * `vitest` não pegam: consulta malformada, coluna que não existe, componente
 * que quebra ao montar.
 *
 * Pré-requisitos, em três terminais:
 *   npm run db:dev
 *   npm run dev:backend
 *   npm run dev
 *
 * Uso: node scripts/smoke-app.mjs
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.VISIO_SMOKE_URL ?? 'http://localhost:8080';
const SAIDA = process.env.VISIO_SMOKE_OUT ?? '.smoke';
const EMAIL = process.env.VISIO_SMOKE_EMAIL ?? 'dono@seven.com.br';

/** Telas a percorrer. Cresce a cada fase. */
const TELAS = [
  { nome: 'painel', rota: '/painel' },
  { nome: 'clientes', rota: '/clientes' },
  { nome: 'cliente-ficha', rota: '/clientes', clicarPrimeiraLinha: true },
  { nome: 'receitas-livro', rota: '/receitas' },
  { nome: 'receitas-vencidas', rota: '/receitas?aba=vencidas' },
  { nome: 'cadastros-grifes', rota: '/cadastros/grifes' },
  { nome: 'cadastros-formas-pagamento', rota: '/cadastros/formas-pagamento' },
  { nome: 'cadastros-feriados', rota: '/cadastros/feriados' },
  { nome: 'permissoes', rota: '/permissoes' },
];

/** O certificado do proxy e a fonte do Google não são problema da aplicação. */
const RUIDO = /CERT_AUTHORITY|fonts\.(googleapis|gstatic)/i;

function acharChromium() {
  if (process.env.VISIO_CHROMIUM) return process.env.VISIO_CHROMIUM;
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !existsSync(raiz)) return undefined;
  for (const pasta of readdirSync(raiz)) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
      const caminho = join(raiz, pasta, rel);
      if (existsSync(caminho)) return caminho;
    }
  }
  return undefined;
}

mkdirSync(SAIDA, { recursive: true });

const executablePath = acharChromium();
const navegador = await chromium.launch(executablePath ? { executablePath } : {});
const ctx = await navegador.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'pt-BR',
});
const pagina = await ctx.newPage();

const problemas = [];
pagina.on('console', (m) => {
  if (m.type() === 'error' && !RUIDO.test(m.text())) problemas.push(`console: ${m.text().slice(0, 200)}`);
});
pagina.on('pageerror', (e) => problemas.push(`pageerror: ${e.message.slice(0, 200)}`));
pagina.on('response', (r) => {
  if (r.status() >= 400 && !RUIDO.test(r.url())) {
    problemas.push(`HTTP ${r.status()} em ${decodeURIComponent(r.url()).slice(0, 160)}`);
  }
});

console.log(`▸ entrando como ${EMAIL}`);
await pagina.goto(`${BASE}/entrar`, { waitUntil: 'networkidle' });
await pagina.fill('input[type=email]', EMAIL);
await pagina.fill('input[type=password]', 'senha-do-ambiente-local');
await pagina.click('button[type=submit]');
await pagina.waitForURL('**/painel', { timeout: 20000 });

for (const tela of TELAS) {
  await pagina.goto(`${BASE}${tela.rota}`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(1200);

  if (tela.clicarPrimeiraLinha) {
    const primeira = pagina.locator('tbody tr').first();
    if ((await primeira.count()) === 0) {
      problemas.push(`${tela.nome}: a lista veio vazia, nada para abrir`);
      continue;
    }
    await primeira.click();
    await pagina.waitForTimeout(1800);
  }

  await pagina.screenshot({ path: `${SAIDA}/${tela.nome}.png`, fullPage: true });
  const conteudo = (await pagina.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ');

  if (conteudo.trim().length < 40) {
    problemas.push(`${tela.nome}: conteúdo praticamente vazio`);
  }
  console.log(`   ${tela.nome.padEnd(28)} ${conteudo.slice(0, 70)}`);
}

await navegador.close();

if (problemas.length > 0) {
  console.log('\n✗ problemas encontrados:');
  problemas.forEach((p) => console.log(`   ${p}`));
  process.exit(1);
}
console.log(`\n✓ ${TELAS.length} telas autenticadas sem erro · prints em ${SAIDA}/`);
