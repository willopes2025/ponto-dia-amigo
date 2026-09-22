import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/auth';

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

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider delayDuration={300}>
          <BrowserRouter>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
