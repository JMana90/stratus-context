import { supabase } from "@/integrations/supabase/client";

export type DelayRow = {
  id: string;
  project_id: string;
  reason: string;
  category: string;
  start_date: string;
  end_date?: string;
  notes?: string;
  reported_by: string;
  created_at?: string;
};

export type DelayInsert = Omit<DelayRow, "id" | "created_at" | "reported_by">;

export const delayService = {
  async list(projectId: string): Promise<DelayRow[]> {
    const { data, error } = await supabase
      .from("project_delays")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: Omit<DelayInsert, "reported_by">): Promise<DelayRow> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw authError ?? new Error("Not authenticated");

    const payload = { ...input, reported_by: authData.user.id } as any;
    const { data, error } = await supabase
      .from("project_delays")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as DelayRow;
  },
};