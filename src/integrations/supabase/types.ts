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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliates: {
        Row: {
          commission_rate: number | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          status: string
          total_earned: number | null
        }
        Insert: {
          commission_rate?: number | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          status?: string
          total_earned?: number | null
        }
        Update: {
          commission_rate?: number | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          status?: string
          total_earned?: number | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          channel: Database["public"]["Enums"]["alert_channel"]
          created_at: string
          id: string
          is_read: boolean
          message: string
          onu_id: string | null
          rx_power: number | null
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          channel?: Database["public"]["Enums"]["alert_channel"]
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          onu_id?: string | null
          rx_power?: number | null
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["alert_channel"]
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          onu_id?: string | null
          rx_power?: number | null
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onu_list"
            referencedColumns: ["id"]
          },
        ]
      }
      app_role_modules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_group: string
          module_name: string
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_group: string
          module_name: string
          permission?: string
          role_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_group?: string
          module_name?: string
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_role_modules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          redirect_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          redirect_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          redirect_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          created_by: string | null
          employee_id: string | null
          id: string
          password: string
          role_id: string | null
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          password?: string
          role_id?: string | null
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          password?: string
          role_id?: string | null
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          assigned_to: string | null
          category: string | null
          code: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          purchase_date: string | null
          purchase_price: number | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          device_log_id: string | null
          employee_id: string
          id: string
          remarks: string | null
          shift_id: string | null
          source: string
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          device_log_id?: string | null
          employee_id: string
          id?: string
          remarks?: string | null
          shift_id?: string | null
          source?: string
          status?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          device_log_id?: string | null
          employee_id?: string
          id?: string
          remarks?: string | null
          shift_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_device_log_id_fkey"
            columns: ["device_log_id"]
            isOneToOne: false
            referencedRelation: "zkteco_attendance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_rules: {
        Row: {
          absent_after_minutes: number
          absent_deduction: number | null
          absent_deduction_type: string | null
          created_at: string
          half_day_after_minutes: number
          id: string
          late_after_minutes: number
          late_deduction: number | null
          late_deduction_type: string | null
          name: string
          status: string
        }
        Insert: {
          absent_after_minutes?: number
          absent_deduction?: number | null
          absent_deduction_type?: string | null
          created_at?: string
          half_day_after_minutes?: number
          id?: string
          late_after_minutes?: number
          late_deduction?: number | null
          late_deduction_type?: string | null
          name: string
          status?: string
        }
        Update: {
          absent_after_minutes?: number
          absent_deduction?: number | null
          absent_deduction_type?: string | null
          created_at?: string
          half_day_after_minutes?: number
          id?: string
          late_after_minutes?: number
          late_deduction?: number | null
          late_deduction_type?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      bill_collections: {
        Row: {
          amount: number
          approved_by: string | null
          billing_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          discount: number
          id: string
          note: string | null
          payment_method: string | null
          received_by: string | null
          status: string
          transaction_id: string | null
          vat: number
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          billing_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          note?: string | null
          payment_method?: string | null
          received_by?: string | null
          status?: string
          transaction_id?: string | null
          vat?: number
        }
        Update: {
          amount?: number
          approved_by?: string | null
          billing_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          note?: string | null
          payment_method?: string | null
          received_by?: string | null
          status?: string
          transaction_id?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_collections_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_collections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      billing: {
        Row: {
          advance: number | null
          amount: number
          bill_id: string
          branch_id: string | null
          client_id: string
          collected_by: string | null
          created_at: string
          discount: number | null
          due: number | null
          due_date: string | null
          extend_date: string | null
          generated: boolean | null
          id: string
          month: string
          paid: number | null
          pay_date: string | null
          payment_method: string | null
          status: string
          vat: number | null
        }
        Insert: {
          advance?: number | null
          amount?: number
          bill_id: string
          branch_id?: string | null
          client_id: string
          collected_by?: string | null
          created_at?: string
          discount?: number | null
          due?: number | null
          due_date?: string | null
          extend_date?: string | null
          generated?: boolean | null
          id?: string
          month: string
          paid?: number | null
          pay_date?: string | null
          payment_method?: string | null
          status?: string
          vat?: number | null
        }
        Update: {
          advance?: number | null
          amount?: number
          bill_id?: string
          branch_id?: string | null
          client_id?: string
          collected_by?: string | null
          created_at?: string
          discount?: number | null
          due?: number | null
          due_date?: string | null
          extend_date?: string | null
          generated?: boolean | null
          id?: string
          month?: string
          paid?: number | null
          pay_date?: string | null
          payment_method?: string | null
          status?: string
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_statuses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      boxes: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          sub_zone_id: string | null
          zone_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          sub_zone_id?: string | null
          zone_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          sub_zone_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boxes_sub_zone_id_fkey"
            columns: ["sub_zone_id"]
            isOneToOne: false
            referencedRelation: "sub_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boxes_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_funding: {
        Row: {
          amount: number | null
          branch_id: string | null
          created_at: string
          description: string | null
          funding_date: string | null
          id: string
          status: string
          type: string | null
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          created_at?: string
          description?: string | null
          funding_date?: string | null
          id?: string
          status?: string
          type?: string | null
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          created_at?: string
          description?: string | null
          funding_date?: string | null
          id?: string
          status?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_funding_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_managers: {
        Row: {
          address: string | null
          balance: number
          branch_id: string | null
          client_code: string | null
          client_code_prefix: string | null
          client_create_permission: boolean
          company_name: string | null
          contact: string | null
          created_at: string
          disable_clients: boolean
          district_id: string | null
          email: string | null
          fund_started: boolean
          fund_started_at: string | null
          id: string
          is_locked: boolean
          logo_url: string | null
          min_balance: number
          min_recharge: number | null
          name: string
          national_id: string | null
          nid_number: string | null
          password: string | null
          permissions: Json
          phone: string | null
          pop_code: string | null
          pop_level: number
          pop_prefix: string | null
          pop_type: string
          portal_enabled: boolean
          server_id: string | null
          set_prefix_mikrotik: boolean
          status: string
          tariff_id: string | null
          upazila_id: string | null
          use_prefix: boolean
          user_id: string | null
          username: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          balance?: number
          branch_id?: string | null
          client_code?: string | null
          client_code_prefix?: string | null
          client_create_permission?: boolean
          company_name?: string | null
          contact?: string | null
          created_at?: string
          disable_clients?: boolean
          district_id?: string | null
          email?: string | null
          fund_started?: boolean
          fund_started_at?: string | null
          id?: string
          is_locked?: boolean
          logo_url?: string | null
          min_balance?: number
          min_recharge?: number | null
          name: string
          national_id?: string | null
          nid_number?: string | null
          password?: string | null
          permissions?: Json
          phone?: string | null
          pop_code?: string | null
          pop_level?: number
          pop_prefix?: string | null
          pop_type?: string
          portal_enabled?: boolean
          server_id?: string | null
          set_prefix_mikrotik?: boolean
          status?: string
          tariff_id?: string | null
          upazila_id?: string | null
          use_prefix?: boolean
          user_id?: string | null
          username?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          balance?: number
          branch_id?: string | null
          client_code?: string | null
          client_code_prefix?: string | null
          client_create_permission?: boolean
          company_name?: string | null
          contact?: string | null
          created_at?: string
          disable_clients?: boolean
          district_id?: string | null
          email?: string | null
          fund_started?: boolean
          fund_started_at?: string | null
          id?: string
          is_locked?: boolean
          logo_url?: string | null
          min_balance?: number
          min_recharge?: number | null
          name?: string
          national_id?: string | null
          nid_number?: string | null
          password?: string | null
          permissions?: Json
          phone?: string | null
          pop_code?: string | null
          pop_level?: number
          pop_prefix?: string | null
          pop_type?: string
          portal_enabled?: boolean
          server_id?: string | null
          set_prefix_mikrotik?: boolean
          status?: string
          tariff_id?: string | null
          upazila_id?: string | null
          use_prefix?: boolean
          user_id?: string | null
          username?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_managers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_managers_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "reseller_tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      bw_bill_items: {
        Row: {
          bill_id: string
          created_at: string
          description: string | null
          from_date: string | null
          id: string
          item_id: string | null
          quantity: number | null
          rate: number | null
          to_date: string | null
          total: number | null
          unit: string | null
          vat_percent: number | null
        }
        Insert: {
          bill_id: string
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          rate?: number | null
          to_date?: string | null
          total?: number | null
          unit?: string | null
          vat_percent?: number | null
        }
        Update: {
          bill_id?: string
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          rate?: number | null
          to_date?: string | null
          total?: number | null
          unit?: string | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bw_bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bw_purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_bill_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bw_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_buy_bill_items: {
        Row: {
          amount: number
          bandwidth_mbps: number
          bill_id: string
          created_at: string
          days: number
          id: string
          period_end: string
          period_start: string
          rate: number
          remarks: string | null
          service_id: string | null
          service_name: string
          sort_order: number
          subscription_id: string | null
          total_days_in_month: number
        }
        Insert: {
          amount?: number
          bandwidth_mbps?: number
          bill_id: string
          created_at?: string
          days?: number
          id?: string
          period_end: string
          period_start: string
          rate?: number
          remarks?: string | null
          service_id?: string | null
          service_name: string
          sort_order?: number
          subscription_id?: string | null
          total_days_in_month?: number
        }
        Update: {
          amount?: number
          bandwidth_mbps?: number
          bill_id?: string
          created_at?: string
          days?: number
          id?: string
          period_end?: string
          period_start?: string
          rate?: number
          remarks?: string | null
          service_id?: string | null
          service_name?: string
          sort_order?: number
          subscription_id?: string | null
          total_days_in_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "bw_buy_bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bw_purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_buy_bill_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_buy_bill_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "bw_buy_provider_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_buy_provider_subscriptions: {
        Row: {
          bandwidth_mbps: number
          created_at: string
          end_date: string | null
          id: string
          provider_id: string
          rate_per_mbps: number
          remarks: string | null
          service_id: string | null
          service_name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          bandwidth_mbps?: number
          created_at?: string
          end_date?: string | null
          id?: string
          provider_id: string
          rate_per_mbps?: number
          remarks?: string | null
          service_id?: string | null
          service_name: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          bandwidth_mbps?: number
          created_at?: string
          end_date?: string | null
          id?: string
          provider_id?: string
          rate_per_mbps?: number
          remarks?: string | null
          service_id?: string | null
          service_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_buy_provider_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "bw_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_buy_provider_subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_buy_service_change_log: {
        Row: {
          change_type: string | null
          changed_by: string | null
          created_at: string
          effective_date: string
          id: string
          new_mbps: number | null
          new_rate: number | null
          new_subscription_id: string | null
          old_mbps: number | null
          old_rate: number | null
          old_subscription_id: string | null
          provider_id: string
          reason: string | null
          service_id: string | null
        }
        Insert: {
          change_type?: string | null
          changed_by?: string | null
          created_at?: string
          effective_date: string
          id?: string
          new_mbps?: number | null
          new_rate?: number | null
          new_subscription_id?: string | null
          old_mbps?: number | null
          old_rate?: number | null
          old_subscription_id?: string | null
          provider_id: string
          reason?: string | null
          service_id?: string | null
        }
        Update: {
          change_type?: string | null
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          new_mbps?: number | null
          new_rate?: number | null
          new_subscription_id?: string | null
          old_mbps?: number | null
          old_rate?: number | null
          old_subscription_id?: string | null
          provider_id?: string
          reason?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bw_buy_service_change_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "bw_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_buy_service_change_log_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "bw_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_invoice_items: {
        Row: {
          amount: number
          bandwidth_mbps: number
          created_at: string
          days: number
          description: string | null
          from_date: string | null
          id: string
          invoice_id: string
          item_id: string | null
          period_end: string
          period_start: string
          quantity: number | null
          rate: number
          remarks: string | null
          service_id: string | null
          service_name: string
          sort_order: number
          subscription_id: string | null
          to_date: string | null
          total_days_in_month: number
          unit: string | null
          vat_pct: number | null
        }
        Insert: {
          amount?: number
          bandwidth_mbps?: number
          created_at?: string
          days?: number
          description?: string | null
          from_date?: string | null
          id?: string
          invoice_id: string
          item_id?: string | null
          period_end: string
          period_start: string
          quantity?: number | null
          rate?: number
          remarks?: string | null
          service_id?: string | null
          service_name: string
          sort_order?: number
          subscription_id?: string | null
          to_date?: string | null
          total_days_in_month?: number
          unit?: string | null
          vat_pct?: number | null
        }
        Update: {
          amount?: number
          bandwidth_mbps?: number
          created_at?: string
          days?: number
          description?: string | null
          from_date?: string | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          period_end?: string
          period_start?: string
          quantity?: number | null
          rate?: number
          remarks?: string | null
          service_id?: string | null
          service_name?: string
          sort_order?: number
          subscription_id?: string | null
          to_date?: string | null
          total_days_in_month?: number
          unit?: string | null
          vat_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bw_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "bw_sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_items: {
        Row: {
          bandwidth: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number | null
          provider_id: string | null
          status: string
        }
        Insert: {
          bandwidth?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
          provider_id?: string | null
          status?: string
        }
        Update: {
          bandwidth?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          provider_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bw_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_items_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "bw_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_providers: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          mobile: string | null
          name: string
          status: string
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          mobile?: string | null
          name: string
          status?: string
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          mobile?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      bw_purchase_bills: {
        Row: {
          amount: number | null
          attachment_url: string | null
          bill_no: string
          billing_month: string | null
          created_at: string
          discount: number | null
          id: string
          invoice_no: string | null
          month: string | null
          paid: number | null
          payment_due: string | null
          period_end: string | null
          period_start: string | null
          provider_id: string | null
          remarks: string | null
          status: string
          total_amount: number
        }
        Insert: {
          amount?: number | null
          attachment_url?: string | null
          bill_no: string
          billing_month?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          invoice_no?: string | null
          month?: string | null
          paid?: number | null
          payment_due?: string | null
          period_end?: string | null
          period_start?: string | null
          provider_id?: string | null
          remarks?: string | null
          status?: string
          total_amount?: number
        }
        Update: {
          amount?: number | null
          attachment_url?: string | null
          bill_no?: string
          billing_month?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          invoice_no?: string | null
          month?: string | null
          paid?: number | null
          payment_due?: string | null
          period_end?: string | null
          period_start?: string | null
          provider_id?: string | null
          remarks?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bw_purchase_bills_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "bw_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_purchase_order_items: {
        Row: {
          created_at: string
          description: string | null
          from_date: string | null
          id: string
          item_name: string
          order_id: string
          quantity: number
          rate: number
          to_date: string | null
          total: number
          unit: string | null
          vat_percent: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          item_name: string
          order_id: string
          quantity?: number
          rate?: number
          to_date?: string | null
          total?: number
          unit?: string | null
          vat_percent?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          from_date?: string | null
          id?: string
          item_name?: string
          order_id?: string
          quantity?: number
          rate?: number
          to_date?: string | null
          total?: number
          unit?: string | null
          vat_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "bw_purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "bw_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_purchase_orders: {
        Row: {
          billing_month: string | null
          created_at: string
          id: string
          note: string | null
          order_no: string
          reseller_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          billing_month?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_no: string
          reseller_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          billing_month?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_no?: string
          reseller_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_purchase_orders_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_recurring_invoices: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          interval_months: number | null
          next_date: string | null
          pop_id: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          interval_months?: number | null
          next_date?: string | null
          pop_id?: string | null
          status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          interval_months?: number | null
          next_date?: string | null
          pop_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_recurring_invoices_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_pops"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_reseller_users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          mobile: string | null
          name: string
          password: string
          permissions: Json
          reseller_id: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name: string
          password: string
          permissions?: Json
          reseller_id: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string
          password?: string
          permissions?: Json
          reseller_id?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_reseller_users_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_sale_collections: {
        Row: {
          amount: number
          balance_due: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          id: string
          invoice_id: string | null
          note: string | null
          payment_method: string | null
          receive_date: string
          received_by: string | null
          status: string
        }
        Insert: {
          amount?: number
          balance_due?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          note?: string | null
          payment_method?: string | null
          receive_date?: string
          received_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          balance_due?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          note?: string | null
          payment_method?: string | null
          receive_date?: string
          received_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_sale_collections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_sale_collections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "bw_sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_sale_customers: {
        Row: {
          activation_date: string | null
          activity_status: string
          address: string | null
          contact_person: string | null
          created_at: string
          customer_code: string | null
          customer_name: string
          email: string | null
          facebook_url: string | null
          id: string
          ip_addresses: Json | null
          mobile: string | null
          nttn_info: string | null
          password: string | null
          phone: string | null
          pop_id: string | null
          pop_name_last_mile: string | null
          reference_by: string | null
          remarks: string | null
          scr_link_id: string | null
          skype_id: string | null
          updated_at: string
          username: string | null
          vlan_info: Json | null
          website: string | null
        }
        Insert: {
          activation_date?: string | null
          activity_status?: string
          address?: string | null
          contact_person?: string | null
          created_at?: string
          customer_code?: string | null
          customer_name: string
          email?: string | null
          facebook_url?: string | null
          id?: string
          ip_addresses?: Json | null
          mobile?: string | null
          nttn_info?: string | null
          password?: string | null
          phone?: string | null
          pop_id?: string | null
          pop_name_last_mile?: string | null
          reference_by?: string | null
          remarks?: string | null
          scr_link_id?: string | null
          skype_id?: string | null
          updated_at?: string
          username?: string | null
          vlan_info?: Json | null
          website?: string | null
        }
        Update: {
          activation_date?: string | null
          activity_status?: string
          address?: string | null
          contact_person?: string | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string
          email?: string | null
          facebook_url?: string | null
          id?: string
          ip_addresses?: Json | null
          mobile?: string | null
          nttn_info?: string | null
          password?: string | null
          phone?: string | null
          pop_id?: string | null
          pop_name_last_mile?: string | null
          reference_by?: string | null
          remarks?: string | null
          scr_link_id?: string | null
          skype_id?: string | null
          updated_at?: string
          username?: string | null
          vlan_info?: Json | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bw_sale_customers_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_pops"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_sale_payments: {
        Row: {
          amount: number
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          discount: number
          id: string
          invoice_id: string | null
          paid_by: string | null
          payment_date: string
          payment_method: string | null
          receipt_no: string | null
          received_by: string | null
          remarks: string | null
        }
        Insert: {
          amount?: number
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_no?: string | null
          received_by?: string | null
          remarks?: string | null
        }
        Update: {
          amount?: number
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          discount?: number
          id?: string
          invoice_id?: string | null
          paid_by?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_no?: string | null
          received_by?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bw_sale_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_sale_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "bw_sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_sale_pops: {
        Row: {
          bandwidth: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          status: string
        }
        Insert: {
          bandwidth?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          status?: string
        }
        Update: {
          bandwidth?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      bw_sale_recurring: {
        Row: {
          bill_amount: number
          created_at: string
          end_date: string | null
          id: string
          pop_id: string | null
          repeat_date: number | null
          start_date: string | null
          status: string
        }
        Insert: {
          bill_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          pop_id?: string | null
          repeat_date?: number | null
          start_date?: string | null
          status?: string
        }
        Update: {
          bill_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          pop_id?: string | null
          repeat_date?: number | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_sale_recurring_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_pops"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_sale_recurring_invoices: {
        Row: {
          billing_month_template: string | null
          created_at: string
          customer_id: string
          end_date: string | null
          id: string
          last_generated_month: string | null
          payment_due_days: number | null
          remarks: string | null
          repeat_day: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_month_template?: string | null
          created_at?: string
          customer_id: string
          end_date?: string | null
          id?: string
          last_generated_month?: string | null
          payment_due_days?: number | null
          remarks?: string | null
          repeat_day?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_month_template?: string | null
          created_at?: string
          customer_id?: string
          end_date?: string | null
          id?: string
          last_generated_month?: string | null
          payment_due_days?: number | null
          remarks?: string | null
          repeat_day?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_sale_recurring_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_sale_recurring_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_id: string | null
          item_name: string
          quantity: number
          rate: number
          recurring_id: string
          sort_order: number
          unit: string | null
          vat_pct: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          quantity?: number
          rate?: number
          recurring_id: string
          sort_order?: number
          unit?: string | null
          vat_pct?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          quantity?: number
          rate?: number
          recurring_id?: string
          sort_order?: number
          unit?: string | null
          vat_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "bw_sale_recurring_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_sale_recurring_items_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_recurring_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      bw_sale_services: {
        Row: {
          code: string | null
          created_at: string
          default_rate: number
          description: string | null
          id: string
          name: string
          sort_order: number
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          default_rate?: number
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          default_rate?: number
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      bw_sales_invoices: {
        Row: {
          amount: number | null
          billing_month: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number | null
          due: number | null
          id: string
          invoice_no: string
          issued_date: string | null
          month: string | null
          notes: string | null
          paid_amount: number | null
          payment_due_date: string | null
          period_end: string | null
          period_start: string | null
          pop_id: string | null
          remarks: string | null
          special_note: string | null
          status: string
          total_amount: number
        }
        Insert: {
          amount?: number | null
          billing_month?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          due?: number | null
          id?: string
          invoice_no: string
          issued_date?: string | null
          month?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          period_end?: string | null
          period_start?: string | null
          pop_id?: string | null
          remarks?: string | null
          special_note?: string | null
          status?: string
          total_amount?: number
        }
        Update: {
          amount?: number | null
          billing_month?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          due?: number | null
          id?: string
          invoice_no?: string
          issued_date?: string | null
          month?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_due_date?: string | null
          period_end?: string | null
          period_start?: string | null
          pop_id?: string | null
          remarks?: string | null
          special_note?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bw_sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_sales_invoices_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_pops"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          request_type: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          request_type?: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          request_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          balance: number | null
          code: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          status: string
          type: string
        }
        Insert: {
          balance?: number | null
          code: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          balance?: number | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_news_events: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          details: string | null
          event_date: string | null
          id: string
          photo_url: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          details?: string | null
          event_date?: string | null
          id?: string
          photo_url?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          details?: string | null
          event_date?: string | null
          id?: string
          photo_url?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_notices: {
        Row: {
          active: boolean
          attachment_url: string | null
          body: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          pinned: boolean
          starts_at: string
          target_scope: string
          title: string
          type: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          active?: boolean
          attachment_url?: string | null
          body: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          pinned?: boolean
          starts_at?: string
          target_scope?: string
          title: string
          type?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          active?: boolean
          attachment_url?: string | null
          body?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          pinned?: boolean
          starts_at?: string
          target_scope?: string
          title?: string
          type?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notices_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      client_request_assignments: {
        Row: {
          assigned_at: string
          employee_id: string
          id: string
          request_id: string
        }
        Insert: {
          assigned_at?: string
          employee_id: string
          id?: string
          request_id: string
        }
        Update: {
          assigned_at?: string
          employee_id?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_request_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "client_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_requests: {
        Row: {
          address: string | null
          assigned_to: string | null
          billing_date: number | null
          connection_type: string | null
          connection_type_id: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          customer_type: string | null
          email: string | null
          id: string
          monthly_bill: number | null
          name: string
          notes: string | null
          otc_charge: number | null
          package_id: string | null
          physical_connectivity: string | null
          schedule_date: string | null
          setup_by: string | null
          setup_status: string | null
          setup_time: string | null
          status: string
          subzone_id: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          billing_date?: number | null
          connection_type?: string | null
          connection_type_id?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string | null
          email?: string | null
          id?: string
          monthly_bill?: number | null
          name: string
          notes?: string | null
          otc_charge?: number | null
          package_id?: string | null
          physical_connectivity?: string | null
          schedule_date?: string | null
          setup_by?: string | null
          setup_status?: string | null
          setup_time?: string | null
          status?: string
          subzone_id?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          billing_date?: number | null
          connection_type?: string | null
          connection_type_id?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string | null
          email?: string | null
          id?: string
          monthly_bill?: number | null
          name?: string
          notes?: string | null
          otc_charge?: number | null
          package_id?: string | null
          physical_connectivity?: string | null
          schedule_date?: string | null
          setup_by?: string | null
          setup_status?: string | null
          setup_time?: string | null
          status?: string
          subzone_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_connection_type_id_fkey"
            columns: ["connection_type_id"]
            isOneToOne: false
            referencedRelation: "connection_types_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_subzone_id_fkey"
            columns: ["subzone_id"]
            isOneToOne: false
            referencedRelation: "sub_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_requests_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      client_schedulers: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          execution_time: string | null
          id: string
          package_id: string | null
          package_rate: number | null
          previous_info: string | null
          profile_speed: string | null
          protocol_type: string | null
          remarks: string | null
          schedule_date: string | null
          schedule_info: string | null
          scheduler_type: string
          server_id: string | null
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          execution_time?: string | null
          id?: string
          package_id?: string | null
          package_rate?: number | null
          previous_info?: string | null
          profile_speed?: string | null
          protocol_type?: string | null
          remarks?: string | null
          schedule_date?: string | null
          schedule_info?: string | null
          scheduler_type?: string
          server_id?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          execution_time?: string | null
          id?: string
          package_id?: string | null
          package_rate?: number | null
          previous_info?: string | null
          profile_speed?: string | null
          protocol_type?: string | null
          remarks?: string | null
          schedule_date?: string | null
          schedule_info?: string | null
          scheduler_type?: string
          server_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_schedulers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_schedulers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_schedulers_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_traffic_logs: {
        Row: {
          client_id: string | null
          device_id: string | null
          download_bytes: number
          id: string
          recorded_at: string
          upload_bytes: number
          username: string | null
        }
        Insert: {
          client_id?: string | null
          device_id?: string | null
          download_bytes?: number
          id?: string
          recorded_at?: string
          upload_bytes?: number
          username?: string | null
        }
        Update: {
          client_id?: string | null
          device_id?: string | null
          download_bytes?: number
          id?: string
          recorded_at?: string
          upload_bytes?: number
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_traffic_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_traffic_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_traffic_monthly: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          month: string
          total_download: number | null
          total_upload: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          month: string
          total_download?: number | null
          total_upload?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          month?: string
          total_download?: number | null
          total_upload?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_traffic_monthly_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          affiliator_id: string | null
          billing_date: number | null
          billing_start_month: string | null
          billing_status: string | null
          box_id: string | null
          branch_id: string | null
          cable_length: number | null
          client_id: string
          client_type: string | null
          connected_by: string | null
          connection_type: string | null
          contact: string | null
          core_color: string | null
          core_count: number | null
          created_at: string
          date_of_birth: string | null
          device_serial: string | null
          device_type: string | null
          email: string | null
          expire_date: string | null
          father_name: string | null
          fiber_code: string | null
          gender: string | null
          house_number: string | null
          id: string
          is_online: boolean
          is_vip: boolean | null
          joining_date: string | null
          latitude: string | null
          left_date: string | null
          left_reason: string | null
          longitude: string | null
          mac_address: string | null
          mikrotik_id: string | null
          mikrotik_status: string | null
          monthly_bill: number | null
          mother_name: string | null
          name: string
          nid_number: string | null
          occupation: string | null
          onu_id: string | null
          package_id: string | null
          password: string | null
          permanent_address: string | null
          phone_number: string | null
          profile: string | null
          protocol_type: string | null
          purchase_date: string | null
          reference_by: string | null
          remarks: string | null
          remote_address: string | null
          road_number: string | null
          server_name: string | null
          speed: string | null
          status: string
          sub_zone_id: string | null
          total_download: number
          total_upload: number
          updated_at: string
          user_id: string | null
          username: string | null
          vendor: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          affiliator_id?: string | null
          billing_date?: number | null
          billing_start_month?: string | null
          billing_status?: string | null
          box_id?: string | null
          branch_id?: string | null
          cable_length?: number | null
          client_id: string
          client_type?: string | null
          connected_by?: string | null
          connection_type?: string | null
          contact?: string | null
          core_color?: string | null
          core_count?: number | null
          created_at?: string
          date_of_birth?: string | null
          device_serial?: string | null
          device_type?: string | null
          email?: string | null
          expire_date?: string | null
          father_name?: string | null
          fiber_code?: string | null
          gender?: string | null
          house_number?: string | null
          id?: string
          is_online?: boolean
          is_vip?: boolean | null
          joining_date?: string | null
          latitude?: string | null
          left_date?: string | null
          left_reason?: string | null
          longitude?: string | null
          mac_address?: string | null
          mikrotik_id?: string | null
          mikrotik_status?: string | null
          monthly_bill?: number | null
          mother_name?: string | null
          name: string
          nid_number?: string | null
          occupation?: string | null
          onu_id?: string | null
          package_id?: string | null
          password?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          profile?: string | null
          protocol_type?: string | null
          purchase_date?: string | null
          reference_by?: string | null
          remarks?: string | null
          remote_address?: string | null
          road_number?: string | null
          server_name?: string | null
          speed?: string | null
          status?: string
          sub_zone_id?: string | null
          total_download?: number
          total_upload?: number
          updated_at?: string
          user_id?: string | null
          username?: string | null
          vendor?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          affiliator_id?: string | null
          billing_date?: number | null
          billing_start_month?: string | null
          billing_status?: string | null
          box_id?: string | null
          branch_id?: string | null
          cable_length?: number | null
          client_id?: string
          client_type?: string | null
          connected_by?: string | null
          connection_type?: string | null
          contact?: string | null
          core_color?: string | null
          core_count?: number | null
          created_at?: string
          date_of_birth?: string | null
          device_serial?: string | null
          device_type?: string | null
          email?: string | null
          expire_date?: string | null
          father_name?: string | null
          fiber_code?: string | null
          gender?: string | null
          house_number?: string | null
          id?: string
          is_online?: boolean
          is_vip?: boolean | null
          joining_date?: string | null
          latitude?: string | null
          left_date?: string | null
          left_reason?: string | null
          longitude?: string | null
          mac_address?: string | null
          mikrotik_id?: string | null
          mikrotik_status?: string | null
          monthly_bill?: number | null
          mother_name?: string | null
          name?: string
          nid_number?: string | null
          occupation?: string | null
          onu_id?: string | null
          package_id?: string | null
          password?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          profile?: string | null
          protocol_type?: string | null
          purchase_date?: string | null
          reference_by?: string | null
          remarks?: string | null
          remote_address?: string | null
          road_number?: string | null
          server_name?: string | null
          speed?: string | null
          status?: string
          sub_zone_id?: string | null
          total_download?: number
          total_upload?: number
          updated_at?: string
          user_id?: string | null
          username?: string | null
          vendor?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_affiliator_id_fkey"
            columns: ["affiliator_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_mikrotik_id_fkey"
            columns: ["mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onu_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_sub_zone_id_fkey"
            columns: ["sub_zone_id"]
            isOneToOne: false
            referencedRelation: "sub_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_types_config: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      customer_messages: {
        Row: {
          channel: string
          created_at: string | null
          customer_id: string | null
          id: string
          message: string
          recipient: string
          status: string | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          message: string
          recipient: string
          status?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          message?: string
          recipient?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          active_users: number | null
          billing_day: number | null
          created_at: string
          email: string | null
          hosting_type: string | null
          id: string
          is_active_billing: boolean | null
          isp_name: string
          last_synced_at: string | null
          max_users: number | null
          monthly_bill: number | null
          notes: string | null
          owner_name: string
          package_id: string | null
          phone: string | null
          provisioned_at: string | null
          status: string
          subdomain: string
          updated_at: string
        }
        Insert: {
          active_users?: number | null
          billing_day?: number | null
          created_at?: string
          email?: string | null
          hosting_type?: string | null
          id?: string
          is_active_billing?: boolean | null
          isp_name: string
          last_synced_at?: string | null
          max_users?: number | null
          monthly_bill?: number | null
          notes?: string | null
          owner_name: string
          package_id?: string | null
          phone?: string | null
          provisioned_at?: string | null
          status?: string
          subdomain: string
          updated_at?: string
        }
        Update: {
          active_users?: number | null
          billing_day?: number | null
          created_at?: string
          email?: string | null
          hosting_type?: string | null
          id?: string
          is_active_billing?: boolean | null
          isp_name?: string
          last_synced_at?: string | null
          max_users?: number | null
          monthly_bill?: number | null
          notes?: string | null
          owner_name?: string
          package_id?: string | null
          phone?: string | null
          provisioned_at?: string | null
          status?: string
          subdomain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      destroyed_items: {
        Row: {
          asset_id: string | null
          created_at: string
          destroy_date: string | null
          destroyed_by: string | null
          id: string
          item_name: string
          reason: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          destroy_date?: string | null
          destroyed_by?: string | null
          id?: string
          item_name: string
          reason?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          destroy_date?: string | null
          destroyed_by?: string | null
          id?: string
          item_name?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destroyed_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          code: string | null
          created_at: string
          division_id: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      employee_shift_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          employee_id: string
          id: string
          shift_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          employee_id: string
          id?: string
          shift_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string
          id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          default_in_time: string | null
          default_out_time: string | null
          department_id: string | null
          device_user_id: string | null
          district: string | null
          email: string | null
          employee_id: string
          facebook_link: string | null
          gender: string | null
          guardian_phone: string | null
          id: string
          image_url: string | null
          institution: string | null
          joining_date: string | null
          last_degree: string | null
          marital_status: string | null
          name: string
          nid_number: string | null
          office_phone: string | null
          passing_year: string | null
          payroll_template_id: string | null
          permanent_address: string | null
          personal_phone: string | null
          phone: string | null
          position_id: string | null
          punch_card_id: string | null
          reference: string | null
          salary: number | null
          show_on_website: boolean | null
          status: string
          upazila: string | null
          updated_at: string
          working_experience: string | null
          zkteco_device_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_in_time?: string | null
          default_out_time?: string | null
          department_id?: string | null
          device_user_id?: string | null
          district?: string | null
          email?: string | null
          employee_id: string
          facebook_link?: string | null
          gender?: string | null
          guardian_phone?: string | null
          id?: string
          image_url?: string | null
          institution?: string | null
          joining_date?: string | null
          last_degree?: string | null
          marital_status?: string | null
          name: string
          nid_number?: string | null
          office_phone?: string | null
          passing_year?: string | null
          payroll_template_id?: string | null
          permanent_address?: string | null
          personal_phone?: string | null
          phone?: string | null
          position_id?: string | null
          punch_card_id?: string | null
          reference?: string | null
          salary?: number | null
          show_on_website?: boolean | null
          status?: string
          upazila?: string | null
          updated_at?: string
          working_experience?: string | null
          zkteco_device_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_in_time?: string | null
          default_out_time?: string | null
          department_id?: string | null
          device_user_id?: string | null
          district?: string | null
          email?: string | null
          employee_id?: string
          facebook_link?: string | null
          gender?: string | null
          guardian_phone?: string | null
          id?: string
          image_url?: string | null
          institution?: string | null
          joining_date?: string | null
          last_degree?: string | null
          marital_status?: string | null
          name?: string
          nid_number?: string | null
          office_phone?: string | null
          passing_year?: string | null
          payroll_template_id?: string | null
          permanent_address?: string | null
          personal_phone?: string | null
          phone?: string | null
          position_id?: string | null
          punch_card_id?: string | null
          reference?: string | null
          salary?: number | null
          show_on_website?: boolean | null
          status?: string
          upazila?: string | null
          updated_at?: string
          working_experience?: string | null
          zkteco_device_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_payroll_template_id_fkey"
            columns: ["payroll_template_id"]
            isOneToOne: false
            referencedRelation: "payroll_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_zkteco_device_id_fkey"
            columns: ["zkteco_device_id"]
            isOneToOne: false
            referencedRelation: "zkteco_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      events_holidays: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          status: string
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          status?: string
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          status?: string
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      expense_entries: {
        Row: {
          account_id: string | null
          amount: number
          branch_id: string | null
          category: string | null
          created_at: string
          description: string | null
          expense_date: string | null
          id: string
          month: string | null
          paid_by: string | null
          payment_method: string | null
          reference: string | null
          status: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          branch_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          month?: string | null
          paid_by?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          branch_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          month?: string | null
          paid_by?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
        }
        Relationships: []
      }
      income_entries: {
        Row: {
          account_id: string | null
          amount: number
          branch_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          income_date: string | null
          month: string | null
          payment_method: string | null
          received_by: string | null
          reference: string | null
          source: string
          status: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string | null
          month?: string | null
          payment_method?: string | null
          received_by?: string | null
          reference?: string | null
          source?: string
          status?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string | null
          month?: string | null
          payment_method?: string | null
          received_by?: string | null
          reference?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_fees: {
        Row: {
          amount: number | null
          client_id: string | null
          created_at: string
          fee_date: string | null
          id: string
          notes: string | null
          paid: number | null
          status: string
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          fee_date?: string | null
          id?: string
          notes?: string | null
          paid?: number | null
          status?: string
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          fee_date?: string | null
          id?: string
          notes?: string | null
          paid?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_fees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category_id: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          purchase_price: number | null
          quantity: number | null
          sale_price: number | null
          status: string
          store_id: string | null
          unit_id: string | null
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          purchase_price?: number | null
          quantity?: number | null
          sale_price?: number | null
          status?: string
          store_id?: string | null
          unit_id?: string | null
        }
        Update: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          purchase_price?: number | null
          quantity?: number | null
          sale_price?: number | null
          status?: string
          store_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_units: {
        Row: {
          created_at: string
          id: string
          name: string
          short_name: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          short_name?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          short_name?: string | null
          status?: string
        }
        Relationships: []
      }
      isp_packages: {
        Row: {
          bandwidth_down: number | null
          bandwidth_up: number | null
          code: string | null
          created_at: string
          id: string
          mikrotik_id: string | null
          mikrotik_profile: string | null
          name: string
          package_type: string | null
          portal_visible: boolean
          price: number
          protocol: string | null
          setup_fee: number | null
          show_on_homepage: boolean | null
          status: string
        }
        Insert: {
          bandwidth_down?: number | null
          bandwidth_up?: number | null
          code?: string | null
          created_at?: string
          id?: string
          mikrotik_id?: string | null
          mikrotik_profile?: string | null
          name: string
          package_type?: string | null
          portal_visible?: boolean
          price?: number
          protocol?: string | null
          setup_fee?: number | null
          show_on_homepage?: boolean | null
          status?: string
        }
        Update: {
          bandwidth_down?: number | null
          bandwidth_up?: number | null
          code?: string | null
          created_at?: string
          id?: string
          mikrotik_id?: string | null
          mikrotik_profile?: string | null
          name?: string
          package_type?: string | null
          portal_visible?: boolean
          price?: number
          protocol?: string | null
          setup_fee?: number | null
          show_on_homepage?: boolean | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "isp_packages_mikrotik_id_fkey"
            columns: ["mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          entry_date: string | null
          entry_no: string
          id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          entry_date?: string | null
          entry_no: string
          id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          entry_date?: string | null
          entry_no?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_content: {
        Row: {
          content_key: string
          content_value: Json
          id: string
          is_active: boolean | null
          section: string
          sort_order: number | null
        }
        Insert: {
          content_key: string
          content_value?: Json
          id?: string
          is_active?: boolean | null
          section: string
          sort_order?: number | null
        }
        Update: {
          content_key?: string
          content_value?: Json
          id?: string
          is_active?: boolean | null
          section?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      leave_applications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string
          created_at: string
          days: number | null
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          remarks: string | null
          start_date: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          created_at?: string
          days?: number | null
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          remarks?: string | null
          start_date: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          created_at?: string
          days?: number | null
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          remarks?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "leave_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          category_id: string
          created_at: string
          employee_id: string
          id: string
          remaining_days: number
          total_days: number
          used_days: number
          year: number
        }
        Insert: {
          category_id: string
          created_at?: string
          employee_id: string
          id?: string
          remaining_days?: number
          total_days?: number
          used_days?: number
          year?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          remaining_days?: number
          total_days?: number
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "leave_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_categories: {
        Row: {
          created_at: string
          days_allowed: number | null
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          days_allowed?: number | null
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          days_allowed?: number | null
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      media_servers: {
        Row: {
          active: boolean
          branch_id: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          password: string | null
          sort_order: number
          type: string
          updated_at: string
          url: string
          username: string | null
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          password?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
          url: string
          username?: string | null
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          password?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
          url?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_servers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      mikrotik_backups: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          mikrotik_id: string
          status: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mikrotik_id: string
          status?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mikrotik_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mikrotik_backups_mikrotik_id_fkey"
            columns: ["mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      mikrotik_bulk_imports: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          imported_rows: number
          package_id: string | null
          status: string
          total_rows: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          imported_rows?: number
          package_id?: string | null
          status?: string
          total_rows?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          imported_rows?: number
          package_id?: string | null
          status?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "mikrotik_bulk_imports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mikrotik_bulk_imports_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      mikrotik_clients: {
        Row: {
          branch_id: string | null
          caller_id: string | null
          created_at: string
          exported: boolean
          exported_to: string | null
          id: string
          logout_time: string | null
          mikrotik_id: string | null
          name: string
          password: string | null
          profile: string | null
          remote_address: string | null
          server_name: string | null
          service: string | null
          status: string
          transferred_at: string | null
          transferred_by: string | null
          transferred_to_mikrotik_id: string | null
          transferred_to_pop_id: string | null
          user_status: string | null
        }
        Insert: {
          branch_id?: string | null
          caller_id?: string | null
          created_at?: string
          exported?: boolean
          exported_to?: string | null
          id?: string
          logout_time?: string | null
          mikrotik_id?: string | null
          name: string
          password?: string | null
          profile?: string | null
          remote_address?: string | null
          server_name?: string | null
          service?: string | null
          status?: string
          transferred_at?: string | null
          transferred_by?: string | null
          transferred_to_mikrotik_id?: string | null
          transferred_to_pop_id?: string | null
          user_status?: string | null
        }
        Update: {
          branch_id?: string | null
          caller_id?: string | null
          created_at?: string
          exported?: boolean
          exported_to?: string | null
          id?: string
          logout_time?: string | null
          mikrotik_id?: string | null
          name?: string
          password?: string | null
          profile?: string | null
          remote_address?: string | null
          server_name?: string | null
          service?: string | null
          status?: string
          transferred_at?: string | null
          transferred_by?: string | null
          transferred_to_mikrotik_id?: string | null
          transferred_to_pop_id?: string | null
          user_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mikrotik_clients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mikrotik_clients_mikrotik_id_fkey"
            columns: ["mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mikrotik_clients_transferred_to_mikrotik_id_fkey"
            columns: ["transferred_to_mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mikrotik_clients_transferred_to_pop_id_fkey"
            columns: ["transferred_to_pop_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      mikrotik_devices: {
        Row: {
          api_port: number
          branch_id: string | null
          created_at: string
          credentials_encrypted: string | null
          enabled: boolean
          id: string
          ip_address: string
          name: string
          password_encrypted: string | null
          status: Database["public"]["Enums"]["device_status"]
          timeout: number
          updated_at: string
          username: string | null
          version: string
        }
        Insert: {
          api_port?: number
          branch_id?: string | null
          created_at?: string
          credentials_encrypted?: string | null
          enabled?: boolean
          id?: string
          ip_address: string
          name: string
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          timeout?: number
          updated_at?: string
          username?: string | null
          version?: string
        }
        Update: {
          api_port?: number
          branch_id?: string | null
          created_at?: string
          credentials_encrypted?: string | null
          enabled?: boolean
          id?: string
          ip_address?: string
          name?: string
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          timeout?: number
          updated_at?: string
          username?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "mikrotik_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_default: boolean
          telegram_id: string | null
          whatsapp_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          telegram_id?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          telegram_id?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      olt_branch_shares: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          olt_id: string
          shared_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          olt_id: string
          shared_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          olt_id?: string
          shared_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "olt_branch_shares_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "olt_branch_shares_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olt_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      olt_devices: {
        Row: {
          branch_id: string | null
          brand_model: string | null
          connection_type: Database["public"]["Enums"]["connection_type"]
          cpu_usage: number | null
          created_at: string
          credentials_encrypted: string | null
          description: string | null
          device_model: string | null
          firmware_version: string | null
          hardware_version: string | null
          id: string
          ip_address: string
          mac_address: string | null
          memory_usage: number | null
          mikrotik_id: string | null
          name: string
          olt_version: string | null
          online_onus: number | null
          password_encrypted: string | null
          port: number
          serial_number: string | null
          snmp_community: string | null
          snmp_enabled: boolean | null
          snmp_ip: string | null
          snmp_port: number | null
          snmp_version: string | null
          status: Database["public"]["Enums"]["device_status"]
          total_onus: number | null
          updated_at: string
          uptime: string | null
          username: string | null
          vendor: Database["public"]["Enums"]["olt_vendor"]
        }
        Insert: {
          branch_id?: string | null
          brand_model?: string | null
          connection_type?: Database["public"]["Enums"]["connection_type"]
          cpu_usage?: number | null
          created_at?: string
          credentials_encrypted?: string | null
          description?: string | null
          device_model?: string | null
          firmware_version?: string | null
          hardware_version?: string | null
          id?: string
          ip_address: string
          mac_address?: string | null
          memory_usage?: number | null
          mikrotik_id?: string | null
          name: string
          olt_version?: string | null
          online_onus?: number | null
          password_encrypted?: string | null
          port?: number
          serial_number?: string | null
          snmp_community?: string | null
          snmp_enabled?: boolean | null
          snmp_ip?: string | null
          snmp_port?: number | null
          snmp_version?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          total_onus?: number | null
          updated_at?: string
          uptime?: string | null
          username?: string | null
          vendor?: Database["public"]["Enums"]["olt_vendor"]
        }
        Update: {
          branch_id?: string | null
          brand_model?: string | null
          connection_type?: Database["public"]["Enums"]["connection_type"]
          cpu_usage?: number | null
          created_at?: string
          credentials_encrypted?: string | null
          description?: string | null
          device_model?: string | null
          firmware_version?: string | null
          hardware_version?: string | null
          id?: string
          ip_address?: string
          mac_address?: string | null
          memory_usage?: number | null
          mikrotik_id?: string | null
          name?: string
          olt_version?: string | null
          online_onus?: number | null
          password_encrypted?: string | null
          port?: number
          serial_number?: string | null
          snmp_community?: string | null
          snmp_enabled?: boolean | null
          snmp_ip?: string | null
          snmp_port?: number | null
          snmp_version?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          total_onus?: number | null
          updated_at?: string
          uptime?: string | null
          username?: string | null
          vendor?: Database["public"]["Enums"]["olt_vendor"]
        }
        Relationships: [
          {
            foreignKeyName: "olt_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "olt_devices_mikrotik_id_fkey"
            columns: ["mikrotik_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      olt_permissions: {
        Row: {
          id: string
          olt_id: string
          user_id: string
        }
        Insert: {
          id?: string
          olt_id: string
          user_id: string
        }
        Update: {
          id?: string
          olt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "olt_permissions_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olt_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      onu_history: {
        Row: {
          id: string
          onu_id: string
          recorded_at: string
          rx_power: number | null
          status: Database["public"]["Enums"]["onu_status"] | null
          tx_power: number | null
        }
        Insert: {
          id?: string
          onu_id: string
          recorded_at?: string
          rx_power?: number | null
          status?: Database["public"]["Enums"]["onu_status"] | null
          tx_power?: number | null
        }
        Update: {
          id?: string
          onu_id?: string
          recorded_at?: string
          rx_power?: number | null
          status?: Database["public"]["Enums"]["onu_status"] | null
          tx_power?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onu_history_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onu_list"
            referencedColumns: ["id"]
          },
        ]
      }
      onu_list: {
        Row: {
          created_at: string
          description: string | null
          distance: number | null
          id: string
          interface: string | null
          last_seen: string | null
          mac: string | null
          offline_reason: string | null
          olt_id: string
          rx_power: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["onu_status"]
          tx_power: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          distance?: number | null
          id?: string
          interface?: string | null
          last_seen?: string | null
          mac?: string | null
          offline_reason?: string | null
          olt_id: string
          rx_power?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["onu_status"]
          tx_power?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          distance?: number | null
          id?: string
          interface?: string | null
          last_seen?: string | null
          mac?: string | null
          offline_reason?: string | null
          olt_id?: string
          rx_power?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["onu_status"]
          tx_power?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onu_list_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olt_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          allowed_modules: string[] | null
          created_at: string | null
          features: string[] | null
          hosting_type: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          olt_range: string | null
          price: number
          price_label: string
          sort_order: number | null
          tier: string | null
          user_limit: number | null
          yearly_price: number | null
        }
        Insert: {
          allowed_modules?: string[] | null
          created_at?: string | null
          features?: string[] | null
          hosting_type?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          olt_range?: string | null
          price?: number
          price_label?: string
          sort_order?: number | null
          tier?: string | null
          user_limit?: number | null
          yearly_price?: number | null
        }
        Update: {
          allowed_modules?: string[] | null
          created_at?: string | null
          features?: string[] | null
          hosting_type?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          olt_range?: string | null
          price?: number
          price_label?: string
          sort_order?: number | null
          tier?: string | null
          user_limit?: number | null
          yearly_price?: number | null
        }
        Relationships: []
      }
      payheads: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: string
          is_percentage: boolean | null
          name: string
          status: string
          type: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_percentage?: boolean | null
          name: string
          status?: string
          type?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_percentage?: boolean | null
          name?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_number: string | null
          category: string | null
          color: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          sort_order: number | null
          status: string
        }
        Insert: {
          account_number?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          sort_order?: number | null
          status?: string
        }
        Update: {
          account_number?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          sort_order?: number | null
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          billing_month: string | null
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          notes: string | null
          package_id: string | null
          payment_method: string | null
          payment_method_id: string | null
          received_by: string | null
          service_request_id: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          billing_month?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          received_by?: string | null
          service_request_id?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          billing_month?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          received_by?: string | null
          service_request_id?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          basic_salary: number | null
          created_at: string
          employee_id: string
          id: string
          month: string
          net_salary: number | null
          paid_at: string | null
          status: string
          total_allowance: number | null
          total_deduction: number | null
        }
        Insert: {
          basic_salary?: number | null
          created_at?: string
          employee_id: string
          id?: string
          month: string
          net_salary?: number | null
          paid_at?: string | null
          status?: string
          total_allowance?: number | null
          total_deduction?: number | null
        }
        Update: {
          basic_salary?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          month?: string
          net_salary?: number | null
          paid_at?: string | null
          status?: string
          total_allowance?: number | null
          total_deduction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_details: {
        Row: {
          amount: number
          created_at: string
          id: string
          payhead_id: string
          payroll_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payhead_id: string
          payroll_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payhead_id?: string
          payroll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_details_payhead_id_fkey"
            columns: ["payhead_id"]
            isOneToOne: false
            referencedRelation: "payheads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_details_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_template_payheads: {
        Row: {
          amount_type: string
          amount_value: number
          created_at: string
          final_amount: number
          id: string
          payhead_id: string
          template_id: string
        }
        Insert: {
          amount_type?: string
          amount_value?: number
          created_at?: string
          final_amount?: number
          id?: string
          payhead_id: string
          template_id: string
        }
        Update: {
          amount_type?: string
          amount_value?: number
          created_at?: string
          final_amount?: number
          id?: string
          payhead_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_template_payheads_payhead_id_fkey"
            columns: ["payhead_id"]
            isOneToOne: false
            referencedRelation: "payheads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_template_payheads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "payroll_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      ping_targets: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          ip_address: string
          is_active: boolean
          last_ping_at: string | null
          last_ping_status: string | null
          name: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address: string
          is_active?: boolean
          last_ping_at?: string | null
          last_ping_status?: string | null
          name: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          is_active?: boolean
          last_ping_at?: string | null
          last_ping_status?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ping_targets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_devices: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          name: string
          status: Database["public"]["Enums"]["power_status"]
          type: Database["public"]["Enums"]["pop_device_type"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          name: string
          status?: Database["public"]["Enums"]["power_status"]
          type?: Database["public"]["Enums"]["pop_device_type"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          name?: string
          status?: Database["public"]["Enums"]["power_status"]
          type?: Database["public"]["Enums"]["pop_device_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_fund_start_logs: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          effective_from: string | null
          id: string
          note: string | null
          pop_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          id?: string
          note?: string | null
          pop_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          id?: string
          note?: string | null
          pop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_fund_start_logs_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_ip_addresses: {
        Row: {
          assigned_to: string | null
          created_at: string
          gateway: string | null
          id: string
          ip_address: string
          pop_id: string | null
          status: string
          subnet: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          gateway?: string | null
          id?: string
          ip_address: string
          pop_id?: string | null
          status?: string
          subnet?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          gateway?: string | null
          id?: string
          ip_address?: string
          pop_id?: string | null
          status?: string
          subnet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pop_ip_addresses_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pop_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          pop_id: string
          status: Database["public"]["Enums"]["power_status"] | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          pop_id: string
          status?: Database["public"]["Enums"]["power_status"] | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          pop_id?: string
          status?: Database["public"]["Enums"]["power_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pop_logs_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pop_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          pop_id: string
          type: string
        }
        Insert: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          pop_id: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          pop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_transactions_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      portal_login_log: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          login_at: string
          logout_at: string | null
          session_id: string | null
          status: string
          user_agent: string | null
          user_type: string
          username: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          session_id?: string | null
          status?: string
          user_agent?: string | null
          user_type?: string
          username: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          session_id?: string | null
          status?: string
          user_agent?: string | null
          user_type?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_login_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_servers: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          url: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_servers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "portal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_invoices: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          invoice_date: string | null
          invoice_no: string
          item_id: string | null
          quantity: number | null
          status: string
          total: number | null
          unit_price: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_no: string
          item_id?: string | null
          quantity?: number | null
          status?: string
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_no?: string
          item_id?: string | null
          quantity?: number | null
          status?: string
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_invoices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_types: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      purchase_bills: {
        Row: {
          amount: number | null
          bill_date: string | null
          bill_no: string
          created_at: string
          due: number | null
          id: string
          paid: number | null
          status: string
          vendor_id: string | null
        }
        Insert: {
          amount?: number | null
          bill_date?: string | null
          bill_no: string
          created_at?: string
          due?: number | null
          id?: string
          paid?: number | null
          status?: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number | null
          bill_date?: string | null
          bill_no?: string
          created_at?: string
          due?: number | null
          id?: string
          paid?: number | null
          status?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          notes: string | null
          purchase_date: string | null
          purchase_no: string
          quantity: number | null
          status: string
          total: number | null
          unit_price: number | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_no: string
          quantity?: number | null
          status?: string
          total?: number | null
          unit_price?: number | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_no?: string
          quantity?: number | null
          status?: string
          total?: number | null
          unit_price?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rejoin_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          employee_id: string
          id: string
          new_department_id: string | null
          new_position_id: string | null
          new_salary: number | null
          rejoin_date: string
          remarks: string | null
          resignation_id: string | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          new_department_id?: string | null
          new_position_id?: string | null
          new_salary?: number | null
          rejoin_date: string
          remarks?: string | null
          resignation_id?: string | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          new_department_id?: string | null
          new_position_id?: string | null
          new_salary?: number | null
          rejoin_date?: string
          remarks?: string | null
          resignation_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rejoin_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejoin_requests_new_department_id_fkey"
            columns: ["new_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejoin_requests_new_position_id_fkey"
            columns: ["new_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejoin_requests_resignation_id_fkey"
            columns: ["resignation_id"]
            isOneToOne: false
            referencedRelation: "resignations"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          approved_by: string | null
          created_at: string
          estimated_cost: number | null
          id: string
          item_id: string | null
          notes: string | null
          quantity: number | null
          requisition_no: string
          status: string
          vendor_id: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number | null
          requisition_no: string
          status?: string
          vendor_id?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number | null
          requisition_no?: string
          status?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_pgw_payments: {
        Row: {
          client_contact: string | null
          client_name: string | null
          created_at: string
          id: string
          our_share: number
          payment_method: string | null
          reseller_id: string
          reseller_share: number
          status: string
          tariff_rate: number
          total_amount: number
          transaction_id: string | null
        }
        Insert: {
          client_contact?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          our_share?: number
          payment_method?: string | null
          reseller_id: string
          reseller_share?: number
          status?: string
          tariff_rate?: number
          total_amount?: number
          transaction_id?: string | null
        }
        Update: {
          client_contact?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          our_share?: number
          payment_method?: string | null
          reseller_id?: string
          reseller_share?: number
          status?: string
          tariff_rate?: number
          total_amount?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_pgw_payments_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_pgw_settlements: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          reference: string | null
          reseller_id: string
          settled_by: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          reference?: string | null
          reseller_id: string
          settled_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          reference?: string | null
          reseller_id?: string
          settled_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_pgw_settlements_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_tariffs: {
        Row: {
          activation_days: number
          created_at: string
          id: string
          is_daily_recharge: boolean
          mikrotik_profile: string | null
          mikrotik_server_id: string | null
          min_activation_days: number
          name: string
          package_id: string | null
          protocol_type: string | null
          selling_rate: number
          status: string
        }
        Insert: {
          activation_days?: number
          created_at?: string
          id?: string
          is_daily_recharge?: boolean
          mikrotik_profile?: string | null
          mikrotik_server_id?: string | null
          min_activation_days?: number
          name: string
          package_id?: string | null
          protocol_type?: string | null
          selling_rate?: number
          status?: string
        }
        Update: {
          activation_days?: number
          created_at?: string
          id?: string
          is_daily_recharge?: boolean
          mikrotik_profile?: string | null
          mikrotik_server_id?: string | null
          min_activation_days?: number
          name?: string
          package_id?: string | null
          protocol_type?: string | null
          selling_rate?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_tariffs_mikrotik_server_id_fkey"
            columns: ["mikrotik_server_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_tariffs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      resign_rules: {
        Row: {
          created_at: string
          id: string
          name: string
          notice_period_days: number | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notice_period_days?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notice_period_days?: number | null
          status?: string
        }
        Relationships: []
      }
      resignations: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          last_working_date: string | null
          reason: string | null
          resign_date: string
          status: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          last_working_date?: string | null
          reason?: string | null
          resign_date: string
          status?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          last_working_date?: string | null
          reason?: string | null
          resign_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "resignations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_sheets: {
        Row: {
          basic_salary: number | null
          created_at: string
          employee_id: string
          id: string
          month: string
          net_salary: number | null
          status: string
          total_allowance: number | null
          total_deduction: number | null
        }
        Insert: {
          basic_salary?: number | null
          created_at?: string
          employee_id: string
          id?: string
          month: string
          net_salary?: number | null
          status?: string
          total_allowance?: number | null
          total_deduction?: number | null
        }
        Update: {
          basic_salary?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          month?: string
          net_salary?: number | null
          status?: string
          total_allowance?: number | null
          total_deduction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_sheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_config: {
        Row: {
          created_at: string
          device_id: string
          device_type: string
          id: string
          interval_minutes: number
          is_active: boolean
          last_run: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          device_type: string
          id?: string
          interval_minutes?: number
          is_active?: boolean
          last_run?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          device_type?: string
          id?: string
          interval_minutes?: number
          is_active?: boolean
          last_run?: string | null
        }
        Relationships: []
      }
      service_invoices: {
        Row: {
          amount: number | null
          client_id: string | null
          created_at: string
          id: string
          invoice_date: string | null
          invoice_no: string
          notes: string | null
          service_name: string
          status: string
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_no: string
          notes?: string | null
          service_name: string
          status?: string
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_no?: string
          notes?: string | null
          service_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          contact_name: string
          created_at: string | null
          district: string
          id: string
          isp_name: string
          notes: string | null
          phone: string
          service_needed: string
          status: string | null
        }
        Insert: {
          contact_name: string
          created_at?: string | null
          district: string
          id?: string
          isp_name: string
          notes?: string | null
          phone: string
          service_needed: string
          status?: string | null
        }
        Update: {
          contact_name?: string
          created_at?: string | null
          district?: string
          id?: string
          isp_name?: string
          notes?: string | null
          phone?: string
          service_needed?: string
          status?: string | null
        }
        Relationships: []
      }
      service_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          grace_minutes: number
          id: string
          late_deduction_amount: number | null
          late_deduction_type: string | null
          name: string
          start_time: string
          status: string
        }
        Insert: {
          created_at?: string
          end_time: string
          grace_minutes?: number
          id?: string
          late_deduction_amount?: number | null
          late_deduction_type?: string | null
          name: string
          start_time: string
          status?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          grace_minutes?: number
          id?: string
          late_deduction_amount?: number | null
          late_deduction_type?: string | null
          name?: string
          start_time?: string
          status?: string
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          id: string
          image: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          min_order: number
          status: string
          type: string
          usage_limit: number | null
          used: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          min_order?: number
          status?: string
          type?: string
          usage_limit?: number | null
          used?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          min_order?: number
          status?: string
          type?: string
          usage_limit?: number | null
          used?: number
          value?: number
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          name: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          sku: string | null
          subtotal: number
          warranty_end: string | null
          warranty_months: number
          warranty_start: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_id: string
          price?: number
          product_id?: string | null
          quantity?: number
          sku?: string | null
          subtotal?: number
          warranty_end?: string | null
          warranty_months?: number
          warranty_start?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          sku?: string | null
          subtotal?: number
          warranty_end?: string | null
          warranty_months?: number
          warranty_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          address: string
          area: string | null
          created_at: string
          customer_name: string
          discount: number
          district: string
          email: string | null
          id: string
          inside_dhaka: boolean
          mobile: string
          notes: string | null
          order_no: string
          order_status: string
          payment_method: string
          payment_status: string
          shipping: number
          subtotal: number
          thana: string | null
          total: number
          trx_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          area?: string | null
          created_at?: string
          customer_name: string
          discount?: number
          district: string
          email?: string | null
          id?: string
          inside_dhaka?: boolean
          mobile: string
          notes?: string | null
          order_no: string
          order_status?: string
          payment_method?: string
          payment_status?: string
          shipping?: number
          subtotal?: number
          thana?: string | null
          total?: number
          trx_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          area?: string | null
          created_at?: string
          customer_name?: string
          discount?: number
          district?: string
          email?: string | null
          id?: string
          inside_dhaka?: boolean
          mobile?: string
          notes?: string | null
          order_no?: string
          order_status?: string
          payment_method?: string
          payment_status?: string
          shipping?: number
          subtotal?: number
          thana?: string | null
          total?: number
          trx_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          brand: string | null
          category_id: string | null
          compare_price: number | null
          created_at: string
          featured: boolean
          id: string
          images: Json
          long_desc: string | null
          low_stock_alert: number
          name: string
          price: number
          short_desc: string | null
          sku: string | null
          slug: string
          specs: Json
          status: string
          stock: number
          unit: string | null
          updated_at: string
          warranty_months: number
          weight_kg: number | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          featured?: boolean
          id?: string
          images?: Json
          long_desc?: string | null
          low_stock_alert?: number
          name: string
          price?: number
          short_desc?: string | null
          sku?: string | null
          slug: string
          specs?: Json
          status?: string
          stock?: number
          unit?: string | null
          updated_at?: string
          warranty_months?: number
          weight_kg?: number | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          compare_price?: number | null
          created_at?: string
          featured?: boolean
          id?: string
          images?: Json
          long_desc?: string | null
          low_stock_alert?: number
          name?: string
          price?: number
          short_desc?: string | null
          sku?: string | null
          slug?: string
          specs?: Json
          status?: string
          stock?: number
          unit?: string | null
          updated_at?: string
          warranty_months?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_shipping_zones: {
        Row: {
          charge: number
          created_at: string
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          charge?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          charge?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      sms_gateways: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          password: string | null
          sender_id: string | null
          sms_type: string
          status: string
          username: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          password?: string | null
          sender_id?: string | null
          sms_type?: string
          status?: string
          username?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          password?: string | null
          sender_id?: string | null
          sms_type?: string
          status?: string
          username?: string | null
        }
        Relationships: []
      }
      sms_groups: {
        Row: {
          created_at: string
          description: string | null
          group_type: string
          id: string
          members: Json | null
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_type?: string
          id?: string
          members?: Json | null
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_type?: string
          id?: string
          members?: Json | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      sms_log: {
        Row: {
          created_at: string
          gateway_id: string | null
          group_id: string | null
          id: string
          message: string
          recipient: string
          recipient_count: number
          sent_at: string | null
          sent_by: string | null
          sms_type: string
          status: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          gateway_id?: string | null
          group_id?: string | null
          id?: string
          message: string
          recipient: string
          recipient_count?: number
          sent_at?: string | null
          sent_by?: string | null
          sms_type?: string
          status?: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          gateway_id?: string | null
          group_id?: string | null
          id?: string
          message?: string
          recipient?: string
          recipient_count?: number
          sent_at?: string | null
          sent_by?: string | null
          sms_type?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_log_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "sms_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "sms_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          status: string
          type: string | null
          variables: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          status?: string
          type?: string | null
          variables?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          type?: string | null
          variables?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          quantity?: number
          reference?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      sub_zones: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          zone_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          zone_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      support_categories: {
        Row: {
          category_type: string
          created_at: string
          department: string | null
          details: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          category_type?: string
          created_at?: string
          department?: string | null
          details?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          category_type?: string
          created_at?: string
          department?: string | null
          details?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      support_ticket_assignees: {
        Row: {
          assigned_at: string
          employee_id: string
          id: string
          ticket_id: string
        }
        Insert: {
          assigned_at?: string
          employee_id: string
          id?: string
          ticket_id: string
        }
        Update: {
          assigned_at?: string
          employee_id?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_assignees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_assignees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_comments: {
        Row: {
          attachments: string[] | null
          comment: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          comment: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          comment?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          box: string | null
          category_id: string | null
          client_id: string | null
          complain_no: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          priority: string | null
          resolved_at: string | null
          solved_at: string | null
          solved_by: string | null
          source: string
          status: string
          subject: string
          subzone: string | null
          ticket_no: string
          zone_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          box?: string | null
          category_id?: string | null
          client_id?: string | null
          complain_no?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          solved_at?: string | null
          solved_by?: string | null
          source?: string
          status?: string
          subject: string
          subzone?: string | null
          ticket_no: string
          zone_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          box?: string | null
          category_id?: string | null
          client_id?: string | null
          complain_no?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          solved_at?: string | null
          solved_by?: string | null
          source?: string
          status?: string
          subject?: string
          subzone?: string | null
          ticket_no?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_solved_by_fkey"
            columns: ["solved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      switches: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          ip_address: string
          name: string
          port: number
          status: Database["public"]["Enums"]["device_status"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address: string
          name: string
          port?: number
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          name?: string
          port?: number
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "switches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          device_name: string | null
          id: string
          log_message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: string
          log_message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: string
          log_message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          assigned_at: string
          employee_id: string
          id: string
          task_id: string
        }
        Insert: {
          assigned_at?: string
          employee_id: string
          id?: string
          task_id: string
        }
        Update: {
          assigned_at?: string
          employee_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          remarks: string | null
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          remarks?: string | null
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          remarks?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      upazilas: {
        Row: {
          code: string | null
          created_at: string
          district_id: string
          id: string
          name: string
          status: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          district_id: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          district_id?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "upazilas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onu_mapping: {
        Row: {
          caller_id_mac: string
          created_at: string
          id: string
          mapped_at: string | null
          onu_id: string | null
          ppp_username: string
          status: Database["public"]["Enums"]["mapping_status"]
        }
        Insert: {
          caller_id_mac: string
          created_at?: string
          id?: string
          mapped_at?: string | null
          onu_id?: string | null
          ppp_username: string
          status?: Database["public"]["Enums"]["mapping_status"]
        }
        Update: {
          caller_id_mac?: string
          created_at?: string
          id?: string
          mapped_at?: string | null
          onu_id?: string | null
          ppp_username?: string
          status?: Database["public"]["Enums"]["mapping_status"]
        }
        Relationships: [
          {
            foreignKeyName: "user_onu_mapping_onu_id_fkey"
            columns: ["onu_id"]
            isOneToOne: false
            referencedRelation: "onu_list"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vas_services: {
        Row: {
          created_at: string
          credentials_template: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          price: number | null
          provider_type: string | null
          status: string
        }
        Insert: {
          created_at?: string
          credentials_template?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          price?: number | null
          provider_type?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          credentials_template?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          price?: number | null
          provider_type?: string | null
          status?: string
        }
        Relationships: []
      }
      vas_subscriptions: {
        Row: {
          client_id: string
          created_at: string | null
          end_date: string | null
          id: string
          service_id: string
          start_date: string | null
          status: string | null
          vas_password: string | null
          vas_username: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          service_id: string
          start_date?: string | null
          status?: string | null
          vas_password?: string | null
          vas_username?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          service_id?: string
          start_date?: string | null
          status?: string | null
          vas_password?: string | null
          vas_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vas_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vas_subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vas_services"
            referencedColumns: ["id"]
          },
        ]
      }
      vas_transactions: {
        Row: {
          amount: number | null
          client_id: string | null
          created_at: string
          id: string
          service_id: string | null
          status: string
          transaction_date: string | null
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          id?: string
          service_id?: string | null
          status?: string
          transaction_date?: string | null
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          id?: string
          service_id?: string | null
          status?: string
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vas_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vas_transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "vas_services"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      warranty_claims: {
        Row: {
          admin_note: string | null
          claim_no: string
          created_at: string
          customer_name: string | null
          id: string
          issue: string
          mobile: string | null
          order_item_id: string
          received_at: string
          resolution_type: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          claim_no: string
          created_at?: string
          customer_name?: string | null
          id?: string
          issue: string
          mobile?: string | null
          order_item_id: string
          received_at?: string
          resolution_type?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          claim_no?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          issue?: string
          mobile?: string | null
          order_item_id?: string
          received_at?: string
          resolution_type?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "shop_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      website_features: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          sort_order: number | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          sort_order?: number | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          sort_order?: number | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      website_festivals: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          start_date: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          start_date?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          start_date?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      website_media: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      website_menu: {
        Row: {
          created_at: string
          id: string
          parent_id: string | null
          sort_order: number | null
          status: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id?: string | null
          sort_order?: number | null
          status?: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string | null
          sort_order?: number | null
          status?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_menu_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "website_menu"
            referencedColumns: ["id"]
          },
        ]
      }
      website_notices: {
        Row: {
          content: string | null
          created_at: string
          id: string
          publish_date: string | null
          status: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          publish_date?: string | null
          status?: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          publish_date?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      website_offers: {
        Row: {
          created_at: string
          description: string | null
          discount_text: string | null
          end_date: string | null
          id: string
          image_url: string | null
          start_date: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_text?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          start_date?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_text?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          start_date?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      website_pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          slug: string
          sort_order: number | null
          status: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          slug: string
          sort_order?: number | null
          status?: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      website_partners: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          sort_order: number | null
          status: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          sort_order?: number | null
          status?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          sort_order?: number | null
          status?: string
          website_url?: string | null
        }
        Relationships: []
      }
      website_services: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          sort_order: number | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      website_testimonials: {
        Row: {
          company: string | null
          content: string | null
          created_at: string
          designation: string | null
          id: string
          image_url: string | null
          name: string
          rating: number | null
          sort_order: number | null
          status: string
        }
        Insert: {
          company?: string | null
          content?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          image_url?: string | null
          name: string
          rating?: number | null
          sort_order?: number | null
          status?: string
        }
        Update: {
          company?: string | null
          content?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          image_url?: string | null
          name?: string
          rating?: number | null
          sort_order?: number | null
          status?: string
        }
        Relationships: []
      }
      zkteco_attendance_logs: {
        Row: {
          created_at: string
          device_id: string
          device_user_id: string | null
          employee_id: string | null
          id: string
          punch_time: string
          punch_type: string
          synced_at: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          device_user_id?: string | null
          employee_id?: string | null
          id?: string
          punch_time: string
          punch_type?: string
          synced_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          device_user_id?: string | null
          employee_id?: string | null
          id?: string
          punch_time?: string
          punch_type?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zkteco_attendance_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "zkteco_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zkteco_attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      zkteco_devices: {
        Row: {
          api_id: string | null
          api_password: string | null
          created_at: string
          id: string
          ip_address: string
          last_sync_at: string | null
          location: string | null
          name: string
          port: number
          serial_number: string | null
          status: string
        }
        Insert: {
          api_id?: string | null
          api_password?: string | null
          created_at?: string
          id?: string
          ip_address: string
          last_sync_at?: string | null
          location?: string | null
          name: string
          port?: number
          serial_number?: string | null
          status?: string
        }
        Update: {
          api_id?: string | null
          api_password?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          last_sync_at?: string | null
          location?: string | null
          name?: string
          port?: number
          serial_number?: string | null
          status?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          description: string | null
          district_id: string | null
          division_id: string | null
          id: string
          name: string
          status: string
          upazila_id: string | null
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          district_id?: string | null
          division_id?: string | null
          id?: string
          name: string
          status?: string
          upazila_id?: string | null
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          district_id?: string | null
          division_id?: string | null
          id?: string
          name?: string
          status?: string
          upazila_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_branch: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_channel: "dashboard" | "telegram"
      alert_type: "warning" | "critical" | "offline"
      app_role: "super_admin" | "admin" | "operator"
      connection_type: "telnet" | "ssh"
      device_status: "online" | "offline" | "unknown"
      mapping_status: "mapped" | "unmapped"
      olt_vendor:
        | "huawei"
        | "bdcom"
        | "vsol"
        | "dbc"
        | "syrotech"
        | "solitine"
        | "corelink"
        | "c-data"
        | "ecom"
        | "hsgq"
        | "phyhome"
      onu_status: "online" | "offline"
      pop_device_type: "generator" | "electric"
      power_status: "up" | "down" | "unknown"
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
      alert_channel: ["dashboard", "telegram"],
      alert_type: ["warning", "critical", "offline"],
      app_role: ["super_admin", "admin", "operator"],
      connection_type: ["telnet", "ssh"],
      device_status: ["online", "offline", "unknown"],
      mapping_status: ["mapped", "unmapped"],
      olt_vendor: [
        "huawei",
        "bdcom",
        "vsol",
        "dbc",
        "syrotech",
        "solitine",
        "corelink",
        "c-data",
        "ecom",
        "hsgq",
        "phyhome",
      ],
      onu_status: ["online", "offline"],
      pop_device_type: ["generator", "electric"],
      power_status: ["up", "down", "unknown"],
    },
  },
} as const
