import type { Ordenacao } from '@/components/data';

/**
 * Listagem paginada server-side.
 *
 * Toda lista grande da plataforma — clientes, produtos, vendas, títulos — passa
 * por aqui. O motivo de existir é evitar que paginação, contagem e tradução de
 * erro sejam reimplementadas em sete telas, cada uma com um jeito de errar.
 */

export interface ParametrosLista {
  pagina: number;
  porPagina: number;
  ordenacao?: Ordenacao;
  busca?: string;
}

export interface ResultadoLista<T> {
  linhas: T[];
  total: number;
}

interface ErroPostgrest {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export const POR_PAGINA_PADRAO = 25;

/**
 * O pedaço do construtor de consulta do Supabase que usamos aqui.
 *
 * Tipar estruturalmente, em vez de importar `PostgrestFilterBuilder`, mantém
 * esta função imune às mudanças de genéricos da biblioteca entre versões — e
 * deixa explícito que só dependemos de três coisas: paginar, ordenar e aguardar.
 */
interface ConsultaPaginavel<T> {
  range(de: number, ate: number): ConsultaPaginavel<T>;
  order(campo: string, opcoes: { ascending: boolean; nullsFirst?: boolean }): ConsultaPaginavel<T>;
  then<R>(
    aoResolver: (resposta: {
      data: T[] | null;
      error: ErroPostgrest | null;
      count: number | null;
    }) => R,
  ): PromiseLike<R>;
}

/**
 * Aplica ordenação e faixa a uma consulta já filtrada, e devolve linhas + total.
 *
 * A contagem vem de `count: 'exact'` na mesma ida ao banco. A alternativa —
 * uma segunda consulta só para contar — dobra a latência da tela e pode
 * divergir da primeira se alguém gravar no meio.
 */
export async function listar<T>(
  // A consulta chega já com os filtros da tela aplicados; aqui só paginamos.
  consulta: ConsultaPaginavel<T>,
  { pagina, porPagina, ordenacao }: ParametrosLista,
): Promise<ResultadoLista<T>> {
  const inicio = (Math.max(1, pagina) - 1) * porPagina;
  const fim = inicio + porPagina - 1;

  let q = consulta.range(inicio, fim);

  if (ordenacao) {
    q = q.order(ordenacao.campo, {
      ascending: ordenacao.direcao === 'asc',
      // Registro sem valor no campo ordenado vai para o fim, em vez de
      // encabeçar a lista e parecer o "mais recente".
      nullsFirst: false,
    });
  }

  const { data, error, count } = await q;

  if (error) throw traduzirErro(error);

  return { linhas: data ?? [], total: count ?? 0 };
}

/**
 * Escapa o que o usuário digitou para uso em `ilike`.
 *
 * Sem isto, um `%` digitado na busca vira curinga e um `_` casa com qualquer
 * caractere — a lista devolve resultado aparentemente aleatório e ninguém
 * relaciona com o que foi digitado.
 */
export function termoBusca(texto: string | undefined): string | null {
  const limpo = (texto ?? '').trim();
  if (limpo.length === 0) return null;
  return `%${limpo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Traduz o erro do Postgres para algo que o lojista entenda.
 *
 * "duplicate key value violates unique constraint" não diz nada a quem está no
 * balcão. Pior: quando a causa é RLS, a mensagem crua sugere um bug de sistema
 * quando o que houve foi falta de permissão.
 */
export function traduzirErro(erro: ErroPostgrest): Error {
  const { code, message } = erro;

  const traducoes: Record<string, string> = {
    '23505': 'Já existe um registro com estes dados.',
    '23503': 'Este registro está em uso por outro cadastro e não pode ser removido.',
    '23514': 'Algum campo está fora do valor permitido.',
    '23502': 'Falta preencher um campo obrigatório.',
    '42501': 'Seu acesso não permite esta operação.',
    PGRST301: 'Sua sessão expirou. Entre novamente.',
  };

  if (code && traducoes[code]) {
    const detalhe = extrairDetalheUtil(erro);
    return new Error(detalhe ? `${traducoes[code]} (${detalhe})` : traducoes[code]);
  }

  // As exceções que nós mesmos levantamos nos triggers já vêm em português e
  // explicam o motivo; passam direto.
  return new Error(message);
}

/** Extrai o nome da restrição violada, quando ajuda a identificar o campo. */
function extrairDetalheUtil(erro: ErroPostgrest): string | null {
  const texto = `${erro.details ?? ''} ${erro.message}`;

  const campo = texto.match(/Key \((?<campo>[^)]+)\)/)?.groups?.campo;
  if (campo) return campo.replace(/_/g, ' ');

  const restricao = texto.match(/constraint "(?<nome>[^"]+)"/)?.groups?.nome;
  if (restricao) return restricao.replace(/_/g, ' ');

  return null;
}
