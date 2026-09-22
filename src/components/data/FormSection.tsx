import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Agrupa campos em formulário longo. O cadastro de cliente tem cerca de
 * quarenta campos: sem agrupamento com título, vira uma coluna única em que
 * ninguém acha nada.
 */
export function FormSection({
  titulo,
  descricao,
  children,
  colunas = 2,
  className,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
  colunas?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      </div>
      <div
        className={cn(
          'grid gap-4',
          colunas === 1 && 'sm:grid-cols-1',
          colunas === 2 && 'sm:grid-cols-2',
          colunas === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {children}
      </div>
    </section>
  );
}
