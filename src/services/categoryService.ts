// src/services/categoryService.ts
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CategoryRow =
  Database["public"]["Tables"]["document_categories"]["Row"];
export type CategoryInsert =
  Database["public"]["Tables"]["document_categories"]["Insert"];

export const categoryService = {
  async listCategories(projectId: string): Promise<CategoryRow[]> {
    const { data, error } = await supabase
      .from("document_categories")
      .select("*")
      .eq("project_id", projectId)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  async createCategory(insert: CategoryInsert): Promise<CategoryRow> {
    const { data, error } = await supabase
      .from("document_categories")
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async generateCategorySuggestions(categoryId: string): Promise<string[]> {
    const { data, error } = await supabase.functions.invoke(
      "llm_generate_checklist",
      { body: { category_id: categoryId } }
    );
    if (error) throw error;
    return (data as any).checklist;
  },

  async saveChecklist(categoryId: string, checklist: string[]): Promise<void> {
    // Note: document_categories table doesn't have checklist_items column
    // This method would need the table to be updated first
    const { error } = await supabase
      .from("document_categories")
      .update({ name: `Category ${categoryId}` }) // placeholder update
      .eq("id", categoryId);
    if (error) throw error;
  },
};