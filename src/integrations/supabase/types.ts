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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      credit_cards: {
        Row: {
          best_purchase_day: number | null
          brand: string | null
          created_at: string
          credit_limit: number | null
          due_day: number | null
          id: string
          last_digits: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_purchase_day?: number | null
          brand?: string | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          id?: string
          last_digits?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_purchase_day?: number | null
          brand?: string | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          id?: string
          last_digits?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          created_at: string
          daily_goal: number
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_goal: number
          date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_goal?: number
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          credit_card_id: string | null
          current_installment: number | null
          date: string
          id: string
          installments: number | null
          notes: string | null
          payment_method: string | null
          total_installments: number | null
          updated_at: string
          user_id: string
          vehicle: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          credit_card_id?: string | null
          current_installment?: number | null
          date: string
          id?: string
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          total_installments?: number | null
          updated_at?: string
          user_id: string
          vehicle?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          credit_card_id?: string | null
          current_installment?: number | null
          date?: string
          id?: string
          installments?: number | null
          notes?: string | null
          payment_method?: string | null
          total_installments?: number | null
          updated_at?: string
          user_id?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          created_at: string
          credit_card_id: string | null
          date: string
          fuel_type: string
          id: string
          liters: number
          odometer_km: number | null
          payment_method: string | null
          station: string | null
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_card_id?: string | null
          date: string
          fuel_type: string
          id?: string
          liters: number
          odometer_km?: number | null
          payment_method?: string | null
          station?: string | null
          total_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_card_id?: string | null
          date?: string
          fuel_type?: string
          id?: string
          liters?: number
          odometer_km?: number | null
          payment_method?: string | null
          station?: string | null
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_bills: {
        Row: {
          amount: number
          created_at: string
          credit_card_id: string
          id: string
          month_year: string
          paid_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          credit_card_id: string
          id?: string
          month_year: string
          paid_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_card_id?: string
          id?: string
          month_year?: string
          paid_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paid_bills_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apps_used: string[] | null
          city: string | null
          created_at: string
          currency: string | null
          id: string
          name: string | null
          start_week_day: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apps_used?: string[] | null
          city?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name?: string | null
          start_week_day?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apps_used?: string[] | null
          city?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name?: string | null
          start_week_day?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenues: {
        Row: {
          amount: number
          app: string
          created_at: string
          date: string
          id: string
          notes: string | null
          receive_method: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          app: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          receive_method?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          app?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          receive_method?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at: string
          current_period_end: string
          id: string
          kiwify_product_id: string
          kiwify_subscription_id: string
          last_event: string | null
          plan_name: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          current_period_end: string
          id?: string
          kiwify_product_id: string
          kiwify_subscription_id: string
          last_event?: string | null
          plan_name: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          current_period_end?: string
          id?: string
          kiwify_product_id?: string
          kiwify_subscription_id?: string
          last_event?: string | null
          plan_name?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      billing_interval: "month" | "quarter" | "year"
      subscription_status: "active" | "past_due" | "canceled"
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
      app_role: ["admin", "user"],
      billing_interval: ["month", "quarter", "year"],
      subscription_status: ["active", "past_due", "canceled"],
    },
  },
} as const
