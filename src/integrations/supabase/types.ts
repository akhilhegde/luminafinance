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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string
          icon: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          icon?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          icon?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      imported_transactions: {
        Row: {
          adjusted_amount: number
          ai_suggestion: string | null
          category_id: string | null
          created_at: string
          duplicate_of: string | null
          id: string
          import_id: string
          is_ignored: boolean
          is_reviewed: boolean
          notes: string | null
          original_amount: number
          payee: string
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          adjusted_amount: number
          ai_suggestion?: string | null
          category_id?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          import_id: string
          is_ignored?: boolean
          is_reviewed?: boolean
          notes?: string | null
          original_amount: number
          payee: string
          transaction_date?: string
          type?: string
          user_id: string
        }
        Update: {
          adjusted_amount?: number
          ai_suggestion?: string | null
          category_id?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          import_id?: string
          is_ignored?: boolean
          is_reviewed?: boolean
          notes?: string | null
          original_amount?: number
          payee?: string
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "imported_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "statement_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      mapping_rules: {
        Row: {
          category_id: string
          created_at: string
          id: string
          payee_pattern: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          payee_pattern: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          payee_pattern?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapping_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_ignore_limit: number | null
          created_at: string
          current_streak: number
          daily_budget: number
          display_name: string | null
          id: string
          last_active_at: string | null
          last_activity_date: string | null
          total_bills_split: number
          total_statements_analyzed: number
          total_xp: number
          unlocked_trophies: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_ignore_limit?: number | null
          created_at?: string
          current_streak?: number
          daily_budget?: number
          display_name?: string | null
          id?: string
          last_active_at?: string | null
          last_activity_date?: string | null
          total_bills_split?: number
          total_statements_analyzed?: number
          total_xp?: number
          unlocked_trophies?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_ignore_limit?: number | null
          created_at?: string
          current_streak?: number
          daily_budget?: number
          display_name?: string | null
          id?: string
          last_active_at?: string | null
          last_activity_date?: string | null
          total_bills_split?: number
          total_statements_analyzed?: number
          total_xp?: number
          unlocked_trophies?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      split_items: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          imported_transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          imported_transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          imported_transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_items_imported_transaction_id_fkey"
            columns: ["imported_transaction_id"]
            isOneToOne: false
            referencedRelation: "imported_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_imports: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          reviewed_count: number
          status: string
          total_transactions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          reviewed_count?: number
          status?: string
          total_transactions?: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          reviewed_count?: number
          status?: string
          total_transactions?: number
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
