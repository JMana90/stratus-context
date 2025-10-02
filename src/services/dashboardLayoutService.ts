import { supabase } from "@/integrations/supabase/client";
import type { ProjectDashboardLayout } from "@/types/canonical";

async function getLayout(projectId: string, role: string): Promise<ProjectDashboardLayout | null> {
  const { data, error } = await supabase
    .from('project_dashboard_layouts' as any)
    .select('*')
    .eq('project_id', projectId)
    .eq('role', role)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ProjectDashboardLayout | null;
}

async function saveLayout(projectId: string, role: string, widgets: string[]) {
  // First, unset any existing default for this project/role
  await supabase
    .from('project_dashboard_layouts' as any)
    .update({ is_default: false })
    .eq('project_id', projectId)
    .eq('role', role);

  // Then insert or update the new layout as default
  const { error } = await supabase
    .from('project_dashboard_layouts' as any)
    .upsert({
      project_id: projectId,
      role,
      layout_json: { widgets },
      is_default: true
    }, {
      onConflict: 'project_id,role,is_default'
    });

  if (error) throw error;
}

export const dashboardLayoutService = {
  getLayout,
  saveLayout
};
