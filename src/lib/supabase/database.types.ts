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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      beleg: {
        Row: {
          art: Database["public"]["Enums"]["beleg_art"]
          beschreibung: string | null
          betrag_cent: number
          created_at: string
          datei_pfad: string | null
          datum: string
          id: string
          km: number | null
          mwst_cent: number | null
          reise_id: string
          waehrung: string
        }
        Insert: {
          art: Database["public"]["Enums"]["beleg_art"]
          beschreibung?: string | null
          betrag_cent: number
          created_at?: string
          datei_pfad?: string | null
          datum: string
          id?: string
          km?: number | null
          mwst_cent?: number | null
          reise_id: string
          waehrung?: string
        }
        Update: {
          art?: Database["public"]["Enums"]["beleg_art"]
          beschreibung?: string | null
          betrag_cent?: number
          created_at?: string
          datei_pfad?: string | null
          datum?: string
          id?: string
          km?: number | null
          mwst_cent?: number | null
          reise_id?: string
          waehrung?: string
        }
        Relationships: [
          {
            foreignKeyName: "beleg_reise_id_fkey"
            columns: ["reise_id"]
            isOneToOne: false
            referencedRelation: "reise"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          created_at: string
          email: string
          id: string
          kostenstelle: string | null
          name: string
          personalnummer: string | null
          rolle: Database["public"]["Enums"]["rolle"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          kostenstelle?: string | null
          name: string
          personalnummer?: string | null
          rolle?: Database["public"]["Enums"]["rolle"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kostenstelle?: string | null
          name?: string
          personalnummer?: string | null
          rolle?: Database["public"]["Enums"]["rolle"]
        }
        Relationships: []
      }
      reise: {
        Row: {
          ablehnungsgrund: string | null
          anlass: string
          beginn: string
          created_at: string
          ende: string
          freigeber_id: string | null
          freigegeben_am: string | null
          id: string
          land: string
          mahlzeiten: Json
          mit_uebernachtung: boolean
          mitarbeiter_id: string
          status: Database["public"]["Enums"]["reise_status"]
          ziel: string
        }
        Insert: {
          ablehnungsgrund?: string | null
          anlass: string
          beginn: string
          created_at?: string
          ende: string
          freigeber_id?: string | null
          freigegeben_am?: string | null
          id?: string
          land?: string
          mahlzeiten?: Json
          mit_uebernachtung?: boolean
          mitarbeiter_id: string
          status?: Database["public"]["Enums"]["reise_status"]
          ziel: string
        }
        Update: {
          ablehnungsgrund?: string | null
          anlass?: string
          beginn?: string
          created_at?: string
          ende?: string
          freigeber_id?: string | null
          freigegeben_am?: string | null
          id?: string
          land?: string
          mahlzeiten?: Json
          mit_uebernachtung?: boolean
          mitarbeiter_id?: string
          status?: Database["public"]["Enums"]["reise_status"]
          ziel?: string
        }
        Relationships: [
          {
            foreignKeyName: "reise_freigeber_id_fkey"
            columns: ["freigeber_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reise_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ist_freigeber: { Args: never; Returns: boolean }
      name_aus_metadaten: {
        Args: { email: string; meta: Json }
        Returns: string
      }
    }
    Enums: {
      beleg_art:
        | "fahrt"
        | "uebernachtung"
        | "bewirtung"
        | "oepnv"
        | "flug"
        | "bahn"
        | "sonstiges"
      reise_status:
        | "entwurf"
        | "eingereicht"
        | "freigegeben"
        | "abgelehnt"
        | "ausgezahlt"
      rolle: "mitarbeiter" | "freigeber" | "admin"
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
      beleg_art: [
        "fahrt",
        "uebernachtung",
        "bewirtung",
        "oepnv",
        "flug",
        "bahn",
        "sonstiges",
      ],
      reise_status: [
        "entwurf",
        "eingereicht",
        "freigegeben",
        "abgelehnt",
        "ausgezahlt",
      ],
      rolle: ["mitarbeiter", "freigeber", "admin"],
    },
  },
} as const
