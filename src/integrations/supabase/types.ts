export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          chave_api: string | null
          created_at: string | null
          id: string
          janela_disparo_fim: string | null
          janela_disparo_inicio: string | null
          nome_fantasia: string
          provedor_mensageria:
            | Database["public"]["Enums"]["messaging_provider"]
            | null
          remetente: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          chave_api?: string | null
          created_at?: string | null
          id?: string
          janela_disparo_fim?: string | null
          janela_disparo_inicio?: string | null
          nome_fantasia: string
          provedor_mensageria?:
            | Database["public"]["Enums"]["messaging_provider"]
            | null
          remetente?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          chave_api?: string | null
          created_at?: string | null
          id?: string
          janela_disparo_fim?: string | null
          janela_disparo_inicio?: string | null
          nome_fantasia?: string
          provedor_mensageria?:
            | Database["public"]["Enums"]["messaging_provider"]
            | null
          remetente?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          atrasos_min: number | null
          created_at: string | null
          data: string
          extras_min: number | null
          horas_previstas: unknown | null
          horas_trabalhadas: unknown | null
          id: string
          saldo_dia: unknown | null
          status: Database["public"]["Enums"]["daily_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          atrasos_min?: number | null
          created_at?: string | null
          data: string
          extras_min?: number | null
          horas_previstas?: unknown | null
          horas_trabalhadas?: unknown | null
          id?: string
          saldo_dia?: unknown | null
          status?: Database["public"]["Enums"]["daily_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          atrasos_min?: number | null
          created_at?: string | null
          data?: string
          extras_min?: number | null
          horas_previstas?: unknown | null
          horas_trabalhadas?: unknown | null
          id?: string
          saldo_dia?: unknown | null
          status?: Database["public"]["Enums"]["daily_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          company_id: string
          created_at: string | null
          data: string
          id: string
          nome: string
          regional: boolean | null
          uf: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data: string
          id?: string
          nome: string
          regional?: boolean | null
          uf?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data?: string
          id?: string
          nome?: string
          regional?: boolean | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          ativo: boolean | null
          company_id: string
          created_at: string | null
          endereco: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          raio_metros: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          raio_metros?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          raio_metros?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          canal: Database["public"]["Enums"]["messaging_provider"]
          created_at: string | null
          data: string
          enviado_em: string | null
          erro: string | null
          id: string
          status: Database["public"]["Enums"]["message_status"] | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["messaging_provider"]
          created_at?: string | null
          data: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["messaging_provider"]
          created_at?: string | null
          data?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          banco_horas: boolean | null
          company_id: string
          contar_hora_extra: boolean | null
          created_at: string | null
          excedente_paga: boolean | null
          gps_obrigatorio: boolean | null
          id: string
          ip_whitelist: string[] | null
          selfie_obrigatoria: boolean | null
          tolerancia_min: number | null
          updated_at: string | null
        }
        Insert: {
          banco_horas?: boolean | null
          company_id: string
          contar_hora_extra?: boolean | null
          created_at?: string | null
          excedente_paga?: boolean | null
          gps_obrigatorio?: boolean | null
          id?: string
          ip_whitelist?: string[] | null
          selfie_obrigatoria?: boolean | null
          tolerancia_min?: number | null
          updated_at?: string | null
        }
        Update: {
          banco_horas?: boolean | null
          company_id?: string
          contar_hora_extra?: boolean | null
          created_at?: string | null
          excedente_paga?: boolean | null
          gps_obrigatorio?: boolean | null
          id?: string
          ip_whitelist?: string[] | null
          selfie_obrigatoria?: boolean | null
          tolerancia_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string | null
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"] | null
          status: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email: string
          id?: string
          nome: string
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string | null
          data_ref: string | null
          id: string
          motivo_admin: string | null
          payload: Json | null
          status: Database["public"]["Enums"]["request_status"] | null
          tipo: Database["public"]["Enums"]["request_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_ref?: string | null
          id?: string
          motivo_admin?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["request_status"] | null
          tipo: Database["public"]["Enums"]["request_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_ref?: string | null
          id?: string
          motivo_admin?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["request_status"] | null
          tipo?: Database["public"]["Enums"]["request_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string | null
          data: string
          id: string
          localizacao_obrigatoria: boolean | null
          observacao: string | null
          remoto: boolean | null
          shift_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          localizacao_obrigatoria?: boolean | null
          observacao?: string | null
          remoto?: boolean | null
          shift_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          localizacao_obrigatoria?: boolean | null
          observacao?: string | null
          remoto?: boolean | null
          shift_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          company_id: string
          created_at: string | null
          dias_semana: number[] | null
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_minutos: number | null
          nome_turno: string
          policy_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          dias_semana?: number[] | null
          hora_fim: string
          hora_inicio: string
          id?: string
          intervalo_minutos?: number | null
          nome_turno: string
          policy_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          dias_semana?: number[] | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_minutos?: number | null
          nome_turno?: string
          policy_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string | null
          data: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          ip: unknown | null
          motivo_invalidez: string | null
          origem: Database["public"]["Enums"]["entry_origin"] | null
          selfie_url: string | null
          timestamp: string
          tipo: Database["public"]["Enums"]["time_entry_type"]
          updated_at: string | null
          user_id: string
          valido: boolean | null
        }
        Insert: {
          created_at?: string | null
          data: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ip?: unknown | null
          motivo_invalidez?: string | null
          origem?: Database["public"]["Enums"]["entry_origin"] | null
          selfie_url?: string | null
          timestamp: string
          tipo: Database["public"]["Enums"]["time_entry_type"]
          updated_at?: string | null
          user_id: string
          valido?: boolean | null
        }
        Update: {
          created_at?: string | null
          data?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ip?: unknown | null
          motivo_invalidez?: string | null
          origem?: Database["public"]["Enums"]["entry_origin"] | null
          selfie_url?: string | null
          timestamp?: string
          tipo?: Database["public"]["Enums"]["time_entry_type"]
          updated_at?: string | null
          user_id?: string
          valido?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      daily_status: "completo" | "incompleto" | "faltou"
      entry_origin: "app" | "webhook" | "ajuste_admin"
      message_status: "ok" | "falha"
      messaging_provider: "whatsapp" | "sms" | "email"
      request_status: "pendente" | "aprovado" | "negado"
      request_type: "ajuste" | "abono" | "folga"
      time_entry_type: "entrada" | "saida" | "pausa_inicio" | "pausa_fim"
      user_role: "admin" | "collab"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      daily_status: ["completo", "incompleto", "faltou"],
      entry_origin: ["app", "webhook", "ajuste_admin"],
      message_status: ["ok", "falha"],
      messaging_provider: ["whatsapp", "sms", "email"],
      request_status: ["pendente", "aprovado", "negado"],
      request_type: ["ajuste", "abono", "folga"],
      time_entry_type: ["entrada", "saida", "pausa_inicio", "pausa_fim"],
      user_role: ["admin", "collab"],
    },
  },
} as const
