import { NavLink } from 'react-router-dom';

import { GRUPOS, MODULOS } from '@/app/routes';
import { Logo } from '@/components/comum/Logo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/**
 * Menu lateral, filtrado pela permissão de cada módulo.
 *
 * Lê o mesmo `MODULOS` que o router: um módulo novo aparece no menu porque foi
 * declarado uma vez, não porque alguém lembrou de acrescentar em duas listas.
 */
export function Sidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  const { can } = useAuth();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-6 px-3 py-4" aria-label="Menu principal">
          {GRUPOS.map((grupo) => {
            const itens = MODULOS.filter((m) => m.grupo === grupo.key && can(m.permissao));
            if (itens.length === 0) return null;

            return (
              <div key={grupo.key}>
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {grupo.label}
                </p>
                <ul className="space-y-0.5">
                  {itens.map((modulo) => (
                    <li key={modulo.path}>
                      <NavLink
                        to={modulo.path}
                        onClick={aoNavegar}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            isActive
                              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground',
                          )
                        }
                      >
                        <modulo.icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">{modulo.label}</span>
                        {modulo.fase !== null && (
                          <span
                            className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            title={`Construído na fase ${modulo.fase}`}
                          >
                            F{modulo.fase}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
