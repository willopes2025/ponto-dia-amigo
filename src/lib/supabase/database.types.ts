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
      cliente_emails: {
        Row: {
          id: string
          tenant_id: string
          cliente_id: string
          email: string
          aceita_contato: boolean
          principal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cliente_id: string
          email: string
          aceita_contato?: boolean
          principal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cliente_id?: string
          email?: string
          aceita_contato?: boolean
          principal?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cliente_emails_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_emails_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      cliente_metricas: {
        Row: {
          cliente_id: string
          tenant_id: string
          vendas_qtd: number
          vendas_valor: number
          ticket_medio: number
          primeira_compra_em: string | null
          ultima_compra_em: string | null
          os_qtd: number
          receitas_qtd: number
          receita_mais_recente: string | null
          crediarios_qtd: number
          parcelas_atraso_qtd: number
          parcelas_atraso_valor: number
          atendimentos_qtd: number
          atualizado_em: string
        }
        Insert: {
          cliente_id: string
          tenant_id: string
          vendas_qtd?: number
          vendas_valor?: number
          ticket_medio?: number
          primeira_compra_em?: string | null
          ultima_compra_em?: string | null
          os_qtd?: number
          receitas_qtd?: number
          receita_mais_recente?: string | null
          crediarios_qtd?: number
          parcelas_atraso_qtd?: number
          parcelas_atraso_valor?: number
          atendimentos_qtd?: number
          atualizado_em?: string
        }
        Update: {
          cliente_id?: string
          tenant_id?: string
          vendas_qtd?: number
          vendas_valor?: number
          ticket_medio?: number
          primeira_compra_em?: string | null
          ultima_compra_em?: string | null
          os_qtd?: number
          receitas_qtd?: number
          receita_mais_recente?: string | null
          crediarios_qtd?: number
          parcelas_atraso_qtd?: number
          parcelas_atraso_valor?: number
          atendimentos_qtd?: number
          atualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cliente_metricas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: true
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_metricas_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      cliente_negativacoes: {
        Row: {
          id: string
          tenant_id: string
          cliente_id: string
          motivo: string
          valor: number | null
          data_inclusao: string
          data_baixa: string | null
          incluido_por: string | null
          baixado_por: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cliente_id: string
          motivo: string
          valor?: number | null
          data_inclusao?: string
          data_baixa?: string | null
          incluido_por?: string | null
          baixado_por?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cliente_id?: string
          motivo?: string
          valor?: number | null
          data_inclusao?: string
          data_baixa?: string | null
          incluido_por?: string | null
          baixado_por?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cliente_negativacoes_baixado_por_fkey'
            columns: ['baixado_por']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_negativacoes_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_negativacoes_incluido_por_fkey'
            columns: ['incluido_por']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_negativacoes_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      cliente_nucleo: {
        Row: {
          nucleo_id: string
          cliente_id: string
          tenant_id: string
          grau_parentesco: string | null
          created_at: string
        }
        Insert: {
          nucleo_id: string
          cliente_id: string
          tenant_id: string
          grau_parentesco?: string | null
          created_at?: string
        }
        Update: {
          nucleo_id?: string
          cliente_id?: string
          tenant_id?: string
          grau_parentesco?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cliente_nucleo_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: true
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_nucleo_nucleo_id_fkey'
            columns: ['nucleo_id']
            isOneToOne: false
            referencedRelation: 'nucleos_familiares'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_nucleo_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      cliente_referencias: {
        Row: {
          id: string
          tenant_id: string
          cliente_id: string
          nome: string
          telefone: string | null
          relacao: string | null
          observacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cliente_id: string
          nome: string
          telefone?: string | null
          relacao?: string | null
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cliente_id?: string
          nome?: string
          telefone?: string | null
          relacao?: string | null
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cliente_referencias_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_referencias_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      cliente_telefones: {
        Row: {
          id: string
          tenant_id: string
          cliente_id: string
          ddi: string
          numero: string
          tipo: Database['public']['Enums']['tipo_telefone']
          aceita_whatsapp: boolean
          aceita_sms: boolean
          aceita_ligacao: boolean
          principal: boolean
          observacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cliente_id: string
          ddi?: string
          numero: string
          tipo?: Database['public']['Enums']['tipo_telefone']
          aceita_whatsapp?: boolean
          aceita_sms?: boolean
          aceita_ligacao?: boolean
          principal?: boolean
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cliente_id?: string
          ddi?: string
          numero?: string
          tipo?: Database['public']['Enums']['tipo_telefone']
          aceita_whatsapp?: boolean
          aceita_sms?: boolean
          aceita_ligacao?: boolean
          principal?: boolean
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cliente_telefones_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cliente_telefones_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      clientes: {
        Row: {
          id: string
          tenant_id: string
          store_id: string | null
          codigo: number
          tipo: Database['public']['Enums']['tipo_pessoa']
          nome: string
          apelido: string | null
          cpf_cnpj: string | null
          rg: string | null
          data_nascimento: string | null
          sexo: Database['public']['Enums']['sexo_cliente']
          estado_civil: string | null
          razao_social: string | null
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          suframa: string | null
          contribuinte_icms: boolean
          cep: string | null
          endereco: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          pais: string
          responsavel_id: string | null
          grau_parentesco: string | null
          nome_pai: string | null
          nome_mae: string | null
          profissao_id: string | null
          escolaridade: string | null
          renda_familiar: number | null
          origem_id: string | null
          convenio_id: string | null
          vendedor_preferencia_id: string | null
          codigo_externo: string | null
          desconto_padrao: number
          acrescimo_padrao: number
          limite_crediario: number | null
          consentimento_contato_em: string | null
          consentimento_origem: string | null
          observacoes: string | null
          negativado: boolean
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          store_id?: string | null
          codigo: number
          tipo?: Database['public']['Enums']['tipo_pessoa']
          nome: string
          apelido?: string | null
          cpf_cnpj?: string | null
          rg?: string | null
          data_nascimento?: string | null
          sexo?: Database['public']['Enums']['sexo_cliente']
          estado_civil?: string | null
          razao_social?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          suframa?: string | null
          contribuinte_icms?: boolean
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          pais?: string
          responsavel_id?: string | null
          grau_parentesco?: string | null
          nome_pai?: string | null
          nome_mae?: string | null
          profissao_id?: string | null
          escolaridade?: string | null
          renda_familiar?: number | null
          origem_id?: string | null
          convenio_id?: string | null
          vendedor_preferencia_id?: string | null
          codigo_externo?: string | null
          desconto_padrao?: number
          acrescimo_padrao?: number
          limite_crediario?: number | null
          consentimento_contato_em?: string | null
          consentimento_origem?: string | null
          observacoes?: string | null
          negativado?: boolean
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          store_id?: string | null
          codigo?: number
          tipo?: Database['public']['Enums']['tipo_pessoa']
          nome?: string
          apelido?: string | null
          cpf_cnpj?: string | null
          rg?: string | null
          data_nascimento?: string | null
          sexo?: Database['public']['Enums']['sexo_cliente']
          estado_civil?: string | null
          razao_social?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          suframa?: string | null
          contribuinte_icms?: boolean
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          pais?: string
          responsavel_id?: string | null
          grau_parentesco?: string | null
          nome_pai?: string | null
          nome_mae?: string | null
          profissao_id?: string | null
          escolaridade?: string | null
          renda_familiar?: number | null
          origem_id?: string | null
          convenio_id?: string | null
          vendedor_preferencia_id?: string | null
          codigo_externo?: string | null
          desconto_padrao?: number
          acrescimo_padrao?: number
          limite_crediario?: number | null
          consentimento_contato_em?: string | null
          consentimento_origem?: string | null
          observacoes?: string | null
          negativado?: boolean
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clientes_convenio_id_fkey'
            columns: ['convenio_id']
            isOneToOne: false
            referencedRelation: 'convenios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clientes_origem_id_fkey'
            columns: ['origem_id']
            isOneToOne: false
            referencedRelation: 'origens_cliente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clientes_profissao_id_fkey'
            columns: ['profissao_id']
            isOneToOne: false
            referencedRelation: 'profissoes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clientes_responsavel_id_fkey'
            columns: ['responsavel_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clientes_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clientes_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clientes_vendedor_preferencia_id_fkey'
            columns: ['vendedor_preferencia_id']
            isOneToOne: false
            referencedRelation: 'funcionarios'
            referencedColumns: ['id']
          }
        ]
      }
      contadores: {
        Row: {
          id: string
          tenant_id: string
          store_id: string | null
          escopo: string
          valor: number
        }
        Insert: {
          id?: string
          tenant_id: string
          store_id?: string | null
          escopo: string
          valor?: number
        }
        Update: {
          id?: string
          tenant_id?: string
          store_id?: string | null
          escopo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: 'contadores_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contadores_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      convenios: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          cnpj: string | null
          contato: string | null
          telefone: string | null
          email: string | null
          desconto_percentual: number
          tipo: string
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          cnpj?: string | null
          contato?: string | null
          telefone?: string | null
          email?: string | null
          desconto_percentual?: number
          tipo?: string
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          cnpj?: string | null
          contato?: string | null
          telefone?: string | null
          email?: string | null
          desconto_percentual?: number
          tipo?: string
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'convenios_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      cores: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cores_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      equipe_membros: {
        Row: {
          equipe_id: string
          funcionario_id: string
          tenant_id: string
          desde: string
          ate: string | null
        }
        Insert: {
          equipe_id: string
          funcionario_id: string
          tenant_id: string
          desde?: string
          ate?: string | null
        }
        Update: {
          equipe_id?: string
          funcionario_id?: string
          tenant_id?: string
          desde?: string
          ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'equipe_membros_equipe_id_fkey'
            columns: ['equipe_id']
            isOneToOne: false
            referencedRelation: 'equipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipe_membros_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'funcionarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipe_membros_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      equipes: {
        Row: {
          id: string
          tenant_id: string
          store_id: string | null
          nome: string
          gerente_id: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          store_id?: string | null
          nome: string
          gerente_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          store_id?: string | null
          nome?: string
          gerente_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'equipes_gerente_id_fkey'
            columns: ['gerente_id']
            isOneToOne: false
            referencedRelation: 'funcionarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipes_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipes_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      feriados: {
        Row: {
          id: string
          tenant_id: string
          store_id: string | null
          data: string
          nome: string
          abrangencia: string
          uf: string | null
          recorrente: boolean
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          store_id?: string | null
          data: string
          nome: string
          abrangencia?: string
          uf?: string | null
          recorrente?: boolean
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          store_id?: string | null
          data?: string
          nome?: string
          abrangencia?: string
          uf?: string | null
          recorrente?: boolean
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feriados_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'feriados_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      formas_pagamento: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          natureza: Database['public']['Enums']['natureza_pagamento']
          permite_parcelamento: boolean
          max_parcelas: number
          taxa_percentual: number
          taxa_fixa: number
          dias_credito: number
          movimenta_caixa: boolean
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          natureza: Database['public']['Enums']['natureza_pagamento']
          permite_parcelamento?: boolean
          max_parcelas?: number
          taxa_percentual?: number
          taxa_fixa?: number
          dias_credito?: number
          movimenta_caixa?: boolean
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          natureza?: Database['public']['Enums']['natureza_pagamento']
          permite_parcelamento?: boolean
          max_parcelas?: number
          taxa_percentual?: number
          taxa_fixa?: number
          dias_credito?: number
          movimenta_caixa?: boolean
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'formas_pagamento_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      formatos: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'formatos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      fornecedor_contatos: {
        Row: {
          id: string
          tenant_id: string
          fornecedor_id: string
          nome: string
          cargo: string | null
          email: string | null
          telefone_fixo: string | null
          telefone_movel: string | null
          observacao: string | null
          principal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          fornecedor_id: string
          nome: string
          cargo?: string | null
          email?: string | null
          telefone_fixo?: string | null
          telefone_movel?: string | null
          observacao?: string | null
          principal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          fornecedor_id?: string
          nome?: string
          cargo?: string | null
          email?: string | null
          telefone_fixo?: string | null
          telefone_movel?: string | null
          observacao?: string | null
          principal?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fornecedor_contatos_fornecedor_id_fkey'
            columns: ['fornecedor_id']
            isOneToOne: false
            referencedRelation: 'fornecedores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fornecedor_contatos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      fornecedores: {
        Row: {
          id: string
          tenant_id: string
          nome_fantasia: string
          razao_social: string | null
          cpf_cnpj: string | null
          is_laboratorio: boolean
          prazo_producao_dias: number | null
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          suframa: string | null
          contribuinte_icms: boolean
          cep: string | null
          endereco: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          telefone: string | null
          email: string | null
          website: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome_fantasia: string
          razao_social?: string | null
          cpf_cnpj?: string | null
          is_laboratorio?: boolean
          prazo_producao_dias?: number | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          suframa?: string | null
          contribuinte_icms?: boolean
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          website?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome_fantasia?: string
          razao_social?: string | null
          cpf_cnpj?: string | null
          is_laboratorio?: boolean
          prazo_producao_dias?: number | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          suframa?: string | null
          contribuinte_icms?: boolean
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          telefone?: string | null
          email?: string | null
          website?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fornecedores_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      funcionarios: {
        Row: {
          id: string
          tenant_id: string
          store_id: string | null
          nome: string
          funcao: string | null
          cpf: string | null
          rg: string | null
          data_nascimento: string | null
          data_admissao: string | null
          data_demissao: string | null
          telefone_fixo: string | null
          telefone_movel: string | null
          email: string | null
          cep: string | null
          endereco: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          foto_url: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          store_id?: string | null
          nome: string
          funcao?: string | null
          cpf?: string | null
          rg?: string | null
          data_nascimento?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          telefone_fixo?: string | null
          telefone_movel?: string | null
          email?: string | null
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          foto_url?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          store_id?: string | null
          nome?: string
          funcao?: string | null
          cpf?: string | null
          rg?: string | null
          data_nascimento?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          telefone_fixo?: string | null
          telefone_movel?: string | null
          email?: string | null
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          foto_url?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'funcionarios_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'funcionarios_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      generos: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'generos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      grifes: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'grifes_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      grupos: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          coeficiente: number | null
          indice: number | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          coeficiente?: number | null
          indice?: number | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          coeficiente?: number | null
          indice?: number | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'grupos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      medicos: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          conselho: string
          registro: string | null
          uf_registro: string | null
          especialidade: string | null
          telefone: string | null
          email: string | null
          observacoes: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          conselho?: string
          registro?: string | null
          uf_registro?: string | null
          especialidade?: string | null
          telefone?: string | null
          email?: string | null
          observacoes?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          conselho?: string
          registro?: string | null
          uf_registro?: string | null
          especialidade?: string | null
          telefone?: string | null
          email?: string | null
          observacoes?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'medicos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      motivos_cancelamento: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          aplica_a: string
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          aplica_a?: string
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          aplica_a?: string
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'motivos_cancelamento_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      nucleos_familiares: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          titular_id: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          titular_id?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          titular_id?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'nucleos_familiares_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nucleos_familiares_titular_id_fkey'
            columns: ['titular_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          }
        ]
      }
      origens_cliente: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'origens_cliente_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
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
      plano_contas: {
        Row: {
          id: string
          tenant_id: string
          parent_id: string | null
          codigo: string
          nome: string
          natureza: Database['public']['Enums']['natureza_conta']
          analitica: boolean
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          parent_id?: string | null
          codigo: string
          nome: string
          natureza: Database['public']['Enums']['natureza_conta']
          analitica?: boolean
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          parent_id?: string | null
          codigo?: string
          nome?: string
          natureza?: Database['public']['Enums']['natureza_conta']
          analitica?: boolean
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plano_contas_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'plano_contas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'plano_contas_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
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
          funcionario_id: string | null
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
          funcionario_id?: string | null
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
          funcionario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'funcionarios'
            referencedColumns: ['id']
          },
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
      profissoes: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profissoes_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      receita_historico: {
        Row: {
          id: string
          tenant_id: string
          receita_id: string
          versao: number
          dados: Json
          alterado_por: string | null
          alterado_em: string
        }
        Insert: {
          id?: string
          tenant_id: string
          receita_id: string
          versao: number
          dados: Json
          alterado_por?: string | null
          alterado_em?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          receita_id?: string
          versao?: number
          dados?: Json
          alterado_por?: string | null
          alterado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receita_historico_alterado_por_fkey'
            columns: ['alterado_por']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receita_historico_receita_id_fkey'
            columns: ['receita_id']
            isOneToOne: false
            referencedRelation: 'receitas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receita_historico_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      receitas: {
        Row: {
          id: string
          tenant_id: string
          store_id: string | null
          cliente_id: string
          codigo: number
          tipo: Database['public']['Enums']['tipo_receita']
          medico_id: string | null
          medico_nome: string | null
          data_receita: string
          validade: string
          od_esferico: number | null
          od_cilindrico: number | null
          od_eixo: number | null
          od_adicao: number | null
          od_dnp: number | null
          od_altura: number | null
          od_prisma: number | null
          od_base: string | null
          od_curva_base: number | null
          od_diametro: number | null
          oe_esferico: number | null
          oe_cilindrico: number | null
          oe_eixo: number | null
          oe_adicao: number | null
          oe_dnp: number | null
          oe_altura: number | null
          oe_prisma: number | null
          oe_base: string | null
          oe_curva_base: number | null
          oe_diametro: number | null
          multifocal: boolean | null
          observacoes: string | null
          arquivo_url: string | null
          criado_por: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          store_id?: string | null
          cliente_id: string
          codigo: number
          tipo?: Database['public']['Enums']['tipo_receita']
          medico_id?: string | null
          medico_nome?: string | null
          data_receita?: string
          validade: string
          od_esferico?: number | null
          od_cilindrico?: number | null
          od_eixo?: number | null
          od_adicao?: number | null
          od_dnp?: number | null
          od_altura?: number | null
          od_prisma?: number | null
          od_base?: string | null
          od_curva_base?: number | null
          od_diametro?: number | null
          oe_esferico?: number | null
          oe_cilindrico?: number | null
          oe_eixo?: number | null
          oe_adicao?: number | null
          oe_dnp?: number | null
          oe_altura?: number | null
          oe_prisma?: number | null
          oe_base?: string | null
          oe_curva_base?: number | null
          oe_diametro?: number | null
          multifocal?: boolean | null
          observacoes?: string | null
          arquivo_url?: string | null
          criado_por?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          store_id?: string | null
          cliente_id?: string
          codigo?: number
          tipo?: Database['public']['Enums']['tipo_receita']
          medico_id?: string | null
          medico_nome?: string | null
          data_receita?: string
          validade?: string
          od_esferico?: number | null
          od_cilindrico?: number | null
          od_eixo?: number | null
          od_adicao?: number | null
          od_dnp?: number | null
          od_altura?: number | null
          od_prisma?: number | null
          od_base?: string | null
          od_curva_base?: number | null
          od_diametro?: number | null
          oe_esferico?: number | null
          oe_cilindrico?: number | null
          oe_eixo?: number | null
          oe_adicao?: number | null
          oe_dnp?: number | null
          oe_altura?: number | null
          oe_prisma?: number | null
          oe_base?: string | null
          oe_curva_base?: number | null
          oe_diametro?: number | null
          multifocal?: boolean | null
          observacoes?: string | null
          arquivo_url?: string | null
          criado_por?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receitas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receitas_criado_por_fkey'
            columns: ['criado_por']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receitas_medico_id_fkey'
            columns: ['medico_id']
            isOneToOne: false
            referencedRelation: 'medicos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receitas_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receitas_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      responsaveis_tecnicos: {
        Row: {
          id: string
          tenant_id: string
          store_id: string | null
          nome: string
          registro: string | null
          cpf: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          store_id?: string | null
          nome: string
          registro?: string | null
          cpf?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          store_id?: string | null
          nome?: string
          registro?: string | null
          cpf?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'responsaveis_tecnicos_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'responsaveis_tecnicos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      situacoes_conta_receber: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          cor: string | null
          considera_inadimplente: boolean
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          cor?: string | null
          considera_inadimplente?: boolean
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          cor?: string | null
          considera_inadimplente?: boolean
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'situacoes_conta_receber_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
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
      subgrupos: {
        Row: {
          id: string
          tenant_id: string
          grupo_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          grupo_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          grupo_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subgrupos_grupo_id_fkey'
            columns: ['grupo_id']
            isOneToOne: false
            referencedRelation: 'grupos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subgrupos_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      tamanhos: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tamanhos_tenant_id_fkey'
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
      tipos_documento: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tipos_documento_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      tipos_lente: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tipos_lente_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      unidades: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          ordem: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          ordem?: number
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unidades_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
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
      vw_receitas_vencidas: {
        Row: {
          receita_id: string | null
          tenant_id: string | null
          store_id: string | null
          cliente_id: string | null
          codigo: number | null
          tipo: Database['public']['Enums']['tipo_receita'] | null
          data_receita: string | null
          validade: string | null
          multifocal: boolean | null
          dias_vencida: number | null
          cliente_nome: string | null
          negativado: boolean | null
          consentiu_contato: boolean | null
          tem_canal_aberto: boolean | null
          ultima_compra_em: string | null
          ticket_medio: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aplicar_rls_padrao: {
        Args: {
          p_tabela: string
          p_escopo: unknown
          p_perm_select: unknown
          p_perm_insert: unknown
          p_perm_update: unknown
          p_perm_delete: unknown
        }
        Returns: undefined
      }
      aplicar_triggers_padrao: {
        Args: {
          p_tabela: string
          p_auditar: unknown
        }
        Returns: undefined
      }
      calcular_pascoa: {
        Args: {
          p_ano: number
        }
        Returns: string
      }
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
      proximo_numero: {
        Args: {
          p_tenant_id: string
          p_escopo: string
          p_store_id: unknown
        }
        Returns: number
      }
      semear_cadastros_padrao: {
        Args: {
          p_tenant_id: string
        }
        Returns: undefined
      }
      semear_feriados_nacionais: {
        Args: {
          p_tenant_id: string
          p_ano: number
        }
        Returns: undefined
      }
      somente_digitos: {
        Args: {
          p_texto: string
        }
        Returns: string
      }
    }
    Enums: {
      natureza_conta: 'receita' | 'despesa'
      natureza_pagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'crediario' | 'cheque' | 'transferencia' | 'credito_troca' | 'cashback' | 'permuta'
      sexo_cliente: 'feminino' | 'masculino' | 'outro' | 'nao_informado'
      tipo_pessoa: 'pf' | 'pj'
      tipo_receita: 'oculos' | 'lente_contato'
      tipo_telefone: 'movel' | 'fixo' | 'comercial' | 'recado'
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
