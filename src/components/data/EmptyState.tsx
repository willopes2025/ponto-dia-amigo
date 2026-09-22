import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Estado vazio com ação.
 *
 * "Nenhum registro" sozinho não ajuda: distingue mal entre "ainda não cadastrei"
 * e "o filtro escondeu tudo". Esta versão diz qual é o caso e oferece a saída.
 */
export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      {Icone && (
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
          <Icone className="h-5 w-5 text-muted-foreground" aria-hidden />
        </span>
      )}
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        {descricao && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{descricao}</p>
        )}
      </div>
      {acao}
    </div>
  );
}
