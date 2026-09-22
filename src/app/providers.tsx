import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/auth';
import { MODO_DEMO } from '@/lib/env';

/**
 * Cliente do React Query.
 *
 * `retry: 1` em vez do padrão 3: um erro de RLS ou de validação não melhora na
 * terceira tentativa — só atrasa a mensagem de erro em alguns segundos.
 * `staleTime` de meio minuto evita refetch a cada foco de janela em telas de
 * cadastro, que mudam pouco.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * A demonstração usa rotas por hash.
 *
 * Ela é publicada como página estática, servida de um subcaminho e sem
 * reescrita de URL no servidor: com rotas normais, abrir ou recarregar
 * /clientes devolveria 404. Com hash, tudo resolve no navegador.
 */
const Router = MODO_DEMO ? HashRouter : BrowserRouter;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider delayDuration={300}>
          <Router>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
