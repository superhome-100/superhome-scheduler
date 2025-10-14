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
      res_classroom: {
        Row: {
          end_time: string | null
          note: string | null
          res_date: string
          res_status: Database["public"]["Enums"]["reservation_status"]
          room: string | null
          start_time: string | null
          uid: string
        }
        Insert: {
          end_time?: string | null
          note?: string | null
          res_date: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          room?: string | null
          start_time?: string | null
          uid: string
        }
        Update: {
          end_time?: string | null
          note?: string | null
          res_date?: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          room?: string | null
          start_time?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_classroom_uid_res_date_fkey"
            columns: ["uid", "res_date"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["uid", "res_date"]
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
          student_count?: number | null
          time_period?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_openwater_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "buoy_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_openwater_uid_res_date_fkey"
            columns: ["uid", "res_date"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["uid", "res_date"]
          },
        ]
      }
      res_pool: {
        Row: {
          end_time: string | null
          lane: string | null
          note: string | null
          res_date: string
          res_status: Database["public"]["Enums"]["reservation_status"]
          start_time: string | null
          uid: string
        }
        Insert: {
          end_time?: string | null
          lane?: string | null
          note?: string | null
          res_date: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          start_time?: string | null
          uid: string
        }
        Update: {
          end_time?: string | null
          lane?: string | null
          note?: string | null
          res_date?: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          start_time?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_pool_uid_res_date_fkey"
            columns: ["uid", "res_date"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["uid", "res_date"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          res_date: string
          res_status: Database["public"]["Enums"]["reservation_status"]
          res_type: Database["public"]["Enums"]["reservation_type"]
          uid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          res_date: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          res_type: Database["public"]["Enums"]["reservation_type"]
          uid: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          res_date?: string
          res_status?: Database["public"]["Enums"]["reservation_status"]
          res_type?: Database["public"]["Enums"]["reservation_type"]
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
      user_profiles: {
        Row: {
          created_at: string
          name: string | null
          privileges: string[]
          status: Database["public"]["Enums"]["user_status"]
          uid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          name?: string | null
          privileges?: string[]
          status?: Database["public"]["Enums"]["user_status"]
          uid: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          name?: string | null
          privileges?: string[]
          status?: Database["public"]["Enums"]["user_status"]
          uid?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _compute_openwater_activity_type: {
        Args: {
          p_activity: Database["public"]["Enums"]["openwater_activity_type"]
          p_depth: number
        }
        Returns: Database["public"]["Enums"]["openwater_activity_type"]
      }
      _owns_reservation: {
        Args: { _res_date: string; _uid: string }
        Returns: boolean
      }
      _process_buoy_group: {
        Args:
          | {
              p_group_depths: number[]
              p_group_uids: string[]
              p_open_water_type: string
              p_res_date: string
              p_time_period: string
            }
          | {
              p_group_depths: number[]
              p_group_uids: string[]
              p_res_date: string
              p_time_period: string
            }
        Returns: Record<string, unknown>
      }
      _validate_openwater_depth: {
        Args: {
          p_activity: Database["public"]["Enums"]["openwater_activity_type"]
          p_depth: number
        }
        Returns: boolean
      }
      auto_assign_buoy: {
        Args:
          | { p_res_date: string; p_time_period: string }
          | { p_res_date: string; p_time_period: string }
        Returns: Json
      }
      auto_assign_buoy_edge_function: {
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
      compute_boat_count: {
        Args: { p_group_id: number }
        Returns: number
      }
      find_best_buoy_for_depth: {
        Args: { target_depth: number }
        Returns: string
      }
      get_buoy_groups_with_names: {
        Args: { p_res_date: string; p_time_period: string }
        Returns: {
          boat: string
          boat_count: number
          buoy_name: string
          id: number
          member_names: string[]
          member_uids: string[]
          open_water_type: string
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
      get_my_buoy_assignment: {
        Args: { p_res_date: string; p_time_period: string }
        Returns: {
          boat: string
          buoy_name: string
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
      openwater_activity_type:
        | "course_coaching"
        | "autonomous_buoy_0_89"
        | "autonomous_platform_0_99"
        | "autonomous_platform_cbs_90_130"
      reservation_status: "pending" | "confirmed" | "rejected"
      reservation_type: "pool" | "open_water" | "classroom"
      user_status: "active" | "disabled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      openwater_activity_type: [
        "course_coaching",
        "autonomous_buoy_0_89",
        "autonomous_platform_0_99",
        "autonomous_platform_cbs_90_130",
      ],
      reservation_status: ["pending", "confirmed", "rejected"],
      reservation_type: ["pool", "open_water", "classroom"],
      user_status: ["active", "disabled"],
    },
  },
} as const

