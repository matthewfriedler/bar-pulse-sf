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
      bar_baselines: {
        Row: {
          avg_capacity: number
          avg_wait: number
          bar_id: string
          dow: number
          hour: number
          samples: number
          updated_at: string
        }
        Insert: {
          avg_capacity: number
          avg_wait?: number
          bar_id: string
          dow: number
          hour: number
          samples?: number
          updated_at?: string
        }
        Update: {
          avg_capacity?: number
          avg_wait?: number
          bar_id?: string
          dow?: number
          hour?: number
          samples?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_baselines_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_checkins: {
        Row: {
          accuracy_meters: number | null
          bar_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          bar_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          accuracy_meters?: number | null
          bar_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_checkins_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_place_cache: {
        Row: {
          bar_id: string
          fetched_at: string
          hours: Json | null
          open_now: boolean | null
          phone: string | null
          photo_url: string | null
          place_id: string | null
          rating: number | null
          user_rating_count: number | null
          website: string | null
        }
        Insert: {
          bar_id: string
          fetched_at?: string
          hours?: Json | null
          open_now?: boolean | null
          phone?: string | null
          photo_url?: string | null
          place_id?: string | null
          rating?: number | null
          user_rating_count?: number | null
          website?: string | null
        }
        Update: {
          bar_id?: string
          fetched_at?: string
          hours?: Json | null
          open_now?: boolean | null
          phone?: string | null
          photo_url?: string | null
          place_id?: string | null
          rating?: number | null
          user_rating_count?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_place_cache_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: true
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_reading_confirmations: {
        Row: {
          agrees: boolean
          bar_id: string
          created_at: string
          direction: string | null
          id: string
          update_id: string | null
          user_id: string
        }
        Insert: {
          agrees: boolean
          bar_id: string
          created_at?: string
          direction?: string | null
          id?: string
          update_id?: string | null
          user_id: string
        }
        Update: {
          agrees?: boolean
          bar_id?: string
          created_at?: string
          direction?: string | null
          id?: string
          update_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_reading_confirmations_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_reading_confirmations_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "bar_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_staff: {
        Row: {
          bar_id: string
          created_at: string
          id: string
          note: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bar_id: string
          created_at?: string
          id?: string
          note?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bar_id?: string
          created_at?: string
          id?: string
          note?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_staff_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_updates: {
        Row: {
          bar_id: string
          capacity: number
          created_at: string
          door_count: number | null
          id: string
          is_owner: boolean
          source: string
          user_id: string
          vibe_note: string | null
          wait_minutes: number
        }
        Insert: {
          bar_id: string
          capacity: number
          created_at?: string
          door_count?: number | null
          id?: string
          is_owner?: boolean
          source?: string
          user_id: string
          vibe_note?: string | null
          wait_minutes: number
        }
        Update: {
          bar_id?: string
          capacity?: number
          created_at?: string
          door_count?: number | null
          id?: string
          is_owner?: boolean
          source?: string
          user_id?: string
          vibe_note?: string | null
          wait_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "bar_updates_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "bars"
            referencedColumns: ["id"]
          },
        ]
      }
      bars: {
        Row: {
          address: string
          google_place_id: string | null
          id: string
          lat: number
          lng: number
          name: string
          neighborhood: string
          vibe: string
        }
        Insert: {
          address: string
          google_place_id?: string | null
          id: string
          lat: number
          lng: number
          name: string
          neighborhood: string
          vibe: string
        }
        Update: {
          address?: string
          google_place_id?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          neighborhood?: string
          vibe?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          settings: Json
          username: string
          username_confirmed: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          settings?: Json
          username: string
          username_confirmed?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          settings?: Json
          username?: string
          username_confirmed?: boolean
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
          role: Database["public"]["Enums"]["app_role"]
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
      is_approved_staff: {
        Args: { _bar_id: string; _user_id: string }
        Returns: boolean
      }
      refresh_bar_baselines: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
