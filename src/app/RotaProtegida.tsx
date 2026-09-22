import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { CarregandoTela } from '@/components/comum/Carregando';
import SemPermissaoPage from '@/features/sistema/pages/SemPermissaoPage';
import { useAuth } from '@/lib/auth';
import type { PermissionKey } from '@/lib/permissions/catalog';

/**
 * Porteiro de rota: autenticação e permissão.
 *
 * O `ProtectedRoute` do app anterior só checava autenticação; a permissão era
 * verificada dentro de cada página, de um jeito diferente em cada uma. Aqui a
 * regra é uma, declarada no registry de rotas, e a falta de permissão devolve
 * um 403 que NOMEIA a chave faltante em vez de uma tela vazia.
 */
export function RotaProtegida({
  permissao,
  children,
}: {
  permissao?: PermissionKey;
  children: ReactNode;
}) {
  const { carregando, usuarioAutenticado, contexto, can } = useAuth();
  const location = useLocation();

  if (carregando) {
    return <CarregandoTela texto="Verificando seu acesso…" />;
  }

  if (!usuarioAutenticado) {
    // Guarda de onde o usuário veio, para voltar aí depois de entrar.
    return <Navigate to="/entrar" replace state={{ de: location.pathname }} />;
  }

  // Sessão válida sem contexto é estado inconsistente (perfil apagado, rede
  // desativada). Melhor encerrar a sessão do que deixar o app em meia-luz.
  if (!contexto) {
    return <Navigate to="/entrar" replace />;
  }

  if (permissao && !can(permissao)) {
    return <SemPermissaoPage />;
  }

  return <>{children}</>;
}
