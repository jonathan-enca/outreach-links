export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      analysis_feed: {
        Row: {
          audit_id: string;
          created_at: string;
          id: number;
          kind: string;
          message: string;
          payload: Json;
          step_key: string | null;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          created_at?: string;
          id?: never;
          kind: string;
          message: string;
          payload?: Json;
          step_key?: string | null;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          created_at?: string;
          id?: never;
          kind?: string;
          message?: string;
          payload?: Json;
          step_key?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      analysis_steps: {
        Row: {
          audit_id: string;
          counters: Json;
          created_at: string;
          error_message: string | null;
          finished_at: string | null;
          id: string;
          key: string;
          last_example: string | null;
          position: number;
          started_at: string | null;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          counters?: Json;
          created_at?: string;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          key: string;
          last_example?: string | null;
          position: number;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          counters?: Json;
          created_at?: string;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          key?: string;
          last_example?: string | null;
          position?: number;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
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
        Relationships: [
          {
            foreignKeyName: "audit_gap_domains_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_gap_domains_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "audit_pages_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_pages_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
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
          analysis_confirmed_at: string | null;
          analysis_cost_usd: number | null;
          analysis_error: string | null;
          analysis_finished_at: string | null;
          analysis_started_at: string | null;
          analysis_status: string;
          actual_cost_usd: number | null;
          auto_chain: boolean;
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
          deadlinks_error: string | null;
          deadlinks_finished_at: string | null;
          deadlinks_started_at: string | null;
          deadlinks_stats: Json;
          deadlinks_status: string;
          error_message: string | null;
          estimate_details: Json;
          estimated_at: string | null;
          estimated_cost_usd: number | null;
          finished_at: string | null;
          id: string;
          links_state: Json;
          max_competitors: number;
          opportunities_cost_usd: number | null;
          opportunities_error: string | null;
          opportunities_estimated_cost_usd: number | null;
          opportunities_finished_at: string | null;
          opportunities_limits: Json;
          opportunities_started_at: string | null;
          opportunities_stats: Json;
          opportunities_status: string;
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
          analysis_confirmed_at?: string | null;
          analysis_cost_usd?: number | null;
          analysis_error?: string | null;
          analysis_finished_at?: string | null;
          analysis_started_at?: string | null;
          analysis_status?: string;
          actual_cost_usd?: number | null;
          auto_chain?: boolean;
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
          deadlinks_error?: string | null;
          deadlinks_finished_at?: string | null;
          deadlinks_started_at?: string | null;
          deadlinks_stats?: Json;
          deadlinks_status?: string;
          error_message?: string | null;
          estimate_details?: Json;
          estimated_at?: string | null;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          id?: string;
          links_state?: Json;
          max_competitors: number;
          opportunities_cost_usd?: number | null;
          opportunities_error?: string | null;
          opportunities_estimated_cost_usd?: number | null;
          opportunities_finished_at?: string | null;
          opportunities_limits?: Json;
          opportunities_started_at?: string | null;
          opportunities_stats?: Json;
          opportunities_status?: string;
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
          analysis_confirmed_at?: string | null;
          analysis_cost_usd?: number | null;
          analysis_error?: string | null;
          analysis_finished_at?: string | null;
          analysis_started_at?: string | null;
          analysis_status?: string;
          actual_cost_usd?: number | null;
          auto_chain?: boolean;
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
          deadlinks_error?: string | null;
          deadlinks_finished_at?: string | null;
          deadlinks_started_at?: string | null;
          deadlinks_stats?: Json;
          deadlinks_status?: string;
          error_message?: string | null;
          estimate_details?: Json;
          estimated_at?: string | null;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          id?: string;
          links_state?: Json;
          max_competitors?: number;
          opportunities_cost_usd?: number | null;
          opportunities_error?: string | null;
          opportunities_estimated_cost_usd?: number | null;
          opportunities_finished_at?: string | null;
          opportunities_limits?: Json;
          opportunities_started_at?: string | null;
          opportunities_stats?: Json;
          opportunities_status?: string;
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
      batch_items: {
        Row: {
          batch_id: string;
          draft_id: string;
          plan_id: string;
          position: number;
          workspace_id: string;
        };
        Insert: {
          batch_id: string;
          draft_id: string;
          plan_id: string;
          position: number;
          workspace_id: string;
        };
        Update: {
          batch_id?: string;
          draft_id?: string;
          plan_id?: string;
          position?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "batch_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batch_items_draft_id_fkey";
            columns: ["draft_id"];
            isOneToOne: true;
            referencedRelation: "target_drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batch_items_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batch_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      batches: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          number: number;
          plan_id: string;
          status: string;
          validated_at: string | null;
          validated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          number: number;
          plan_id: string;
          status?: string;
          validated_at?: string | null;
          validated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          number?: number;
          plan_id?: string;
          status?: string;
          validated_at?: string | null;
          validated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "batches_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batches_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      brand_profiles: {
        Row: {
          cost_usd: number;
          created_at: string;
          created_by: string | null;
          id: string;
          pages_read: Json;
          profile: Json;
          site_id: string;
          source: string;
          version: number;
          workspace_id: string;
        };
        Insert: {
          cost_usd?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          pages_read?: Json;
          profile: Json;
          site_id: string;
          source: string;
          version: number;
          workspace_id: string;
        };
        Update: {
          cost_usd?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          pages_read?: Json;
          profile?: Json;
          site_id?: string;
          source?: string;
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brand_profiles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_profiles_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_profiles_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      query_recipes: {
        Row: {
          cost_usd: number;
          created_at: string;
          id: string;
          language: string;
          niche_key: string;
          persona_key: string;
          persona_label: string;
          queries: Json;
          recipe_version: number;
        };
        Insert: {
          cost_usd?: number;
          created_at?: string;
          id?: string;
          language: string;
          niche_key: string;
          persona_key: string;
          persona_label: string;
          queries: Json;
          recipe_version: number;
        };
        Update: {
          cost_usd?: number;
          created_at?: string;
          id?: string;
          language?: string;
          niche_key?: string;
          persona_key?: string;
          persona_label?: string;
          queries?: Json;
          recipe_version?: number;
        };
        Relationships: [];
      };
      query_universes: {
        Row: {
          brand_profile_version: number | null;
          budget_usd: number;
          created_at: string;
          created_by: string | null;
          est_cost_usd: number;
          goal: string;
          id: string;
          llm_cost_usd: number;
          queries: Json;
          recipes: Json;
          site_id: string;
          workspace_id: string;
        };
        Insert: {
          brand_profile_version?: number | null;
          budget_usd: number;
          created_at?: string;
          created_by?: string | null;
          est_cost_usd: number;
          goal: string;
          id?: string;
          llm_cost_usd?: number;
          queries: Json;
          recipes?: Json;
          site_id: string;
          workspace_id: string;
        };
        Update: {
          brand_profile_version?: number | null;
          budget_usd?: number;
          created_at?: string;
          created_by?: string | null;
          est_cost_usd?: number;
          goal?: string;
          id?: string;
          llm_cost_usd?: number;
          queries?: Json;
          recipes?: Json;
          site_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "query_universes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "query_universes_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "query_universes_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      findings_runs: {
        Row: {
          actual_cost_usd: number | null;
          audit_id: string;
          budget_usd: number;
          confirmed_by: string | null;
          created_at: string;
          error_message: string | null;
          expected_cost_usd: number;
          finished_at: string | null;
          id: string;
          plan: Json;
          qualification_run_id: string;
          site_id: string;
          started_at: string | null;
          stats: Json;
          status: string;
          stop_reason: string | null;
          updated_at: string;
          workspace_id: string;
          worst_case_usd: number;
        };
        Insert: {
          actual_cost_usd?: number | null;
          audit_id: string;
          budget_usd: number;
          confirmed_by?: string | null;
          created_at?: string;
          error_message?: string | null;
          expected_cost_usd: number;
          finished_at?: string | null;
          id?: string;
          plan: Json;
          qualification_run_id: string;
          site_id: string;
          started_at?: string | null;
          stats?: Json;
          status?: string;
          stop_reason?: string | null;
          updated_at?: string;
          workspace_id: string;
          worst_case_usd: number;
        };
        Update: {
          actual_cost_usd?: number | null;
          audit_id?: string;
          budget_usd?: number;
          confirmed_by?: string | null;
          created_at?: string;
          error_message?: string | null;
          expected_cost_usd?: number;
          finished_at?: string | null;
          id?: string;
          plan?: Json;
          qualification_run_id?: string;
          site_id?: string;
          started_at?: string | null;
          stats?: Json;
          status?: string;
          stop_reason?: string | null;
          updated_at?: string;
          workspace_id?: string;
          worst_case_usd?: number;
        };
        Relationships: [];
      };
      target_findings: {
        Row: {
          anchor: string | null;
          audit_id: string;
          brief: Json;
          created_at: string;
          domain: string;
          http_status: number | null;
          id: string;
          kind: string;
          link_url: string | null;
          page_url: string;
          proposed_sentence: string | null;
          quote: string;
          reason: string;
          replacement_how: string;
          request_lines: string[];
          resource_title: string;
          resource_url: string;
          run_id: string;
          target_id: string;
          workspace_id: string;
        };
        Insert: {
          anchor?: string | null;
          audit_id: string;
          brief: Json;
          created_at?: string;
          domain: string;
          http_status?: number | null;
          id?: string;
          kind: string;
          link_url?: string | null;
          page_url: string;
          proposed_sentence?: string | null;
          quote: string;
          reason: string;
          replacement_how: string;
          request_lines: string[];
          resource_title: string;
          resource_url: string;
          run_id: string;
          target_id: string;
          workspace_id: string;
        };
        Update: {
          anchor?: string | null;
          audit_id?: string;
          brief?: Json;
          created_at?: string;
          domain?: string;
          http_status?: number | null;
          id?: string;
          kind?: string;
          link_url?: string | null;
          page_url?: string;
          proposed_sentence?: string | null;
          quote?: string;
          reason?: string;
          replacement_how?: string;
          request_lines?: string[];
          resource_title?: string;
          resource_url?: string;
          run_id?: string;
          target_id?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      plan_item_briefs: {
        Row: {
          brief: Json;
          created_at: string;
          finding_id: string | null;
          kind: string;
          plan_id: string;
          plan_item_id: string;
          presentation: string;
          quote: string | null;
          request_lines: string[];
          target_id: string | null;
          workspace_id: string;
        };
        Insert: {
          brief: Json;
          created_at?: string;
          finding_id?: string | null;
          kind: string;
          plan_id: string;
          plan_item_id: string;
          presentation: string;
          quote?: string | null;
          request_lines: string[];
          target_id?: string | null;
          workspace_id: string;
        };
        Update: {
          brief?: Json;
          created_at?: string;
          finding_id?: string | null;
          kind?: string;
          plan_id?: string;
          plan_item_id?: string;
          presentation?: string;
          quote?: string | null;
          request_lines?: string[];
          target_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      qualification_runs: {
        Row: {
          actual_cost_usd: number | null;
          audit_id: string;
          budget_usd: number;
          collection_id: string;
          confirmed_by: string | null;
          created_at: string;
          error_message: string | null;
          expected_cost_usd: number;
          finished_at: string | null;
          id: string;
          more_requested_at: string | null;
          more_stats: Json;
          auto_status: string;
          auto_started_at: string | null;
          auto_lots: number;
          auto_low_streak: number;
          auto_added: number;
          auto_cost_usd: number;
          auto_stop: string | null;
          more_status: string;
          plan: Json;
          site_id: string;
          started_at: string | null;
          stats: Json;
          status: string;
          stop_reason: string | null;
          updated_at: string;
          workspace_id: string;
          worst_case_usd: number;
        };
        Insert: {
          actual_cost_usd?: number | null;
          audit_id: string;
          budget_usd: number;
          collection_id: string;
          confirmed_by?: string | null;
          created_at?: string;
          error_message?: string | null;
          expected_cost_usd: number;
          finished_at?: string | null;
          id?: string;
          more_requested_at?: string | null;
          more_stats?: Json;
          auto_status?: string;
          auto_started_at?: string | null;
          auto_lots?: number;
          auto_low_streak?: number;
          auto_added?: number;
          auto_cost_usd?: number;
          auto_stop?: string | null;
          more_status?: string;
          plan: Json;
          site_id: string;
          started_at?: string | null;
          stats?: Json;
          status?: string;
          stop_reason?: string | null;
          updated_at?: string;
          workspace_id: string;
          worst_case_usd: number;
        };
        Update: {
          actual_cost_usd?: number | null;
          audit_id?: string;
          budget_usd?: number;
          collection_id?: string;
          confirmed_by?: string | null;
          created_at?: string;
          error_message?: string | null;
          expected_cost_usd?: number;
          finished_at?: string | null;
          id?: string;
          more_requested_at?: string | null;
          more_stats?: Json;
          auto_status?: string;
          auto_started_at?: string | null;
          auto_lots?: number;
          auto_low_streak?: number;
          auto_added?: number;
          auto_cost_usd?: number;
          auto_stop?: string | null;
          more_status?: string;
          plan?: Json;
          site_id?: string;
          started_at?: string | null;
          stats?: Json;
          status?: string;
          stop_reason?: string | null;
          updated_at?: string;
          workspace_id?: string;
          worst_case_usd?: number;
        };
        Relationships: [];
      };
      qualified_targets: {
        Row: {
          audit_id: string;
          competitors_count: number;
          contact_email: string | null;
          contact_status: string | null;
          contact_url: string | null;
          created_at: string;
          domain: string;
          domain_rank: number | null;
          exclusion_detail: string | null;
          exclusion_reason: string | null;
          fit: number | null;
          form_url: string | null;
          hook: string | null;
          id: string;
          judgement: Json | null;
          page: Json | null;
          platform_hosted: boolean;
          provisional_score: number;
          rank: number | null;
          request_lines: string[] | null;
          run_id: string;
          score: number | null;
          score_parts: Json | null;
          sendable: boolean;
          site_type: string | null;
          stage_reached: number;
          status: string;
          tactics: string[];
          url: string | null;
          why: string | null;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          competitors_count?: number;
          contact_email?: string | null;
          contact_status?: string | null;
          contact_url?: string | null;
          created_at?: string;
          domain: string;
          domain_rank?: number | null;
          exclusion_detail?: string | null;
          exclusion_reason?: string | null;
          fit?: number | null;
          form_url?: string | null;
          hook?: string | null;
          id?: string;
          judgement?: Json | null;
          page?: Json | null;
          platform_hosted?: boolean;
          provisional_score?: number;
          rank?: number | null;
          request_lines?: string[] | null;
          run_id: string;
          score?: number | null;
          score_parts?: Json | null;
          sendable?: boolean;
          site_type?: string | null;
          stage_reached: number;
          status: string;
          tactics: string[];
          url?: string | null;
          why?: string | null;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          competitors_count?: number;
          contact_email?: string | null;
          contact_status?: string | null;
          contact_url?: string | null;
          created_at?: string;
          domain?: string;
          domain_rank?: number | null;
          exclusion_detail?: string | null;
          exclusion_reason?: string | null;
          fit?: number | null;
          form_url?: string | null;
          hook?: string | null;
          id?: string;
          judgement?: Json | null;
          page?: Json | null;
          platform_hosted?: boolean;
          provisional_score?: number;
          rank?: number | null;
          request_lines?: string[] | null;
          run_id?: string;
          score?: number | null;
          score_parts?: Json | null;
          sendable?: boolean;
          site_type?: string | null;
          stage_reached?: number;
          status?: string;
          tactics?: string[];
          url?: string | null;
          why?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      candidate_collections: {
        Row: {
          actual_cost_usd: number | null;
          audit_id: string;
          confirmed_by: string | null;
          created_at: string;
          error_message: string | null;
          expected_cost_usd: number;
          finished_at: string | null;
          id: string;
          plan: Json;
          site_id: string;
          started_at: string | null;
          stats: Json;
          status: string;
          stop_reason: string | null;
          target_usd: number;
          updated_at: string;
          workspace_id: string;
          worst_case_usd: number;
        };
        Insert: {
          actual_cost_usd?: number | null;
          audit_id: string;
          confirmed_by?: string | null;
          created_at?: string;
          error_message?: string | null;
          expected_cost_usd: number;
          finished_at?: string | null;
          id?: string;
          plan: Json;
          site_id: string;
          started_at?: string | null;
          stats?: Json;
          status?: string;
          stop_reason?: string | null;
          target_usd: number;
          updated_at?: string;
          workspace_id: string;
          worst_case_usd: number;
        };
        Update: {
          actual_cost_usd?: number | null;
          audit_id?: string;
          confirmed_by?: string | null;
          created_at?: string;
          error_message?: string | null;
          expected_cost_usd?: number;
          finished_at?: string | null;
          id?: string;
          plan?: Json;
          site_id?: string;
          started_at?: string | null;
          stats?: Json;
          status?: string;
          stop_reason?: string | null;
          target_usd?: number;
          updated_at?: string;
          workspace_id?: string;
          worst_case_usd?: number;
        };
        Relationships: [];
      };
      collection_candidates: {
        Row: {
          audit_id: string;
          collection_id: string;
          competitors_count: number;
          created_at: string;
          domain: string;
          domain_rank: number | null;
          id: string;
          language: string | null;
          page_type: string | null;
          signal_count: number;
          sources: Json;
          spam_score: number | null;
          tactics: string[];
          title: string | null;
          url: string | null;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          collection_id: string;
          competitors_count?: number;
          created_at?: string;
          domain: string;
          domain_rank?: number | null;
          id?: string;
          language?: string | null;
          page_type?: string | null;
          signal_count?: number;
          sources?: Json;
          spam_score?: number | null;
          tactics: string[];
          title?: string | null;
          url?: string | null;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          collection_id?: string;
          competitors_count?: number;
          created_at?: string;
          domain?: string;
          domain_rank?: number | null;
          id?: string;
          language?: string | null;
          page_type?: string | null;
          signal_count?: number;
          sources?: Json;
          spam_score?: number | null;
          tactics?: string[];
          title?: string | null;
          url?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
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
          referring_domains: number | null;
          sample_url: string | null;
          score: number;
          selected: boolean;
          size_excluded: boolean;
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
          referring_domains?: number | null;
          sample_url?: string | null;
          score: number;
          selected?: boolean;
          size_excluded?: boolean;
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
          referring_domains?: number | null;
          sample_url?: string | null;
          score?: number;
          selected?: boolean;
          size_excluded?: boolean;
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
      contact_runs: {
        Row: {
          cost_usd: number;
          error_message: string | null;
          finished_at: string | null;
          plan_id: string;
          requested_by: string | null;
          started_at: string;
          stats: Json;
          status: string;
          workspace_id: string;
        };
        Insert: {
          cost_usd?: number;
          error_message?: string | null;
          finished_at?: string | null;
          plan_id: string;
          requested_by?: string | null;
          started_at?: string;
          stats?: Json;
          status: string;
          workspace_id: string;
        };
        Update: {
          cost_usd?: number;
          error_message?: string | null;
          finished_at?: string | null;
          plan_id?: string;
          requested_by?: string | null;
          started_at?: string;
          stats?: Json;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_runs_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: true;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_runs_workspace_id_fkey";
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
          public_audit_id: string | null;
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
          public_audit_id?: string | null;
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
          public_audit_id?: string | null;
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
            foreignKeyName: "cost_ledger_public_audit_id_fkey";
            columns: ["public_audit_id"];
            isOneToOne: false;
            referencedRelation: "public_audits";
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
      credits_ledger: {
        Row: {
          created_at: string;
          delta: number;
          id: string;
          idempotency_key: string | null;
          reason: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          id?: string;
          idempotency_key?: string | null;
          reason: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          id?: string;
          idempotency_key?: string | null;
          reason?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credits_ledger_workspace_id_fkey";
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
      draft_declines: {
        Row: {
          cost_usd: number;
          created_at: string;
          declined_by: string;
          page_url: string | null;
          plan_id: string;
          plan_item_id: string;
          reason: string;
          retry_requested: boolean;
          workspace_id: string;
        };
        Insert: {
          cost_usd?: number;
          created_at?: string;
          declined_by: string;
          page_url?: string | null;
          plan_id: string;
          plan_item_id: string;
          reason: string;
          retry_requested?: boolean;
          workspace_id: string;
        };
        Update: {
          cost_usd?: number;
          created_at?: string;
          declined_by?: string;
          page_url?: string | null;
          plan_id?: string;
          plan_item_id?: string;
          reason?: string;
          retry_requested?: boolean;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draft_declines_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_declines_plan_item_id_fkey";
            columns: ["plan_item_id"];
            isOneToOne: true;
            referencedRelation: "link_plan_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_declines_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      draft_runs: {
        Row: {
          cost_usd: number;
          error_message: string | null;
          finished_at: string | null;
          plan_id: string;
          requested_by: string | null;
          started_at: string;
          stats: Json;
          status: string;
          workspace_id: string;
        };
        Insert: {
          cost_usd?: number;
          error_message?: string | null;
          finished_at?: string | null;
          plan_id: string;
          requested_by?: string | null;
          started_at?: string;
          stats?: Json;
          status: string;
          workspace_id: string;
        };
        Update: {
          cost_usd?: number;
          error_message?: string | null;
          finished_at?: string | null;
          plan_id?: string;
          requested_by?: string | null;
          started_at?: string;
          stats?: Json;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draft_runs_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: true;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_runs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
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
      inbound_messages: {
        Row: {
          body_excerpt: string;
          classified_at: string | null;
          created_at: string;
          from_email: string | null;
          id: string;
          in_reply_to: string | null;
          kind: string;
          mailbox_id: string;
          match_method: string;
          message_id: string;
          received_at: string;
          sent_message_id: string;
          subject: string | null;
          workspace_id: string;
        };
        Insert: {
          body_excerpt?: string;
          classified_at?: string | null;
          created_at?: string;
          from_email?: string | null;
          id?: string;
          in_reply_to?: string | null;
          kind: string;
          mailbox_id: string;
          match_method: string;
          message_id: string;
          received_at: string;
          sent_message_id: string;
          subject?: string | null;
          workspace_id: string;
        };
        Update: {
          body_excerpt?: string;
          classified_at?: string | null;
          created_at?: string;
          from_email?: string | null;
          id?: string;
          in_reply_to?: string | null;
          kind?: string;
          mailbox_id?: string;
          match_method?: string;
          message_id?: string;
          received_at?: string;
          sent_message_id?: string;
          subject?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_messages_mailbox_id_fkey";
            columns: ["mailbox_id"];
            isOneToOne: false;
            referencedRelation: "mailboxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_messages_sent_message_id_fkey";
            columns: ["sent_message_id"];
            isOneToOne: false;
            referencedRelation: "sent_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_messages_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_prefs: {
        Row: {
          reply_waiting: boolean;
          to_validate: boolean;
          links: boolean;
          mailbox: boolean;
          new_sites: boolean;
          weekly: boolean;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          reply_waiting?: boolean;
          to_validate?: boolean;
          links?: boolean;
          mailbox?: boolean;
          new_sites?: boolean;
          weekly?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          reply_waiting?: boolean;
          to_validate?: boolean;
          links?: boolean;
          mailbox?: boolean;
          new_sites?: boolean;
          weekly?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      thread_reads: {
        Row: {
          read_at: string;
          read_by: string | null;
          sent_message_id: string;
          workspace_id: string;
        };
        Insert: {
          read_at?: string;
          read_by?: string | null;
          sent_message_id: string;
          workspace_id: string;
        };
        Update: {
          read_at?: string;
          read_by?: string | null;
          sent_message_id?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      thread_tags: {
        Row: {
          created_at: string;
          created_by: string | null;
          sent_message_id: string;
          tag: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          sent_message_id: string;
          tag: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          sent_message_id?: string;
          tag?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      inbox_states: {
        Row: {
          sent_message_id: string;
          state: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          sent_message_id: string;
          state: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          sent_message_id?: string;
          state?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inbox_states_sent_message_id_fkey";
            columns: ["sent_message_id"];
            isOneToOne: true;
            referencedRelation: "sent_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbox_states_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      link_checks: {
        Row: {
          anchor_found: string | null;
          checked_at: string;
          contextual: boolean | null;
          error: string | null;
          exact_page: boolean | null;
          found: boolean;
          http_status: number | null;
          id: string;
          indexable: boolean | null;
          link_id: string;
          milestone_day: number | null;
          outcome: string;
          rel: string | null;
          workspace_id: string;
        };
        Insert: {
          anchor_found?: string | null;
          checked_at?: string;
          contextual?: boolean | null;
          error?: string | null;
          exact_page?: boolean | null;
          found?: boolean;
          http_status?: number | null;
          id?: string;
          indexable?: boolean | null;
          link_id: string;
          milestone_day?: number | null;
          outcome: string;
          rel?: string | null;
          workspace_id: string;
        };
        Update: {
          anchor_found?: string | null;
          checked_at?: string;
          contextual?: boolean | null;
          error?: string | null;
          exact_page?: boolean | null;
          found?: boolean;
          http_status?: number | null;
          id?: string;
          indexable?: boolean | null;
          link_id?: string;
          milestone_day?: number | null;
          outcome?: string;
          rel?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "link_checks_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_checks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      link_opportunities: {
        Row: {
          audit_id: string;
          broken_checked_at: string | null;
          broken_http_status: number | null;
          broken_url: string | null;
          created_at: string;
          expected_link_type: string;
          id: string;
          offer: string | null;
          origin_query: string | null;
          plan_position: number | null;
          priority: string;
          priority_score: number;
          rationale: string;
          site_id: string;
          source_domain: string;
          source_title: string | null;
          source_url: string | null;
          status: string;
          target_page_url: string;
          type: string;
          url_exact: boolean;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          broken_checked_at?: string | null;
          broken_http_status?: number | null;
          broken_url?: string | null;
          created_at?: string;
          expected_link_type: string;
          id?: string;
          offer?: string | null;
          origin_query?: string | null;
          plan_position?: number | null;
          priority: string;
          priority_score: number;
          rationale: string;
          site_id: string;
          source_domain: string;
          source_title?: string | null;
          source_url?: string | null;
          status?: string;
          target_page_url: string;
          type: string;
          url_exact?: boolean;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          broken_checked_at?: string | null;
          broken_http_status?: number | null;
          broken_url?: string | null;
          created_at?: string;
          expected_link_type?: string;
          id?: string;
          offer?: string | null;
          origin_query?: string | null;
          plan_position?: number | null;
          priority?: string;
          priority_score?: number;
          rationale?: string;
          site_id?: string;
          source_domain?: string;
          source_title?: string | null;
          source_url?: string | null;
          status?: string;
          target_page_url?: string;
          type?: string;
          url_exact?: boolean;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "link_opportunities_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_opportunities_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_opportunities_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      link_plan_items: {
        Row: {
          anchor_kind: string;
          anchor_text: string;
          broken_url: string | null;
          expected_link_type: string;
          id: string;
          offer: string | null;
          opportunity_id: string | null;
          plan_id: string;
          position: number;
          priority: string;
          priority_score: number;
          rationale: string;
          source_domain: string;
          source_url: string | null;
          target_page_url: string;
          type: string;
          url_exact: boolean;
          workspace_id: string;
        };
        Insert: {
          anchor_kind: string;
          anchor_text: string;
          broken_url?: string | null;
          expected_link_type: string;
          id?: string;
          offer?: string | null;
          opportunity_id?: string | null;
          plan_id: string;
          position: number;
          priority: string;
          priority_score: number;
          rationale: string;
          source_domain: string;
          source_url?: string | null;
          target_page_url: string;
          type: string;
          url_exact?: boolean;
          workspace_id: string;
        };
        Update: {
          anchor_kind?: string;
          anchor_text?: string;
          broken_url?: string | null;
          expected_link_type?: string;
          id?: string;
          offer?: string | null;
          opportunity_id?: string | null;
          plan_id?: string;
          position?: number;
          priority?: string;
          priority_score?: number;
          rationale?: string;
          source_domain?: string;
          source_url?: string | null;
          target_page_url?: string;
          type?: string;
          url_exact?: boolean;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "link_plan_items_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_plan_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      link_plan_triage_runs: {
        Row: {
          cost_usd: number;
          error_message: string | null;
          finished_at: string | null;
          plan_id: string;
          requested_by: string | null;
          started_at: string;
          stats: Json;
          status: string;
          workspace_id: string;
        };
        Insert: {
          cost_usd?: number;
          error_message?: string | null;
          finished_at?: string | null;
          plan_id: string;
          requested_by?: string | null;
          started_at?: string;
          stats?: Json;
          status: string;
          workspace_id: string;
        };
        Update: {
          cost_usd?: number;
          error_message?: string | null;
          finished_at?: string | null;
          plan_id?: string;
          requested_by?: string | null;
          started_at?: string;
          stats?: Json;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "link_plan_triage_runs_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: true;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_plan_triage_runs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      link_plans: {
        Row: {
          audit_id: string;
          id: string;
          item_count: number;
          site_id: string;
          validated_at: string;
          validated_by: string | null;
          version: number;
          workspace_id: string;
        };
        Insert: {
          audit_id: string;
          id?: string;
          item_count: number;
          site_id: string;
          validated_at?: string;
          validated_by?: string | null;
          version: number;
          workspace_id: string;
        };
        Update: {
          audit_id?: string;
          id?: string;
          item_count?: number;
          site_id?: string;
          validated_at?: string;
          validated_by?: string | null;
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "link_plans_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_plans_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_plans_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      link_target_triage: {
        Row: {
          assessed_at: string;
          confidence: number | null;
          cost_usd: number;
          hook: string | null;
          id: string;
          needs_review: boolean;
          page_title: string | null;
          plan_id: string;
          plan_item_id: string;
          reason: string;
          resolved_url: string | null;
          source: string;
          url_origin: string | null;
          url_status: number | null;
          verdict: string;
          workspace_id: string;
        };
        Insert: {
          assessed_at?: string;
          confidence?: number | null;
          cost_usd?: number;
          hook?: string | null;
          id?: string;
          needs_review?: boolean;
          page_title?: string | null;
          plan_id: string;
          plan_item_id: string;
          reason: string;
          resolved_url?: string | null;
          source: string;
          url_origin?: string | null;
          url_status?: number | null;
          verdict: string;
          workspace_id: string;
        };
        Update: {
          assessed_at?: string;
          confidence?: number | null;
          cost_usd?: number;
          hook?: string | null;
          id?: string;
          needs_review?: boolean;
          page_title?: string | null;
          plan_id?: string;
          plan_item_id?: string;
          reason?: string;
          resolved_url?: string | null;
          source?: string;
          url_origin?: string | null;
          url_status?: number | null;
          verdict?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "link_target_triage_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_target_triage_plan_item_id_fkey";
            columns: ["plan_item_id"];
            isOneToOne: true;
            referencedRelation: "link_plan_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "link_target_triage_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      links: {
        Row: {
          alert: string | null;
          alert_at: string | null;
          anchor_found: string | null;
          attempts: number;
          checks_done: number;
          contextual: boolean | null;
          created_at: string;
          declared_at: string;
          exact_page: boolean | null;
          expected_anchor: string | null;
          first_live_at: string | null;
          http_status: number | null;
          id: string;
          indexable: boolean | null;
          last_checked_at: string | null;
          last_error: string | null;
          lost_at: string | null;
          next_check_at: string | null;
          origin: string;
          plan_item_id: string | null;
          rel: string | null;
          site_id: string;
          source_domain: string;
          source_url: string;
          status: string;
          target_url: string;
          workspace_id: string;
        };
        Insert: {
          alert?: string | null;
          alert_at?: string | null;
          anchor_found?: string | null;
          attempts?: number;
          checks_done?: number;
          contextual?: boolean | null;
          created_at?: string;
          declared_at?: string;
          exact_page?: boolean | null;
          expected_anchor?: string | null;
          first_live_at?: string | null;
          http_status?: number | null;
          id?: string;
          indexable?: boolean | null;
          last_checked_at?: string | null;
          last_error?: string | null;
          lost_at?: string | null;
          next_check_at?: string | null;
          origin?: string;
          plan_item_id?: string | null;
          rel?: string | null;
          site_id: string;
          source_domain: string;
          source_url: string;
          status?: string;
          target_url: string;
          workspace_id: string;
        };
        Update: {
          alert?: string | null;
          alert_at?: string | null;
          anchor_found?: string | null;
          attempts?: number;
          checks_done?: number;
          contextual?: boolean | null;
          created_at?: string;
          declared_at?: string;
          exact_page?: boolean | null;
          expected_anchor?: string | null;
          first_live_at?: string | null;
          http_status?: number | null;
          id?: string;
          indexable?: boolean | null;
          last_checked_at?: string | null;
          last_error?: string | null;
          lost_at?: string | null;
          next_check_at?: string | null;
          origin?: string;
          plan_item_id?: string | null;
          rel?: string | null;
          site_id?: string;
          source_domain?: string;
          source_url?: string;
          status?: string;
          target_url?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "links_plan_item_id_fkey";
            columns: ["plan_item_id"];
            isOneToOne: false;
            referencedRelation: "link_plan_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "links_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "links_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      mailboxes: {
        Row: {
          created_at: string;
          created_by: string | null;
          daily_cap: number;
          email: string;
          from_name: string;
          health: Json | null;
          hourly_cap: number;
          id: string;
          imap_host: string;
          imap_last_read_at: string | null;
          imap_last_uid: number;
          imap_ok: boolean | null;
          imap_port: number;
          imap_uid_validity: number | null;
          key_version: string;
          last_error: string | null;
          last_test_at: string | null;
          password_enc: string;
          send_days: number[];
          send_window_end: number;
          send_window_start: number;
          site_id: string;
          smtp_host: string;
          smtp_ok: boolean | null;
          smtp_port: number;
          status: string;
          timezone: string;
          updated_at: string;
          username: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          daily_cap?: number;
          email: string;
          from_name: string;
          health?: Json | null;
          hourly_cap?: number;
          id?: string;
          imap_host: string;
          imap_last_read_at?: string | null;
          imap_last_uid?: number;
          imap_ok?: boolean | null;
          imap_port: number;
          imap_uid_validity?: number | null;
          key_version: string;
          last_error?: string | null;
          last_test_at?: string | null;
          password_enc: string;
          send_days?: number[];
          send_window_end?: number;
          send_window_start?: number;
          site_id: string;
          smtp_host: string;
          smtp_ok?: boolean | null;
          smtp_port: number;
          status?: string;
          timezone?: string;
          updated_at?: string;
          username: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          daily_cap?: number;
          email?: string;
          from_name?: string;
          health?: Json | null;
          hourly_cap?: number;
          id?: string;
          imap_host?: string;
          imap_last_read_at?: string | null;
          imap_last_uid?: number;
          imap_ok?: boolean | null;
          imap_port?: number;
          imap_uid_validity?: number | null;
          key_version?: string;
          last_error?: string | null;
          last_test_at?: string | null;
          password_enc?: string;
          send_days?: number[];
          send_window_end?: number;
          send_window_start?: number;
          site_id?: string;
          smtp_host?: string;
          smtp_ok?: boolean | null;
          smtp_port?: number;
          status?: string;
          timezone?: string;
          updated_at?: string;
          username?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mailboxes_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mailboxes_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      manual_tasks: {
        Row: {
          created_at: string;
          done_at: string | null;
          follow_up_cancel_reason: string | null;
          follow_up_done_at: string | null;
          follow_up_due_at: string | null;
          follow_up_message: string | null;
          follow_up_status: string | null;
          form_url: string;
          id: string;
          message: string | null;
          plan_id: string;
          plan_item_id: string;
          status: string;
          type: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          done_at?: string | null;
          follow_up_cancel_reason?: string | null;
          follow_up_done_at?: string | null;
          follow_up_due_at?: string | null;
          follow_up_message?: string | null;
          follow_up_status?: string | null;
          form_url: string;
          id?: string;
          message?: string | null;
          plan_id: string;
          plan_item_id: string;
          status?: string;
          type?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          done_at?: string | null;
          follow_up_cancel_reason?: string | null;
          follow_up_done_at?: string | null;
          follow_up_due_at?: string | null;
          follow_up_message?: string | null;
          follow_up_status?: string | null;
          form_url?: string;
          id?: string;
          message?: string | null;
          plan_id?: string;
          plan_item_id?: string;
          status?: string;
          type?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manual_tasks_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manual_tasks_plan_item_id_fkey";
            columns: ["plan_item_id"];
            isOneToOne: true;
            referencedRelation: "link_plan_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manual_tasks_workspace_id_fkey";
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
      plans: {
        Row: {
          key: string;
          max_mailboxes: number;
          max_sites: number;
          monthly_audits: number;
          monthly_credits: number;
          monthly_send_cap: number;
          name: string;
          price_eur_cents: number;
          sort_order: number;
        };
        Insert: {
          key: string;
          max_mailboxes: number;
          max_sites: number;
          monthly_audits?: number;
          monthly_credits: number;
          monthly_send_cap: number;
          name: string;
          price_eur_cents: number;
          sort_order: number;
        };
        Update: {
          key?: string;
          max_mailboxes?: number;
          max_sites?: number;
          monthly_audits?: number;
          monthly_credits?: number;
          monthly_send_cap?: number;
          name?: string;
          price_eur_cents?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      public_audit_leads: {
        Row: {
          access_token: string;
          consent_at: string;
          created_at: string;
          email: string;
          id: string;
          public_audit_id: string;
          requester_hash: string | null;
        };
        Insert: {
          access_token: string;
          consent_at?: string;
          created_at?: string;
          email: string;
          id?: string;
          public_audit_id: string;
          requester_hash?: string | null;
        };
        Update: {
          access_token?: string;
          consent_at?: string;
          created_at?: string;
          email?: string;
          id?: string;
          public_audit_id?: string;
          requester_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "public_audit_leads_public_audit_id_fkey";
            columns: ["public_audit_id"];
            isOneToOne: false;
            referencedRelation: "public_audits";
            referencedColumns: ["id"];
          },
        ];
      };
      public_audits: {
        Row: {
          attempts: number;
          cost_usd: number | null;
          created_at: string;
          domain: string;
          error_code: string | null;
          error_message: string | null;
          estimated_cost_usd: number | null;
          finished_at: string | null;
          id: string;
          period_key: string;
          queries: string[];
          queries_source: string;
          requester_hash: string | null;
          result: Json;
          score: number | null;
          started_at: string | null;
          status: string;
        };
        Insert: {
          attempts?: number;
          cost_usd?: number | null;
          created_at?: string;
          domain: string;
          error_code?: string | null;
          error_message?: string | null;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          id?: string;
          period_key: string;
          queries?: string[];
          queries_source?: string;
          requester_hash?: string | null;
          result?: Json;
          score?: number | null;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          attempts?: number;
          cost_usd?: number | null;
          created_at?: string;
          domain?: string;
          error_code?: string | null;
          error_message?: string | null;
          estimated_cost_usd?: number | null;
          finished_at?: string | null;
          id?: string;
          period_key?: string;
          queries?: string[];
          queries_source?: string;
          requester_hash?: string | null;
          result?: Json;
          score?: number | null;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      rate_limit_hits: {
        Row: {
          bucket: string;
          created_at: string;
          id: number;
          key_hash: string;
        };
        Insert: {
          bucket: string;
          created_at?: string;
          id?: never;
          key_hash: string;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          id?: never;
          key_hash?: string;
        };
        Relationships: [];
      };
      reply_classifications: {
        Row: {
          action_status: string;
          category: string;
          confidence: number;
          cost_usd: number;
          created_at: string;
          follow_up_not_before: string | null;
          id: string;
          inbound_message_id: string;
          injection_suspected: boolean;
          justification: string;
          model: string | null;
          needs_review: boolean;
          proposed_action: string;
          sent_message_id: string;
          source: string;
          validated_at: string | null;
          validated_by: string | null;
          validated_category: string | null;
          workspace_id: string;
        };
        Insert: {
          action_status: string;
          category: string;
          confidence: number;
          cost_usd?: number;
          created_at?: string;
          follow_up_not_before?: string | null;
          id?: string;
          inbound_message_id: string;
          injection_suspected?: boolean;
          justification: string;
          model?: string | null;
          needs_review?: boolean;
          proposed_action: string;
          sent_message_id: string;
          source: string;
          validated_at?: string | null;
          validated_by?: string | null;
          validated_category?: string | null;
          workspace_id: string;
        };
        Update: {
          action_status?: string;
          category?: string;
          confidence?: number;
          cost_usd?: number;
          created_at?: string;
          follow_up_not_before?: string | null;
          id?: string;
          inbound_message_id?: string;
          injection_suspected?: boolean;
          justification?: string;
          model?: string | null;
          needs_review?: boolean;
          proposed_action?: string;
          sent_message_id?: string;
          source?: string;
          validated_at?: string | null;
          validated_by?: string | null;
          validated_category?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reply_classifications_inbound_message_id_fkey";
            columns: ["inbound_message_id"];
            isOneToOne: true;
            referencedRelation: "inbound_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_classifications_sent_message_id_fkey";
            columns: ["sent_message_id"];
            isOneToOne: false;
            referencedRelation: "sent_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_classifications_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      reply_drafts: {
        Row: {
          body: string;
          budget_cap_eur: number | null;
          cost_usd: number;
          created_at: string;
          edited: boolean;
          id: string;
          inbound_message_id: string;
          insertion: Json | null;
          kind: string;
          link_nature: string | null;
          payment_option: string | null;
          sent_message_id: string;
          source: string;
          status: string;
          subject: string | null;
          validated_at: string | null;
          validated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          body: string;
          budget_cap_eur?: number | null;
          cost_usd?: number;
          created_at?: string;
          edited?: boolean;
          id?: string;
          inbound_message_id: string;
          insertion?: Json | null;
          kind: string;
          link_nature?: string | null;
          payment_option?: string | null;
          sent_message_id: string;
          source: string;
          status?: string;
          subject?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          body?: string;
          budget_cap_eur?: number | null;
          cost_usd?: number;
          created_at?: string;
          edited?: boolean;
          id?: string;
          inbound_message_id?: string;
          insertion?: Json | null;
          kind?: string;
          link_nature?: string | null;
          payment_option?: string | null;
          sent_message_id?: string;
          source?: string;
          status?: string;
          subject?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reply_drafts_inbound_message_id_fkey";
            columns: ["inbound_message_id"];
            isOneToOne: false;
            referencedRelation: "inbound_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_drafts_sent_message_id_fkey";
            columns: ["sent_message_id"];
            isOneToOne: false;
            referencedRelation: "sent_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_drafts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      reply_sends: {
        Row: {
          attempts: number;
          body: string;
          claimed_at: string;
          created_at: string;
          dry_run: boolean;
          from_email: string | null;
          error: string | null;
          id: string;
          in_reply_to: string;
          inbound_message_id: string;
          mailbox_id: string | null;
          message_id: string;
          next_attempt_at: string | null;
          reply_draft_id: string;
          sent_at: string | null;
          sent_message_id: string;
          skip_reason: string | null;
          status: string;
          subject: string;
          to_email: string;
          workspace_id: string;
        };
        Insert: {
          attempts?: number;
          body: string;
          claimed_at?: string;
          created_at?: string;
          dry_run: boolean;
          from_email?: string | null;
          error?: string | null;
          id?: string;
          in_reply_to: string;
          inbound_message_id: string;
          mailbox_id?: string | null;
          message_id: string;
          next_attempt_at?: string | null;
          reply_draft_id: string;
          sent_at?: string | null;
          sent_message_id: string;
          skip_reason?: string | null;
          status: string;
          subject: string;
          to_email: string;
          workspace_id: string;
        };
        Update: {
          attempts?: number;
          body?: string;
          claimed_at?: string;
          created_at?: string;
          dry_run?: boolean;
          from_email?: string | null;
          error?: string | null;
          id?: string;
          in_reply_to?: string;
          inbound_message_id?: string;
          mailbox_id?: string | null;
          message_id?: string;
          next_attempt_at?: string | null;
          reply_draft_id?: string;
          sent_at?: string | null;
          sent_message_id?: string;
          skip_reason?: string | null;
          status?: string;
          subject?: string;
          to_email?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reply_sends_inbound_message_id_fkey";
            columns: ["inbound_message_id"];
            isOneToOne: false;
            referencedRelation: "inbound_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_sends_mailbox_id_fkey";
            columns: ["mailbox_id"];
            isOneToOne: false;
            referencedRelation: "mailboxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_sends_reply_draft_id_fkey";
            columns: ["reply_draft_id"];
            isOneToOne: false;
            referencedRelation: "reply_drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_sends_sent_message_id_fkey";
            columns: ["sent_message_id"];
            isOneToOne: false;
            referencedRelation: "sent_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_sends_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      reply_signals: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          received_at: string;
          sent_message_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          received_at?: string;
          sent_message_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          received_at?: string;
          sent_message_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reply_signals_sent_message_id_fkey";
            columns: ["sent_message_id"];
            isOneToOne: false;
            referencedRelation: "sent_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reply_signals_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      sent_messages: {
        Row: {
          attempts: number;
          batch_id: string;
          body: string;
          claimed_at: string;
          created_at: string;
          draft_id: string;
          dry_run: boolean;
          from_email: string | null;
          error: string | null;
          follow_up_due_at: string | null;
          id: string;
          in_reply_to: string | null;
          mailbox_id: string | null;
          message_id: string;
          next_attempt_at: string | null;
          plan_id: string;
          sent_at: string | null;
          skip_reason: string | null;
          status: string;
          step: string;
          subject: string;
          to_email: string;
          workspace_id: string;
        };
        Insert: {
          attempts?: number;
          batch_id: string;
          body: string;
          claimed_at?: string;
          created_at?: string;
          draft_id: string;
          dry_run: boolean;
          from_email?: string | null;
          error?: string | null;
          follow_up_due_at?: string | null;
          id?: string;
          in_reply_to?: string | null;
          mailbox_id?: string | null;
          message_id: string;
          next_attempt_at?: string | null;
          plan_id: string;
          sent_at?: string | null;
          skip_reason?: string | null;
          status: string;
          step?: string;
          subject: string;
          to_email: string;
          workspace_id: string;
        };
        Update: {
          attempts?: number;
          batch_id?: string;
          body?: string;
          claimed_at?: string;
          created_at?: string;
          draft_id?: string;
          dry_run?: boolean;
          from_email?: string | null;
          error?: string | null;
          follow_up_due_at?: string | null;
          id?: string;
          in_reply_to?: string | null;
          mailbox_id?: string | null;
          message_id?: string;
          next_attempt_at?: string | null;
          plan_id?: string;
          sent_at?: string | null;
          skip_reason?: string | null;
          status?: string;
          step?: string;
          subject?: string;
          to_email?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sent_messages_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sent_messages_draft_id_fkey";
            columns: ["draft_id"];
            isOneToOne: false;
            referencedRelation: "target_drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sent_messages_mailbox_id_fkey";
            columns: ["mailbox_id"];
            isOneToOne: false;
            referencedRelation: "mailboxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sent_messages_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sent_messages_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      site_logos: {
        Row: {
          site_id: string;
          mime: string;
          data_base64: string;
          updated_at: string;
        };
        Insert: {
          site_id: string;
          mime: string;
          data_base64: string;
          updated_at?: string;
        };
        Update: {
          site_id?: string;
          mime?: string;
          data_base64?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_logos_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: true;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      site_catalogue: {
        Row: {
          description: string;
          heading: string;
          read_at: string;
          site_id: string;
          source: string;
          title: string;
          url: string;
          workspace_id: string;
        };
        Insert: {
          description?: string;
          heading?: string;
          read_at?: string;
          site_id: string;
          source?: string;
          title?: string;
          url: string;
          workspace_id: string;
        };
        Update: {
          description?: string;
          heading?: string;
          read_at?: string;
          site_id?: string;
          source?: string;
          title?: string;
          url?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_catalogue_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_catalogue_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      site_pages: {
        Row: {
          content: string;
          description: string;
          read_at: string;
          site_id: string;
          title: string;
          url: string;
          workspace_id: string;
        };
        Insert: {
          content?: string;
          description?: string;
          read_at?: string;
          site_id: string;
          title?: string;
          url: string;
          workspace_id: string;
        };
        Update: {
          content?: string;
          description?: string;
          read_at?: string;
          site_id?: string;
          title?: string;
          url?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_pages_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_pages_workspace_id_fkey";
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
          goal: string;
          founder_role: string | null;
          founder_confirmed_at: string | null;
          target_keywords: string[];
          sender_email: string | null;
          signature_first_name: string | null;
          signature_last_name: string | null;
          signature_show_site: boolean;
          signature_linkedin_url: string | null;
          signature_phone: string | null;
          signature_logo_token: string | null;
          counterparts: string[];
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
          goal?: string;
          founder_role?: string | null;
          founder_confirmed_at?: string | null;
          target_keywords?: string[];
          sender_email?: string | null;
          signature_first_name?: string | null;
          signature_last_name?: string | null;
          signature_show_site?: boolean;
          signature_linkedin_url?: string | null;
          signature_phone?: string | null;
          signature_logo_token?: string | null;
          counterparts?: string[];
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
          goal?: string;
          founder_role?: string | null;
          founder_confirmed_at?: string | null;
          target_keywords?: string[];
          sender_email?: string | null;
          signature_first_name?: string | null;
          signature_last_name?: string | null;
          signature_show_site?: boolean;
          signature_linkedin_url?: string | null;
          signature_phone?: string | null;
          signature_logo_token?: string | null;
          counterparts?: string[];
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
      stripe_events: {
        Row: {
          id: string;
          livemode: boolean;
          received_at: string;
          type: string;
        };
        Insert: {
          id: string;
          livemode?: boolean;
          received_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          livemode?: boolean;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          livemode: boolean;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          livemode?: boolean;
          plan: string;
          status: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          livemode?: boolean;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_fkey";
            columns: ["plan"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      suppressions: {
        Row: {
          created_at: string;
          domain: string | null;
          email: string | null;
          id: string;
          reason: string;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string;
          domain?: string | null;
          email?: string | null;
          id?: string;
          reason?: string;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string;
          domain?: string | null;
          email?: string | null;
          id?: string;
          reason?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "suppressions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      target_contacts: {
        Row: {
          assessed_at: string;
          contact_url: string | null;
          cost_usd: number;
          email: string | null;
          email_source: string | null;
          form_url: string | null;
          id: string;
          plan_id: string;
          plan_item_id: string;
          reason: string;
          sendable: boolean;
          status: string;
          verification: string;
          verifier: string | null;
          workspace_id: string;
        };
        Insert: {
          assessed_at?: string;
          contact_url?: string | null;
          cost_usd?: number;
          email?: string | null;
          email_source?: string | null;
          form_url?: string | null;
          id?: string;
          plan_id: string;
          plan_item_id: string;
          reason: string;
          sendable?: boolean;
          status: string;
          verification?: string;
          verifier?: string | null;
          workspace_id: string;
        };
        Update: {
          assessed_at?: string;
          contact_url?: string | null;
          cost_usd?: number;
          email?: string | null;
          email_source?: string | null;
          form_url?: string | null;
          id?: string;
          plan_id?: string;
          plan_item_id?: string;
          reason?: string;
          sendable?: boolean;
          status?: string;
          verification?: string;
          verifier?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "target_contacts_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "target_contacts_plan_item_id_fkey";
            columns: ["plan_item_id"];
            isOneToOne: true;
            referencedRelation: "link_plan_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "target_contacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      target_drafts: {
        Row: {
          body: string;
          channel: string;
          cost_usd: number;
          edited_at: string | null;
          edited_by_user: boolean;
          generated_at: string;
          hook: string;
          id: string;
          lint_issues: Json;
          plan_id: string;
          plan_item_id: string;
          proposed_url: string;
          ready: boolean;
          review_note: string | null;
          status: string;
          subject: string | null;
          targeting_reason: string;
          url_checked_at: string | null;
          url_status: number | null;
          workspace_id: string;
        };
        Insert: {
          body: string;
          channel: string;
          cost_usd?: number;
          edited_at?: string | null;
          edited_by_user?: boolean;
          generated_at?: string;
          hook: string;
          id?: string;
          lint_issues?: Json;
          plan_id: string;
          plan_item_id: string;
          proposed_url: string;
          ready?: boolean;
          review_note?: string | null;
          status?: string;
          subject?: string | null;
          targeting_reason: string;
          url_checked_at?: string | null;
          url_status?: number | null;
          workspace_id: string;
        };
        Update: {
          body?: string;
          channel?: string;
          cost_usd?: number;
          edited_at?: string | null;
          edited_by_user?: boolean;
          generated_at?: string;
          hook?: string;
          id?: string;
          lint_issues?: Json;
          plan_id?: string;
          plan_item_id?: string;
          proposed_url?: string;
          ready?: boolean;
          review_note?: string | null;
          status?: string;
          subject?: string | null;
          targeting_reason?: string;
          url_checked_at?: string | null;
          url_status?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "target_drafts_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "link_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "target_drafts_plan_item_id_fkey";
            columns: ["plan_item_id"];
            isOneToOne: true;
            referencedRelation: "link_plan_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "target_drafts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          autonomy_level: string;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          plan: string;
        };
        Insert: {
          autonomy_level?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          plan?: string;
        };
        Update: {
          autonomy_level?: string;
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
      analysis_step_update: {
        Args: {
          p_audit: string;
          p_counters?: Json | null;
          p_error?: string | null;
          p_example?: string | null;
          p_key: string;
          p_status?: string | null;
        };
        Returns: boolean;
      };
      analysis_reset_steps: {
        Args: { p_audit: string; p_steps: string[] };
        Returns: undefined;
      };
      create_link_plan: {
        Args: { p_audit_id: string; p_items: Json; p_user_id: string };
        Returns: {
          plan_id: string;
          version: number;
        }[];
      };
      domains_contacted_elsewhere: {
        Args: { p_days?: number; p_domains: string[]; p_workspace: string };
        Returns: string[];
      };
      has_workspace_role: {
        Args: { roles: string[]; ws: string };
        Returns: boolean;
      };
      is_workspace_member: { Args: { ws: string }; Returns: boolean };
      public_audit_spend_since: { Args: { p_since: string }; Returns: number };
      rate_limit_hit: {
        Args: {
          p_bucket: string;
          p_key_hash: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: {
          allowed: boolean;
          hits: number;
          retry_after_seconds: number;
        }[];
      };
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
