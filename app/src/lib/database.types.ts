export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assignment_queue: {
        Row: {
          created_at: string | null
          res_date: string
          status: string
          time_period: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          res_date: string
          status?: string
          time_period: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          res_date?: string
          status?: string
          time_period?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      availabilities: {
        Row: {
          available: boolean
          category: Database["public"]["Enums"]["reservation_type"]
          created_at: string | null
          date: string
          id: number
          reason: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          available?: boolean
          category: Database["public"]["Enums"]["reservation_type"]
          created_at?: string | null
          date: string
          id?: number
          reason?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          available?: boolean
          category?: Database["public"]["Enums"]["reservation_type"]
          created_at?: string | null
          date?: string
          id?: number
          reason?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      buddy_group_members: {
        Row: {
          buddy_group_id: string
          invited_at: string | null
          responded_at: string | null
          status: string
          uid: string
        }
        Insert: {
          buddy_group_id: string
          invited_at?: string | null
          responded_at?: string | null
          status?: string
          uid: string
        }
        Update: {
          buddy_group_id?: string
          invited_at?: string | null
          responded_at?: string | null
          status?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_group_members_buddy_group_id_fkey"
            columns: ["buddy_group_id"]
            isOneToOne: false
            referencedRelation: "buddy_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_groups: {
        Row: {
          created_at: string | null
          id: string
          initiator_uid: string
          res_date: string
          res_type: string
          time_period: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          initiator_uid: string
          res_date: string
          res_type: string
          time_period: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          initiator_uid?: string
          res_date?: string
          res_type?: string
          time_period?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      buoy: {
        Row: {
          buoy_name: string
          max_depth: number
        }
        Insert: {
          buoy_name: string
          max_depth: number
        }
        Update: {
          buoy_name?: string
          max_depth?: number
        }
        Relationships: []
      }
      buoy_group: {
        Row: {
          boat: string | null
          boat_count: number | null
          buoy_name: string
          created_at: string
          id: number
          note: string | null
          open_water_type: string | null
          res_date: string
          time_period: string
          updated_at: string
        }
        Insert: {
          boat?: string | null
          boat_count?: number | null
          buoy_name: string
          created_at?: string
          id?: number
          note?: string | null
          open_water_type?: string | null
          res_date: string
          time_period: string
          updated_at?: string
        }
        Update: {
          boat?: string | null
          boat_count?: number | null
          buoy_name?: string
          created_at?: string
          id?: number
          note?: string | null
          open_water_type?: string | null
          res_date?: string
          time_period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buoy_group_buoy_name_fkey"
            columns: ["buoy_name"]
            isOneToOne: false
            referencedRelation: "buoy"
            referencedColumns: ["buoy_name"]
          },
        ]
      }
      price_template_updates: {
        Row: {
          auto_ow: number
          auto_pool: number
          coach_classroom: number
          coach_ow: number
          coach_pool: number
          created_at: string
          id: string
          platform_ow: number
          platformcbs_ow: number
          price_template_name: string
        }
        Insert: {
          auto_ow: number
          auto_pool: number
          coach_classroom: number
          coach_ow: number
          coach_pool: number
          created_at?: string
          id: string
          platform_ow: number
          platformcbs_ow: number
          price_template_name: string
        }
        Update: {
          auto_ow?: number
          auto_pool?: number
          coach_classroom?: number
          coach_ow?: number
          coach_pool?: number
          created_at?: string
          id?: string
          platform_ow?: number
          platformcbs_ow?: number
          price_template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_template_updates_price_template_name_fkey"
            columns: ["price_template_name"]
            isOneToOne: false
            referencedRelation: "price_templates"
            referencedColumns: ["name"]
          },
        ]
      }
      price_templates: {
        Row: {
          created_at: string
          description: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      res_classroom: {
        Row: {
          classroom_type:
            | Database["public"]["Enums"]["classroom_activity_type"]
            | null
          end_time: string | null
          note: string | null
          res_date: string
          res_status: Database["public"]["Enums"]["reservation_status"]
          reservation_id: number
          room: string | null
          start_time: string | null
          student_count: number | null
          uid: string
        }
        Insert: {
          classroom_type?:
            | Database["public"]["Enums"]["classroom_activity_type"]
            | null
          end_time?: string | null
          note?: string | null
          res_date: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          reservation_id: number
          room?: string | null
          start_time?: string | null
          student_count?: number | null
          uid: string
        }
        Update: {
          classroom_type?:
            | Database["public"]["Enums"]["classroom_activity_type"]
            | null
          end_time?: string | null
          note?: string | null
          res_date?: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          reservation_id?: number
          room?: string | null
          start_time?: string | null
          student_count?: number | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_classroom_reservation_fk"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["reservation_id"]
          },
        ]
      }
      res_openwater: {
        Row: {
          activity_type:
            | Database["public"]["Enums"]["openwater_activity_type"]
            | null
          auto_adjust_closest: boolean
          bottom_plate: boolean
          buddy_group_id: string | null
          buoy: string | null
          deep_fim_training: boolean
          depth_m: number | null
          group_id: number | null
          large_buoy: boolean
          note: string | null
          open_water_type: string | null
          pulley: boolean
          res_date: string
          res_status: Database["public"]["Enums"]["reservation_status"]
          reservation_id: number
          student_count: number | null
          time_period: string | null
          uid: string
        }
        Insert: {
          activity_type?:
            | Database["public"]["Enums"]["openwater_activity_type"]
            | null
          auto_adjust_closest?: boolean
          bottom_plate?: boolean
          buddy_group_id?: string | null
          buoy?: string | null
          deep_fim_training?: boolean
          depth_m?: number | null
          group_id?: number | null
          large_buoy?: boolean
          note?: string | null
          open_water_type?: string | null
          pulley?: boolean
          res_date: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          reservation_id: number
          student_count?: number | null
          time_period?: string | null
          uid: string
        }
        Update: {
          activity_type?:
            | Database["public"]["Enums"]["openwater_activity_type"]
            | null
          auto_adjust_closest?: boolean
          bottom_plate?: boolean
          buddy_group_id?: string | null
          buoy?: string | null
          deep_fim_training?: boolean
          depth_m?: number | null
          group_id?: number | null
          large_buoy?: boolean
          note?: string | null
          open_water_type?: string | null
          pulley?: boolean
          res_date?: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          reservation_id?: number
          student_count?: number | null
          time_period?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_openwater_buddy_group_id_fkey"
            columns: ["buddy_group_id"]
            isOneToOne: false
            referencedRelation: "buddy_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_openwater_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "buoy_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_openwater_reservation_fk"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["reservation_id"]
          },
        ]
      }
      res_pool: {
        Row: {
          buddy_group_id: string | null
          end_time: string | null
          lane: string | null
          note: string | null
          pool_type: Database["public"]["Enums"]["pool_activity_type"] | null
          res_date: string
          res_status: Database["public"]["Enums"]["reservation_status"]
          reservation_id: number
          start_time: string | null
          student_count: number | null
          uid: string
        }
        Insert: {
          buddy_group_id?: string | null
          end_time?: string | null
          lane?: string | null
          note?: string | null
          pool_type?: Database["public"]["Enums"]["pool_activity_type"] | null
          res_date: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          reservation_id: number
          start_time?: string | null
          student_count?: number | null
          uid: string
        }
        Update: {
          buddy_group_id?: string | null
          end_time?: string | null
          lane?: string | null
          note?: string | null
          pool_type?: Database["public"]["Enums"]["pool_activity_type"] | null
          res_date?: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          reservation_id?: number
          start_time?: string | null
          student_count?: number | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_pool_buddy_group_id_fkey"
            columns: ["buddy_group_id"]
            isOneToOne: false
            referencedRelation: "buddy_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_pool_reservation_fk"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["reservation_id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          price: number | null
          res_date: string
          res_status: Database["public"]["Enums"]["reservation_status"]
          res_type: Database["public"]["Enums"]["reservation_type"]
          reservation_id: number
          uid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          price?: number | null
          res_date: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          res_type: Database["public"]["Enums"]["reservation_type"]
          reservation_id?: number
          uid: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          price?: number | null
          res_date?: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          res_type?: Database["public"]["Enums"]["reservation_type"]
          reservation_id?: number
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auth_provider: string | null
          created_at: string
          name: string | null
          nickname: string | null
          price_template_name: string | null
          privileges: string[]
          status: Database["public"]["Enums"]["user_status"]
          uid: string
          updated_at: string
        }
        Insert: {
          auth_provider?: string | null
          created_at?: string
          name?: string | null
          nickname?: string | null
          price_template_name?: string | null
          privileges?: string[]
          status?: Database["public"]["Enums"]["user_status"]
          uid: string
          updated_at?: string
        }
        Update: {
          auth_provider?: string | null
          created_at?: string
          name?: string | null
          nickname?: string | null
          price_template_name?: string | null
          privileges?: string[]
          status?: Database["public"]["Enums"]["user_status"]
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_price_template_name_fkey"
            columns: ["price_template_name"]
            isOneToOne: false
            referencedRelation: "price_templates"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _apply_reservation_price: {
        Args: { p_res_ts: string; p_uid: string }
        Returns: undefined
      }
      _compute_openwater_activity_type: {
        Args: {
          p_activity: Database["public"]["Enums"]["openwater_activity_type"]
          p_depth: number
        }
        Returns: Database["public"]["Enums"]["openwater_activity_type"]
      }
      _current_user_is_active: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      _owns_reservation: {
        Args: { _res_date: string; _uid: string }
        Returns: boolean
      }
      _process_buoy_group: {
        Args: {
          p_group_depths: number[]
          p_group_uids: string[]
          p_open_water_type: string
          p_res_date: string
          p_time_period: string
        }
        Returns: Record<string, unknown>
      }
      _save_buoy_groups: {
        Args: {
          p_groups: Database["public"]["CompositeTypes"]["buoy_group_input"][]
          p_res_date: string
          p_time_period: string
        }
        Returns: undefined
      }
      _validate_openwater_depth: {
        Args: {
          p_activity: Database["public"]["Enums"]["openwater_activity_type"]
          p_depth: number
        }
        Returns: boolean
      }
      auto_assign_buoy: {
        Args: { p_res_date: string; p_time_period: string }
        Returns: Json
      }
      check_buoy_capacity: {
        Args: { p_buoy_name: string; p_res_date: string; p_time_period: string }
        Returns: number
      }
      check_group_capacity: {
        Args: { p_group_id: number }
        Returns: number
      }
      claim_assignment_job: {
        Args: Record<PropertyKey, never>
        Returns: {
          res_date: string
          time_period: string
        }[]
      }
      complete_assignment_job: {
        Args: { p_res_date: string; p_status?: string; p_time_period: string }
        Returns: undefined
      }
      compute_boat_count: {
        Args: { p_group_id: number }
        Returns: number
      }
      compute_monthly_completed_totals: {
        Args: { p_from: string; p_to: string }
        Returns: {
          month: string
          total: number
          ym: string
        }[]
      }
      compute_prices_for_reservation: {
        Args: { p_res_date: string; p_uid: string }
        Returns: {
          category: string
          price: number
          price_field: string
          type_key: string
        }[]
      }
      compute_prices_for_reservation_at: {
        Args: { p_res_ts: string; p_uid: string }
        Returns: {
          category: string
          price: number
          price_field: string
          type_key: string
        }[]
      }
      compute_reservation_total: {
        Args: { p_res_date: string }
        Returns: number
      }
      compute_reservation_total_for: {
        Args: { p_res_ts: string; p_uid: string }
        Returns: number
      }
      create_buddy_group_with_members: {
        Args: {
          p_buddy_uids: string[]
          p_initiator_uid: string
          p_res_date: string
          p_res_type: string
          p_time_period: string
        }
        Returns: string
      }
      cron_process_assignment_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_best_buoy_for_depth: {
        Args: { target_depth: number }
        Returns: string
      }
      gbt_bit_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bpchar_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bytea_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_inet_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_numeric_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_text_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_timetz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_tstz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      get_buddy_group_with_members: {
        Args: { p_res_date: string; p_res_type: string; p_time_period: string }
        Returns: {
          buddy_group_id: string
          buoy: string
          depth_m: number
          initiator_uid: string
          lane: string
          member_status: string
          member_uid: string
          open_water_type: string
          res_type: string
        }[]
      }
      get_buoy_groups_public: {
        Args: { p_res_date: string; p_time_period: string }
        Returns: {
          boat: string
          boat_count: number
          buoy_name: string
          id: number
          member_names: string[]
          member_statuses: string[]
          member_uids: string[]
          open_water_type: string
          res_date: string
          time_period: string
        }[]
      }
      get_buoy_groups_with_names: {
        Args: { p_res_date: string; p_time_period: string }
        Returns: {
          boat: string
          buoy_name: string
          id: number
          member_names: string[]
          member_uids: string[]
          res_date: string
          time_period: string
        }[]
      }
      get_group_members: {
        Args: { p_group_id: number }
        Returns: {
          depth_m: number
          uid: string
          user_name: string
        }[]
      }
      get_monthly_reservation_stats: {
        Args: { end_date: string; start_date: string }
        Returns: {
          participant_count: number
          res_date: string
          res_type: Database["public"]["Enums"]["reservation_type"]
          time_period: string
        }[]
      }
      get_my_buoy_assignment: {
        Args: { p_res_date: string; p_time_period: string }
        Returns: {
          boat: string
          buoy_name: string
        }[]
      }
      get_openwater_assignment_map: {
        Args: { p_res_date: string }
        Returns: {
          boat: string
          buoy_name: string
          res_date: string
          time_period: string
          uid: string
        }[]
      }
      get_openwater_pair_info: {
        Args: { p_res_date: string; p_uid: string }
        Returns: {
          auto_adjust_closest: boolean
          depth_m: number
          paired_name: string
          paired_uid: string
        }[]
      }
      handle_odd_divers: {
        Args: { diver_count: number; target_depth: number }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      refresh_boat_count: {
        Args: { p_group_id: number }
        Returns: undefined
      }
      validate_depth_assignment: {
        Args: { buoy_max_depth: number; diver_depth: number }
        Returns: boolean
      }
    }
    Enums: {
      classroom_activity_type: "course_coaching"
      openwater_activity_type:
        | "course_coaching"
        | "autonomous_buoy"
        | "autonomous_platform"
        | "autonomous_platform_cbs"
      pool_activity_type: "course_coaching" | "autonomous"
      reservation_status: "pending" | "confirmed" | "rejected" | "cancelled"
      reservation_type: "pool" | "open_water" | "classroom"
      user_status: "active" | "disabled"
    }
    CompositeTypes: {
      buoy_group_input: {
        buoy_name: string | null
        open_water_type: string | null
        uids: string[] | null
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      classroom_activity_type: ["course_coaching"],
      openwater_activity_type: [
        "course_coaching",
        "autonomous_buoy",
        "autonomous_platform",
        "autonomous_platform_cbs",
      ],
      pool_activity_type: ["course_coaching", "autonomous"],
      reservation_status: ["pending", "confirmed", "rejected", "cancelled"],
      reservation_type: ["pool", "open_water", "classroom"],
      user_status: ["active", "disabled"],
    },
  },
} as const

