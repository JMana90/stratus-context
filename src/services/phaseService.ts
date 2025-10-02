import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PhaseRow = Database["public"]["Tables"]["project_phases"]["Row"];
type PhaseInsert = Database["public"]["Tables"]["project_phases"]["Insert"];

export const phaseService = {
  async list(projectId: string): Promise<PhaseRow[]> {
    const { data, error } = await supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async create(phase: PhaseInsert): Promise<PhaseRow> {
    const { data, error } = await supabase
      .from("project_phases")
      .insert(phase)
      .select()
      .single();
    if (error) throw error;
    return data!;
  },

  async update(id: string, updates: Partial<PhaseRow>): Promise<PhaseRow> {
    const { data, error } = await supabase
      .from("project_phases")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data!;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("project_phases")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
