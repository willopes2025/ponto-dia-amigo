import type { ReactNode } from 'react';

import type { PermissionKey } from '@/lib/permissions/catalog';

import { useAuth } from './useAuth';

interface CanProps {
  /** Exige esta chave. */
  permissao?: PermissionKey;
  /** Exige QUALQUER uma destas. */
  alguma?: PermissionKey[];
  /** Exige TODAS estas. */
  todas?: PermissionKey[];
  children: ReactNode;
  /** O que mostrar quando não tem permissão. Por padrão, nada. */
  fallback?: ReactNode;
}

/**
 * Esconde um trecho de interface conforme a permissão.
 *
 * Isto é conveniência de UI, não segurança: quem decide de verdade é o RLS no
 * banco. Esconder o botão evita que o usuário descubra o limite por um erro.
 */
export function Can({ permissao, alguma, todas, children, fallback = null }: CanProps) {
  const { can, canAlguma, canTodas } = useAuth();

  const permitido =
    (permissao ? can(permissao) : true) &&
    (alguma ? canAlguma(...alguma) : true) &&
    (todas ? canTodas(...todas) : true);

  return <>{permitido ? children : fallback}</>;
}
