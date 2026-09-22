/* eslint-disable @typescript-eslint/no-explicit-any */
import dados from './dados.json';


/**
 * Cliente Supabase de mentira, para a versão de demonstração.
 *
 * A demonstração roda sem backend: publicada como página estática, precisa
 * responder às mesmas chamadas que o app faz contra o PostgREST. Em vez de
 * adaptar as telas para um "modo demo" — o que criaria dois caminhos de código e
 * faria a demonstração divergir do produto —, o produto fica igual e trocamos
 * apenas o cliente.
 *
 * Implementa só o que o app realmente usa. Qualquer chamada fora disso falha de
 * forma visível, o que é melhor do que devolver vazio em silêncio.
 *
 * As escritas funcionam e ficam em memória: quem navega pode cadastrar e
 * alterar, e tudo volta ao início ao recarregar a página.
 */

type Linha = Record<string, any>;

const base: Record<string, Linha[]> = JSON.parse(JSON.stringify(dados));

/** Relações usadas nos `select` com junção. Declaradas, não adivinhadas. */
const RELACOES: Record<
  string,
  { tipo: 'um' | 'muitos'; chaveLocal: string; tabela: string; chaveAlvo: string }
> = {
  'profiles.tenants': { tipo: 'um', chaveLocal: 'tenant_id', tabela: 'tenants', chaveAlvo: 'id' },
  'user_stores.stores': { tipo: 'um', chaveLocal: 'store_id', tabela: 'stores', chaveAlvo: 'id' },
  'receitas.clientes': { tipo: 'um', chaveLocal: 'cliente_id', tabela: 'clientes', chaveAlvo: 'id' },
  'receitas.medicos': { tipo: 'um', chaveLocal: 'medico_id', tabela: 'medicos', chaveAlvo: 'id' },

  'clientes.cliente_metricas': { tipo: 'um', chaveLocal: 'id', tabela: 'cliente_metricas', chaveAlvo: 'cliente_id' },
  'clientes.cliente_telefones': { tipo: 'muitos', chaveLocal: 'id', tabela: 'cliente_telefones', chaveAlvo: 'cliente_id' },
  'clientes.cliente_emails': { tipo: 'muitos', chaveLocal: 'id', tabela: 'cliente_emails', chaveAlvo: 'cliente_id' },
  'clientes.cliente_referencias': { tipo: 'muitos', chaveLocal: 'id', tabela: 'cliente_referencias', chaveAlvo: 'cliente_id' },
  'clientes.cliente_negativacoes': { tipo: 'muitos', chaveLocal: 'id', tabela: 'cliente_negativacoes', chaveAlvo: 'cliente_id' },

  'permission_profiles.permission_profile_permissions': { tipo: 'muitos', chaveLocal: 'id', tabela: 'permission_profile_permissions', chaveAlvo: 'permission_profile_id' },
  'permission_profiles.user_permission_profiles': { tipo: 'muitos', chaveLocal: 'id', tabela: 'user_permission_profiles', chaveAlvo: 'permission_profile_id' },

  'profiles.user_stores': { tipo: 'muitos', chaveLocal: 'id', tabela: 'user_stores', chaveAlvo: 'profile_id' },
  'profiles.user_permission_profiles': { tipo: 'muitos', chaveLocal: 'id', tabela: 'user_permission_profiles', chaveAlvo: 'profile_id' },
};

// ---------------------------------------------------------------------------
// Leitura do `select`
// ---------------------------------------------------------------------------
interface Embutido {
  nome: string;
  colunas: string[];
}

