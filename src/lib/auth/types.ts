import type { Tables } from '@/lib/supabase';
import type { PermissionKey } from '@/lib/permissions/catalog';

export type Profile = Tables<'profiles'>;
export type Tenant = Tables<'tenants'>;
export type Store = Tables<'stores'>;

export interface SessionContext {
  profile: Profile;
  tenant: Tenant;
  /** Filiais a que este usuário tem acesso, já ordenadas por código. */
  stores: Store[];
  permissions: Set<string>;
}

export interface AuthState {
  /** `undefined` enquanto a sessão está sendo resolvida; `null` quando não há sessão. */
  carregando: boolean;
  usuarioAutenticado: boolean;
  contexto: SessionContext | null;

  /** Filial selecionada. Null só quando o usuário não tem filial nenhuma. */
  storeAtual: Store | null;
  selecionarStore: (storeId: string) => void;

  can: (chave: PermissionKey) => boolean;
  canAlguma: (...chaves: PermissionKey[]) => boolean;
  canTodas: (...chaves: PermissionKey[]) => boolean;

  entrar: (email: string, senha: string) => Promise<{ erro: string | null }>;
  cadastrar: (dados: DadosCadastro) => Promise<{ erro: string | null; confirmacaoPendente: boolean }>;
  sair: () => Promise<void>;
  recarregarContexto: () => Promise<void>;
}

export interface DadosCadastro {
  nome: string;
  email: string;
  senha: string;
  /** Nome da rede. Só no cadastro de uma ótica nova; num convite, é ignorado. */
  nomeRede?: string;
  nomeLoja?: string;
}
