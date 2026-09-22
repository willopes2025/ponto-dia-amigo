import { createContext } from 'react';

import type { AuthState } from './types';

/**
 * Contexto de autenticação, num arquivo só dele.
 *
 * Separar o contexto do componente e dos hooks é o que permite que
 * `AuthProvider.tsx` exporte apenas um componente — requisito do Fast Refresh
 * do Vite, que desliga o hot reload de arquivos que misturam componente e
 * outros valores exportados.
 */
export const AuthContext = createContext<AuthState | null>(null);
