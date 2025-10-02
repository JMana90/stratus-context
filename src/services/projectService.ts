// src/services/projectService.ts
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// helper: current user id
async function getUserIdStrict(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

/* ---------- Row/Insert/Update types ---------- */
export type ProjectRow   = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert= Database["public"]["Tables"]["projects"]["Insert"];

export type PhaseRow     = Database["public"]["Tables"]["project_phases"]["Row"];
export type PhaseInsert  = Database["public"]["Tables"]["project_phases"]["Insert"];
export type PhaseUpdate  = Database["public"]["Tables"]["project_phases"]["Update"];

/* ---------- Service ---------- */
export const projectService = {
  /* Projects -------------------------------------------------- */
  async getUserProjects(userId: string): Promise<ProjectRow[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("created_by", userId)          // uses your real column
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async hasUserProjects(userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId);

    if (error) throw error;
    return (count ?? 0) > 0;
  },

  // Keep this if other parts of the app still call it
  async getProjects(): Promise<ProjectRow[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async getProject(id: string): Promise<ProjectRow & { project_members?: any[] }> {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        project_members(
          role,
          user_id
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(orgId: string, name: string, industry: string) {
    const userId = await getUserIdStrict();
  
    // Try RPC that enforces quotas if it exists
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc("create_project_with_cap", { org_id: orgId, name, industry })
      .single();
  
    if (!rpcErr && rpcData) {
      return rpcData as string; // <- createdProjectId
    }
  
    // Fallback: direct insert if RPC not present
    const { data: direct, error: insertErr } = await supabase
      .from("projects")
      .insert({
        organization_id: orgId,
        name,
        industry,
        created_by: userId,
      })
      .select("id")
      .single();
  
    if (insertErr || !direct?.id) {
      throw insertErr ?? new Error("Project insert failed");
    }
  
    return direct.id as string; // <- createdProjectId
  },

  async createProject(data: {
    name: string;
    organization_id: string;
    created_by: string;
    status?: string;
    description?: string;
    industry?: string;
    location?: string;
    project_type?: string;
  }): Promise<ProjectRow> {
    const { data: project, error } = await supabase
      .from("projects")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return project;
  },

  async createProjectWithCap(
    organizationId: string,
    name: string,
    industry?: string,
    location?: string,
    description?: string,
    project_type?: string
  ): Promise<ProjectRow> {
    try {
      // Try the RPC function first, but fall back to direct insert if subscriptions table doesn't exist
      const { data, error } = await supabase.rpc("create_project_with_cap", {
        org_id: organizationId,
        name: name,
        industry: industry || null,
        location: location || null,
        description: description || null,
        project_type: project_type || null,
      });

      if (error) {
        console.warn("RPC create_project_with_cap failed, falling back to direct insert:", error);
        // Fall back to direct project creation without cap check
        return await this.createProject({
          name,
          organization_id: organizationId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          industry: industry || null,
          location: location || null,
          description: description || null,
          project_type: project_type || null,
          status: 'active'
        });
      }
      
      // Return the created project by fetching it
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", data)
        .single();

      if (fetchError) throw fetchError;
      console.log("Project created:", project.id);
      return project;
    } catch (error: any) {
      console.error("Error in createProjectWithCap:", error);
      throw error;
    }
  },

  async getProjectCount(organizationId: string): Promise<number> {
    const { count, error } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .neq("status", "deleted");

    if (error) throw error;
    return count || 0;
  },

  async getProjectLimit(organizationId: string): Promise<{ current: number; limit: number; plan: string }> {
    // Get current count
    const current = await this.getProjectCount(organizationId);
    
    // For now, default to free plan limits until subscription system is fully implemented
    // This can be enhanced later when subscription schema is available
    let plan: string = "free"; // TODO: Replace with actual subscription lookup
    
    let limit: number;
    if (plan === "professional") {
      limit = 5;
    } else if (plan === "enterprise") {
      limit = 999999;
    } else {
      limit = 1; // free plan
    }

    return { current, limit, plan };
  },

  async updateProject(id: string, updates: Partial<ProjectRow>): Promise<ProjectRow> {
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await (supabase as any).rpc("delete_project_cascade", { p_project_id: id });
    if (error) throw error;
  },

  /* Phases ---------------------------------------------------- */
  async getPhasesForProject(projectId: string): Promise<PhaseRow[]> {
    const { data, error } = await supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

// --- upsertPhase: handles both Insert & Update via narrowing on "id" ---
async upsertPhase(
  phase: PhaseInsert | PhaseUpdate
): Promise<PhaseRow> {
  if ("id" in phase && phase.id) {
    // UPDATE path
    const { id, ...rest } = phase;
  const { data, error } = await supabase
    .from("project_phases")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
  }

  // INSERT path
  const insertPayload = phase as PhaseInsert;
  const { data, error } = await supabase
    .from("project_phases")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data;
},


  async deletePhase(phaseId: string): Promise<void> {
    const { error } = await supabase
      .from("project_phases")
      .delete()
      .eq("id", phaseId);

    if (error) throw error;
  },

  async getIntegrationPrefs(projectId: string): Promise<Record<string, boolean>> {
    const { data, error } = await supabase
      .from("projects")
      .select("integrations_prefs")
      .eq("id", projectId)
      .single();
    if (error) throw error;
    return (data?.integrations_prefs as Record<string, boolean>) ?? {};
  },

  async saveIntegrationPrefs(projectId: string, prefs: Record<string, boolean>): Promise<void> {
    const { error } = await supabase
      .from("projects")
      .update({ integrations_prefs: prefs })
      .eq("id", projectId);
    if (error) throw error;
  }
};
