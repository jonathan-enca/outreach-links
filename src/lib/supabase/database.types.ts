export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      audit_gap_domains: {
        Row: {
          audit_id: string;
          best_rank: number | null;
          competitors: string[];
          competitors_count: number;
          created_at: string;
          dofollow: boolean | null;
          domain: string;
          id: number;
          min_spam_score: number | null;
          sample_anchor: string | null;
          sample_url: string | null;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          best_rank?: number | null;
          competitors?: string[];
          competitors_count: number;
          created_at?: string;
          dofollow?: boolean | null;
          domain: string;
          id?: never;
          min_spam_score?: number | null;
          sample_anchor?: string | null;
          sample_url?: string | null;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          best_rank?: number | null;
          competitors?: string[];
          competitors_count?: number;
          created_at?: string;
          dofollow?: boolean | null;
          domain?: string;
          id?: never;
          min_spam_score?: number | null;
          sample_anchor?: string | null;
          sample_url?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      audit_pages: {
        Row: {
          audit_id: string;
          avg_position: number | null;
          best_position: number | null;
          created_at: string;
          http_status: number | null;
          id: number;
          is_priority: boolean;
          keywords_count: number;
          keywords_json: Json;
          onpage_score: number | null;
          priority_rank: number | null;
          priority_score: number;
          referring_domains: number | null;
          required_domains_estimated: number | null;
          required_domains_high: number | null;
          required_domains_low: number | null;
          tech_issues: string[];
          tech_status: string;
          total_volume: number;
          url: string;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          avg_position?: number | null;
          best_position?: number | null;
          created_at?: string;
          http_status?: number | null;
          id?: never;
          is_priority?: boolean;
          keywords_count?: number;
          keywords_json?: Json;
          onpage_score?: number | null;
          priority_rank?: number | null;
          priority_score?: number;
          referring_domains?: number | null;
          required_domains_estimated?: number | null;
          required_domains_high?: number | null;
          required_domains_low?: number | null;
          tech_issues?: string[];
          tech_status?: string;
          total_volume?: number;
          url: string;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          avg_position?: number | null;
          best_position?: number | null;
          created_at?: string;
          http_status?: number | null;
          id?: never;
          is_priority?: boolean;
          keywords_count?: number;
          keywords_json?: Json;
          onpage_score?: number | null;
          priority_rank?: number | null;
          priority_score?: number;
          referring_domains?: number | null;
          required_domains_estimated?: number | null;
          required_domains_high?: number | null;
          required_domains_low?: number | null;
          tech_issues?: string[];
          tech_status?: string;
          total_volume?: number;
          url?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      audit_serp_results: {
        Row: {
          audit_id: string;
          domain: string;
          id: number;
          query: string;
          rank: number;
          title: string | null;
          url: string;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          domain: string;
          id?: never;
          query: string;
          rank: number;
          title?: string | null;
          url: string;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          domain?: string;
          id?: never;
          query?: string;
          rank?: number;
          title?: string | null;
          url?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_serp_results_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_serp_results_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      audits: {
        Row: {
          actual_cost_usd: number | null;
          backlinks_cost_usd: number | null;
          backlinks_error: string | null;
          backlinks_estimated_cost_usd: number | null;
          backlinks_finished_at: string | null;
          backlinks_limit: number | null;
          backlinks_started_at: string | null;
          backlinks_stats: Json;
          backlinks_status: string;
          confirmed_at: string | null;
          cost_cap_usd: number;
          created_at: string;
          created_by: string | null;
          error_message: string | null;
          estimate_details: Json;
          estimated_at: string | null;
          estimated_cost_usd: number | null;
          finished_at: string | null;
          id: string;
          max_competitors: number;
          plan: string;
          profile_cost_usd: number | null;
          profile_data: Json;
          profile_error: string | null;
          profile_estimated_cost_usd: number | null;
          profile_finished_at: string | null;
          profile_limits: Json;
          profile_started_at: string | null;
          profile_status: string;
          profile_summary: string | null;
          profile_summary_model: string | null;
          profile_summary_source: string | null;
          queries: string[];
          site_id: string;
          started_at: string | null;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          actual_cost_usd?: number | null;
          backlinks_cost_usd?: number | null;
          backlinks_error?: string | null;
          backlinks_estimated_cost_usd?: number | null;
          backlinks_finished_at?: string | null;
          backlinks_limit?: number | null;
          backlinks_started_at?: string | null;
          backlinks_stats?: Json;
          backlinks_status?: string;
          confirmed_at?: string | null;
          cost_cap_usd: number;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          estimate_details?: Json;
          estimated_at?: string | null;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          id?: string;
          max_competitors: number;
          plan?: string;
          profile_cost_usd?: number | null;
          profile_data?: Json;
          profile_error?: string | null;
          profile_estimated_cost_usd?: number | null;
          profile_finished_at?: string | null;
          profile_limits?: Json;
          profile_started_at?: string | null;
          profile_status?: string;
          profile_summary?: string | null;
          profile_summary_model?: string | null;
          profile_summary_source?: string | null;
          queries: string[];
          site_id: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          actual_cost_usd?: number | null;
          backlinks_cost_usd?: number | null;
          backlinks_error?: string | null;
          backlinks_estimated_cost_usd?: number | null;
          backlinks_finished_at?: string | null;
          backlinks_limit?: number | null;
          backlinks_started_at?: string | null;
          backlinks_stats?: Json;
          backlinks_status?: string;
          confirmed_at?: string | null;
          cost_cap_usd?: number;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          estimate_details?: Json;
          estimated_at?: string | null;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          id?: string;
          max_competitors?: number;
          plan?: string;
          profile_cost_usd?: number | null;
          profile_data?: Json;
          profile_error?: string | null;
          profile_estimated_cost_usd?: number | null;
          profile_finished_at?: string | null;
          profile_limits?: Json;
          profile_started_at?: string | null;
          profile_status?: string;
          profile_summary?: string | null;
          profile_summary_model?: string | null;
          profile_summary_source?: string | null;
          queries?: string[];
          site_id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audits_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audits_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      competitor_backlinks: {
        Row: {
          anchor: string | null;
          audit_id: string;
          clean_status: string;
          competitor_id: string;
          created_at: string;
          dofollow: boolean | null;
          exclusion_reasons: string[];
          first_seen: string | null;
          id: number;
          is_broken: boolean | null;
          item_type: string | null;
          last_seen: string | null;
          source_domain: string;
          source_rank: number | null;
          source_url: string;
          spam_score: number | null;
          target_url: string | null;
          workspace_id: string;
        };
        Insert: {
          anchor?: string | null;
          audit_id: string;
          clean_status?: string;
          competitor_id: string;
          created_at?: string;
          dofollow?: boolean | null;
          exclusion_reasons?: string[];
          first_seen?: string | null;
          id?: never;
          is_broken?: boolean | null;
          item_type?: string | null;
          last_seen?: string | null;
          source_domain: string;
          source_rank?: number | null;
          source_url: string;
          spam_score?: number | null;
          target_url?: string | null;
          workspace_id: string;
        };
        Update: {
          anchor?: string | null;
          audit_id?: string;
          clean_status?: string;
          competitor_id?: string;
          created_at?: string;
          dofollow?: boolean | null;
          exclusion_reasons?: string[];
          first_seen?: string | null;
          id?: never;
          is_broken?: boolean | null;
          item_type?: string | null;
          last_seen?: string | null;
          source_domain?: string;
          source_rank?: number | null;
          source_url?: string;
          spam_score?: number | null;
          target_url?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competitor_backlinks_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competitor_backlinks_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competitor_backlinks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      competitors: {
        Row: {
          appearances: number;
          audit_id: string;
          avg_rank: number;
          best_rank: number;
          created_at: string;
          domain: string;
          id: string;
          queries_count: number;
          sample_url: string | null;
          score: number;
          selected: boolean;
          workspace_id: string;
        };
        Insert: {
          appearances: number;
          audit_id: string;
          avg_rank: number;
          best_rank: number;
          created_at?: string;
          domain: string;
          id?: string;
          queries_count: number;
          sample_url?: string | null;
          score: number;
          selected?: boolean;
          workspace_id: string;
        };
        Update: {
          appearances?: number;
          audit_id?: string;
          avg_rank?: number;
          best_rank?: number;
          created_at?: string;
          domain?: string;
          id?: string;
          queries_count?: number;
          sample_url?: string | null;
          score?: number;
          selected?: boolean;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competitors_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competitors_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      cost_ledger: {
        Row: {
          actual_cost_usd: number | null;
          audit_id: string | null;
          created_at: string;
          estimated_cost_usd: number;
          id: number;
          metadata: Json;
          operation: string;
          provider: string;
          units: number;
          workspace_id: string | null;
        };
        Insert: {
          actual_cost_usd?: number | null;
          audit_id?: string | null;
          created_at?: string;
          estimated_cost_usd?: number;
          id?: never;
          metadata?: Json;
          operation: string;
          provider: string;
          units?: number;
          workspace_id?: string | null;
        };
        Update: {
          actual_cost_usd?: number | null;
          audit_id?: string | null;
          created_at?: string;
          estimated_cost_usd?: number;
          id?: never;
          metadata?: Json;
          operation?: string;
          provider?: string;
          units?: number;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cost_ledger_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cost_ledger_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      dataforseo_cache: {
        Row: {
          cache_key: string;
          cost_usd: number;
          created_at: string;
          endpoint: string;
          expires_at: string;
          params: Json;
          response: Json;
        };
        Insert: {
          cache_key: string;
          cost_usd?: number;
          created_at?: string;
          endpoint: string;
          expires_at: string;
          params: Json;
          response: Json;
        };
        Update: {
          cache_key?: string;
          cost_usd?: number;
          created_at?: string;
          endpoint?: string;
          expires_at?: string;
          params?: Json;
          response?: Json;
        };
        Relationships: [];
      };
      events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: number;
          payload: Json;
          type: string;
          workspace_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          payload?: Json;
          type: string;
          workspace_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          payload?: Json;
          type?: string;
          workspace_id?: string;
        };
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
      memberships: {
        Row: {
          created_at: string;
          role: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          user_id?: string;
          workspace_id?: string;
        };
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
          categories: string[];
          country: string | null;
          created_at: string;
          domain: string;
          id: string;
          language: string;
          niche: string | null;
          offered_asset: string | null;
          priority_queries: string[];
          sender_email: string | null;
          signature_first_name: string | null;
          updated_at: string;
          verification_method: string | null;
          verification_token: string;
          verified_at: string | null;
          workspace_id: string;
        };
        Insert: {
          categories?: string[];
          country?: string | null;
          created_at?: string;
          domain: string;
          id?: string;
          language?: string;
          niche?: string | null;
          offered_asset?: string | null;
          priority_queries?: string[];
          sender_email?: string | null;
          signature_first_name?: string | null;
          updated_at?: string;
          verification_method?: string | null;
          verification_token?: string;
          verified_at?: string | null;
          workspace_id: string;
        };
        Update: {
          categories?: string[];
          country?: string | null;
          created_at?: string;
          domain?: string;
          id?: string;
          language?: string;
          niche?: string | null;
          offered_asset?: string | null;
          priority_queries?: string[];
          sender_email?: string | null;
          signature_first_name?: string | null;
          updated_at?: string;
          verification_method?: string | null;
          verification_token?: string;
          verified_at?: string | null;
          workspace_id?: string;
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
      workspaces: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          plan: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          plan?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          plan?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_workspace_role: {
        Args: { roles: string[]; ws: string };
        Returns: boolean;
      };
      is_workspace_member: { Args: { ws: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
