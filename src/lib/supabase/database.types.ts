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
          beschreibung: string | null
          betrag_cent: number
          bewirtung_anlass: string | null
          bewirtung_teilnehmer: string | null
          created_at: string
          datei_pfad: string | null
          datum: string
          id: string
          kategorie_id: string
          kostenstelle: string | null
          lieferant: string | null
          mwst_prozent: number
          reise_id: string
          waehrung: string
          zahlungsart: string | null
        }
        Insert: {
          beschreibung?: string | null
          betrag_cent: number
          bewirtung_anlass?: string | null
          bewirtung_teilnehmer?: string | null
          created_at?: string
          datei_pfad?: string | null
          datum: string
          id?: string
          kategorie_id: string
          kostenstelle?: string | null
          lieferant?: string | null
          mwst_prozent: number
          reise_id: string
          waehrung?: string
          zahlungsart?: string | null
        }
        Update: {
          beschreibung?: string | null
          betrag_cent?: number
          bewirtung_anlass?: string | null
          bewirtung_teilnehmer?: string | null
          created_at?: string
          datei_pfad?: string | null
          datum?: string
          id?: string
          kategorie_id?: string
          kostenstelle?: string | null
          lieferant?: string | null
          mwst_prozent?: number
          reise_id?: string
          waehrung?: string
          zahlungsart?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beleg_kategorie_id_fkey"
            columns: ["kategorie_id"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beleg_reise_id_fkey"
            columns: ["reise_id"]
            isOneToOne: false
            referencedRelation: "reise"
            referencedColumns: ["id"]
          },
        ]
      }
      beleg_eingang: {
        Row: {
          created_at: string
          datei_pfad: string
          id: string
          ki_ergebnis: Json | null
          ki_fehler: string | null
          mitarbeiter_id: string
        }
        Insert: {
          created_at?: string
          datei_pfad: string
          id?: string
          ki_ergebnis?: Json | null
          ki_fehler?: string | null
          mitarbeiter_id?: string
        }
        Update: {
          created_at?: string
          datei_pfad?: string
          id?: string
          ki_ergebnis?: Json | null
          ki_fehler?: string | null
          mitarbeiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beleg_eingang_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      einstellungen: {
        Row: {
          id: boolean
          km_satz_cent: number
          km_steuerfrei_cent: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          km_satz_cent?: number
          km_steuerfrei_cent?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          km_satz_cent?: number
          km_steuerfrei_cent?: number
          updated_at?: string
        }
        Relationships: []
      }
      einstellungen_intern: {
        Row: {
          datev_upload_mail: string | null
          datev_upload_mail_auslagen: string | null
          id: boolean
          updated_at: string
        }
        Insert: {
          datev_upload_mail?: string | null
          datev_upload_mail_auslagen?: string | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          datev_upload_mail?: string | null
          datev_upload_mail_auslagen?: string | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      fahrt: {
        Row: {
          created_at: string
          datum: string
          id: string
          km: number
          km_route: number | null
          reise_id: string
          strecke: string
          zweck: string | null
        }
        Insert: {
          created_at?: string
          datum: string
          id?: string
          km: number
          km_route?: number | null
          reise_id: string
          strecke: string
          zweck?: string | null
        }
        Update: {
          created_at?: string
          datum?: string
          id?: string
          km?: number
          km_route?: number | null
          reise_id?: string
          strecke?: string
          zweck?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fahrt_reise_id_fkey"
            columns: ["reise_id"]
            isOneToOne: false
            referencedRelation: "reise"
            referencedColumns: ["id"]
          },
        ]
      }
      kalender_ausgeblendet: {
        Row: {
          erstellt_am: string
          person_id: string
          termin_id: string
        }
        Insert: {
          erstellt_am?: string
          person_id?: string
          termin_id: string
        }
        Update: {
          erstellt_am?: string
          person_id?: string
          termin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kalender_ausgeblendet_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      kategorie: {
        Row: {
          abschnitt: string
          aktiv: boolean
          beleg_erfassbar: boolean
          bezeichnung: string
          id: string
          konto: string | null
          mwst_prozent: number | null
          sortierung: number
        }
        Insert: {
          abschnitt: string
          aktiv?: boolean
          beleg_erfassbar?: boolean
          bezeichnung: string
          id: string
          konto?: string | null
          mwst_prozent?: number | null
          sortierung?: number
        }
        Update: {
          abschnitt?: string
          aktiv?: boolean
          beleg_erfassbar?: boolean
          bezeichnung?: string
          id?: string
          konto?: string | null
          mwst_prozent?: number | null
          sortierung?: number
        }
        Relationships: []
      }
      ki_nutzung: {
        Row: {
          id: number
          person_id: string
          zeit: string
        }
        Insert: {
          id?: never
          person_id: string
          zeit?: string
        }
        Update: {
          id?: never
          person_id?: string
          zeit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ki_nutzung_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_protokoll: {
        Row: {
          an: string[]
          art: string
          ausgeloest_von: string | null
          betreff: string | null
          fehler: string | null
          id: number
          reise_id: string | null
          status: string
          zeit: string
        }
        Insert: {
          an?: string[]
          art: string
          ausgeloest_von?: string | null
          betreff?: string | null
          fehler?: string | null
          id?: never
          reise_id?: string | null
          status: string
          zeit?: string
        }
        Update: {
          an?: string[]
          art?: string
          ausgeloest_von?: string | null
          betreff?: string | null
          fehler?: string | null
          id?: never
          reise_id?: string | null
          status?: string
          zeit?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_protokoll_ausgeloest_von_fkey"
            columns: ["ausgeloest_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_protokoll_reise_id_fkey"
            columns: ["reise_id"]
            isOneToOne: false
            referencedRelation: "reise"
            referencedColumns: ["id"]
          },
        ]
      }
      meldung: {
        Row: {
          art: string
          browser: string | null
          erstellt_am: string
          id: string
          notiz: string | null
          person_id: string
          seite: string | null
          status: string
          text: string
        }
        Insert: {
          art: string
          browser?: string | null
          erstellt_am?: string
          id?: string
          notiz?: string | null
          person_id?: string
          seite?: string | null
          status?: string
          text: string
        }
        Update: {
          art?: string
          browser?: string | null
          erstellt_am?: string
          id?: string
          notiz?: string | null
          person_id?: string
          seite?: string | null
          status?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "meldung_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profil_privat: {
        Row: {
          id: string
          personalnummer: string | null
          updated_at: string
          wohnort: string | null
        }
        Insert: {
          id: string
          personalnummer?: string | null
          updated_at?: string
          wohnort?: string | null
        }
        Update: {
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
          erste_taetigkeitsstaette_id: string | null
          id: string
          kalender_vorschlaege: boolean
          kfz_kennzeichen: string | null
          kostenstelle: string | null
          name: string
          rolle: Database["public"]["Enums"]["rolle"]
          vorgesetzter_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          erste_taetigkeitsstaette_id?: string | null
          id: string
          kalender_vorschlaege?: boolean
          kfz_kennzeichen?: string | null
          kostenstelle?: string | null
          name: string
          rolle?: Database["public"]["Enums"]["rolle"]
          vorgesetzter_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          erste_taetigkeitsstaette_id?: string | null
          id?: string
          kalender_vorschlaege?: boolean
          kfz_kennzeichen?: string | null
          kostenstelle?: string | null
          name?: string
          rolle?: Database["public"]["Enums"]["rolle"]
          vorgesetzter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_erste_taetigkeitsstaette_id_fkey"
            columns: ["erste_taetigkeitsstaette_id"]
            isOneToOne: false
            referencedRelation: "standort"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_vorgesetzter_id_fkey"
            columns: ["vorgesetzter_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      projekt: {
        Row: {
          aktiv: boolean
          bezeichnung: string
          created_at: string
          foerdergeber: string | null
          foerderkennzeichen: string | null
          id: string
          nummer: string | null
        }
        Insert: {
          aktiv?: boolean
          bezeichnung: string
          created_at?: string
          foerdergeber?: string | null
          foerderkennzeichen?: string | null
          id?: string
          nummer?: string | null
        }
        Update: {
          aktiv?: boolean
          bezeichnung?: string
          created_at?: string
          foerdergeber?: string | null
          foerderkennzeichen?: string | null
          id?: string
          nummer?: string | null
        }
        Relationships: []
      }
      reise: {
        Row: {
          ablehnungsgrund: string | null
          art: Database["public"]["Enums"]["abrechnung_art"]
          ausgezahlt_am: string | null
          ausgezahlt_von: string | null
          beginn: string
          begruendung: string
          beleg_nr: string | null
          besuchte_stellen: string | null
          buchungsmonat: string | null
          created_at: string
          eingereicht_am: string | null
          ende: string
          freigeber_id: string | null
          freigegeben_am: string | null
          geprueft_am: string | null
          geprueft_von: string | null
          id: string
          kfz_kennzeichen: string | null
          km_satz_cent: number | null
          km_steuerfrei_cent: number | null
          kostenstelle: string | null
          land: string
          mahlzeiten: Json
          mit_uebernachtung: boolean
          mitarbeiter_id: string
          mitfahrt_bei: string | null
          projekt_id: string | null
          reiseweg: string
          status: Database["public"]["Enums"]["reise_status"]
          verkehrsmittel: Database["public"]["Enums"]["verkehrsmittel"][]
          verpflegung_bemerkung: string | null
          verpflegung_fest: Json | null
          vorschuss_cent: number
        }
        Insert: {
          ablehnungsgrund?: string | null
          art?: Database["public"]["Enums"]["abrechnung_art"]
          ausgezahlt_am?: string | null
          ausgezahlt_von?: string | null
          beginn: string
          begruendung: string
          beleg_nr?: string | null
          besuchte_stellen?: string | null
          buchungsmonat?: string | null
          created_at?: string
          eingereicht_am?: string | null
          ende: string
          freigeber_id?: string | null
          freigegeben_am?: string | null
          geprueft_am?: string | null
          geprueft_von?: string | null
          id?: string
          kfz_kennzeichen?: string | null
          km_satz_cent?: number | null
          km_steuerfrei_cent?: number | null
          kostenstelle?: string | null
          land?: string
          mahlzeiten?: Json
          mit_uebernachtung?: boolean
          mitarbeiter_id: string
          mitfahrt_bei?: string | null
          projekt_id?: string | null
          reiseweg: string
          status?: Database["public"]["Enums"]["reise_status"]
          verkehrsmittel?: Database["public"]["Enums"]["verkehrsmittel"][]
          verpflegung_bemerkung?: string | null
          verpflegung_fest?: Json | null
          vorschuss_cent?: number
        }
        Update: {
          ablehnungsgrund?: string | null
          art?: Database["public"]["Enums"]["abrechnung_art"]
          ausgezahlt_am?: string | null
          ausgezahlt_von?: string | null
          beginn?: string
          begruendung?: string
          beleg_nr?: string | null
          besuchte_stellen?: string | null
          buchungsmonat?: string | null
          created_at?: string
          eingereicht_am?: string | null
          ende?: string
          freigeber_id?: string | null
          freigegeben_am?: string | null
          geprueft_am?: string | null
          geprueft_von?: string | null
          id?: string
          kfz_kennzeichen?: string | null
          km_satz_cent?: number | null
          km_steuerfrei_cent?: number | null
          kostenstelle?: string | null
          land?: string
          mahlzeiten?: Json
          mit_uebernachtung?: boolean
          mitarbeiter_id?: string
          mitfahrt_bei?: string | null
          projekt_id?: string | null
          reiseweg?: string
          status?: Database["public"]["Enums"]["reise_status"]
          verkehrsmittel?: Database["public"]["Enums"]["verkehrsmittel"][]
          verpflegung_bemerkung?: string | null
          verpflegung_fest?: Json | null
          vorschuss_cent?: number
        }
        Relationships: [
          {
            foreignKeyName: "reise_ausgezahlt_von_fkey"
            columns: ["ausgezahlt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reise_freigeber_id_fkey"
            columns: ["freigeber_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reise_geprueft_von_fkey"
            columns: ["geprueft_von"]
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
          {
            foreignKeyName: "reise_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekt"
            referencedColumns: ["id"]
          },
        ]
      }
      reise_ereignis: {
        Row: {
          aktion: string
          id: number
          kommentar: string | null
          person_id: string
          person_name: string | null
          reise_id: string
          zeit: string
        }
        Insert: {
          aktion: string
          id?: never
          kommentar?: string | null
          person_id: string
          person_name?: string | null
          reise_id: string
          zeit?: string
        }
        Update: {
          aktion?: string
          id?: never
          kommentar?: string | null
          person_id?: string
          person_name?: string | null
          reise_id?: string
          zeit?: string
        }
        Relationships: [
          {
            foreignKeyName: "reise_ereignis_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reise_ereignis_reise_id_fkey"
            columns: ["reise_id"]
            isOneToOne: false
            referencedRelation: "reise"
            referencedColumns: ["id"]
          },
        ]
      }
      standort: {
        Row: {
          aktiv: boolean
          created_at: string
          id: string
          name: string
          orte: string[]
          sortierung: number
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          id?: string
          name: string
          orte?: string[]
          sortierung?: number
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          id?: string
          name?: string
          orte?: string[]
          sortierung?: number
        }
        Relationships: []
      }
      vorschuss: {
        Row: {
          ablehnungsgrund: string | null
          ausgezahlt_am: string | null
          ausgezahlt_von: string | null
          beantragt_am: string
          betrag_cent: number
          entschieden_am: string | null
          entschieden_von: string | null
          grund: string | null
          id: string
          mitarbeiter_id: string
          reise_anlass: string
          reise_beginn: string
          reise_id: string
          reise_weg: string
          status: Database["public"]["Enums"]["vorschuss_status"]
        }
        Insert: {
          ablehnungsgrund?: string | null
          ausgezahlt_am?: string | null
          ausgezahlt_von?: string | null
          beantragt_am?: string
          betrag_cent: number
          entschieden_am?: string | null
          entschieden_von?: string | null
          grund?: string | null
          id?: string
          mitarbeiter_id: string
          reise_anlass: string
          reise_beginn: string
          reise_id: string
          reise_weg: string
          status?: Database["public"]["Enums"]["vorschuss_status"]
        }
        Update: {
          ablehnungsgrund?: string | null
          ausgezahlt_am?: string | null
          ausgezahlt_von?: string | null
          beantragt_am?: string
          betrag_cent?: number
          entschieden_am?: string | null
          entschieden_von?: string | null
          grund?: string | null
          id?: string
          mitarbeiter_id?: string
          reise_anlass?: string
          reise_beginn?: string
          reise_id?: string
          reise_weg?: string
          status?: Database["public"]["Enums"]["vorschuss_status"]
        }
        Relationships: [
          {
            foreignKeyName: "vorschuss_ausgezahlt_von_fkey"
            columns: ["ausgezahlt_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vorschuss_entschieden_von_fkey"
            columns: ["entschieden_von"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vorschuss_mitarbeiter_id_fkey"
            columns: ["mitarbeiter_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vorschuss_reise_id_fkey"
            columns: ["reise_id"]
            isOneToOne: false
            referencedRelation: "reise"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      darf_genehmigen: { Args: { p_mitarbeiter: string }; Returns: boolean }
      darf_pruefen: { Args: { p_mitarbeiter: string }; Returns: boolean }
      darf_reise_sehen: { Args: { p_reise: string }; Returns: boolean }
      ist_admin: { Args: never; Returns: boolean }
      ist_buchhaltung: { Args: never; Returns: boolean }
      ist_freigeber: { Args: never; Returns: boolean }
      ki_kontingent_nutzen: { Args: never; Returns: boolean }
      mail_empfaenger: {
        Args: { p_art: string; p_reise: string }
        Returns: {
          email: string
        }[]
      }
      mail_protokollieren: {
        Args: {
          p_an: string[]
          p_art: string
          p_betreff: string
          p_fehler: string
          p_person?: string
          p_reise: string
          p_status: string
        }
        Returns: undefined
      }
      name_aus_metadaten: {
        Args: { email: string; meta: Json }
        Returns: string
      }
      reise_ablehnen: {
        Args: { p_grund: string; p_id: string }
        Returns: undefined
      }
      reise_auszahlen: { Args: { p_id: string }; Returns: undefined }
      reise_einreichen: { Args: { p_id: string }; Returns: undefined }
      reise_genehmigen: {
        Args: { p_id: string; p_kommentar?: string }
        Returns: undefined
      }
      reise_holen: {
        Args: { p_id: string }
        Returns: {
          ablehnungsgrund: string | null
          art: Database["public"]["Enums"]["abrechnung_art"]
          ausgezahlt_am: string | null
          ausgezahlt_von: string | null
          beginn: string
          begruendung: string
          beleg_nr: string | null
          besuchte_stellen: string | null
          buchungsmonat: string | null
          created_at: string
          eingereicht_am: string | null
          ende: string
          freigeber_id: string | null
          freigegeben_am: string | null
          geprueft_am: string | null
          geprueft_von: string | null
          id: string
          kfz_kennzeichen: string | null
          km_satz_cent: number | null
          km_steuerfrei_cent: number | null
          kostenstelle: string | null
          land: string
          mahlzeiten: Json
          mit_uebernachtung: boolean
          mitarbeiter_id: string
          mitfahrt_bei: string | null
          projekt_id: string | null
          reiseweg: string
          status: Database["public"]["Enums"]["reise_status"]
          verkehrsmittel: Database["public"]["Enums"]["verkehrsmittel"][]
          verpflegung_bemerkung: string | null
          verpflegung_fest: Json | null
          vorschuss_cent: number
        }
        SetofOptions: {
          from: "*"
          to: "reise"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reise_pruefen: {
        Args: { p_buchungsmonat: string; p_id: string }
        Returns: string
      }
      reise_zurueckziehen: { Args: { p_id: string }; Returns: undefined }
      reisen_auszahlen: { Args: { p_ids: string[] }; Returns: number }
      reisen_einreichen: { Args: { p_ids: string[] }; Returns: number }
      reisen_genehmigen: {
        Args: { p_ids: string[]; p_kommentar?: string }
        Returns: number
      }
      reisen_pruefen: {
        Args: { p_buchungsmonat: string; p_ids: string[] }
        Returns: number
      }
      vorschuss_ablehnen: {
        Args: { p_grund: string; p_id: string }
        Returns: undefined
      }
      vorschuss_auszahlen: { Args: { p_id: string }; Returns: undefined }
      vorschuss_beantragen: {
        Args: { p_betrag_cent: number; p_grund: string; p_reise: string }
        Returns: string
      }
      vorschuss_genehmigen: { Args: { p_id: string }; Returns: undefined }
      vorschuss_holen: {
        Args: { p_id: string }
        Returns: {
          ablehnungsgrund: string | null
          ausgezahlt_am: string | null
          ausgezahlt_von: string | null
          beantragt_am: string
          betrag_cent: number
          entschieden_am: string | null
          entschieden_von: string | null
          grund: string | null
          id: string
          mitarbeiter_id: string
          reise_anlass: string
          reise_beginn: string
          reise_id: string
          reise_weg: string
          status: Database["public"]["Enums"]["vorschuss_status"]
        }
        SetofOptions: {
          from: "*"
          to: "vorschuss"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vorschuss_zurueckziehen: { Args: { p_id: string }; Returns: undefined }
    }
    Enums: {
      abrechnung_art: "reise" | "auslagen"
      reise_status:
        | "entwurf"
        | "eingereicht"
        | "freigegeben"
        | "geprueft"
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
      vorschuss_status: "beantragt" | "genehmigt" | "abgelehnt" | "ausgezahlt"
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
      abrechnung_art: ["reise", "auslagen"],
      reise_status: [
        "entwurf",
        "eingereicht",
        "freigegeben",
        "geprueft",
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
      vorschuss_status: ["beantragt", "genehmigt", "abgelehnt", "ausgezahlt"],
    },
  },
} as const
