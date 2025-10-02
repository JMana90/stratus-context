
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database['public']['Tables']['organizations']['Row'];
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];

export const organizationService = {
  async getOrganizations() {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members(
          role,
          user_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createOrganization(organization: OrganizationInsert) {
    const { data, error } = await supabase
      .from('organizations')
      .insert(organization)
      .select()
      .single();

    if (error) throw error;

    // Add the creator as owner in organization_members
    await supabase
      .from('organization_members')
      .insert({
        organization_id: data.id,
        user_id: data.owner_id,
        role: 'owner'
      });

    return data;
  },

  async getCurrentUserOrganization() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data?.organization;
  }
};
