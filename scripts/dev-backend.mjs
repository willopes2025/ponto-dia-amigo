/**
 * Backend local compatível com a API do Supabase, para desenvolvimento e para a
 * verificação visual.
 *
 * Por que existe: sem um projeto Supabase, nenhuma tela autenticada pode ser
 * exercitada — e "compila e passa no lint" não prova que a tela funciona. Isto
 * sobe um PostgREST sobre o Postgres local e um substituto mínimo do GoTrue,
 * servindo os dois nos mesmos caminhos que o supabase-js espera
 * (`/rest/v1/...` e `/auth/v1/...`).
 *
 * NÃO é um Supabase completo: não há envio de e-mail, recuperação de senha,
 * storage nem realtime. É o suficiente para entrar, navegar e gravar — que é o
 * que precisa ser verificado.
 *
 * Uso:
 *   npm run dev:backend          # sobe na porta 54321
 *   # e no .env:
 *   VITE_SUPABASE_URL="http://localhost:54321"
 *   VITE_SUPABASE_ANON_KEY="<qualquer coisa: o stub não valida a anon key>"
 */
import { createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PORTA = Number(process.env.VISIO_DEV_PORT ?? 54321);
const PORTA_PGRST = Number(process.env.VISIO_PGRST_PORT ?? 54322);
const SEGREDO_JWT = process.env.VISIO_JWT_SECRET ?? 'segredo-local-de-desenvolvimento-visio-1234567890';
const DB_URL = process.env.VISIO_DB_URL ?? 'postgresql://postgres@127.0.0.1:55432/visio_dev';

// ---------------------------------------------------------------------------
// JWT (HS256) — sem dependência
// ---------------------------------------------------------------------------
const base64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function assinarJwt(payload) {
  const cabecalho = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const corpo = base64url(JSON.stringify(payload));
  const assinatura = base64url(
    createHmac('sha256', SEGREDO_JWT).update(`${cabecalho}.${corpo}`).digest(),
  );
  return `${cabecalho}.${corpo}.${assinatura}`;
}

function tokenDeAcesso(usuario) {
  const agora = Math.floor(Date.now() / 1000);
  return assinarJwt({
    sub: usuario.id,
    email: usuario.email,
    // `authenticated` é o papel que as políticas RLS esperam.
    role: 'authenticated',
    aud: 'authenticated',
    iat: agora,
    exp: agora + 60 * 60 * 24,
  });
}

// ---------------------------------------------------------------------------
// Consultas diretas ao banco, via psql
// ---------------------------------------------------------------------------
function sql(query) {
  const saida = execFileSync('psql', [DB_URL, '-tAF\u001f', '-c', query], { encoding: 'utf8' });
  return saida.split('\n').filter(Boolean).map((l) => l.split('\u001f'));
}

function acharUsuario(email) {
  const [linha] = sql(
    `select id, email from auth.users where lower(email) = lower('${email.replace(/'/g, "''")}') limit 1`,
  );
  return linha ? { id: linha[0], email: linha[1] } : null;
}

function criarUsuario(email, metadados) {
  const id = randomUUID();
  const json = JSON.stringify(metadados ?? {}).replace(/'/g, "''");
  sql(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ('${id}', '${email.replace(/'/g, "''")}', '${json}'::jsonb)`,
  );
  return { id, email };
}

function corpoUsuario(usuario) {
  return {
    id: usuario.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: usuario.email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}

function corpoSessao(usuario) {
  const access_token = tokenDeAcesso(usuario);
  return {
    access_token,
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: `refresh-${usuario.id}`,
    user: corpoUsuario(usuario),
  };
}

// ---------------------------------------------------------------------------
// PostgREST
// ---------------------------------------------------------------------------
const arquivoConf = '/tmp/visio-postgrest.conf';
writeFileSync(
  arquivoConf,
  [
    `db-uri = "${DB_URL}"`,
    'db-schemas = "public"',
    // O papel anônimo é o mesmo `anon` das políticas; quem traz JWT vira
    // `authenticated` e o RLS passa a valer para ele.
    'db-anon-role = "anon"',
    `jwt-secret = "${SEGREDO_JWT}"`,
    `server-port = ${PORTA_PGRST}`,
    'db-pool = 8',
  ].join('\n'),
);

const pgrst = spawn('postgrest', [arquivoConf], { stdio: ['ignore', 'pipe', 'pipe'] });
pgrst.stdout.on('data', (d) => process.stdout.write(`[postgrest] ${d}`));
pgrst.stderr.on('data', (d) => process.stderr.write(`[postgrest] ${d}`));

const encerrar = () => {
  pgrst.kill();
  try {
    unlinkSync(arquivoConf);
  } catch {
    /* já removido */
  }
  process.exit(0);
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

// ---------------------------------------------------------------------------
// Servidor: /auth/v1 respondido aqui, /rest/v1 encaminhado ao PostgREST
// ---------------------------------------------------------------------------
// Nomes em minúscula de propósito: o Node emite as chaves como vieram, e um
// `Access-Control-Allow-Origin` nosso convivendo com o `access-control-allow-origin`
// do PostgREST faz o navegador ver dois valores e bloquear a resposta.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-range, x-total-count',
};

function responder(res, status, corpo) {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(corpo === undefined ? '' : JSON.stringify(corpo));
}

async function lerCorpo(req) {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  const texto = Buffer.concat(partes).toString('utf8');
  return texto ? JSON.parse(texto) : {};
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORTA}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // ─── Autenticação ──────────────────────────────────────────────────────
  if (url.pathname.startsWith('/auth/v1/')) {
    try {
      const rota = url.pathname.replace('/auth/v1/', '');

      if (rota === 'token') {
        const { email } = await lerCorpo(req);
        const usuario = acharUsuario(email ?? '');
        if (!usuario) {
          // Mesma forma de erro do GoTrue, para a tela de login traduzir igual.
          return responder(res, 400, {
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
            msg: 'Invalid login credentials',
          });
        }
        return responder(res, 200, corpoSessao(usuario));
      }

      if (rota === 'signup') {
        const corpo = await lerCorpo(req);
        if (acharUsuario(corpo.email ?? '')) {
          return responder(res, 400, { msg: 'User already registered' });
        }
        // O gatilho handle_new_user() roda no INSERT e monta rede, filial,
        // perfil e modelos — exatamente como no Supabase real.
        const usuario = criarUsuario(corpo.email, corpo.data ?? {});
        return responder(res, 200, corpoSessao(usuario));
      }

      if (rota === 'user') {
        const [, payload] = (req.headers.authorization ?? '').replace('Bearer ', '').split('.');
        const dados = payload ? JSON.parse(Buffer.from(payload, 'base64').toString()) : null;
        if (!dados?.sub) return responder(res, 401, { msg: 'missing token' });
        return responder(res, 200, corpoUsuario({ id: dados.sub, email: dados.email }));
      }

      if (rota === 'logout') return responder(res, 204);

      return responder(res, 404, { msg: `rota de auth não implementada: ${rota}` });
    } catch (erro) {
      return responder(res, 500, { msg: String(erro) });
    }
  }

  // ─── REST e RPC ────────────────────────────────────────────────────────
  if (url.pathname.startsWith('/rest/v1')) {
    const alvo = `http://127.0.0.1:${PORTA_PGRST}${url.pathname.replace('/rest/v1', '')}${url.search}`;
    const cabecalhos = { ...req.headers };
    delete cabecalhos.host;
    delete cabecalhos['content-length'];
    // A anon key do Supabase vai no header `apikey`; o PostgREST não a conhece.
    delete cabecalhos.apikey;

    const corpo =
      req.method === 'GET' || req.method === 'HEAD' ? undefined : await lerCorpo(req).catch(() => ({}));

    try {
      const resposta = await fetch(alvo, {
        method: req.method,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      const texto = await resposta.text();

      // Os cabeçalhos do PostgREST entram primeiro e os nossos de CORS depois:
      // o PostgREST manda um Access-Control-Allow-Origin próprio que, se
      // aplicado por último, sobrescreve o nosso e o navegador bloqueia a
      // resposta — com um erro que aponta para o lugar errado.
      const saida = {};
      for (const [k, v] of resposta.headers) {
        const nome = k.toLowerCase();
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(nome)) {
          saida[nome] = v;
        }
      }
      Object.assign(saida, CORS);
      res.writeHead(resposta.status, saida);
      res.end(texto);
    } catch (erro) {
      responder(res, 502, { msg: `falha ao falar com o PostgREST: ${erro}` });
    }
    return;
  }

  responder(res, 404, { msg: 'apenas /auth/v1 e /rest/v1' });
});

servidor.listen(PORTA, () => {
  console.log(`\n▸ backend de desenvolvimento em http://localhost:${PORTA}`);
  console.log(`  banco:     ${DB_URL}`);
  console.log(`  postgrest: porta ${PORTA_PGRST}`);
  console.log(`\n  No .env:`);
  console.log(`    VITE_SUPABASE_URL="http://localhost:${PORTA}"`);
  console.log(`    VITE_SUPABASE_ANON_KEY="chave-local-de-desenvolvimento"\n`);
});
