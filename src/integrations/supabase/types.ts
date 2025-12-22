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
      bills_instances: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          fixed_bill_id: string
          id: string
          is_paid: boolean
          month_year: string
          paid_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          fixed_bill_id: string
          id?: string
          is_paid?: boolean
          month_year: string
          paid_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          fixed_bill_id?: string
          id?: string
          is_paid?: boolean
          month_year?: string
          paid_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_instances_fixed_bill_id_fkey"
            columns: ["fixed_bill_id"]
            isOneToOne: false
            referencedRelation: "fixed_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_members: {
        Row: {
          competition_id: string
          id: string
          is_competitor: boolean
          joined_at: string | null
          pix_key: string | null
          pix_key_type: string | null
          pix_updated_at: string | null
          role: string
          transparency_accepted: boolean
          transparency_accepted_at: string | null
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          is_competitor?: boolean
          joined_at?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_updated_at?: string | null
          role?: string
          transparency_accepted?: boolean
          transparency_accepted_at?: string | null
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          is_competitor?: boolean
          joined_at?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pix_updated_at?: string | null
          role?: string
          transparency_accepted?: boolean
          transparency_accepted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_members_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_payouts: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          payout_value: number
          status: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          payout_value?: number
          status: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          payout_value?: number
          status?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_payouts_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_payouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_results: {
        Row: {
          competition_id: string
          created_at: string
          finished_at: string
          goal_value: number | null
          meta_reached: boolean
          prize_value: number | null
          winner_score: number
          winner_team_id: string | null
          winner_type: string
          winner_user_id: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          finished_at?: string
          goal_value?: number | null
          meta_reached?: boolean
          prize_value?: number | null
          winner_score?: number
          winner_team_id?: string | null
          winner_type: string
          winner_user_id?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          finished_at?: string
          goal_value?: number | null
          meta_reached?: boolean
          prize_value?: number | null
          winner_score?: number
          winner_team_id?: string | null
          winner_type?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_results_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: true
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_results_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_teams: {
        Row: {
          competition_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          competition_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          competition_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_user_popups: {
        Row: {
          competition_id: string
          id: string
          popup_type: string
          shown_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          popup_type?: string
          shown_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          popup_type?: string
          shown_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_user_popups_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          allow_teams: boolean | null
          code: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          end_date: string
          goal_type: string
          goal_value: number
          host_participates: boolean
          id: string
          is_listed: boolean
          is_public: boolean | null
          max_members: number | null
          name: string
          password_hash: string
          prize_value: number
          start_date: string
          team_size: number | null
          updated_at: string | null
        }
        Insert: {
          allow_teams?: boolean | null
          code: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_date: string
          goal_type?: string
          goal_value: number
          host_participates?: boolean
          id?: string
          is_listed?: boolean
          is_public?: boolean | null
          max_members?: number | null
          name: string
          password_hash: string
          prize_value: number
          start_date: string
          team_size?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_teams?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          goal_type?: string
          goal_value?: number
          host_participates?: boolean
          id?: string
          is_listed?: boolean
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          password_hash?: string
          prize_value?: number
          start_date?: string
          team_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_card_invoices: {
        Row: {
          balance: number
          closing_date: string
          created_at: string
          credit_card_id: string
          due_date: string
          id: string
          is_paid: boolean
          paid_at: string | null
          paid_total: number
          period_end: string
          period_start: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          closing_date: string
          created_at?: string
          credit_card_id: string
          due_date: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          paid_total?: number
          period_end: string
          period_start: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          closing_date?: string
          created_at?: string
          credit_card_id?: string
          due_date?: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          paid_total?: number
          period_end?: string
          period_start?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards_with_limits"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          credit_card_id: string
          current_installment: number | null
          date: string
          description: string | null
          id: string
          invoice_id: string | null
          source_expense_id: string | null
          source_fuel_log_id: string | null
          total_installments: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          credit_card_id: string
          current_installment?: number | null
          date: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          source_expense_id?: string | null
          source_fuel_log_id?: string | null
          total_installments?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          credit_card_id?: string
          current_installment?: number | null
          date?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          source_expense_id?: string | null
          source_fuel_log_id?: string | null
          total_installments?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards_with_limits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_source_expense_id_fkey"
            columns: ["source_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_source_fuel_log_id_fkey"
            columns: ["source_fuel_log_id"]
            isOneToOne: false
            referencedRelation: "fuel_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          best_purchase_day: number | null
          brand: string | null
          closing_day: number | null
          created_at: string
          credit_limit: number | null
          due_day: number | null
          due_month_offset: number | null
          id: string
          last_digits: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_purchase_day?: number | null
          brand?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          due_month_offset?: number | null
          id?: string
          last_digits?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_purchase_day?: number | null
          brand?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          due_month_offset?: number | null
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
      daily_km_logs: {
        Row: {
          created_at: string
          date: string
          end_km: number | null
          id: string
          km_driven: number | null
          notes: string | null
          start_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_km?: number | null
          id?: string
          km_driven?: number | null
          notes?: string | null
          start_km: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_km?: number | null
          id?: string
          km_driven?: number | null
          notes?: string | null
          start_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_work_summary: {
        Row: {
          created_at: string
          date: string
          id: string
          km_rodados: number | null
          updated_at: string
          user_id: string
          worked_minutes: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          km_rodados?: number | null
          updated_at?: string
          user_id: string
          worked_minutes?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          km_rodados?: number | null
          updated_at?: string
          user_id?: string
          worked_minutes?: number | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          is_system: boolean
          key: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          key: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_system?: boolean
          key?: string
          name?: string
          user_id?: string | null
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
          fuel_log_id: string | null
          id: string
          installments: number | null
          invoice_id: string | null
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
          fuel_log_id?: string | null
          id?: string
          installments?: number | null
          invoice_id?: string | null
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
          fuel_log_id?: string | null
          id?: string
          installments?: number | null
          invoice_id?: string | null
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
          {
            foreignKeyName: "expenses_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards_with_limits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_fuel_log_id_fkey"
            columns: ["fuel_log_id"]
            isOneToOne: false
            referencedRelation: "fuel_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_bills: {
        Row: {
          amount: number
          created_at: string
          due_day: number | null
          id: string
          is_active: boolean
          name: string
          recurrence: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_day?: number | null
          id?: string
          is_active?: boolean
          name: string
          recurrence?: string
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_day?: number | null
          id?: string
          is_active?: boolean
          name?: string
          recurrence?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fuel_logs: {
        Row: {
          created_at: string
          credit_card_id: string | null
          date: string
          fuel_type: string
          id: string
          invoice_id: string | null
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
          invoice_id?: string | null
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
          invoice_id?: string | null
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
          {
            foreignKeyName: "fuel_logs_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards_with_limits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      income_day_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          income_day_id: string
          notes: string | null
          payment_method: string | null
          platform: string
          platform_label: string | null
          trips: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          income_day_id: string
          notes?: string | null
          payment_method?: string | null
          platform: string
          platform_label?: string | null
          trips?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          income_day_id?: string
          notes?: string | null
          payment_method?: string | null
          platform?: string
          platform_label?: string | null
          trips?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_day_items_income_day_id_fkey"
            columns: ["income_day_id"]
            isOneToOne: false
            referencedRelation: "income_days"
            referencedColumns: ["id"]
          },
        ]
      }
      income_days: {
        Row: {
          created_at: string
          date: string
          hours_minutes: number
          id: string
          km_rodados: number
          notes: string | null
          trips: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours_minutes?: number
          id?: string
          km_rodados?: number
          notes?: string | null
          trips?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours_minutes?: number
          id?: string
          km_rodados?: number
          notes?: string | null
          trips?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          created_at: string
          current_km: number
          date: string
          description: string | null
          id: string
          is_active: boolean
          next_km: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_km: number
          date: string
          description?: string | null
          id?: string
          is_active?: boolean
          next_km: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_km?: number
          date?: string
          description?: string | null
          id?: string
          is_active?: boolean
          next_km?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          competition_id: string
          created_at: string
          dismissed_at: string | null
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
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
          {
            foreignKeyName: "paid_bills_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards_with_limits"
            referencedColumns: ["id"]
          },
        ]
      }
      password_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string | null
          token_hash: string
          token_preview: string | null
          type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token?: string | null
          token_hash: string
          token_preview?: string | null
          type: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string | null
          token_hash?: string
          token_preview?: string | null
          type?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platforms: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          is_other: boolean
          key: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_other?: boolean
          key: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_other?: boolean
          key?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apps_used: string[] | null
          avatar_url: string | null
          city: string | null
          created_at: string
          currency: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          name: string | null
          onboarding_completed: boolean
          start_week_day: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          apps_used?: string[] | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          onboarding_completed?: boolean
          start_week_day?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          apps_used?: string[] | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          onboarding_completed?: boolean
          start_week_day?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
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
          recurrence_day: number | null
          recurrence_type: string
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
          recurrence_day?: number | null
          recurrence_type?: string
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
          recurrence_day?: number | null
          recurrence_type?: string
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
          km_rodados: number | null
          notes: string | null
          receive_method: string | null
          trips_count: number | null
          type: string
          updated_at: string
          user_id: string
          worked_minutes: number | null
        }
        Insert: {
          amount: number
          app: string
          created_at?: string
          date: string
          id?: string
          km_rodados?: number | null
          notes?: string | null
          receive_method?: string | null
          trips_count?: number | null
          type: string
          updated_at?: string
          user_id: string
          worked_minutes?: number | null
        }
        Update: {
          amount?: number
          app?: string
          created_at?: string
          date?: string
          id?: string
          km_rodados?: number | null
          notes?: string | null
          receive_method?: string | null
          trips_count?: number | null
          type?: string
          updated_at?: string
          user_id?: string
          worked_minutes?: number | null
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
      user_expense_categories: {
        Row: {
          category_key: string
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_key: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_key?: string
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_platforms: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          platform_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          platform_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          platform_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_platforms_platform_key_fkey"
            columns: ["platform_key"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["key"]
          },
        ]
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
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json
          processed_at: string | null
          response: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json
          processed_at?: string | null
          response?: Json | null
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json
          processed_at?: string | null
          response?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      work_session_pauses: {
        Row: {
          created_at: string
          id: string
          paused_at: string
          resumed_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paused_at: string
          resumed_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paused_at?: string
          resumed_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_session_pauses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "work_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          created_at: string
          date: string
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string
          status: string
          total_paused_seconds: number
          total_worked_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at: string
          status?: string
          total_paused_seconds?: number
          total_worked_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          total_paused_seconds?: number
          total_worked_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      credit_cards_with_limits: {
        Row: {
          available: number | null
          best_purchase_day: number | null
          brand: string | null
          closing_day: number | null
          committed: number | null
          created_at: string | null
          credit_limit: number | null
          due_day: number | null
          due_month_offset: number | null
          id: string | null
          last_digits: string | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_clear_competition_notifications: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      admin_simulate_competition_finish: {
        Args: { p_competition_id: string; p_meta_reached: boolean }
        Returns: Json
      }
      assign_member_to_team: {
        Args: { p_competition_id: string; p_team_id: string; p_user_id: string }
        Returns: Json
      }
      check_competition_winner_popup: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      check_finish_result_popup: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      compute_closing_date: {
        Args: { p_closing_day: number; p_tx_date: string }
        Returns: string
      }
      consume_password_token: {
        Args: { p_token: string; p_type: string }
        Returns: string
      }
      create_competition:
        | {
            Args: {
              p_allow_teams?: boolean
              p_description: string
              p_end_date: string
              p_goal_type: string
              p_goal_value: number
              p_max_members?: number
              p_name: string
              p_password: string
              p_start_date: string
              p_team_size?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_allow_teams?: boolean
              p_description: string
              p_end_date: string
              p_goal_type: string
              p_goal_value: number
              p_host_participates?: boolean
              p_max_members?: number
              p_name: string
              p_password: string
              p_prize_value?: number
              p_start_date: string
              p_team_size?: number
            }
            Returns: Json
          }
      create_competition_teams: {
        Args: { p_competition_id: string; p_team_count: number }
        Returns: Json
      }
      create_fuel_expense: {
        Args: {
          p_credit_card_id?: string
          p_date: string
          p_fuel_type: string
          p_liters: number
          p_notes?: string
          p_odometer_km?: number
          p_payment_method?: string
          p_station?: string
          p_total_value: number
        }
        Returns: Json
      }
      delete_competition_as_host: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      delete_fuel_expense: { Args: { p_expense_id: string }; Returns: boolean }
      dismiss_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      finalize_competition: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      finalize_competition_if_needed: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      generate_competition_code: { Args: never; Returns: string }
      get_competition_dashboard: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      get_competition_id_by_code: { Args: { p_code: string }; Returns: string }
      get_competition_leaderboard: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      get_competition_page: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      get_competitions_for_tabs: {
        Args: never
        Returns: {
          allow_teams: boolean
          computed_label: string
          computed_status: string
          description: string
          end_date: string
          goal_value: number
          host_user_id: string
          id: string
          meta_reached: boolean
          name: string
          participants_count: number
          prize_value: number
          start_date: string
          user_is_host: boolean
          user_is_member: boolean
        }[]
      }
      get_listed_competitions: {
        Args: never
        Returns: {
          allow_teams: boolean
          code: string
          description: string
          end_date: string
          goal_value: number
          id: string
          is_member: boolean
          max_members: number
          member_count: number
          name: string
          prize_value: number
          start_date: string
        }[]
      }
      get_revenue_by_platform: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          platform_key: string
          platform_label: string
          platform_name: string
          total_amount: number
          total_trips: number
        }[]
      }
      get_winner_payouts_for_host: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_default_expense_categories_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      insert_default_platforms_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_competition_host: {
        Args: { _competition_id: string; _user_id: string }
        Returns: boolean
      }
      is_competition_member: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      is_competition_member_internal: {
        Args: { _competition_id: string; _user_id: string }
        Returns: boolean
      }
      join_competition:
        | { Args: { p_code: string; p_password: string }; Returns: Json }
        | {
            Args: {
              p_code: string
              p_password: string
              p_pix_key?: string
              p_pix_key_type?: string
            }
            Returns: Json
          }
      join_competition_with_password: {
        Args: {
          p_competition_id: string
          p_password: string
          p_pix_key: string
          p_pix_key_type: string
        }
        Returns: Json
      }
      mark_finish_result_popup_shown: {
        Args: { p_competition_id: string }
        Returns: boolean
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_winner_popup_shown: {
        Args: { p_competition_id: string }
        Returns: boolean
      }
      recalc_invoice: { Args: { p_invoice_id: string }; Returns: undefined }
      recalculate_invoice_total: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      resolve_or_create_invoice: {
        Args: { p_credit_card_id: string; p_tx_date: string }
        Returns: string
      }
      resolve_or_create_invoice_for_user: {
        Args: { p_credit_card_id: string; p_tx_date: string; p_user_id: string }
        Returns: string
      }
      unassign_member_from_team: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: Json
      }
      update_competition_as_host: {
        Args: {
          p_competition_id: string
          p_description?: string
          p_end_date?: string
          p_goal_value?: number
          p_max_members?: number
          p_name?: string
          p_prize_value?: number
          p_start_date?: string
        }
        Returns: Json
      }
      update_fuel_expense: {
        Args: {
          p_credit_card_id?: string
          p_date: string
          p_expense_id: string
          p_fuel_type: string
          p_liters: number
          p_notes?: string
          p_odometer_km?: number
          p_payment_method?: string
          p_station?: string
          p_total_value: number
        }
        Returns: boolean
      }
      update_team_name: {
        Args: { p_name: string; p_team_id: string }
        Returns: Json
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
