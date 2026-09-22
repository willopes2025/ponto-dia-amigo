/**
 * Verificação do build de demonstração.
 *
 * A demonstração tem um caminho próprio no bundler — cliente Supabase trocado
 * por alias, rotas por hash, dados embutidos — e nada disso é exercitado pelos
 * outros testes. Sem esta verificação, um build de demonstração pode sair
 * silenciosamente com o cliente de produção dentro; foi exatamente o que
 * aconteceu quando o alias genérico "@" vinha antes do específico.
 *
 * Uso:
 *   npm run build:demo
 *   npx vite preview --port 4173 --host 127.0.0.1   (noutro terminal)
 *   node scripts/smoke-demo.mjs
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.VISIO_DEMO_URL ?? 'http://127.0.0.1:4173';
const SAIDA = process.env.VISIO_SMOKE_OUT ?? '.smoke';

/** Rotas por hash: a demonstração é servida de um subcaminho, sem reescrita. */
const TELAS = [
  { nome: 'demo-landing', rota: '/', alvo: 'body' },
  { nome: 'demo-painel', rota: '/#/painel' },
  { nome: 'demo-clientes', rota: '/#/clientes' },
  { nome: 'demo-cliente-ficha', rota: '/#/clientes', clicarPrimeiraLinha: true },
  { nome: 'demo-receitas', rota: '/#/receitas' },
  { nome: 'demo-receitas-vencidas', rota: '/#/receitas?aba=vencidas' },
  { nome: 'demo-permissoes', rota: '/#/permissoes' },
  { nome: 'demo-cadastros', rota: '/#/cadastros/grifes' },
  { nome: 'demo-usuarios', rota: '/#/usuarios' },
  { nome: 'demo-filiais', rota: '/#/cadastros/filiais' },
  { nome: 'demo-fornecedores', rota: '/#/cadastros/fornecedores' },
];

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
pagina.setDefaultTimeout(15000);

const problemas = [];
pagina.on('console', (m) => {
  if (m.type() === 'error' && !RUIDO.test(m.text())) problemas.push(`console: ${m.text().slice(0, 200)}`);
});
pagina.on('pageerror', (e) => problemas.push(`pageerror: ${e.message.slice(0, 200)}`));
// A demonstração não deve falar com backend nenhum: qualquer requisição a um
// domínio externo (fora a fonte) significa que o cliente de produção vazou
// para dentro do build.
pagina.on('request', (r) => {
  const url = r.url();
  if (!url.startsWith(BASE) && !url.startsWith('data:') && !RUIDO.test(url)) {
    problemas.push(`requisição externa inesperada: ${url.slice(0, 140)}`);
  }
});

for (const tela of TELAS) {
  try {
    await pagina.goto(`${BASE}${tela.rota}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await pagina.waitForTimeout(1500);

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
    const conteudo = (
      await pagina.locator(tela.alvo ?? 'main').first().innerText().catch(() => '')
    ).replace(/\s+/g, ' ');

    if (conteudo.trim().length < 40) problemas.push(`${tela.nome}: conteúdo praticamente vazio`);
    console.log(`   ${tela.nome.padEnd(26)} ${conteudo.slice(0, 66)}`);
  } catch (erro) {
    problemas.push(`${tela.nome}: ${String(erro).slice(0, 160)}`);
  }
}

await navegador.close();

if (problemas.length > 0) {
  console.log('\n✗ problemas encontrados:');
  problemas.forEach((p) => console.log(`   ${p}`));
  process.exit(1);
}
console.log(`\n✓ ${TELAS.length} telas da demonstração sem erro · prints em ${SAIDA}/`);
