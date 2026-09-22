import { Check, ChevronsUpDown, Store as StoreIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/**
 * Seletor de filial.
 *
 * Existe porque preço, estoque, caixa, venda e O.S. são todos por filial: sem
 * saber em qual loja o usuário está, metade do sistema não tem resposta certa.
 * Com uma filial só, vira rótulo — não faz sentido oferecer escolha de um.
 */
export function StoreSwitcher() {
  const { contexto, storeAtual, selecionarStore } = useAuth();
  const [aberto, setAberto] = useState(false);

  const filiais = contexto?.stores ?? [];

  if (!storeAtual) {
    return (
      <span className="text-sm text-muted-foreground">Sem filial atribuída</span>
    );
  }

  if (filiais.length === 1) {
    return (
      <span className="flex items-center gap-2 text-sm font-medium">
        <StoreIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="max-w-[16rem] truncate">{storeAtual.nome_fantasia}</span>
      </span>
    );
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-label="Trocar de filial"
          className="w-[15rem] justify-between"
        >
          <span className="flex min-w-0 items-center gap-2">
            <StoreIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{storeAtual.nome_fantasia}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[15rem] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar filial…" />
          <CommandList>
            <CommandEmpty>Nenhuma filial encontrada.</CommandEmpty>
            <CommandGroup heading={contexto?.tenant.nome}>
              {filiais.map((filial) => (
                <CommandItem
                  key={filial.id}
                  value={`${filial.codigo} ${filial.nome_fantasia}`}
                  onSelect={() => {
                    selecionarStore(filial.id);
                    setAberto(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      filial.id === storeAtual.id ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{filial.nome_fantasia}</span>
                  <span className="ml-auto text-xs tabular text-muted-foreground">
                    {String(filial.codigo).padStart(2, '0')}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
