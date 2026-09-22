import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Carregando({
  texto = 'Carregando…',
  className,
}: {
  texto?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2 py-12 text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span className="text-sm">{texto}</span>
    </div>
  );
}

/** Tela cheia — para o carregamento da sessão, antes de o shell existir. */
export function CarregandoTela({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Carregando texto={texto} />
    </div>
  );
}
