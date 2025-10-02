import { supabase } from "@/integrations/supabase/client";
import type { ProjectActionItem } from "@/types/canonical";

async function listOpen(projectId: string): Promise<ProjectActionItem[]> {
  const { data, error } = await supabase
    .from('project_action_items' as any)
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'done')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as ProjectActionItem[]) || [];
}

async function insertMany(
  projectId: string,
  items: Array<Omit<ProjectActionItem, "id" | "created_at" | "updated_at" | "project_id" | "created_by">>
): Promise<ProjectActionItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const itemsWithDefaults = items.map(item => ({
    ...item,
    project_id: projectId,
    created_by: user.id,
    status: item.status || 'open' as const,
    due_date: item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : null
  }));

  const { data, error } = await supabase
    .from('project_action_items' as any)
    .insert(itemsWithDefaults)
    .select();

  if (error) throw error;
  return (data as unknown as ProjectActionItem[]) || [];
}

async function updateStatus(id: string, status: "open"|"done"|"blocked") {
  const { error } = await supabase
    .from('project_action_items' as any)
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

async function update(id: string, patch: Partial<Pick<ProjectActionItem, 'due_date' | 'notes' | 'status' | 'owner'>>) {
  const updateData: any = {};
  
  if (patch.due_date !== undefined) {
    updateData.due_date = patch.due_date ? new Date(patch.due_date).toISOString().split('T')[0] : null;
  }
  if (patch.notes !== undefined) {
    updateData.notes = patch.notes;
  }
  if (patch.status !== undefined) {
    updateData.status = patch.status;
  }
  if (patch.owner !== undefined) {
    updateData.owner = patch.owner;
  }

  const { error } = await supabase
    .from('project_action_items' as any)
    .update(updateData)
    .eq('id', id);

  if (error) throw error;
}

export const actionItemsService = {
  listOpen,
  insertMany,
  updateStatus,
  update
};
