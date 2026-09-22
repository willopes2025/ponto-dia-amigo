import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { Ordenacao } from '@/components/data';

import { POR_PAGINA_PADRAO } from './lista';

/**
 * Estado de uma tela de listagem, guardado na URL.
 *
 * Na URL, e não em `useState`, por três motivos práticos: o usuário pode mandar
 * o link da lista filtrada para um colega, o botão voltar do navegador funciona,
 * e recarregar a página não perde o que estava sendo olhado.
 */
export function useListaParams<F extends Record<string, string | undefined>>(
  filtrosIniciais: F,
  ordenacaoInicial?: Ordenacao,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [porPagina] = useState(POR_PAGINA_PADRAO);

  const pagina = Math.max(1, Number(searchParams.get('p') ?? 1) || 1);
  const busca = searchParams.get('q') ?? '';

  const ordenacao = useMemo<Ordenacao | undefined>(() => {
    const campo = searchParams.get('ord');
    if (!campo) return ordenacaoInicial;
    return { campo, direcao: searchParams.get('dir') === 'desc' ? 'desc' : 'asc' };
    // `ordenacaoInicial` é literal de objeto no chamador; comparar por conteúdo
    // evitaria um recálculo por render, mas o custo aqui é irrelevante.
  }, [searchParams, ordenacaoInicial]);

  const filtros = useMemo(() => {
    const atual = { ...filtrosIniciais };
    for (const chave of Object.keys(filtrosIniciais) as (keyof F)[]) {
      const valor = searchParams.get(String(chave));
      (atual as Record<string, string | undefined>)[String(chave)] = valor ?? undefined;
    }
    return atual;
  }, [searchParams, filtrosIniciais]);

  const atualizar = useCallback(
    (mudancas: Record<string, string | number | undefined>, voltarParaPrimeira = true) => {
      setSearchParams(
        (anterior) => {
          const proximo = new URLSearchParams(anterior);
          for (const [chave, valor] of Object.entries(mudancas)) {
            if (valor === undefined || valor === '' || valor === null) {
              proximo.delete(chave);
            } else {
              proximo.set(chave, String(valor));
            }
          }
          // Mudar filtro mantendo a página 7 mostra uma lista vazia e parece bug.
          if (voltarParaPrimeira) proximo.delete('p');
          return proximo;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    pagina,
    porPagina,
    busca,
    ordenacao,
    filtros,

    irParaPagina: useCallback((p: number) => atualizar({ p }, false), [atualizar]),
    buscar: useCallback((q: string) => atualizar({ q }), [atualizar]),
    ordenar: useCallback(
      (o: Ordenacao) => atualizar({ ord: o.campo, dir: o.direcao }, false),
      [atualizar],
    ),
    filtrar: useCallback(
      (chave: keyof F, valor: string | undefined) => atualizar({ [String(chave)]: valor }),
      [atualizar],
    ),
    limparFiltros: useCallback(() => {
      const zerados = Object.fromEntries(
        Object.keys(filtrosIniciais).map((chave) => [chave, undefined]),
      );
      atualizar({ ...zerados, q: undefined });
    }, [atualizar, filtrosIniciais]),
  };
}
