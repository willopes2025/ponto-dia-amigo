import { LogOut, Menu, Search, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import { iniciais } from '@/lib/format';

import { StoreSwitcher } from './StoreSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function TopBar({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const { contexto, sair } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={aoAbrirMenu}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>

      <StoreSwitcher />

      <div className="ml-auto flex items-center gap-1">
        {/* Dica do atalho: quem não sabe que a paleta existe não usa. */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden items-center gap-2 text-muted-foreground sm:flex"
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
            )
          }
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="text-xs">Buscar</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            Ctrl K
          </kbd>
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Minha conta">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {iniciais(contexto?.profile.nome)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{contexto?.profile.nome}</p>
              <p className="truncate text-xs text-muted-foreground">{contexto?.profile.email}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {contexto?.tenant.nome}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/minha-conta')}>
              <UserRound className="mr-2 h-4 w-4" aria-hidden /> Minha conta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await sair();
                navigate('/entrar', { replace: true });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
