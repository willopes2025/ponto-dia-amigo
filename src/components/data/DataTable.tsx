import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Tabela com paginação e ordenação SERVER-SIDE.
 *
 * Deliberadamente não usa uma biblioteca de tabela: o valor delas está em
 * ordenar, filtrar e agrupar no cliente, e aqui nada disso acontece no cliente
 * — uma rede com 40 mil produtos não cabe no navegador. O que sobra é definição
 * de coluna e renderização, que é pouco código e fica mais claro assim.
 */

export interface Coluna<T> {
  /** Chave da coluna. Quando `ordenavel`, é o nome do campo enviado ao banco. */
  chave: string;
  titulo: ReactNode;
  celula: (linha: T) => ReactNode;
  ordenavel?: boolean;
  /** Alinhamento; números vão à direita, com `tabular` para alinhar as casas. */
  alinhamento?: 'esquerda' | 'direita' | 'centro';
  className?: string;
  /** Some em telas estreitas. Para coluna de apoio, não para a principal. */
  ocultarNoMobile?: boolean;
}

export interface Ordenacao {
  campo: string;
  direcao: 'asc' | 'desc';
}

interface DataTableProps<T> {
  colunas: Coluna<T>[];
  linhas: T[] | undefined;
  chaveLinha: (linha: T) => string;
  carregando?: boolean;
  erro?: Error | null;

  /** Total de registros no servidor — não o tamanho da página. */
  total?: number;
  pagina: number;
  porPagina: number;
  aoMudarPagina: (pagina: number) => void;

  ordenacao?: Ordenacao;
  aoOrdenar?: (ordenacao: Ordenacao) => void;

  aoClicarLinha?: (linha: T) => void;
  vazio?: ReactNode;
}

const ALINHAMENTO = {
  esquerda: 'text-left',
  direita: 'text-right tabular',
  centro: 'text-center',
} as const;

export function DataTable<T>({
  colunas,
  linhas,
  chaveLinha,
  carregando = false,
  erro = null,
  total,
  pagina,
  porPagina,
  aoMudarPagina,
  ordenacao,
  aoOrdenar,
  aoClicarLinha,
  vazio,
}: DataTableProps<T>) {
  const totalPaginas = total !== undefined ? Math.max(1, Math.ceil(total / porPagina)) : undefined;
  const primeiro = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const ultimo = total !== undefined ? Math.min(pagina * porPagina, total) : undefined;

  const alternarOrdem = (chave: string) => {
    if (!aoOrdenar) return;
    aoOrdenar({
      campo: chave,
      direcao: ordenacao?.campo === chave && ordenacao.direcao === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((coluna) => (
                <TableHead
                  key={coluna.chave}
                  className={cn(
                    ALINHAMENTO[coluna.alinhamento ?? 'esquerda'],
                    coluna.ocultarNoMobile && 'hidden md:table-cell',
                    coluna.className,
                  )}
                >
                  {coluna.ordenavel && aoOrdenar ? (
                    <button
                      type="button"
                      onClick={() => alternarOrdem(coluna.chave)}
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      aria-label={`Ordenar por ${String(coluna.titulo)}`}
                    >
                      {coluna.titulo}
                      {ordenacao?.campo === coluna.chave &&
                        (ordenacao.direcao === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden />
                        ))}
                    </button>
                  ) : (
                    coluna.titulo
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {carregando ? (
              // Esqueleto com a mesma quantidade de colunas: a tabela não pula
              // de largura quando os dados chegam.
              Array.from({ length: Math.min(porPagina, 8) }).map((_, i) => (
                <TableRow key={`esqueleto-${i}`}>
                  {colunas.map((coluna) => (
                    <TableCell
                      key={coluna.chave}
                      className={cn(coluna.ocultarNoMobile && 'hidden md:table-cell')}
                    >
                      <Skeleton className="h-4 w-full max-w-[12rem]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : erro ? (
              <TableRow>
                <TableCell colSpan={colunas.length} className="py-10 text-center">
                  <p className="text-sm font-medium text-destructive">
                    Não foi possível carregar os dados.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{erro.message}</p>
                </TableCell>
              </TableRow>
            ) : !linhas || linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colunas.length} className="py-12 text-center">
                  {vazio ?? <p className="text-sm text-muted-foreground">Nenhum registro.</p>}
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((linha) => (
                <TableRow
                  key={chaveLinha(linha)}
                  onClick={aoClicarLinha ? () => aoClicarLinha(linha) : undefined}
                  className={aoClicarLinha ? 'cursor-pointer' : undefined}
                >
                  {colunas.map((coluna) => (
                    <TableCell
                      key={coluna.chave}
                      className={cn(
                        ALINHAMENTO[coluna.alinhamento ?? 'esquerda'],
                        coluna.ocultarNoMobile && 'hidden md:table-cell',
                        coluna.className,
                      )}
                    >
                      {coluna.celula(linha)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total !== undefined && total > 0 && (
        <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <p>
            {primeiro}–{ultimo} de <span className="tabular">{total}</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => aoMudarPagina(pagina - 1)}
              disabled={pagina <= 1 || carregando}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1">Anterior</span>
            </Button>
            <span className="px-2 tabular">
              {pagina} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => aoMudarPagina(pagina + 1)}
              disabled={totalPaginas !== undefined ? pagina >= totalPaginas : true}
            >
              <span className="sr-only sm:not-sr-only sm:mr-1">Próxima</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
