import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Carregando, CarregandoTela } from '@/components/comum/Carregando';
import { AppShell } from '@/shell/AppShell';

import type { PermissionKey } from '@/lib/permissions/catalog';

import { Providers } from './providers';
import { RotaProtegida } from './RotaProtegida';
import { MODULOS } from './routes';

/**
 * As telas são carregadas sob demanda.
 *
 * Com trinta e um módulos, um bundle único cresce até o primeiro carregamento
 * ficar lento para todo mundo — inclusive para o vendedor que só usa três
 * telas. `lazy` faz cada módulo virar um pedaço à parte, baixado quando a rota
 * é aberta.
 */
const LandingPage = lazy(() => import('@/features/marketing/pages/LandingPage'));
const EntrarPage = lazy(() => import('@/features/auth/pages/EntrarPage'));
const CadastrarPage = lazy(() => import('@/features/auth/pages/CadastrarPage'));
const PainelPage = lazy(() => import('@/features/dashboard/pages/PainelPage'));
const CadastrosPage = lazy(() => import('@/features/cadastros/pages/CadastrosPage'));
const PermissoesPage = lazy(() => import('@/features/permissoes/pages/PermissoesPage'));
const ClientesPage = lazy(() => import('@/features/clientes/pages/ClientesPage'));
const ClienteFormPage = lazy(() => import('@/features/clientes/pages/ClienteFormPage'));
const ReceitasPage = lazy(() => import('@/features/receitas/pages/ReceitasPage'));
const ModuloEmBrevePage = lazy(() => import('@/features/sistema/pages/ModuloEmBrevePage'));
const NaoEncontradoPage = lazy(() => import('@/features/sistema/pages/NaoEncontradoPage'));

/**
 * Telas já construídas, por rota. O que não está aqui cai no placeholder do
 * módulo — que explica o que a tela fará e em qual fase entra.
 */
const PAGINAS: Record<string, ComponentType> = {
  '/painel': PainelPage,
  '/cadastros': CadastrosPage,
  '/permissoes': PermissoesPage,
  '/clientes': ClientesPage,
  '/receitas': ReceitasPage,
};

/**
 * Sub-rotas de um módulo já construído. Ficam fora de `MODULOS` porque o menu
 * mostra só a entrada principal — a navegação interna é da própria tela.
 */
const SUBROTAS: { path: string; permissao: PermissionKey; pagina: ComponentType }[] = [
  { path: '/cadastros/:slug', permissao: 'cadastros.acessar', pagina: CadastrosPage },
  { path: '/clientes/:id', permissao: 'clientes.consultar', pagina: ClienteFormPage },
];

export default function App() {
  return (
    <Providers>
      <Suspense fallback={<CarregandoTela />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<EntrarPage />} />
          <Route path="/cadastrar" element={<CadastrarPage />} />

          {/* Todo módulo do registry ganha rota aqui, com a permissão declarada
              junto dele. Uma lista só: o menu lê o mesmo array. */}
          <Route element={<AppShell />}>
            {MODULOS.map((modulo) => {
              const Pagina = PAGINAS[modulo.path] ?? ModuloEmBrevePage;
              return (
                <Route
                  key={modulo.path}
                  path={modulo.path}
                  element={
                    <RotaProtegida permissao={modulo.permissao}>
                      {/* Suspense interno: a troca de módulo não pisca a casca
                          inteira, só a área de conteúdo. */}
                      <Suspense fallback={<Carregando />}>
                        <Pagina />
                      </Suspense>
                    </RotaProtegida>
                  }
                />
              );
            })}

            {SUBROTAS.map(({ path, permissao, pagina: Pagina }) => (
              <Route
                key={path}
                path={path}
                element={
                  <RotaProtegida permissao={permissao}>
                    <Suspense fallback={<Carregando />}>
                      <Pagina />
                    </Suspense>
                  </RotaProtegida>
                }
              />
            ))}
          </Route>

          {/* Atalhos e compatibilidade de URL */}
          <Route path="/dashboard" element={<Navigate to="/painel" replace />} />
          <Route path="/login" element={<Navigate to="/entrar" replace />} />

          <Route path="*" element={<NaoEncontradoPage />} />
        </Routes>
      </Suspense>
    </Providers>
  );
}
