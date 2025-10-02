import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TaskRow = Database["public"]["Tables"]["project_tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["project_tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["project_tasks"]["Update"];

export const taskService = {
  async listByProject(projectId: string): Promise<TaskRow[]> {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async listByPhase(phaseId: string): Promise<TaskRow[]> {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("phase_id", phaseId)
      .order("due_date", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

   // --- upsert: handles both Insert & Update via narrowing on "id" ---
  async upsert(
    task: TaskInsert | TaskUpdate
  ): Promise<TaskRow> {
    // UPDATE if an `id` is present
    if ("id" in task && task.id) {
      const { id, ...rest } = task;
    const { data, error } = await supabase
      .from("project_tasks")
      .update(rest)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
    }

    // INSERT path
    const insertPayload = task as TaskInsert;
  const { data, error } = await supabase
    .from("project_tasks")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data;
  },


  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("project_tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Returns the single "next" task: first not-done task with the earliest due_date.
   */
  async getNextTask(projectId: string): Promise<TaskRow | null> {
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  }
};
