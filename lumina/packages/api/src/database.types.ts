export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      break_events: {
        Row: {
          break_type: string | null
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          org_id: string
          postponed_count: number | null
          scheduled_at: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          break_type?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          org_id: string
          postponed_count?: number | null
          scheduled_at: string
          started_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          break_type?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          org_id?: string
          postponed_count?: number | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "break_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          current_progress: number | null
          department: string | null
          id: string
          joined_at: string
          last_updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          current_progress?: number | null
          department?: string | null
          id?: string
          joined_at?: string
          last_updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          current_progress?: number | null
          department?: string | null
          id?: string
          joined_at?: string
          last_updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "team_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_requests: {
        Row: {
          admin_notes: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          request_details: string | null
          request_type: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_details?: string | null
          request_type: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_details?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          exercise_id: string
          id: string
          org_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          org_id: string
          started_at: string
          status: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          org_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sessions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "eye_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      eye_exercises: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: string
          duration_seconds: number
          icon_name: string | null
          id: string
          instructions: Json
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          difficulty?: string
          duration_seconds: number
          icon_name?: string | null
          id?: string
          instructions: Json
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          duration_seconds?: number
          icon_name?: string | null
          id?: string
          instructions?: Json
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json | null
          connected_at: string | null
          connected_by: string | null
          created_at: string
          credentials: Json | null
          error_message: string | null
          id: string
          integration_type: string
          last_synced_at: string | null
          org_id: string
          status: string
        }
        Insert: {
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          credentials?: Json | null
          error_message?: string | null
          id?: string
          integration_type: string
          last_synced_at?: string | null
          org_id: string
          status?: string
        }
        Update: {
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          credentials?: Json | null
          error_message?: string | null
          id?: string
          integration_type?: string
          last_synced_at?: string | null
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_alerts: {
        Row: {
          acknowledged: boolean
          alert_type: string
          created_at: string
          id: string
          message: string | null
          org_id: string
          severity: string
          user_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          alert_type: string
          created_at?: string
          id?: string
          message?: string | null
          org_id: string
          severity: string
          user_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          alert_type?: string
          created_at?: string
          id?: string
          message?: string | null
          org_id?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          deletion_requested_at: string | null
          department: string | null
          id: string
          joined_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          deletion_requested_at?: string | null
          department?: string | null
          id?: string
          joined_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          deletion_requested_at?: string | null
          department?: string | null
          id?: string
          joined_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          alert_settings: Json | null
          created_at: string
          id: string
          name: string
          privacy_mode: string
          slug: string
          subscription_tier: string
        }
        Insert: {
          alert_settings?: Json | null
          created_at?: string
          id?: string
          name: string
          privacy_mode?: string
          slug: string
          subscription_tier?: string
        }
        Update: {
          alert_settings?: Json | null
          created_at?: string
          id?: string
          name?: string
          privacy_mode?: string
          slug?: string
          subscription_tier?: string
        }
        Relationships: []
      }
      privacy_consents: {
        Row: {
          consented_at: string
          id: string
          ip_address: unknown
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consented_at?: string
          id?: string
          ip_address?: unknown
          policy_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consented_at?: string
          id?: string
          ip_address?: unknown
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      releases: {
        Row: {
          created_at: string | null
          id: string
          macos_size: number | null
          macos_url: string | null
          release_notes: string | null
          version: string
          windows_size: number | null
          windows_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          macos_size?: number | null
          macos_url?: string | null
          release_notes?: string | null
          version: string
          windows_size?: number | null
          windows_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          macos_size?: number | null
          macos_url?: string | null
          release_notes?: string | null
          version?: string
          windows_size?: number | null
          windows_url?: string | null
        }
        Relationships: []
      }
      team_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          org_id: string
          prize_description: string | null
          start_date: string
          status: string
          target_metric: Json
        }
        Insert: {
          challenge_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          org_id: string
          prize_description?: string | null
          start_date: string
          status?: string
          target_metric: Json
        }
        Update: {
          challenge_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          org_id?: string
          prize_description?: string | null
          start_date?: string
          status?: string
          target_metric?: Json
        }
        Relationships: [
          {
            foreignKeyName: "team_challenges_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_data: {
        Row: {
          avg_ear: number | null
          blink_count: number
          id: string
          org_id: string
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          avg_ear?: number | null
          blink_count: number
          id?: string
          org_id: string
          session_id?: string | null
          timestamp: string
          user_id: string
        }
        Update: {
          avg_ear?: number | null
          blink_count?: number
          id?: string
          org_id?: string
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_data_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_details: {
        Row: {
          department: string | null
          email: string | null
          full_name: string | null
          joined_at: string | null
          org_id: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_my_org_ids: { Args: never; Returns: string[] }
      get_user_admin_org_ids: { Args: never; Returns: string[] }
      get_user_org: { Args: never; Returns: string }
      get_user_org_ids: { Args: { check_user_id: string }; Returns: string[] }
      is_admin_of: { Args: { p_org_id: string }; Returns: boolean }
      is_org_admin: { Args: { check_org_id: string }; Returns: boolean }
      is_org_admin_or_manager: {
        Args: { check_org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
