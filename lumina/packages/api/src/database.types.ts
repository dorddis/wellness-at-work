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
          id: string
          user_id: string
          org_id: string
          scheduled_at: string
          started_at: string | null
          completed_at: string | null
          postponed_count: number
          status: string
          break_type: string
          duration_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          scheduled_at: string
          started_at?: string | null
          completed_at?: string | null
          postponed_count?: number
          status: string
          break_type?: string
          duration_seconds?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
          scheduled_at?: string
          started_at?: string | null
          completed_at?: string | null
          postponed_count?: number
          status?: string
          break_type?: string
          duration_seconds?: number
          created_at?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          id: string
          challenge_id: string
          user_id: string
          department: string | null
          joined_at: string
          current_progress: number
          last_updated_at: string | null
        }
        Insert: {
          id?: string
          challenge_id: string
          user_id: string
          department?: string | null
          joined_at?: string
          current_progress?: number
          last_updated_at?: string | null
        }
        Update: {
          id?: string
          challenge_id?: string
          user_id?: string
          department?: string | null
          joined_at?: string
          current_progress?: number
          last_updated_at?: string | null
        }
        Relationships: []
      }
      exercise_sessions: {
        Row: {
          id: string
          user_id: string
          org_id: string
          exercise_id: string
          started_at: string
          completed_at: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          exercise_id: string
          started_at: string
          completed_at?: string | null
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string
          exercise_id?: string
          started_at?: string
          completed_at?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      eye_exercises: {
        Row: {
          id: string
          name: string
          description: string
          duration_seconds: number
          instructions: Json
          category: string
          difficulty: string
          icon_name: string | null
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          duration_seconds: number
          instructions: Json
          category: string
          difficulty?: string
          icon_name?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          duration_seconds?: number
          instructions?: Json
          category?: string
          difficulty?: string
          icon_name?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          id: string
          org_id: string
          integration_type: string
          status: string
          credentials: Json | null
          config: Json
          last_synced_at: string | null
          error_message: string | null
          connected_by: string | null
          connected_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          integration_type: string
          status?: string
          credentials?: Json | null
          config?: Json
          last_synced_at?: string | null
          error_message?: string | null
          connected_by?: string | null
          connected_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          integration_type?: string
          status?: string
          credentials?: Json | null
          config?: Json
          last_synced_at?: string | null
          error_message?: string | null
          connected_by?: string | null
          connected_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      member_details: {
        Row: {
          user_id: string
          email: string | null
          full_name: string | null
          department: string | null
          role: string
          joined_at: string
          org_id: string
        }
        Insert: {
          user_id: string
          email?: string | null
          full_name?: string | null
          department?: string | null
          role?: string
          joined_at?: string
          org_id: string
        }
        Update: {
          user_id?: string
          email?: string | null
          full_name?: string | null
          department?: string | null
          role?: string
          joined_at?: string
          org_id?: string
        }
        Relationships: []
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
      team_challenges: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          challenge_type: string
          start_date: string
          end_date: string
          target_metric: Json
          status: string
          prize_description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          challenge_type: string
          start_date: string
          end_date: string
          target_metric: Json
          status?: string
          prize_description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          challenge_type?: string
          start_date?: string
          end_date?: string
          target_metric?: Json
          status?: string
          prize_description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      get_my_org_ids: { Args: Record<string, never>; Returns: string[] }
      get_user_org: { Args: Record<string, never>; Returns: string }
      is_admin_of: { Args: { p_org_id: string }; Returns: boolean }
      is_org_admin: { Args: { check_org_id: string }; Returns: boolean }
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
