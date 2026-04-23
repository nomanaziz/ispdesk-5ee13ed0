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
          is_default: boolean
          is_protected: boolean
          name: string
          redirect_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_protected?: boolean
          name: string
          redirect_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_protected?: boolean
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
      asset_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          quantity: number
          recipient_id: string | null
          recipient_name: string
          recipient_type: string
          returned_at: string | null
          returned_by: string | null
          serial_no: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity?: number
          recipient_id?: string | null
          recipient_name: string
          recipient_type: string
          returned_at?: string | null
          returned_by?: string | null
          serial_no?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity?: number
          recipient_id?: string | null
          recipient_name?: string
          recipient_type?: string
          returned_at?: string | null
          returned_by?: string | null
          serial_no?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_assignments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
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
      automatic_processes: {
        Row: {
          branch_id: string | null
          created_at: string
          enabled: boolean
          execute_at: string
          execution_day: string | null
          id: string
          interval_type: string
          last_run: string | null
          next_run: string | null
          notes: string | null
          process_key: string
          process_name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          enabled?: boolean
          execute_at?: string
          execution_day?: string | null
          id?: string
          interval_type?: string
          last_run?: string | null
          next_run?: string | null
          notes?: string | null
          process_key: string
          process_name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          enabled?: boolean
          execute_at?: string
          execution_day?: string | null
          id?: string
          interval_type?: string
          last_run?: string | null
          next_run?: string | null
          notes?: string | null
          process_key?: string
          process_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automatic_processes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      billing_history: {
        Row: {
          action: string
          billing_id: string | null
          changed_at: string
          changed_by: string | null
          client_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          remarks: string | null
        }
        Insert: {
          action: string
          billing_id?: string | null
          changed_at?: string
          changed_by?: string | null
          client_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          remarks?: string | null
        }
        Update: {
          action?: string
          billing_id?: string | null
          changed_at?: string
          changed_by?: string | null
          client_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_client_id_fkey"
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
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: "boxes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
          branch_id: string
          created_at: string
          created_by: string | null
          description: string | null
          discount: number
          due_amount: number
          funding_date: string | null
          id: string
          invoice_number: string | null
          payment_method: string | null
          processing_fee: number
          receipt_number: string | null
          received_amount: number
          received_by: string | null
          received_on: string | null
          remarks: string | null
          status: string
          trans_type: string
          type: string | null
          vat: number
        }
        Insert: {
          amount?: number | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount?: number
          due_amount?: number
          funding_date?: string | null
          id?: string
          invoice_number?: string | null
          payment_method?: string | null
          processing_fee?: number
          receipt_number?: string | null
          received_amount?: number
          received_by?: string | null
          received_on?: string | null
          remarks?: string | null
          status?: string
          trans_type?: string
          type?: string | null
          vat?: number
        }
        Update: {
          amount?: number | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount?: number
          due_amount?: number
          funding_date?: string | null
          id?: string
          invoice_number?: string | null
          payment_method?: string | null
          processing_fee?: number
          receipt_number?: string | null
          received_amount?: number
          received_by?: string | null
          received_on?: string | null
          remarks?: string | null
          status?: string
          trans_type?: string
          type?: string | null
          vat?: number
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
          allow_negative_balance: boolean
          auto_disable_day: number
          auto_settle_pgw: boolean
          balance: number
          branch_id: string | null
          client_code: string | null
          client_code_prefix: string | null
          client_create_permission: boolean
          company_name: string | null
          contact: string | null
          created_at: string
          credit_refund_policy: boolean
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
          pop_type_changed_at: string | null
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
          allow_negative_balance?: boolean
          auto_disable_day?: number
          auto_settle_pgw?: boolean
          balance?: number
          branch_id?: string | null
          client_code?: string | null
          client_code_prefix?: string | null
          client_create_permission?: boolean
          company_name?: string | null
          contact?: string | null
          created_at?: string
          credit_refund_policy?: boolean
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
          pop_type_changed_at?: string | null
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
          allow_negative_balance?: boolean
          auto_disable_day?: number
          auto_settle_pgw?: boolean
          balance?: number
          branch_id?: string | null
          client_code?: string | null
          client_code_prefix?: string | null
          client_create_permission?: boolean
          company_name?: string | null
          contact?: string | null
          created_at?: string
          credit_refund_policy?: boolean
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
          pop_type_changed_at?: string | null
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
          item_name: string | null
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
          item_name?: string | null
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
          item_name?: string | null
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
          current_service_id: string | null
          id: string
          note: string | null
          order_no: string
          request_type: string | null
          reseller_id: string
          status: string
          target_service_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          billing_month?: string | null
          created_at?: string
          current_service_id?: string | null
          id?: string
          note?: string | null
          order_no: string
          request_type?: string | null
          reseller_id: string
          status?: string
          target_service_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          billing_month?: string | null
          created_at?: string
          current_service_id?: string | null
          id?: string
          note?: string | null
          order_no?: string
          request_type?: string | null
          reseller_id?: string
          status?: string
          target_service_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bw_purchase_orders_current_service_id_fkey"
            columns: ["current_service_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_purchase_orders_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bw_purchase_orders_target_service_id_fkey"
            columns: ["target_service_id"]
            isOneToOne: false
            referencedRelation: "bw_sale_services"
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
          own_bkash_number: string | null
          password: string | null
          payment_mode: string | null
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
          own_bkash_number?: string | null
          password?: string | null
          payment_mode?: string | null
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
          own_bkash_number?: string | null
          password?: string | null
          payment_mode?: string | null
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
      client_update_requests: {
        Row: {
          changes: Json
          client_id: string
          created_at: string
          id: string
          note: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          changes?: Json
          client_id: string
          created_at?: string
          id?: string
          note?: string | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          changes?: Json
          client_id?: string
          created_at?: string
          id?: string
          note?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_update_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
          cable_recovered: boolean
          client_id: string
          client_type: string | null
          connected_by: string | null
          connection_type: string | null
          contact: string | null
          core_color: string | null
          core_count: number | null
          created_at: string
          created_by_admin: string | null
          date_of_birth: string | null
          device_recovered: boolean
          device_serial: string | null
          device_type: string | null
          district_id: string | null
          division_id: string | null
          documents: Json
          email: string | null
          expire_date: string | null
          expire_day: number | null
          father_name: string | null
          fiber_code: string | null
          gender: string | null
          house_number: string | null
          id: string
          installed_by_ids: string[] | null
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
          nid_back_url: string | null
          nid_front_url: string | null
          nid_number: string | null
          occupation: string | null
          onu_id: string | null
          owner_scope: string
          package_id: string | null
          password: string | null
          permanent_address: string | null
          phone_number: string | null
          photo_url: string | null
          present_address: string | null
          profile: string | null
          protocol_type: string | null
          purchase_date: string | null
          recovered_at: string | null
          recovered_by: string | null
          recovery_remarks: string | null
          recovery_status: string
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
          upazila_id: string | null
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
          cable_recovered?: boolean
          client_id: string
          client_type?: string | null
          connected_by?: string | null
          connection_type?: string | null
          contact?: string | null
          core_color?: string | null
          core_count?: number | null
          created_at?: string
          created_by_admin?: string | null
          date_of_birth?: string | null
          device_recovered?: boolean
          device_serial?: string | null
          device_type?: string | null
          district_id?: string | null
          division_id?: string | null
          documents?: Json
          email?: string | null
          expire_date?: string | null
          expire_day?: number | null
          father_name?: string | null
          fiber_code?: string | null
          gender?: string | null
          house_number?: string | null
          id?: string
          installed_by_ids?: string[] | null
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
          nid_back_url?: string | null
          nid_front_url?: string | null
          nid_number?: string | null
          occupation?: string | null
          onu_id?: string | null
          owner_scope?: string
          package_id?: string | null
          password?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          photo_url?: string | null
          present_address?: string | null
          profile?: string | null
          protocol_type?: string | null
          purchase_date?: string | null
          recovered_at?: string | null
          recovered_by?: string | null
          recovery_remarks?: string | null
          recovery_status?: string
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
          upazila_id?: string | null
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
          cable_recovered?: boolean
          client_id?: string
          client_type?: string | null
          connected_by?: string | null
          connection_type?: string | null
          contact?: string | null
          core_color?: string | null
          core_count?: number | null
          created_at?: string
          created_by_admin?: string | null
          date_of_birth?: string | null
          device_recovered?: boolean
          device_serial?: string | null
          device_type?: string | null
          district_id?: string | null
          division_id?: string | null
          documents?: Json
          email?: string | null
          expire_date?: string | null
          expire_day?: number | null
          father_name?: string | null
          fiber_code?: string | null
          gender?: string | null
          house_number?: string | null
          id?: string
          installed_by_ids?: string[] | null
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
          nid_back_url?: string | null
          nid_front_url?: string | null
          nid_number?: string | null
          occupation?: string | null
          onu_id?: string | null
          owner_scope?: string
          package_id?: string | null
          password?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          photo_url?: string | null
          present_address?: string | null
          profile?: string | null
          protocol_type?: string | null
          purchase_date?: string | null
          recovered_at?: string | null
          recovered_by?: string | null
          recovery_remarks?: string | null
          recovery_status?: string
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
          upazila_id?: string | null
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
            foreignKeyName: "clients_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
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
            foreignKeyName: "clients_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
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
      credit_refund_logs: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_username: string | null
          created_at: string
          daily_rate: number
          id: string
          package_id: string | null
          package_name: string | null
          paid_days: number
          pop_balance_after: number | null
          pop_balance_before: number | null
          pop_id: string
          reason: string | null
          refund_amount: number
          refund_days: number
          refunded_at: string
          status: string
          used_days: number
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          client_username?: string | null
          created_at?: string
          daily_rate?: number
          id?: string
          package_id?: string | null
          package_name?: string | null
          paid_days?: number
          pop_balance_after?: number | null
          pop_balance_before?: number | null
          pop_id: string
          reason?: string | null
          refund_amount?: number
          refund_days?: number
          refunded_at?: string
          status?: string
          used_days?: number
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          client_username?: string | null
          created_at?: string
          daily_rate?: number
          id?: string
          package_id?: string | null
          package_name?: string | null
          paid_days?: number
          pop_balance_after?: number | null
          pop_balance_before?: number | null
          pop_id?: string
          reason?: string | null
          refund_amount?: number
          refund_days?: number
          refunded_at?: string
          status?: string
          used_days?: number
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
          branch_id: string | null
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      device_admin_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          device_id: string | null
          device_name: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          performed_by: string | null
          performed_by_name: string | null
          status: string | null
          target_username: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          status?: string | null
          target_username?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          status?: string | null
          target_username?: string | null
        }
        Relationships: []
      }
      device_admin_backups: {
        Row: {
          backup_format: string
          created_at: string
          created_by: string | null
          device_id: string
          device_name: string | null
          device_type: string
          error_message: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          id: string
          job_id: string | null
          schedule_id: string | null
          status: string
          triggered_by: string
        }
        Insert: {
          backup_format?: string
          created_at?: string
          created_by?: string | null
          device_id: string
          device_name?: string | null
          device_type: string
          error_message?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          job_id?: string | null
          schedule_id?: string | null
          status?: string
          triggered_by?: string
        }
        Update: {
          backup_format?: string
          created_at?: string
          created_by?: string | null
          device_id?: string
          device_name?: string | null
          device_type?: string
          error_message?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          job_id?: string | null
          schedule_id?: string | null
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_admin_backups_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "device_admin_deploy_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_admin_backups_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "device_admin_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      device_admin_deploy_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          job_type: string
          notes: string | null
          password_hash: string | null
          permission: string | null
          results: Json
          status: string
          target_devices: Json
          username: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_type: string
          notes?: string | null
          password_hash?: string | null
          permission?: string | null
          results?: Json
          status?: string
          target_devices?: Json
          username?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_type?: string
          notes?: string | null
          password_hash?: string | null
          permission?: string | null
          results?: Json
          status?: string
          target_devices?: Json
          username?: string | null
        }
        Relationships: []
      }
      device_admin_group_members: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          device_type: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          device_type: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          device_type?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_admin_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "device_admin_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      device_admin_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_admin_managed_devices: {
        Row: {
          backup_schedule: string
          category: string
          created_at: string
          created_by: string | null
          enable_password: string | null
          group_id: string | null
          id: string
          ip_address: string | null
          location: string | null
          name: string
          password_encrypted: string | null
          port: number | null
          protocol: string
          status: string
          updated_at: string
          username: string | null
          vendor: string
        }
        Insert: {
          backup_schedule?: string
          category?: string
          created_at?: string
          created_by?: string | null
          enable_password?: string | null
          group_id?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          name: string
          password_encrypted?: string | null
          port?: number | null
          protocol?: string
          status?: string
          updated_at?: string
          username?: string | null
          vendor?: string
        }
        Update: {
          backup_schedule?: string
          category?: string
          created_at?: string
          created_by?: string | null
          enable_password?: string | null
          group_id?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          name?: string
          password_encrypted?: string | null
          port?: number | null
          protocol?: string
          status?: string
          updated_at?: string
          username?: string | null
          vendor?: string
        }
        Relationships: []
      }
      device_admin_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          cron_expression: string
          device_id: string | null
          device_type: string | null
          enabled: boolean
          frequency: string | null
          group_id: string | null
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          payload: Json
          schedule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron_expression: string
          device_id?: string | null
          device_type?: string | null
          enabled?: boolean
          frequency?: string | null
          group_id?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          payload?: Json
          schedule_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron_expression?: string
          device_id?: string | null
          device_type?: string | null
          enabled?: boolean
          frequency?: string | null
          group_id?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          payload?: Json
          schedule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_admin_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "device_admin_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      device_admin_user_inventory: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          device_type: string
          id: string
          last_synced_at: string
          permission: string | null
          raw_data: Json | null
          username: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          device_type: string
          id?: string
          last_synced_at?: string
          permission?: string | null
          raw_data?: Json | null
          username: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          device_type?: string
          id?: string
          last_synced_at?: string
          permission?: string | null
          raw_data?: Json | null
          username?: string
        }
        Relationships: []
      }
      device_audit_log: {
        Row: {
          action: string
          created_at: string
          device_id: string | null
          device_kind: string
          id: string
          payload: Json | null
          result: string | null
          target: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          device_id?: string | null
          device_kind: string
          id?: string
          payload?: Json | null
          result?: string | null
          target?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          device_id?: string | null
          device_kind?: string
          id?: string
          payload?: Json | null
          result?: string | null
          target?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      device_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission_key: string
          scope: string
          scope_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_key: string
          scope?: string
          scope_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_key?: string
          scope?: string
          scope_id?: string | null
          user_id?: string
        }
        Relationships: []
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
          branch_id: string | null
          created_at: string
          date_of_birth: string | null
          default_in_time: string | null
          default_out_time: string | null
          department_id: string | null
          device_user_id: string | null
          district: string | null
          district_id: string | null
          division_id: string | null
          email: string | null
          employee_id: string
          facebook_link: string | null
          gender: string | null
          guardian_phone: string | null
          has_user_access: boolean
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
          sub_user_id: string | null
          upazila: string | null
          upazila_id: string | null
          updated_at: string
          user_password: string | null
          user_permissions: Json
          user_username: string | null
          working_experience: string | null
          zkteco_device_id: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_in_time?: string | null
          default_out_time?: string | null
          department_id?: string | null
          device_user_id?: string | null
          district?: string | null
          district_id?: string | null
          division_id?: string | null
          email?: string | null
          employee_id: string
          facebook_link?: string | null
          gender?: string | null
          guardian_phone?: string | null
          has_user_access?: boolean
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
          sub_user_id?: string | null
          upazila?: string | null
          upazila_id?: string | null
          updated_at?: string
          user_password?: string | null
          user_permissions?: Json
          user_username?: string | null
          working_experience?: string | null
          zkteco_device_id?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_in_time?: string | null
          default_out_time?: string | null
          department_id?: string | null
          device_user_id?: string | null
          district?: string | null
          district_id?: string | null
          division_id?: string | null
          email?: string | null
          employee_id?: string
          facebook_link?: string | null
          gender?: string | null
          guardian_phone?: string | null
          has_user_access?: boolean
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
          sub_user_id?: string | null
          upazila?: string | null
          upazila_id?: string | null
          updated_at?: string
          user_password?: string | null
          user_permissions?: Json
          user_username?: string | null
          working_experience?: string | null
          zkteco_device_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
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
            foreignKeyName: "employees_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
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
      important_link_categories: {
        Row: {
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      important_links: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "important_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "important_link_categories"
            referencedColumns: ["id"]
          },
        ]
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
          price_includes_vat: boolean
          protocol: string | null
          setup_fee: number | null
          show_on_homepage: boolean | null
          show_vat_breakdown: boolean
          status: string
          vat_percent: number
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
          price_includes_vat?: boolean
          protocol?: string | null
          setup_fee?: number | null
          show_on_homepage?: boolean | null
          show_vat_breakdown?: boolean
          status?: string
          vat_percent?: number
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
          price_includes_vat?: boolean
          protocol?: string | null
          setup_fee?: number | null
          show_on_homepage?: boolean | null
          show_vat_breakdown?: boolean
          status?: string
          vat_percent?: number
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
          linked_client_id: string | null
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
          linked_client_id?: string | null
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
          linked_client_id?: string | null
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
            foreignKeyName: "mikrotik_clients_linked_client_id_fkey"
            columns: ["linked_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          assigned_to_pop_id: string | null
          branch_id: string | null
          created_at: string
          credentials_encrypted: string | null
          enabled: boolean
          id: string
          ip_address: string
          name: string
          order_no: number | null
          password_encrypted: string | null
          status: Database["public"]["Enums"]["device_status"]
          timeout: number
          updated_at: string
          username: string | null
          version: string
        }
        Insert: {
          api_port?: number
          assigned_to_pop_id?: string | null
          branch_id?: string | null
          created_at?: string
          credentials_encrypted?: string | null
          enabled?: boolean
          id?: string
          ip_address: string
          name: string
          order_no?: number | null
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          timeout?: number
          updated_at?: string
          username?: string | null
          version?: string
        }
        Update: {
          api_port?: number
          assigned_to_pop_id?: string | null
          branch_id?: string | null
          created_at?: string
          credentials_encrypted?: string | null
          enabled?: boolean
          id?: string
          ip_address?: string
          name?: string
          order_no?: number | null
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          timeout?: number
          updated_at?: string
          username?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "mikrotik_devices_assigned_to_pop_id_fkey"
            columns: ["assigned_to_pop_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mikrotik_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      network_edges: {
        Row: {
          color_code: string | null
          connection_type: string
          created_at: string
          created_by: string | null
          edge_code: string | null
          id: string
          length_m: number | null
          remarks: string | null
          source_node_id: string
          status: string
          target_node_id: string
        }
        Insert: {
          color_code?: string | null
          connection_type?: string
          created_at?: string
          created_by?: string | null
          edge_code?: string | null
          id?: string
          length_m?: number | null
          remarks?: string | null
          source_node_id: string
          status?: string
          target_node_id: string
        }
        Update: {
          color_code?: string | null
          connection_type?: string
          created_at?: string
          created_by?: string | null
          edge_code?: string | null
          id?: string
          length_m?: number | null
          remarks?: string | null
          source_node_id?: string
          status?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "network_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "network_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      network_node_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          node_id: string
          port_no: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          node_id: string
          port_no?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          node_id?: string
          port_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_node_clients_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "network_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      network_node_items: {
        Row: {
          distributed_at: string
          distributed_by: string | null
          id: string
          inventory_item_id: string
          node_id: string
          quantity: number
          remarks: string | null
        }
        Insert: {
          distributed_at?: string
          distributed_by?: string | null
          id?: string
          inventory_item_id: string
          node_id: string
          quantity?: number
          remarks?: string | null
        }
        Update: {
          distributed_at?: string
          distributed_by?: string | null
          id?: string
          inventory_item_id?: string
          node_id?: string
          quantity?: number
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_node_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "network_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      network_nodes: {
        Row: {
          address: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string | null
          latitude: number | null
          longitude: number | null
          mac: string | null
          name: string
          node_type: string
          olt_device_id: string | null
          parent_id: string | null
          port_info: string | null
          position_x: number | null
          position_y: number | null
          remarks: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          latitude?: number | null
          longitude?: number | null
          mac?: string | null
          name: string
          node_type?: string
          olt_device_id?: string | null
          parent_id?: string | null
          port_info?: string | null
          position_x?: number | null
          position_y?: number | null
          remarks?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          latitude?: number | null
          longitude?: number | null
          mac?: string | null
          name?: string
          node_type?: string
          olt_device_id?: string | null
          parent_id?: string | null
          port_info?: string | null
          position_x?: number | null
          position_y?: number | null
          remarks?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "network_nodes"
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
          telnet_port: number | null
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
          telnet_port?: number | null
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
          telnet_port?: number | null
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
      olt_mac_table: {
        Row: {
          created_at: string
          id: string
          mac: string
          olt_id: string
          port: string
          port_type: string
          seen_at: string
          vlan: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          mac: string
          olt_id: string
          port: string
          port_type?: string
          seen_at?: string
          vlan?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          mac?: string
          olt_id?: string
          port?: string
          port_type?: string
          seen_at?: string
          vlan?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "olt_mac_table_olt_id_fkey"
            columns: ["olt_id"]
            isOneToOne: false
            referencedRelation: "olt_devices"
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
      olt_ports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          olt_id: string
          port_name: string
          port_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          olt_id: string
          port_name: string
          port_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          olt_id?: string
          port_name?: string
          port_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "olt_ports_olt_id_fkey"
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
      pop_billing_periods: {
        Row: {
          branch_manager_id: string
          created_at: string
          due_days: number
          generate_day: number
          period_type: string
          updated_at: string
        }
        Insert: {
          branch_manager_id: string
          created_at?: string
          due_days?: number
          generate_day?: number
          period_type?: string
          updated_at?: string
        }
        Update: {
          branch_manager_id?: string
          created_at?: string
          due_days?: number
          generate_day?: number
          period_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_billing_periods_branch_manager_id_fkey"
            columns: ["branch_manager_id"]
            isOneToOne: true
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_daily_charges: {
        Row: {
          branch_id: string
          charge_date: string
          charged_amount: number
          charged_by: string | null
          client_id: string | null
          client_name: string | null
          client_username: string | null
          created_at: string
          daily_rate: number
          id: string
          monthly_rate: number
          package_id: string | null
          package_name: string | null
          pop_balance_after: number
          pop_balance_before: number
          pop_id: string
          profile: string | null
          protocol_type: string | null
          remarks: string | null
          server_id: string | null
          server_name: string | null
          sub_zone_id: string | null
          sub_zone_name: string | null
          zone_id: string | null
          zone_name: string | null
        }
        Insert: {
          branch_id: string
          charge_date?: string
          charged_amount?: number
          charged_by?: string | null
          client_id?: string | null
          client_name?: string | null
          client_username?: string | null
          created_at?: string
          daily_rate?: number
          id?: string
          monthly_rate?: number
          package_id?: string | null
          package_name?: string | null
          pop_balance_after?: number
          pop_balance_before?: number
          pop_id: string
          profile?: string | null
          protocol_type?: string | null
          remarks?: string | null
          server_id?: string | null
          server_name?: string | null
          sub_zone_id?: string | null
          sub_zone_name?: string | null
          zone_id?: string | null
          zone_name?: string | null
        }
        Update: {
          branch_id?: string
          charge_date?: string
          charged_amount?: number
          charged_by?: string | null
          client_id?: string | null
          client_name?: string | null
          client_username?: string | null
          created_at?: string
          daily_rate?: number
          id?: string
          monthly_rate?: number
          package_id?: string | null
          package_name?: string | null
          pop_balance_after?: number
          pop_balance_before?: number
          pop_id?: string
          profile?: string | null
          protocol_type?: string | null
          remarks?: string | null
          server_id?: string | null
          server_name?: string | null
          sub_zone_id?: string | null
          sub_zone_name?: string | null
          zone_id?: string | null
          zone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pop_daily_charges_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pop_daily_charges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pop_daily_charges_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
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
      pop_district_assignments: {
        Row: {
          branch_manager_id: string
          created_at: string
          district_id: string
          id: string
          upazila_ids: string[] | null
        }
        Insert: {
          branch_manager_id: string
          created_at?: string
          district_id: string
          id?: string
          upazila_ids?: string[] | null
        }
        Update: {
          branch_manager_id?: string
          created_at?: string
          district_id?: string
          id?: string
          upazila_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "pop_district_assignments_branch_manager_id_fkey"
            columns: ["branch_manager_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pop_district_assignments_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_fund_recharges: {
        Row: {
          amount: number
          approved_at: string | null
          branch_id: string | null
          created_at: string
          funding_id: string | null
          gateway_payment_id: string | null
          gateway_response: Json | null
          id: string
          method: string
          note: string | null
          pop_id: string
          status: string
          trx_id: string | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          branch_id?: string | null
          created_at?: string
          funding_id?: string | null
          gateway_payment_id?: string | null
          gateway_response?: Json | null
          id?: string
          method: string
          note?: string | null
          pop_id: string
          status?: string
          trx_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          branch_id?: string | null
          created_at?: string
          funding_id?: string | null
          gateway_payment_id?: string | null
          gateway_response?: Json | null
          id?: string
          method?: string
          note?: string | null
          pop_id?: string
          status?: string
          trx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pop_fund_recharges_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pop_fund_recharges_funding_id_fkey"
            columns: ["funding_id"]
            isOneToOne: false
            referencedRelation: "branch_funding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pop_fund_recharges_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
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
      pop_package_pricing: {
        Row: {
          branch_manager_id: string
          created_at: string
          id: string
          pop_selling_rate: number
          tariff_package_id: string
          updated_at: string
        }
        Insert: {
          branch_manager_id: string
          created_at?: string
          id?: string
          pop_selling_rate?: number
          tariff_package_id: string
          updated_at?: string
        }
        Update: {
          branch_manager_id?: string
          created_at?: string
          id?: string
          pop_selling_rate?: number
          tariff_package_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_package_pricing_branch_manager_id_fkey"
            columns: ["branch_manager_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pop_package_pricing_tariff_package_id_fkey"
            columns: ["tariff_package_id"]
            isOneToOne: false
            referencedRelation: "reseller_tariff_packages"
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
          branch_id: string | null
          created_at: string
          department_id: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
      public_payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          billing_id: string | null
          client_id: string
          created_at: string
          gateway_payment_id: string | null
          gateway_response: Json | null
          id: string
          method: string
          note: string | null
          sender_number: string | null
          status: string
          trx_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          billing_id?: string | null
          client_id: string
          created_at?: string
          gateway_payment_id?: string | null
          gateway_response?: Json | null
          id?: string
          method: string
          note?: string | null
          sender_number?: string | null
          status?: string
          trx_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          billing_id?: string | null
          client_id?: string
          created_at?: string
          gateway_payment_id?: string | null
          gateway_response?: Json | null
          id?: string
          method?: string
          note?: string | null
          sender_number?: string | null
          status?: string
          trx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_payment_requests_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_payment_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
          remaining_amount: number
          reseller_id: string
          reseller_share: number
          settled_amount: number
          settlement_status: string
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
          remaining_amount?: number
          reseller_id: string
          reseller_share?: number
          settled_amount?: number
          settlement_status?: string
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
          remaining_amount?: number
          reseller_id?: string
          reseller_share?: number
          settled_amount?: number
          settlement_status?: string
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
          created_by: string | null
          funding_id: string | null
          id: string
          method: string | null
          notes: string | null
          payment_date: string | null
          pgw_payment_ids: string[] | null
          receipt_no: string | null
          reference: string | null
          reseller_id: string
          settled_by: string | null
          settlement_type: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          funding_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string | null
          pgw_payment_ids?: string[] | null
          receipt_no?: string | null
          reference?: string | null
          reseller_id: string
          settled_by?: string | null
          settlement_type?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          funding_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string | null
          pgw_payment_ids?: string[] | null
          receipt_no?: string | null
          reference?: string | null
          reseller_id?: string
          settled_by?: string | null
          settlement_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_pgw_settlements_funding_id_fkey"
            columns: ["funding_id"]
            isOneToOne: false
            referencedRelation: "branch_funding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_pgw_settlements_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "branch_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          customer_id: string
          expires_at: string | null
          features: Json
          id: string
          plan: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_id: string
          expires_at?: string | null
          features?: Json
          id?: string
          plan?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          features?: Json
          id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "bw_sale_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_tariff_change_logs: {
        Row: {
          action: string
          assigned_pops: string | null
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          changed_fields: Json | null
          effective_from: string | null
          effective_to: string | null
          id: string
          min_activation_days: number | null
          package_name: string | null
          package_rate: number | null
          profile: string | null
          profile_speed: string | null
          server_name: string | null
          tariff_id: string | null
          tariff_name: string | null
          tariff_package_id: string | null
          tariff_type: string | null
          validity_days: number | null
        }
        Insert: {
          action?: string
          assigned_pops?: string | null
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: Json | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          min_activation_days?: number | null
          package_name?: string | null
          package_rate?: number | null
          profile?: string | null
          profile_speed?: string | null
          server_name?: string | null
          tariff_id?: string | null
          tariff_name?: string | null
          tariff_package_id?: string | null
          tariff_type?: string | null
          validity_days?: number | null
        }
        Update: {
          action?: string
          assigned_pops?: string | null
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_fields?: Json | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          min_activation_days?: number | null
          package_name?: string | null
          package_rate?: number | null
          profile?: string | null
          profile_speed?: string | null
          server_name?: string | null
          tariff_id?: string | null
          tariff_name?: string | null
          tariff_package_id?: string | null
          tariff_type?: string | null
          validity_days?: number | null
        }
        Relationships: []
      }
      reseller_tariff_packages: {
        Row: {
          buy_rate: number
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          mikrotik_profile: string | null
          mikrotik_server_id: string | null
          min_activation_days: number
          package_id: string
          protocol_type: string
          selling_rate: number
          status: string
          tariff_id: string
          updated_at: string
          validity_days: number
        }
        Insert: {
          buy_rate?: number
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          mikrotik_profile?: string | null
          mikrotik_server_id?: string | null
          min_activation_days?: number
          package_id: string
          protocol_type?: string
          selling_rate?: number
          status?: string
          tariff_id: string
          updated_at?: string
          validity_days?: number
        }
        Update: {
          buy_rate?: number
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          mikrotik_profile?: string | null
          mikrotik_server_id?: string | null
          min_activation_days?: number
          package_id?: string
          protocol_type?: string
          selling_rate?: number
          status?: string
          tariff_id?: string
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "reseller_tariff_packages_mikrotik_server_id_fkey"
            columns: ["mikrotik_server_id"]
            isOneToOne: false
            referencedRelation: "mikrotik_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_tariff_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "isp_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_tariff_packages_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "reseller_tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_tariffs: {
        Row: {
          activation_days: number | null
          created_at: string
          created_by: string | null
          id: string
          is_daily_recharge: boolean
          mikrotik_profile: string | null
          mikrotik_server_id: string | null
          min_activation_days: number
          name: string
          package_id: string | null
          protocol_type: string | null
          selling_rate: number | null
          status: string
          tariff_type: string
        }
        Insert: {
          activation_days?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_daily_recharge?: boolean
          mikrotik_profile?: string | null
          mikrotik_server_id?: string | null
          min_activation_days?: number
          name: string
          package_id?: string | null
          protocol_type?: string | null
          selling_rate?: number | null
          status?: string
          tariff_type?: string
        }
        Update: {
          activation_days?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_daily_recharge?: boolean
          mikrotik_profile?: string | null
          mikrotik_server_id?: string | null
          min_activation_days?: number
          name?: string
          package_id?: string | null
          protocol_type?: string | null
          selling_rate?: number | null
          status?: string
          tariff_type?: string
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
          advance: number
          basic_salary: number | null
          bonus: number
          branch_id: string | null
          created_at: string
          due: number
          employee_id: string
          id: string
          incentive: number
          month: string
          net_salary: number | null
          overtime: number
          paid_date: string | null
          paid_salary: number
          remarks: string | null
          status: string
          total_allowance: number | null
          total_amount: number
          total_deduction: number | null
        }
        Insert: {
          advance?: number
          basic_salary?: number | null
          bonus?: number
          branch_id?: string | null
          created_at?: string
          due?: number
          employee_id: string
          id?: string
          incentive?: number
          month: string
          net_salary?: number | null
          overtime?: number
          paid_date?: string | null
          paid_salary?: number
          remarks?: string | null
          status?: string
          total_allowance?: number | null
          total_amount?: number
          total_deduction?: number | null
        }
        Update: {
          advance?: number
          basic_salary?: number | null
          bonus?: number
          branch_id?: string | null
          created_at?: string
          due?: number
          employee_id?: string
          id?: string
          incentive?: number
          month?: string
          net_salary?: number | null
          overtime?: number
          paid_date?: string | null
          paid_salary?: number
          remarks?: string | null
          status?: string
          total_allowance?: number | null
          total_amount?: number
          total_deduction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_sheets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "shop_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          brand: string | null
          category_id: string | null
          compare_price: number | null
          created_at: string
          featured: boolean
          free_shipping: boolean
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
          free_shipping?: boolean
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
          free_shipping?: boolean
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
      sms_template_master: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          created_by_branch: string | null
          id: string
          is_active: boolean
          is_protected: boolean
          name: string
          template_key: string
          template_type: string
          updated_at: string
          variables: Json
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          created_by_branch?: string | null
          id?: string
          is_active?: boolean
          is_protected?: boolean
          name: string
          template_key: string
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_branch?: string | null
          id?: string
          is_active?: boolean
          is_protected?: boolean
          name?: string
          template_key?: string
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sms_template_master_created_by_branch_fkey"
            columns: ["created_by_branch"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_template_overrides: {
        Row: {
          branch_id: string | null
          content: string | null
          created_at: string
          id: string
          is_active: boolean | null
          master_id: string
          name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          master_id: string
          name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          master_id?: string
          name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_template_overrides_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_template_overrides_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "sms_template_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_template_overrides_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "sms_templates_effective"
            referencedColumns: ["master_id"]
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
          code: string | null
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      sub_zones: {
        Row: {
          branch_id: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          zone_id: string
        }
        Insert: {
          branch_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          zone_id: string
        }
        Update: {
          branch_id?: string | null
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
            foreignKeyName: "sub_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
      switch_ports: {
        Row: {
          admin_status: string | null
          bias_current: number | null
          description: string | null
          duplex: string | null
          enabled: boolean
          flow_control: string | null
          id: string
          if_index: number | null
          in_octets: number | null
          in_rate_bps: number | null
          interface: string
          last_synced: string
          mac_address: string | null
          oper_status: string | null
          out_octets: number | null
          out_rate_bps: number | null
          rx_power: number | null
          sfp_temp: number | null
          sfp_voltage: number | null
          speed_mbps: number | null
          switch_id: string
          tx_power: number | null
          vlan_id: number | null
        }
        Insert: {
          admin_status?: string | null
          bias_current?: number | null
          description?: string | null
          duplex?: string | null
          enabled?: boolean
          flow_control?: string | null
          id?: string
          if_index?: number | null
          in_octets?: number | null
          in_rate_bps?: number | null
          interface: string
          last_synced?: string
          mac_address?: string | null
          oper_status?: string | null
          out_octets?: number | null
          out_rate_bps?: number | null
          rx_power?: number | null
          sfp_temp?: number | null
          sfp_voltage?: number | null
          speed_mbps?: number | null
          switch_id: string
          tx_power?: number | null
          vlan_id?: number | null
        }
        Update: {
          admin_status?: string | null
          bias_current?: number | null
          description?: string | null
          duplex?: string | null
          enabled?: boolean
          flow_control?: string | null
          id?: string
          if_index?: number | null
          in_octets?: number | null
          in_rate_bps?: number | null
          interface?: string
          last_synced?: string
          mac_address?: string | null
          oper_status?: string | null
          out_octets?: number | null
          out_rate_bps?: number | null
          rx_power?: number | null
          sfp_temp?: number | null
          sfp_voltage?: number | null
          speed_mbps?: number | null
          switch_id?: string
          tx_power?: number | null
          vlan_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "switch_ports_switch_id_fkey"
            columns: ["switch_id"]
            isOneToOne: false
            referencedRelation: "switches"
            referencedColumns: ["id"]
          },
        ]
      }
      switch_traffic_samples: {
        Row: {
          id: number
          in_bps: number | null
          interface: string
          out_bps: number | null
          recorded_at: string
          switch_id: string
        }
        Insert: {
          id?: number
          in_bps?: number | null
          interface: string
          out_bps?: number | null
          recorded_at?: string
          switch_id: string
        }
        Update: {
          id?: number
          in_bps?: number | null
          interface?: string
          out_bps?: number | null
          recorded_at?: string
          switch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "switch_traffic_samples_switch_id_fkey"
            columns: ["switch_id"]
            isOneToOne: false
            referencedRelation: "switches"
            referencedColumns: ["id"]
          },
        ]
      }
      switch_vlans: {
        Row: {
          created_at: string
          id: string
          name: string | null
          switch_id: string
          tagged_ports: string[] | null
          untagged_ports: string[] | null
          vlan_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          switch_id: string
          tagged_ports?: string[] | null
          untagged_ports?: string[] | null
          vlan_id: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          switch_id?: string
          tagged_ports?: string[] | null
          untagged_ports?: string[] | null
          vlan_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "switch_vlans_switch_id_fkey"
            columns: ["switch_id"]
            isOneToOne: false
            referencedRelation: "switches"
            referencedColumns: ["id"]
          },
        ]
      }
      switches: {
        Row: {
          branch_id: string | null
          cpu_usage: number | null
          created_at: string
          description: string | null
          firmware: string | null
          id: string
          ip_address: string
          last_synced: string | null
          memory_usage: number | null
          model: string | null
          name: string
          password_encrypted: string | null
          port: number
          snmp_community: string | null
          snmp_port: number | null
          snmp_version: string | null
          status: Database["public"]["Enums"]["device_status"]
          updated_at: string
          uptime: string | null
          username: string | null
          vendor: string | null
        }
        Insert: {
          branch_id?: string | null
          cpu_usage?: number | null
          created_at?: string
          description?: string | null
          firmware?: string | null
          id?: string
          ip_address: string
          last_synced?: string | null
          memory_usage?: number | null
          model?: string | null
          name: string
          password_encrypted?: string | null
          port?: number
          snmp_community?: string | null
          snmp_port?: number | null
          snmp_version?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
          uptime?: string | null
          username?: string | null
          vendor?: string | null
        }
        Update: {
          branch_id?: string | null
          cpu_usage?: number | null
          created_at?: string
          description?: string | null
          firmware?: string | null
          id?: string
          ip_address?: string
          last_synced?: string | null
          memory_usage?: number | null
          model?: string | null
          name?: string
          password_encrypted?: string | null
          port?: number
          snmp_community?: string | null
          snmp_port?: number | null
          snmp_version?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
          uptime?: string | null
          username?: string | null
          vendor?: string | null
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
      user_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          owner_id: string
          owner_type: string
          pinned: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          owner_id: string
          owner_type: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          owner_id?: string
          owner_type?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_onu_mapping: {
        Row: {
          caller_id_mac: string
          created_at: string
          id: string
          mapped_at: string | null
          match_method: string | null
          onu_id: string | null
          pon_port: string | null
          ppp_username: string
          status: Database["public"]["Enums"]["mapping_status"]
        }
        Insert: {
          caller_id_mac: string
          created_at?: string
          id?: string
          mapped_at?: string | null
          match_method?: string | null
          onu_id?: string | null
          pon_port?: string | null
          ppp_username: string
          status?: Database["public"]["Enums"]["mapping_status"]
        }
        Update: {
          caller_id_mac?: string
          created_at?: string
          id?: string
          mapped_at?: string | null
          match_method?: string | null
          onu_id?: string | null
          pon_port?: string | null
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
          location: string
          parent_id: string | null
          sort_order: number | null
          status: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          parent_id?: string | null
          sort_order?: number | null
          status?: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
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
      sms_templates_effective: {
        Row: {
          branch_id: string | null
          category: string | null
          content: string | null
          created_by_branch: string | null
          is_active: boolean | null
          is_overridden: boolean | null
          is_protected: boolean | null
          master_id: string | null
          name: string | null
          template_key: string | null
          template_type: string | null
          variables: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_template_master_created_by_branch_fkey"
            columns: ["created_by_branch"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_template_overrides_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_branch: { Args: { _user_id: string }; Returns: string }
      has_device_permission: {
        Args: {
          _branch_id?: string
          _device_id?: string
          _key: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
      revert_mikrotik_client: { Args: { _mt_id: string }; Returns: Json }
      seed_default_pop_hierarchy_for_branch: {
        Args: { _branch_id: string }
        Returns: undefined
      }
      seed_pop_defaults: { Args: { _branch_id: string }; Returns: undefined }
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
