/**
 * GERADO AUTOMATICAMENTE — não edite.
 * Gerador: scripts/gen-db-types.mjs · Regenere com: npm run types:gen
 *
 * Reflete o schema produzido por supabase/migrations/. Se uma migration renomear
 * uma coluna, regenerar este arquivo faz o `tsc` apontar todos os pontos de uso
 * que precisam mudar — em vez de o erro aparecer em produção.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: number
          tenant_id: string | null
          store_id: string | null
          tabela: string
          registro_id: string
          operacao: string
          dados_antes: Json | null
          dados_depois: Json | null
          campos: string[] | null
          auth_user_id: string | null
          criado_em: string
        }
        Insert: {
          id?: number
          tenant_id?: string | null
          store_id?: string | null
          tabela: string
          registro_id: string
          operacao: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          campos?: string[] | null
          auth_user_id?: string | null
          criado_em?: string
        }
        Update: {
          id?: number
          tenant_id?: string | null
          store_id?: string | null
          tabela?: string
          registro_id?: string
          operacao?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          campos?: string[] | null
          auth_user_id?: string | null
          criado_em?: string
        }
        Relationships: []
      }
      permission_profile_permissions: {
        Row: {
          permission_profile_id: string
          permission_key: string
        }
        Insert: {
          permission_profile_id: string
          permission_key: string
        }
        Update: {
          permission_profile_id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: 'permission_profile_permissions_permission_key_fkey'
            columns: ['permission_key']
            isOneToOne: false
            referencedRelation: 'permissions'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'permission_profile_permissions_permission_profile_id_fkey'
            columns: ['permission_profile_id']
            isOneToOne: false
            referencedRelation: 'permission_profiles'
            referencedColumns: ['id']
          }
        ]
      }
      permission_profiles: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          is_owner: boolean
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          is_owner?: boolean
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          is_owner?: boolean
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'permission_profiles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      permissions: {
        Row: {
          key: string
          modulo: string
          acao: string
          label: string
          descricao: string | null
          sensivel: boolean
          ordem: number
        }
        Insert: {
          key: string
          modulo: string
          acao: string
          label: string
          descricao?: string | null
          sensivel?: boolean
          ordem?: number
        }
        Update: {
          key?: string
          modulo?: string
          acao?: string
          label?: string
          descricao?: string | null
          sensivel?: boolean
          ordem?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          nome: string
          email: string
          telefone: string | null
          avatar_url: string | null
          limite_desconto: number
          ultima_store_id: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          nome: string
          email: string
          telefone?: string | null
          avatar_url?: string | null
          limite_desconto?: number
          ultima_store_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          nome?: string
          email?: string
          telefone?: string | null
          avatar_url?: string | null
          limite_desconto?: number
          ultima_store_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_ultima_store_id_fkey'
            columns: ['ultima_store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      stores: {
        Row: {
          id: string
          tenant_id: string
          codigo: number
          nome_fantasia: string
          razao_social: string | null
          cnpj: string | null
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          suframa: string | null
          contribuinte_icms: boolean
          crt: number | null
          cep: string | null
          endereco: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          telefone: string | null
          email: string | null
          timezone: string
          dias_uteis: number[]
          certificado_validade: string | null
          licenca_status: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          codigo: number
          nome_fantasia: string
          razao_social?: string | null
          cnpj?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          suframa?: string | null
          contribuinte_icms?: boolean
          crt?: number | null
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          timezone?: string
          dias_uteis?: number[]
          certificado_validade?: string | null
          licenca_status?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          codigo?: number
          nome_fantasia?: string
          razao_social?: string | null
          cnpj?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          suframa?: string | null
          contribuinte_icms?: boolean
          crt?: number | null
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          timezone?: string
          dias_uteis?: number[]
          certificado_validade?: string | null
          licenca_status?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stores_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      tenants: {
        Row: {
          id: string
          nome: string
          slug: string
          documento: string | null
          timezone: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          slug: string
          documento?: string | null
          timezone?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          slug?: string
          documento?: string | null
          timezone?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          id: string
          tenant_id: string
          email: string
          nome: string | null
          permission_profile_ids: string[]
          store_ids: string[]
          limite_desconto: number
          criado_por: string | null
          expira_em: string
          aceito_em: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          nome?: string | null
          permission_profile_ids?: string[]
          store_ids?: string[]
          limite_desconto?: number
          criado_por?: string | null
          expira_em?: string
          aceito_em?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          nome?: string | null
          permission_profile_ids?: string[]
          store_ids?: string[]
          limite_desconto?: number
          criado_por?: string | null
          expira_em?: string
          aceito_em?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_invites_criado_por_fkey'
            columns: ['criado_por']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_invites_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      user_permission_profiles: {
        Row: {
          profile_id: string
          permission_profile_id: string
          created_at: string
        }
        Insert: {
          profile_id: string
          permission_profile_id: string
          created_at?: string
        }
        Update: {
          profile_id?: string
          permission_profile_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_permission_profiles_permission_profile_id_fkey'
            columns: ['permission_profile_id']
            isOneToOne: false
            referencedRelation: 'permission_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_permission_profiles_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      user_stores: {
        Row: {
          profile_id: string
          store_id: string
          is_padrao: boolean
          created_at: string
        }
        Insert: {
          profile_id: string
          store_id: string
          is_padrao?: boolean
          created_at?: string
        }
        Update: {
          profile_id?: string
          store_id?: string
          is_padrao?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_stores_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_stores_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_modelos_padrao: {
        Args: {
          p_tenant_id: string
        }
        Returns: undefined
      }
      current_permissions: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      current_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_store_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gerar_slug_tenant: {
        Args: {
          p_nome: string
        }
        Returns: string
      }
      has_permission: {
        Args: {
          p_key: string
        }
        Returns: boolean
      }
      normalizar_texto: {
        Args: {
          p_texto: string
        }
        Returns: string
      }
      somente_digitos: {
        Args: {
          p_texto: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public'];

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
