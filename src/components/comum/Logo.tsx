import { cn } from '@/lib/utils';

/**
 * Marca da VISIO. A lente (dois arcos que se cruzam) é desenhada em SVG inline
 * para acompanhar a cor do tema sem precisar de dois arquivos de imagem.
 */
export function Logo({
  className,
  mostrarTexto = true,
}: {
  className?: string;
  mostrarTexto?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7 shrink-0"
        role="img"
        aria-label="VISIO"
        fill="none"
      >
        <circle cx="16" cy="16" r="15" className="fill-primary" />
        <path
          d="M5 16c3.2-4.6 6.9-6.9 11-6.9S23.8 11.4 27 16c-3.2 4.6-6.9 6.9-11 6.9S8.2 20.6 5 16Z"
          className="fill-primary-foreground"
          opacity="0.95"
        />
        <circle cx="16" cy="16" r="4.1" className="fill-primary" />
        <circle cx="17.6" cy="14.4" r="1.3" className="fill-primary-foreground" opacity="0.9" />
      </svg>
      {mostrarTexto && (
        <span className="text-lg font-semibold tracking-tight">
          VISIO
        </span>
      )}
    </span>
  );
}
