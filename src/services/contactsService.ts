import { supabase } from "@/integrations/supabase/client";
import type { ProjectContact } from "@/types/canonical";

async function list(projectId: string, search?: string): Promise<ProjectContact[]> {
  let q = supabase.from("project_contacts").select("*").eq("project_id", projectId);
  if (search) q = q.ilike("name", `%${search}%`).or(`email.ilike.%${search}%`);
  const { data, error } = await q.order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectContact[];
}

async function createMany(projectId: string, items: Array<
  Pick<ProjectContact, "name"|"email"|"role"|"phone">
>) {
  const rows = items.map(i => ({ 
    ...i, 
    project_id: projectId,
    email: i.email || 'no-email@example.com' // Ensure required field
  }));
  const { error } = await supabase.from("project_contacts").insert(rows);
  if (error) throw error;
}

async function update(contactId: string, patch: Partial<ProjectContact>) {
  const { error } = await supabase.from("project_contacts").update(patch).eq("id", contactId);
  if (error) throw error;
}

async function remove(contactId: string) {
  const { error } = await supabase.from("project_contacts").delete().eq("id", contactId);
}

export const contactsService = {
  list,
  createMany,
  update,
  remove
};
