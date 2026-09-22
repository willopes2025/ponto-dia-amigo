import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Barra de filtros com busca atrasada e chips do que está aplicado.
 *
 * Os chips não são enfeite: filtro invisível é a origem do chamado "sumiu meu
 * cliente" — alguém deixou um filtro de cidade ligado da semana passada e a
 * lista aparece vazia sem dizer por quê.
 */

export interface FiltroAtivo {
  chave: string;
  rotulo: string;
  valor: string;
  limpar: () => void;
}

interface FilterBarProps {
  busca: string;
  aoBuscar: (termo: string) => void;
  placeholder?: string;
  /** Seletores e outros controles, à direita da busca. */
  children?: ReactNode;
  filtrosAtivos?: FiltroAtivo[];
  aoLimparTudo?: () => void;
  acoes?: ReactNode;
  className?: string;
}

export function FilterBar({
  busca,
  aoBuscar,
  placeholder = 'Buscar…',
  children,
  filtrosAtivos = [],
  aoLimparTudo,
  acoes,
  className,
}: FilterBarProps) {
  // Estado local para o campo responder a cada tecla; o que sobe é atrasado,
  // senão cada letra vira uma consulta ao banco.
  const [termo, setTermo] = useState(busca);

  useEffect(() => setTermo(busca), [busca]);

  useEffect(() => {
    if (termo === busca) return;
    const id = window.setTimeout(() => aoBuscar(termo), 300);
    return () => window.clearTimeout(id);
  }, [termo, busca, aoBuscar]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder={placeholder}
            className="pl-8"
            aria-label={placeholder}
          />
          {termo && (
            <button
              type="button"
              onClick={() => {
                setTermo('');
                aoBuscar('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        {acoes && <div className="flex items-center gap-2 sm:ml-auto">{acoes}</div>}
      </div>

      {filtrosAtivos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filtros:</span>
          {filtrosAtivos.map((filtro) => (
            <Badge key={filtro.chave} variant="secondary" className="gap-1 pr-1 font-normal">
              <span className="text-muted-foreground">{filtro.rotulo}:</span>
              {filtro.valor}
              <button
                type="button"
                onClick={filtro.limpar}
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remover filtro ${filtro.rotulo}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          ))}
          {aoLimparTudo && filtrosAtivos.length > 1 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={aoLimparTudo}>
              Limpar tudo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
