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
      profil_privat: {
        Row: {
          iban: string | null
          id: string
          personalnummer: string | null
          updated_at: string
          wohnort: string | null
        }
        Insert: {
          iban?: string | null
          id: string
          personalnummer?: string | null
          updated_at?: string
          wohnort?: string | null
        }
        Update: {
          iban?: string | null
          id?: string
          personalnummer?: string | null
          updated_at?: string
          wohnort?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profil_privat_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          created_at: string
          email: string
          id: string
          kfz_kennzeichen: string | null
          kostenstelle: string | null
          name: string
          rolle: Database["public"]["Enums"]["rolle"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          kfz_kennzeichen?: string | null
          kostenstelle?: string | null
          name: string
          rolle?: Database["public"]["Enums"]["rolle"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kfz_kennzeichen?: string | null
          kostenstelle?: string | null
          name?: string
          rolle?: Database["public"]["Enums"]["rolle"]
        }
        Relationships: []
      }
      reise: {
        Row: {
          ablehnungsgrund: string | null
          beginn: string
          begruendung: string
          besuchte_stellen: string | null
          created_at: string
          ende: string
          freigeber_id: string | null
          freigegeben_am: string | null
          id: string
          kfz_kennzeichen: string | null
          kostenstelle: string | null
          land: string
          mahlzeiten: Json
          mit_uebernachtung: boolean
          mitarbeiter_id: string
          mitfahrt_bei: string | null
          reiseweg: string
          status: Database["public"]["Enums"]["reise_status"]
          verkehrsmittel: Database["public"]["Enums"]["verkehrsmittel"][]
          verpflegung_bemerkung: string | null
        }
        Insert: {
          ablehnungsgrund?: string | null
          beginn: string
          begruendung: string
          besuchte_stellen?: string | null
          created_at?: string
          ende: string
          freigeber_id?: string | null
          freigegeben_am?: string | null
          id?: string
          kfz_kennzeichen?: string | null
          kostenstelle?: string | null
          land?: string
          mahlzeiten?: Json
          mit_uebernachtung?: boolean
          mitarbeiter_id: string
          mitfahrt_bei?: string | null
          reiseweg: string
          status?: Database["public"]["Enums"]["reise_status"]
          verkehrsmittel?: Database["public"]["Enums"]["verkehrsmittel"][]
          verpflegung_bemerkung?: string | null
        }
        Update: {
          ablehnungsgrund?: string | null
          beginn?: string
          begruendung?: string
          besuchte_stellen?: string | null
          created_at?: string
          ende?: string
          freigeber_id?: string | null
          freigegeben_am?: string | null
          id?: string
          kfz_kennzeichen?: string | null
          kostenstelle?: string | null
          land?: string
          mahlzeiten?: Json
          mit_uebernachtung?: boolean
          mitarbeiter_id?: string
          mitfahrt_bei?: string | null
          reiseweg?: string
          status?: Database["public"]["Enums"]["reise_status"]
          verkehrsmittel?: Database["public"]["Enums"]["verkehrsmittel"][]
          verpflegung_bemerkung?: string | null
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
      ist_buchhaltung: { Args: never; Returns: boolean }
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
      rolle: "mitarbeiter" | "freigeber" | "buchhaltung" | "admin"
      verkehrsmittel:
        | "flugzeug"
        | "eisenbahn"
        | "firmenwagen"
        | "eigener_pkw"
        | "mitfahrt"
        | "mietwagen"
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
      rolle: ["mitarbeiter", "freigeber", "buchhaltung", "admin"],
      verkehrsmittel: [
        "flugzeug",
        "eisenbahn",
        "firmenwagen",
        "eigener_pkw",
        "mitfahrt",
        "mietwagen",
      ],
    },
  },
} as const
