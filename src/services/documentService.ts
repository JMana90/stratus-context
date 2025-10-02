import { supabase } from "@/integrations/supabase/client";

// Define types since they may not be in the generated types yet
type DocumentRow = {
  id: string;
  name: string;
  project_id: string;
  file_path: string;
  uploaded_by: string;
  created_at: string;
  category?: string;
  suggested_category?: string;
  checklist_items?: any;
  file_size?: number;
  mime_type?: string;
  current_version: number;
};

type DocumentInsert = Omit<DocumentRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

type DocumentVersionRow = {
  id: string;
  document_id: string;
  version: number;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
};

type DocumentVersionInsert = Omit<DocumentVersionRow, 'id' | 'uploaded_at'> & {
  id?: string;
  uploaded_at?: string;
};

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

export const documentService = {
  async listDocuments(projectId: string): Promise<DocumentRow[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async uploadDocument(
    projectId: string,
    file: File,
    category?: string | null
  ): Promise<DocumentRow> {
    const userId = await getUserId();

    // build a storage path
    const id = crypto.randomUUID();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const filePath = `projects/${projectId}/${id}.${ext}`;

    // 1) Storage upload
    const { error: uploadError } = await supabase
      .storage
      .from("documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        metadata: { project_id: projectId },
      });

    if (uploadError) throw uploadError;

    // 2) Insert into documents (only columns that are in your schema)
    const insertDoc: DocumentInsert = {
      project_id: projectId,
      name: file.name,
      file_path: filePath,
      uploaded_by: userId,
      current_version: 1,
      // add only if your schema actually has it:
      ...(category ? { category } : {}),
    };

    const { data: docRow, error: docErr } = await supabase
      .from("documents")
      .insert(insertDoc)
      .select("*")
      .single();

    if (docErr || !docRow) throw docErr ?? new Error("Insert failed");

    // 3) Insert first version row
    const versionInsert: DocumentVersionInsert = {
      document_id: docRow.id,
      version: 1,
      storage_path: filePath,
      uploaded_by: userId,
    };

    const { error: verErr } = await supabase
      .from("document_versions")
      .insert(versionInsert);

    if (verErr) throw verErr;

    return docRow;
  },

  async getVersionHistory(documentId: string): Promise<DocumentVersionRow[]> {
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("version", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  getDownloadUrl(path: string): string {
    return supabase.storage.from("documents").getPublicUrl(path).data.publicUrl;
  },

  /**
   * Lightweight AI suggestion stub:
   * - Pulls the document name
   * - Calls your (placeholder) AI endpoint
   * - Persists suggestions into columns that exist in your 'documents' table:
   *   suggested_category (text) and checklist_items (text[]).
   */
  async generateSuggestions(
    documentId: string
  ): Promise<{ category: string; checklist: string[] }> {
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("name")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) throw docErr ?? new Error("Document not found");

    // Call your AI worker/edge function (replace path if yours differs)
    const aiRes = await fetch("/.netlify/functions/lovable-llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `For a document titled "${doc.name}", suggest one best-fit category and 5 key checklist items as JSON.`,
      }),
    });

    if (!aiRes.ok) throw new Error("AI request failed");

    const parsed = await aiRes.json();
    const category = parsed?.category ?? "General";
    const checklist: string[] = Array.isArray(parsed?.checklist)
      ? parsed.checklist
      : [];

    // Persist to documents table (columns must exist in your schema)
    const { error: updErr } = await supabase
      .from("documents")
      .update({
        suggested_category: category,
        checklist_items: checklist,
      })
      .eq("id", documentId);

    if (updErr) throw updErr;

    return { category, checklist };
  },

  async saveSuggestions(
    documentId: string,
    category: string,
    checklist: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from("documents")
      .update({
        suggested_category: category,
        checklist_items: checklist,
      })
      .eq("id", documentId);

    if (error) throw error;
  },
};
