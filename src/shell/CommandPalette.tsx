import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { GRUPOS, MODULOS } from '@/app/routes';
import { useAuth } from '@/lib/auth';

/**
 * Paleta de comandos (⌘K / Ctrl+K).
 *
 * Num sistema com trinta e um módulos, achar a tela pelo menu custa mais do que
 * digitar o nome dela. A paleta lista só o que o usuário pode acessar — o mesmo
 * filtro de permissão do menu, pelo mesmo registry.
 */
export function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const { can, contexto, storeAtual, selecionarStore } = useAuth();

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'k' && (evento.metaKey || evento.ctrlKey)) {
        evento.preventDefault();
        setAberto((atual) => !atual);
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  const permitidos = MODULOS.filter((modulo) => can(modulo.permissao));
  const outrasFiliais = (contexto?.stores ?? []).filter((f) => f.id !== storeAtual?.id);

  return (
    <CommandDialog open={aberto} onOpenChange={setAberto}>
      <CommandInput placeholder="Buscar módulo ou trocar de filial…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {GRUPOS.map((grupo) => {
          const doGrupo = permitidos.filter((m) => m.grupo === grupo.key);
          if (doGrupo.length === 0) return null;

          return (
            <CommandGroup key={grupo.key} heading={grupo.label}>
              {doGrupo.map((modulo) => (
                <CommandItem
                  key={modulo.path}
                  // `value` é o que a busca compara: inclui os sinônimos para
                  // "kanban" achar Ordens de Serviço e "cpf" achar Clientes.
                  value={`${modulo.label} ${modulo.resumo} ${(modulo.busca ?? []).join(' ')}`}
                  onSelect={() => {
                    setAberto(false);
                    navigate(modulo.path);
                  }}
                >
                  <modulo.icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <span>{modulo.label}</span>
                  {modulo.fase !== null && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      fase {modulo.fase}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {outrasFiliais.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Trocar de filial">
              {outrasFiliais.map((filial) => (
                <CommandItem
                  key={filial.id}
                  value={`filial loja ${filial.nome_fantasia}`}
                  onSelect={() => {
                    selecionarStore(filial.id);
                    setAberto(false);
                  }}
                >
                  <span className="truncate">{filial.nome_fantasia}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
