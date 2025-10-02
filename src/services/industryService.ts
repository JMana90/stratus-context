// src/services/industryService.ts
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_TEMPLATES, INDUSTRY_OPTIONS, type IndustryKey } from "@/config/industries";

type IndustryProfileRow = Database["public"]["Tables"]["industry_profiles"]["Row"];
type ChecklistTemplateRow = Database["public"]["Tables"]["checklist_templates"]["Row"];
type ChecklistTemplateInsert = Database["public"]["Tables"]["checklist_templates"]["Insert"];
type StatusSummaryRow = Database["public"]["Tables"]["status_summaries"]["Row"];

export const industryService = {
  async getIndustryProfile(projectId: string): Promise<IndustryProfileRow | null> {
    const { data, error } = await supabase
      .from("industry_profiles")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async setIndustryProfile(projectId: string, industry: IndustryKey): Promise<IndustryProfileRow> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // upsert by unique(project_id)
    const { data, error } = await supabase
      .from("industry_profiles")
      .upsert({
        project_id: projectId,
        industry,
        created_by: user.id,
      }, { onConflict: "project_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data!;
  },

  async listTemplatesByIndustry(industry: IndustryKey): Promise<ChecklistTemplateRow[]> {
    if (industry === "general") {
      // Show all global templates or none – your choice
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .order("key", { ascending: true });
      if (error) throw error;
      return data ?? [];
    }
    const { data, error } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("industry", industry)
      .order("key", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  /** Seed default templates for an industry if missing */
  async seedTemplatesIfMissing(industry: IndustryKey): Promise<void> {
    if (industry === "general") return;

    const existing = await this.listTemplatesByIndustry(industry);
    if (existing.length > 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const defaults = DEFAULT_TEMPLATES[industry] ?? [];
    if (!defaults.length) return;

    const payload: ChecklistTemplateInsert[] = defaults.map((t) => ({
      industry,
      key: t.key,
      items: t.items as unknown as any, // jsonb
      created_by: user.id,
    }));

    const { error } = await supabase.from("checklist_templates").insert(payload);
    if (error) throw error;
  },

  /** Call edge function to generate a status summary and persist it */
  async generateStatusSummary(projectId: string): Promise<StatusSummaryRow> {
    const res = await fetch("/functions/v1/llm_summarize_status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to summarize");

    const { data, error } = await supabase
      .from("status_summaries")
      .insert({
        project_id: projectId,
        summary: json.summary ?? "",
        source: json.source ?? {},
        created_by: json.created_by ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data!;
  },

  async listRecentSummaries(projectId: string, limit = 5): Promise<StatusSummaryRow[]> {
    const { data, error } = await supabase
      .from("status_summaries")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // Add missing methods that components are calling
  async getStatusSummaries(projectId: string): Promise<StatusSummaryRow[]> {
    return this.listRecentSummaries(projectId);
  },

  async createStatusSummary(projectId: string): Promise<StatusSummaryRow> {
    return this.generateStatusSummary(projectId);
  },

  async logActivity(projectId: string, action: string, meta: any = {}): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("activity_log")
      .insert({
        project_id: projectId,
        action,
        actor: user.id,
        meta,
      });
    if (error) throw error;
  },
};
