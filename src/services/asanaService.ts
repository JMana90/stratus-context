import { supabase } from "@/integrations/supabase/client";

export interface AsanaUser {
  gid: string;
  name: string;
  email?: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  assignee?: {
    gid: string;
    name: string;
  } | null;
  completed: boolean;
  due_on?: string | null;
  resource_subtype: string;
  permalink_url: string;
}

export class AsanaService {
  /**
   * Test connection by calling /me endpoint
   */
  async testConnection(): Promise<{ success: boolean; user?: AsanaUser; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke("asana_proxy", {
        body: { 
          method: "GET",
          endpoint: "/me"
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        return { success: false, error: data.message || "Connection failed" };
      }

      return { success: true, user: data.data };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to test connection" };
    }
  }

  /**
   * List tasks for a specific Asana project
   */
  async listProjectTasks(projectId: string): Promise<{ success: boolean; tasks?: AsanaTask[]; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke("asana_proxy", {
        body: { 
          method: "GET",
          endpoint: `/projects/${projectId}/tasks`,
          params: {
            limit: "50",
            opt_fields: "name,assignee.name,completed,due_on,resource_subtype,permalink_url"
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        return { success: false, error: data.message || "Failed to fetch tasks" };
      }

      return { success: true, tasks: data.data || [] };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to fetch tasks" };
    }
  }
}

export const asanaService = new AsanaService();