/** Divide por vírgulas de primeiro nível, ignorando as de dentro de parênteses. */
function dividirTopo(texto: string): string[] {
  const partes: string[] = [];
  let nivel = 0;
  let atual = '';
  for (const c of texto) {
    if (c === '(') nivel += 1;
    if (c === ')') nivel -= 1;
    if (c === ',' && nivel === 0) {
      partes.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  if (atual.trim()) partes.push(atual);
  return partes.map((p) => p.trim()).filter(Boolean);
}

function lerSelect(select: string): { colunas: string[]; embutidos: Embutido[] } {
  const colunas: string[] = [];
  const embutidos: Embutido[] = [];

  for (const parte of dividirTopo(select)) {
    const juncao = parte.match(/^(?<nome>[a-z_]+)\s*(?:!inner|!left)?\s*\((?<cols>.*)\)$/s);
    if (juncao?.groups) {
      embutidos.push({
        nome: juncao.groups.nome,
        colunas: dividirTopo(juncao.groups.cols),
      });
    } else {
      colunas.push(parte.replace(/\s*!inner$/, ''));
    }
  }
  return { colunas, embutidos };
}

function projetar(linha: Linha, colunas: string[]): Linha {
  if (colunas.length === 0 || colunas.includes('*')) return { ...linha };
  const saida: Linha = {};
  for (const coluna of colunas) saida[coluna] = linha[coluna];
  return saida;
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------
/** Converte um padrão `ilike` do PostgREST em expressão regular. */
function ilikeParaRegex(padrao: string): RegExp {
  let regex = '';
  let escapando = false;
  for (const c of padrao) {
    if (escapando) {
      regex += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      escapando = false;
      continue;
    }
    if (c === '\\') { escapando = true; continue; }
    if (c === '%') { regex += '.*'; continue; }
    if (c === '_') { regex += '.'; continue; }
    regex += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${regex}$`, 'i');
}

function semAcento(v: unknown): string {
  return String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

type Filtro = (linha: Linha) => boolean;

/** Uma condição no formato `coluna.operador.valor`, como o `or` do PostgREST. */
function condicaoTextual(expressao: string): Filtro {
  const [coluna, operador, ...resto] = expressao.split('.');
  const valor = resto.join('.');
  if (operador === 'ilike') {
    const regex = ilikeParaRegex(valor);
    return (linha) => regex.test(semAcento(linha[coluna]));
  }
  if (operador === 'eq') return (linha) => String(linha[coluna]) === valor;
  if (operador === 'is') return (linha) => (valor === 'null' ? linha[coluna] == null : true);
  return () => true;
}

// ---------------------------------------------------------------------------
// Construtor de consulta
// ---------------------------------------------------------------------------
class Consulta {
  private filtros: Filtro[] = [];
  private ordens: { campo: string; asc: boolean }[] = [];
  private faixa?: [number, number];
  private colunas = '*';
  private contar = false;
  private somenteCabecalho = false;
  private unico: 'single' | 'maybe' | null = null;
  private operacao: { tipo: 'select' | 'insert' | 'update' | 'delete' | 'upsert'; carga?: any } = {
    tipo: 'select',
  };

  constructor(private tabela: string) {}

  select(colunas = '*', opcoes?: { count?: string; head?: boolean }) {
    this.colunas = colunas;
    this.contar = opcoes?.count === 'exact';
    this.somenteCabecalho = Boolean(opcoes?.head);
    if (this.operacao.tipo === 'select') this.operacao = { tipo: 'select' };
    return this;
  }

  insert(carga: any) { this.operacao = { tipo: 'insert', carga }; return this; }
  update(carga: any) { this.operacao = { tipo: 'update', carga }; return this; }
  upsert(carga: any) { this.operacao = { tipo: 'upsert', carga }; return this; }
  delete() { this.operacao = { tipo: 'delete' }; return this; }

  eq(coluna: string, valor: any) {
    this.filtros.push((l) => String(l[coluna]) === String(valor));
    return this;
  }
  neq(coluna: string, valor: any) {
    this.filtros.push((l) => String(l[coluna]) !== String(valor));
    return this;
  }
  is(coluna: string, valor: any) {
    this.filtros.push((l) => (valor === null ? l[coluna] == null : l[coluna] === valor));
    return this;
  }
  lt(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] != null && l[coluna] < valor);
    return this;
  }
  gte(coluna: string, valor: any) {
    this.filtros.push((l) => l[coluna] != null && l[coluna] >= valor);
    return this;
  }
  in(coluna: string, valores: any[]) {
    const conjunto = new Set(valores.map(String));
    this.filtros.push((l) => conjunto.has(String(l[coluna])));
    return this;
  }
  ilike(coluna: string, padrao: string) {
    // `clientes.nome` num filtro sobre junção: aplica na coluna simples.
    const campo = coluna.includes('.') ? coluna.split('.').pop()! : coluna;
    const regex = ilikeParaRegex(semAcento(padrao));
    this.filtros.push((l) => regex.test(semAcento(l[campo])));
    return this;
  }
  or(expressao: string) {
    const condicoes = dividirTopo(expressao).map(condicaoTextual);
    this.filtros.push((l) => condicoes.some((c) => c(l)));
    return this;
  }
  order(campo: string, opcoes?: { ascending?: boolean }) {
    this.ordens.push({ campo, asc: opcoes?.ascending !== false });
    return this;
  }
  range(de: number, ate: number) { this.faixa = [de, ate]; return this; }
  limit(n: number) { this.faixa = [0, n - 1]; return this; }
  single() { this.unico = 'single'; return this; }
  maybeSingle() { this.unico = 'maybe'; return this; }

  private tabelaDados(): Linha[] {
    if (!base[this.tabela]) base[this.tabela] = [];
    return base[this.tabela];
  }

  private expandir(linha: Linha, embutidos: Embutido[], colunas: string[]): Linha {
    const saida = projetar(linha, colunas);
    for (const embutido of embutidos) {
      const relacao = RELACOES[`${this.tabela}.${embutido.nome}`];
      if (!relacao) {
        throw new Error(
          `Demonstração: relação ${this.tabela} → ${embutido.nome} não está declarada em RELACOES.`,
        );
      }
      const alvo = base[relacao.tabela] ?? [];
      const casam = alvo.filter(
        (a) => linha[relacao.chaveLocal] != null && a[relacao.chaveAlvo] === linha[relacao.chaveLocal],
      );
      saida[embutido.nome] =
        relacao.tipo === 'um'
          ? (casam[0] ? projetar(casam[0], embutido.colunas) : null)
          : casam.map((c) => projetar(c, embutido.colunas));
    }
    return saida;
  }

  private executar() {
    const tabela = this.tabelaDados();
    const { colunas, embutidos } = lerSelect(this.colunas);

    // ─── Escritas ────────────────────────────────────────────────────────
    if (this.operacao.tipo === 'insert' || this.operacao.tipo === 'upsert') {
      const cargas = Array.isArray(this.operacao.carga) ? this.operacao.carga : [this.operacao.carga];
      const criadas = cargas.map((carga: Linha) => {
        const existente = carga.id ? tabela.find((l) => l.id === carga.id) : undefined;
        if (existente && this.operacao.tipo === 'upsert') {
          Object.assign(existente, carga);
          return existente;
        }
        const nova: Linha = {
          id: carga.id ?? crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ativo: true,
          ...carga,
        };
        // Numeração legível, como o gatilho `proximo_numero` faz no banco.
        if ('codigo' in (tabela[0] ?? {}) && nova.codigo == null) {
          nova.codigo = Math.max(0, ...tabela.map((l) => Number(l.codigo) || 0)) + 1;
        }
        tabela.push(nova);
        return nova;
      });

      const linhas = criadas.map((l) => this.expandir(l, embutidos, colunas));
      return { data: this.unico ? (linhas[0] ?? null) : linhas, error: null, count: linhas.length };
    }

    const selecionadas = tabela.filter((l) => this.filtros.every((f) => f(l)));

    if (this.operacao.tipo === 'update') {
      for (const linha of selecionadas) {
        Object.assign(linha, this.operacao.carga, { updated_at: new Date().toISOString() });
      }
      const linhas = selecionadas.map((l) => this.expandir(l, embutidos, colunas));
      return { data: this.unico ? (linhas[0] ?? null) : linhas, error: null, count: linhas.length };
    }

    if (this.operacao.tipo === 'delete') {
      base[this.tabela] = tabela.filter((l) => !selecionadas.includes(l));
      return { data: null, error: null, count: selecionadas.length };
    }

    // ─── Leitura ─────────────────────────────────────────────────────────
    const ordenadas = [...selecionadas];
    if (this.ordens.length > 0) {
      ordenadas.sort((a, b) => {
        for (const { campo, asc } of this.ordens) {
          const x = a[campo];
          const y = b[campo];
          if (x == null && y == null) continue;
          // Registro sem valor vai para o fim, como `nullsFirst: false`.
          if (x == null) return 1;
          if (y == null) return -1;
          if (x === y) continue;
          const comparacao = typeof x === 'number' && typeof y === 'number'
            ? x - y
            : String(x).localeCompare(String(y), 'pt-BR');
          return asc ? comparacao : -comparacao;
        }
        return 0;
      });
    }

    const total = ordenadas.length;
    const pagina = this.faixa ? ordenadas.slice(this.faixa[0], this.faixa[1] + 1) : ordenadas;

    if (this.somenteCabecalho) return { data: null, error: null, count: total };

    const linhas = pagina.map((l) => this.expandir(l, embutidos, colunas));

    if (this.unico) {
      if (linhas.length === 0) {
        return this.unico === 'maybe'
          ? { data: null, error: null, count: 0 }
          : { data: null, error: { message: 'Nenhum registro encontrado', code: 'PGRST116' }, count: 0 };
      }
      return { data: linhas[0], error: null, count: 1 };
    }

    return { data: linhas, error: null, count: this.contar ? total : null };
  }

  /**
   * `then` torna a consulta aguardável, como o construtor do supabase-js: o
   * app escreve `await supabase.from(...)...` sem chamar nada que execute.
   *
   * Erro vira `{ error }` em vez de exceção, porque é assim que o SDK real se
   * comporta — e é o que as telas tratam.
   */
  then(aoResolver?: ((resposta: any) => any) | null, aoRejeitar?: ((erro: any) => any) | null) {
    let resultado: any;
    try {
      resultado = this.executar();
    } catch (erro) {
      resultado = {
        data: null,
        error: { message: erro instanceof Error ? erro.message : String(erro) },
        count: null,
      };
    }
    return Promise.resolve(resultado).then(aoResolver, aoRejeitar);
  }
}

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------
const USUARIO_DEMO = base.profiles?.[0];

const sessaoDemo = {
  access_token: 'demonstracao',
  token_type: 'bearer',
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  refresh_token: 'demonstracao',
  user: {
    id: USUARIO_DEMO?.user_id ?? 'demo',
    email: USUARIO_DEMO?.email ?? 'demo@visio.app',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

type Ouvinte = (evento: string, sessao: unknown) => void;
const ouvintes: Ouvinte[] = [];

export const clienteDemo = {
  from: (tabela: string) => new Consulta(tabela),

  rpc: (nome: string) => {
    if (nome === 'current_permissions') {
      // Na demonstração entra-se como proprietário: acesso total.
      return Promise.resolve({
        data: (base.permissions ?? []).map((p) => p.key),
        error: null,
      });
    }
    return Promise.resolve({
      data: null,
      error: { message: `Demonstração: a função ${nome} não está implementada.` },
    });
  },

  auth: {
    getSession: () => Promise.resolve({ data: { session: sessaoDemo }, error: null }),
    getUser: () => Promise.resolve({ data: { user: sessaoDemo.user }, error: null }),
    onAuthStateChange: (ouvinte: Ouvinte) => {
      ouvintes.push(ouvinte);
      // O INITIAL_SESSION chega no próximo tick, como no SDK real.
      setTimeout(() => ouvinte('INITIAL_SESSION', sessaoDemo), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const i = ouvintes.indexOf(ouvinte);
              if (i >= 0) ouvintes.splice(i, 1);
            },
          },
        },
      };
    },
    signInWithPassword: () => {
      ouvintes.forEach((o) => o('SIGNED_IN', sessaoDemo));
      return Promise.resolve({ data: { session: sessaoDemo, user: sessaoDemo.user }, error: null });
    },
    signUp: () =>
      Promise.resolve({
        data: { session: null, user: null },
        error: { message: 'Esta é uma demonstração: o cadastro de novas redes está desligado.' },
      }),
    // Sair recarrega: a demonstração não tem para onde deslogar.
    signOut: () => Promise.resolve({ error: null }),
  },
};
