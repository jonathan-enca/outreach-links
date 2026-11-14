/**
 * Types de la base. Régénérer avec `pnpm db:types` après chaque migration
 * (nécessite la CLI Supabase et la base locale démarrée).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: { id: string; name: string; created_by: string | null; created_at: string };
        Insert: { id?: string; name: string; created_by?: string | null; created_at?: string };
        Update: { id?: string; name?: string; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      memberships: {
        Row: { workspace_id: string; user_id: string; role: string; created_at: string };
        Insert: { workspace_id: string; user_id: string; role?: string; created_at?: string };
        Update: { workspace_id?: string; user_id?: string; role?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "memberships_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          id: string;
          workspace_id: string;
          domain: string;
          niche: string | null;
          country: string | null;
          language: string;
          signature_first_name: string | null;
          offered_asset: string | null;
          categories: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          domain: string;
          niche?: string | null;
          country?: string | null;
          language?: string;
          signature_first_name?: string | null;
          offered_asset?: string | null;
          categories?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          domain?: string;
          niche?: string | null;
          country?: string | null;
          language?: string;
          signature_first_name?: string | null;
          offered_asset?: string | null;
          categories?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sites_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          id: number;
          workspace_id: string;
          actor_id: string | null;
          type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          workspace_id: string;
          actor_id?: string | null;
          type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_workspace_member: { Args: { ws: string }; Returns: boolean };
      has_workspace_role: { Args: { ws: string; roles: string[] }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
