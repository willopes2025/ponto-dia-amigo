import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AvisoDemo } from '@/components/comum/AvisoDemo';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * Casca da aplicação: menu lateral fixo no desktop, gaveta no mobile.
 *
 * Usa o `Sheet` do shadcn em vez de um overlay feito à mão — traz foco preso,
 * fechar com Esc e rótulo acessível de graça.
 */
export function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AvisoDemo />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
          <Sidebar />
        </aside>

        <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar aoNavegar={() => setMenuAberto(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar aoAbrirMenu={() => setMenuAberto(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[110rem] space-y-6 px-4 py-6 sm:px-6">
              <Outlet />
            </div>
          </main>
        </div>

        <CommandPalette />
      </div>
    </div>
  );
}
