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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          meta: Json
          project_id: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          id?: string
          meta?: Json
          project_id: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          meta?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          industry: string
          items: Json
          key: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          industry: string
          items?: Json
          key: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          industry?: string
          items?: Json
          key?: string
        }
        Relationships: []
      }
      dashboards: {
        Row: {
          created_at: string
          id: string
          project_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          document_id: string
          id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          document_id: string
          id?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
          version: number
        }
        Update: {
          document_id?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          checklist_items: Json | null
          created_at: string
          current_version: number
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          project_id: string
          suggested_category: string | null
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          checklist_items?: Json | null
          created_at?: string
          current_version?: number
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          suggested_category?: string | null
          uploaded_by: string
        }
        Update: {
          category?: string | null
          checklist_items?: Json | null
          created_at?: string
          current_version?: number
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          suggested_category?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_profiles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          industry: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          industry: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          industry?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          access_token: string | null
          account_label: string | null
          created_at: string
          expires_at: string | null
          id: string
          instance_url: string | null
          metadata: Json
          organization_id: string
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          instance_url?: string | null
          metadata?: Json
          organization_id: string
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          instance_url?: string | null
          metadata?: Json
          organization_id?: string
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_requests: {
        Row: {
          created_at: string
          id: string
          integration_type: string
          justification: string | null
          organization_id: string
          project_id: string
          provider_id: string
          provider_name: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_type: string
          justification?: string | null
          organization_id: string
          project_id: string
          provider_id: string
          provider_name: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_type?: string
          justification?: string | null
          organization_id?: string
          project_id?: string
          provider_id?: string
          provider_name?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string | null
          source: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name?: string | null
          source?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string | null
          source?: string | null
        }
        Relationships: []
      }
      meeting_minutes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          minutes_json: Json
          occurred_at: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          minutes_json?: Json
          occurred_at?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          minutes_json?: Json
          occurred_at?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_connections: {
        Row: {
          access_token: string
          account_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          organization_id: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          account_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          provider: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_integrations: {
        Row: {
          configuration: Json
          created_at: string
          created_by: string
          id: string
          integration_type: string
          is_active: boolean
          organization_id: string
          provider_id: string
          provider_name: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          created_by: string
          id?: string
          integration_type: string
          is_active?: boolean
          organization_id: string
          provider_id: string
          provider_name: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          created_by?: string
          id?: string
          integration_type?: string
          is_active?: boolean
          organization_id?: string
          provider_id?: string
          provider_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      phase_tasks: {
        Row: {
          created_at: string | null
          depends_on: string | null
          description: string | null
          due_date: string | null
          id: string
          phase_id: string | null
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id?: string | null
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id?: string | null
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "phase_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          project_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          project_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          project_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dashboards: {
        Row: {
          created_at: string
          id: string
          layout: Json
          project_id: string
          updated_at: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          project_id: string
          updated_at?: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          project_id?: string
          updated_at?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fk_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_delays: {
        Row: {
          category: string
          created_at: string | null
          end_date: string | null
          id: string
          notes: string | null
          project_id: string
          reason: string
          reported_by: string
          start_date: string
        }
        Insert: {
          category: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id: string
          reason: string
          reported_by: string
          start_date: string
        }
        Update: {
          category?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          reason?: string
          reported_by?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_delays_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_integrations: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          is_enabled: boolean
          organization_integration_id: string
          project_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_integration_id: string
          project_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_integration_id?: string
          project_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_organization_integration_id_fkey"
            columns: ["organization_integration_id"]
            isOneToOne: false
            referencedRelation: "organization_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          order_index: number | null
          percent_complete: number | null
          project_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          order_index?: number | null
          percent_complete?: number | null
          project_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          order_index?: number | null
          percent_complete?: number | null
          project_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          project_id: string
          taken_at: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          taken_at?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          taken_at?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          ai_suggested: boolean
          assignee: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          phase_id: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_suggested?: boolean
          assignee?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_suggested?: boolean
          assignee?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          phase_id?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          last_run_at: string | null
          next_run_at: string | null
          preferences_json: Json
          project_id: string
          schedule_rrule: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          preferences_json?: Json
          project_id: string
          schedule_rrule?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          preferences_json?: Json
          project_id?: string
          schedule_rrule?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_context: Json | null
          created_at: string
          created_by: string
          current_phase: string | null
          description: string | null
          id: string
          industry: string | null
          integrations_prefs: Json
          location: string | null
          name: string
          organization_id: string
          project_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_context?: Json | null
          created_at?: string
          created_by: string
          current_phase?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          integrations_prefs?: Json
          location?: string | null
          name: string
          organization_id: string
          project_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_context?: Json | null
          created_at?: string
          created_by?: string
          current_phase?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          integrations_prefs?: Json
          location?: string | null
          name?: string
          organization_id?: string
          project_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      status_summaries: {
        Row: {
          created_at: string
          created_by: string
          id: string
          project_id: string
          source: Json
          summary: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          source?: Json
          summary: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          source?: Json
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string
          created_at: string
          format: string
          id: string
          meta_json: Json
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          format?: string
          id?: string
          meta_json?: Json
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          format?: string
          id?: string
          meta_json?: Json
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      update_drafts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          project_id: string
          sections_json: Json
          template_id: string
          timeframe_days: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          sections_json: Json
          template_id: string
          timeframe_days?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          sections_json?: Json
          template_id?: string
          timeframe_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "update_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_drafts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_project_integration_mappings: {
        Row: {
          created_at: string | null
          is_enabled: boolean | null
          mapping_id: string | null
          org_configuration: Json | null
          org_is_active: boolean | null
          org_status: string | null
          organization_integration_id: string | null
          project_configuration: Json | null
          project_id: string | null
          project_settings: Json | null
          provider: string | null
          provider_id: string | null
          provider_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_organization_integration_id_fkey"
            columns: ["organization_integration_id"]
            isOneToOne: false
            referencedRelation: "organization_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_invite_to_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      create_project_with_cap: {
        Args: {
          description?: string
          industry?: string
          location?: string
          name: string
          org_id: string
          project_type?: string
        }
        Returns: string
      }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      has_salesforce_connection: {
        Args: { _org_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string }
        Returns: boolean
      }
      revoke_integration_connection: {
        Args: { _org_id: string; _provider: string; _user_scoped?: boolean }
        Returns: undefined
      }
      upsert_salesforce_connection: {
        Args: {
          _access_token: string
          _expires_in_sec: number
          _instance_url: string
          _org_id: string
          _refresh_token: string
          _scopes: string[]
          _user_scoped: boolean
        }
        Returns: string
      }
    }
    Enums: {
      task_status: "todo" | "in_progress" | "blocked" | "done"
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
  public: {
    Enums: {
      task_status: ["todo", "in_progress", "blocked", "done"],
    },
  },
} as const
