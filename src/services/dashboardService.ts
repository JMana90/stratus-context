import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { WidgetId } from "@/config/industry-widgets";

// Import synonyms from the config
import { WIDGET_SYNONYMS } from "@/config/industry-widgets";

// Map the selection UI keys to real widget ids used by the dashboard.
const WIDGET_ID_MAP: Record<string, WidgetId | undefined> = {
  // Budget variants
  "budget": "budget-overview",
  "budget-overview": "budget-overview",
  
  // Documents variants  
  "documents": "doc-repo",
  "document-repository": "doc-repo", 
  "doc-repo": "doc-repo",
  
  // Contacts variants
  "contacts": "project-contacts",
  "contacts-list": "project-contacts",
  "project-contacts": "project-contacts",
  
  // Photos variants
  "photos": "project-photos", 
  "project-photos": "project-photos",
  
  // Delays variants
  "delays": "delay-tracker",
  "delay-tracker": "delay-tracker",
  
  // Timeline/Gantt variants
  "timeline": "timeline",
  "gantt": "timeline",
  "gantt-chart": "timeline",
  "time-tracking": "timeline",
  
  // Meeting minutes
  "meeting-minutes": "meeting-minutes",
  
  // Include synonyms from config
  ...WIDGET_SYNONYMS,
  
  // Ignored (always-on or unimplemented)
  "project-status": undefined,
  "project-overview": undefined, 
  "action-items": undefined,
  "compliance": undefined,
};

// Valid widget IDs that can be stored in DB
const ALLOWED_WIDGETS = new Set<WidgetId>([
  "budget-overview",
  "project-contacts", 
  "doc-repo",
  "project-photos",
  "delay-tracker",
  "timeline",
  "meeting-minutes",
]);

/**
 * Normalize a list of UI-selected ids into the internal widget ids your
 * dashboard uses. Unknown ids are dropped; duplicates are removed.
 */
export function normalizeWidgetIds(input: (string | WidgetId)[]): WidgetId[] {
  const mapped: WidgetId[] = [];

  for (const raw of input) {
    const key = String(raw);
    const internal = WIDGET_ID_MAP[key];
    if (internal && ALLOWED_WIDGETS.has(internal)) {
      mapped.push(internal);
    } else if (key && !WIDGET_ID_MAP.hasOwnProperty(key)) {
      console.warn("Unknown widget id:", key);
    }
  }

  // Remove duplicates
  return Array.from(new Set(mapped));
}


type DashboardRow = Database['public']['Tables']['dashboards']['Row'];
type DashboardInsert = Database['public']['Tables']['dashboards']['Insert'];

export const dashboardService = {
  async getDashboard(projectId: string) {
    const { data, error } = await supabase
      .from('dashboards')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createDashboard(dashboard: DashboardInsert) {
    const { data, error } = await supabase
      .from('dashboards')
      .insert(dashboard)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDashboard(projectId: string, updates: Partial<DashboardRow>) {
    const { data, error } = await supabase
      .from('dashboards')
      .update(updates)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateWidgets(id: string, widgets: string[]) {
    const { error } = await supabase
      .from('dashboards')
      .update({ widgets })
      .eq('id', id);
  
    if (error) throw error;
  },
  
  async deleteDashboard(projectId: string) {
    const { error } = await supabase
      .from('dashboards')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;
  },

  async hasDashboard(projectId: string) {
    const { data, error } = await supabase
      .from('dashboards')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },


  async getWidgets(projectId: string): Promise<string[] | null> {
    const { data, error } = await supabase
      .from("dashboards")
      .select("widgets")
      .eq("project_id", projectId)
      .maybeSingle();
  
    if (error) throw error;
    return Array.isArray(data?.widgets) ? data.widgets as string[] : null;
  },

  async setWidgets(projectId: string, widgets: string[]) {
    const { data: existing } = await supabase
      .from("dashboards")
      .select("id")
      .eq("project_id", projectId)
      .single();
  
    if (existing) {
      const { error } = await supabase
        .from("dashboards")
        .update({ widgets })
        .eq("project_id", projectId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("dashboards")
        .insert({ project_id: projectId, widgets });
      if (error) throw error;
    }
  },
  
  async applyIndustryDefaults(projectId: string, industry: string, extras?: string[]) {
    const { INDUSTRY_WIDGETS } = await import("@/config/industry-widgets");
    const base = INDUSTRY_WIDGETS[(industry as any)] ?? INDUSTRY_WIDGETS.general;
    const widgets = Array.from(new Set([...(base ?? []), ...(extras ?? [])]));

    // Single atomic upsert to avoid RLS race conditions and ensure idempotency
    const { error } = await supabase
      .from("dashboards")
      .upsert(
        { project_id: projectId, widgets },
        { onConflict: "project_id" }
      );

    if (error) throw error;
  },

  async getDefaultWidgets(industry: string): Promise<{ widgets: string[]; addons: string[]; all: string[] }> {
    const { INDUSTRY_WIDGETS, INDUSTRY_RECOMMENDED } = await import("@/config/industry-widgets");
    const widgets = (INDUSTRY_WIDGETS[(industry as any)] ?? INDUSTRY_WIDGETS.general) as string[];
    const addons = (INDUSTRY_RECOMMENDED[(industry as any)] ?? []) as string[];
    const all = Array.from(new Set([...(widgets ?? []), ...(addons ?? [])]));
    return { widgets, addons, all };
  },

  async applySelectedWidgets(projectId: string, widgetIds: WidgetId[] | string[]) {
    const final = normalizeWidgetIds(widgetIds as string[]);
  
      // Persist in a single upsert row (assuming a dashboards table with
      // project_id (PK) and widgets (text[]) columns).
      const { error } = await supabase
        .from("dashboards")
        .upsert(
          { project_id: projectId, widgets: final },
          { onConflict: "project_id" }
        );
  
      if (error) throw error;
    },
};