import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Alternador de tema. Os tokens de claro e escuro já existiam por completo no
 * design system do projeto anterior — só não havia nada que trocasse a classe.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alternar tema">
          <Sun className="h-4 w-4 dark:hidden" aria-hidden />
          <Moon className="hidden h-4 w-4 dark:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} aria-current={theme === 'light'}>
          <Sun className="mr-2 h-4 w-4" aria-hidden /> Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} aria-current={theme === 'dark'}>
          <Moon className="mr-2 h-4 w-4" aria-hidden /> Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} aria-current={theme === 'system'}>
          <Monitor className="mr-2 h-4 w-4" aria-hidden /> Do sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
