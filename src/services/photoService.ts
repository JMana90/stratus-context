import { supabase } from "@/integrations/supabase/client";

export type PhotoRow = {
  id: string;
  project_id: string;
  url: string;
  caption?: string;
  taken_at?: string;
  uploaded_by: string;
  created_at?: string;
};

export type PhotoInsert = Omit<PhotoRow, "id" | "created_at" | "uploaded_by">;

export const photoService = {
  async list(projectId: string): Promise<PhotoRow[]> {
    // Mock data - table doesn't exist yet
    return [];
  },

  async create(input: { project_id: string; url: string; caption?: string; taken_at?: string }): Promise<PhotoRow> {
    // Mock implementation - table doesn't exist yet
    const mockPhoto: PhotoRow = {
      id: crypto.randomUUID(),
      project_id: input.project_id,
      url: input.url,
      caption: input.caption,
      taken_at: input.taken_at || new Date().toISOString(),
      uploaded_by: "mock-user",
      created_at: new Date().toISOString(),
    };
    return mockPhoto;
  },
};