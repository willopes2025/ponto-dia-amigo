import { useContext } from 'react';

import type { PermissionKey } from '@/lib/permissions/catalog';

import { AuthContext } from './context';
import type { AuthState } from './types';

export function useAuth(): AuthState {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return contexto;
}

/** Atalho para gating de UI: `const podeCancelar = useCan('vendas.cancelar')`. */
export function useCan(chave: PermissionKey): boolean {
  return useAuth().can(chave);
}
