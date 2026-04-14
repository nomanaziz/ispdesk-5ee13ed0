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
      billing: {
        Row: {
          advance: number | null
          amount: number
          bill_id: string
          client_id: string
          collected_by: string | null
          created_at: string
          discount: number | null
          due: number | null
          due_date: string | null
          extend_date: string | null
          id: string
          month: string
          paid: number | null
          pay_date: string | null
          payment_method: string | null
          status: string
        }
        Insert: {
          advance?: number | null
          amount?: number
          bill_id: string
          client_id: string
          collected_by?: string | null
          created_at?: string
          discount?: number | null
          due?: number | null
          due_date?: string | null
          extend_date?: string | null
          id?: string
          month: string
          paid?: number | null
          pay_date?: string | null
          payment_method?: string | null
          status?: string
        }
        Update: {
          advance?: number | null
          amount?: number
          bill_id?: string
          client_id?: string
          collected_by?: string | null
          created_at?: string
          discount?: number | null
          due?: number | null
          due_date?: string | null
          extend_date?: string | null
          id?: string
          month?: string
          paid?: number | null
          pay_date?: string | null
          payment_method?: string | null
          status?: string
        }
        Relationships: [
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
          branch_id: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          status: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          status?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_managers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      bw_categories: {
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
      bw_items: {
        Row: {
          bandwidth: string | null
          category_id: string | null
          created_at: string
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
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      bw_purchase_bills: {
        Row: {
          amount: number | null
          bill_no: string
          created_at: string
          id: string
          month: string | null
          paid: number | null
          provider_id: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          bill_no: string
          created_at?: string
          id?: string
          month?: string | null
          paid?: number | null
          provider_id?: string | null
          status?: string
        }
        Update: {
          amount?: number | null
          bill_no?: string
          created_at?: string
          id?: string
          month?: string | null
          paid?: number | null
          provider_id?: string | null
          status?: string
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
      bw_sales_invoices: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          invoice_no: string
          month: string | null
          pop_id: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          invoice_no: string
          month?: string | null
          pop_id?: string | null
          status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          invoice_no?: string
          month?: string | null
          pop_id?: string | null
          status?: string
        }
        Relationships: [
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
          id: string
          previous_info: string | null
          remarks: string | null
          schedule_date: string | null
          schedule_info: string | null
          scheduler_type: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          previous_info?: string | null
          remarks?: string | null
          schedule_date?: string | null
          schedule_info?: string | null
          scheduler_type?: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          previous_info?: string | null
          remarks?: string | null
          schedule_date?: string | null
          schedule_info?: string | null
          scheduler_type?: string
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
          status: string
          sub_zone_id: string | null
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
          status?: string
          sub_zone_id?: string | null
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
          status?: string
          sub_zone_id?: string | null
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
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          isp_name: string
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
          created_at?: string
          email?: string | null
          id?: string
          isp_name: string
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
          created_at?: string
          email?: string | null
          id?: string
          isp_name?: string
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
          department_id: string | null
          device_user_id: string | null
          email: string | null
          employee_id: string
          id: string
          joining_date: string | null
          name: string
          phone: string | null
          position_id: string | null
          salary: number | null
          show_on_website: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          device_user_id?: string | null
          email?: string | null
          employee_id: string
          id?: string
          joining_date?: string | null
          name: string
          phone?: string | null
          position_id?: string | null
          salary?: number | null
          show_on_website?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          device_user_id?: string | null
          email?: string | null
          employee_id?: string
          id?: string
          joining_date?: string | null
          name?: string
          phone?: string | null
          position_id?: string | null
          salary?: number | null
          show_on_website?: boolean | null
          status?: string
          updated_at?: string
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
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
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
          created_at: string
          description: string | null
          expense_date: string | null
          id: string
          reference: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          reference?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      income_entries: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          income_date: string | null
          reference: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string | null
          reference?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
          approved_by: string | null
          category_id: string
          created_at: string
          days: number | null
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          category_id: string
          created_at?: string
          days?: number | null
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          category_id?: string
          created_at?: string
          days?: number | null
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
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
      leave_categories: {
        Row: {
          created_at: string
          days_allowed: number | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          days_allowed?: number | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          days_allowed?: number | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      mikrotik_devices: {
        Row: {
          api_port: number
          branch_id: string | null
          created_at: string
          credentials_encrypted: string | null
          id: string
          ip_address: string
          name: string
          password_encrypted: string | null
          status: Database["public"]["Enums"]["device_status"]
          updated_at: string
          username: string | null
        }
        Insert: {
          api_port?: number
          branch_id?: string | null
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          ip_address: string
          name: string
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_port?: number
          branch_id?: string | null
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          ip_address?: string
          name?: string
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
          username?: string | null
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
          online_onus: number | null
          password_encrypted: string | null
          port: number
          serial_number: string | null
          status: Database["public"]["Enums"]["device_status"]
          total_onus: number | null
          updated_at: string
          uptime: string | null
          username: string | null
          vendor: Database["public"]["Enums"]["olt_vendor"]
        }
        Insert: {
          branch_id?: string | null
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
          online_onus?: number | null
          password_encrypted?: string | null
          port?: number
          serial_number?: string | null
          status?: Database["public"]["Enums"]["device_status"]
          total_onus?: number | null
          updated_at?: string
          uptime?: string | null
          username?: string | null
          vendor?: Database["public"]["Enums"]["olt_vendor"]
        }
        Update: {
          branch_id?: string | null
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
          online_onus?: number | null
          password_encrypted?: string | null
          port?: number
          serial_number?: string | null
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
          created_at: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          olt_range: string | null
          price: number
          price_label: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          olt_range?: string | null
          price?: number
          price_label?: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          olt_range?: string | null
          price?: number
          price_label?: string
          sort_order?: number | null
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
          created_at: string | null
          id: string
          package_id: string | null
          payment_method: string | null
          service_request_id: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          service_request_id?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          service_request_id?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
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
      sms_gateways: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string
          id: string
          name: string
          sender_id: string | null
          status: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          name: string
          sender_id?: string | null
          status?: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          name?: string
          sender_id?: string | null
          status?: string
        }
        Relationships: []
      }
      sms_groups: {
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
      sms_log: {
        Row: {
          created_at: string
          gateway_id: string | null
          id: string
          message: string
          recipient: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          gateway_id?: string | null
          id?: string
          message: string
          recipient: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          gateway_id?: string | null
          id?: string
          message?: string
          recipient?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_log_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "sms_gateways"
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
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          status?: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          type?: string | null
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
      support_tickets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          priority: string | null
          resolved_at: string | null
          status: string
          subject: string
          ticket_no: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_no: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_no?: string
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
      tasks: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
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
          description: string | null
          id: string
          name: string
          price: number | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          status?: string
        }
        Relationships: []
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
