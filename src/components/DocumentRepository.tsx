// src/components/DocumentRepository.tsx
import React, { useState, useEffect, ChangeEvent } from "react";
import { documentService } from "@/services/documentService";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { categoryService, CategoryRow } from "@/services/categoryService";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
// Define types locally since they're not in the types file
interface DocumentRow {
  id: string;
  project_id: string;
  name: string;
  file_path: string;
  category?: string | null;
  suggested_category?: string | null;
  checklist_items?: any;
  created_at: string;
  uploaded_by: string;
  mime_type?: string | null;
  file_size?: number | null;
}

interface DocumentVersionRow {
  id: string;
  document_id: string;
  version: number;
  storage_path: string;
  uploaded_at: string;
  uploaded_by: string;
}
import { Table, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export function DocumentRepository({ projectId, showHeader = false }: { projectId: string; showHeader?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // --- state
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [historyDoc, setHistoryDoc] = useState<{ id: string; name: string } | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ docId: string; category: string; checklist: string[] } | null>(null);

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [checklistData, setChecklistData] = useState<{ docId: string; checklist: string[] } | null>(null);
  // ─────────── New Category State Hooks ───────────
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);
  const [categorySuggestions, setCategorySuggestions] = useState<string[] | null>(null);
  const [categorySuggesting, setCategorySuggesting] = useState(false);
  const [category, setCategory] = useState<string>("");
  // ──────────────────────────────────────────────────

  // load docs
  const reload = async () => {
    const list = await documentService.listDocuments(projectId);
    setDocs(list);
  };
  useEffect(() => { reload(); }, [projectId]);

  // ─────────── Load Categories on Mount ───────────
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await categoryService.listCategories(projectId);
      setCategories(cats);
      if (cats.length) setSelectedCategory(cats[0]);
    };
    loadCategories();
  }, [projectId]);
  // ────────────────────────────────────────────────


  // --- upload flow
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setSelectedFile(e.target.files[0]);
  };
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const newDoc = await documentService.uploadDocument(projectId, selectedFile, category);
      setDocs((prev) => [newDoc as any, ...prev]);
      setCategory("");
      setSelectedFile(null);
      // Invalidate and refresh
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      await reload();
      toast({ title: 'Upload complete', description: `${newDoc.name} uploaded successfully.` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Unable to upload file', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // --- version history
  const showHistory = async (doc: DocumentRow) => {
    setHistoryDoc({ id: doc.id, name: doc.name });
    setHistoryLoading(true);
    const data = await documentService.getVersionHistory(doc.id);
    setVersions(data);
    setHistoryLoading(false);
  };

  // --- AI suggestions (category + checklist)
  const handleSuggest = async (docId: string) => { /* existing */ };

  // --- NEW: generate checklist
  const handleGenerateChecklist = async (docId: string) => {
    setGeneratingId(docId);
    const result = await documentService.generateSuggestions(docId);
    setChecklistData({ docId, checklist: result.checklist });
    setGeneratingId(null);
  };
  const applyChecklist = async () => {
    if (!checklistData) return;
    await documentService.saveSuggestions(checklistData.docId, '', checklistData.checklist);
    setChecklistData(null);
    await reload();
  };

  return (
    <div className="p-4 space-y-6">
      {showHeader && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Document Repository</h2>
        </div>
      )}
      {/* Upload controls */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* ─────────── Category Selector + Suggest ─────────── */}
        <div className="flex-1 min-w-[240px] flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1 border rounded w-full text-left">
                {selectedCategory?.name || "Select Category"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map((c) => (
                <DropdownMenuItem key={c.id} onSelect={() => setSelectedCategory(c)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={async () => {
                  const name = prompt("Enter new category name:");
                  if (!name || !user) return;
                  const newCat = await categoryService.createCategory({
                    project_id: projectId,
                    name,
                    created_by: user.id,
                  });
                  setCategories((prev) => [...prev, newCat]);
                  setSelectedCategory(newCat);
                }}
              >
                + New Category…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      
          <button
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedCategory || categorySuggesting}
            onClick={async () => {
              if (!selectedCategory) return;
              setCategorySuggesting(true);
              try {
                const checks = await categoryService.generateCategorySuggestions(
                  selectedCategory.id
                );
                setCategorySuggestions(checks);
              } finally {
                setCategorySuggesting(false);
              }
            }}
          >
            {categorySuggesting ? "Suggesting…" : "Suggest"}
          </button>
        </div>
        {/* ─────────────────────────────────────────────────────── */}
      
        {/* Compact uploader */}
        <div className="flex items-center gap-2">
          <input
            id="upload-doc"
            name="upload-doc"
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <label
            htmlFor="upload-doc"
            className="px-3 py-1 border rounded cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Choose file
          </label>
          <span className="text-sm text-muted-foreground max-w-[220px] truncate">
            {selectedFile ? selectedFile.name : "No file selected"}
          </span>
          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
                Uploading…
              </span>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </div>

      {/* Documents list */}
      <div className="mt-4 min-h-[4rem]">
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell className="text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{doc.category || doc.suggested_category || '-'}</TableCell>
                  <TableCell>{new Date(doc.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <a
                      className="underline text-primary"
                      href={documentService.getDownloadUrl(doc.file_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                    <button className="underline" onClick={() => showHistory(doc)}>History</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Checklist Popover */}
      {checklistData && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div 
            className="
              bg-white text-slate-900 
              dark:bg-slate-900 dark:text-slate-100 
              p-4 rounded shadow-lg w-96 
              border border-slate-200 dark:border-slate-700
            "
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-semibold mb-2">Checklist Suggestions</h4>
            <ul className="list-disc list-inside mb-4">
              {checklistData.checklist.map((item,i)=><li key={i}>{item}</li>)}
            </ul>
            <div className="flex justify-end space-x-2">
              <Button onClick={()=>setChecklistData(null)}>Cancel</Button>
              <Button onClick={applyChecklist}>Apply</Button>
            </div>
          </div>
        </div>
      )}

    {/* AI Suggestions Popover */}
    {suggestions && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div
          className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6 rounded shadow-lg w-96 border border-slate-200 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-2">AI Suggestions</h3>
    
          {/* Category input */}
          <label className="block mb-2">
            <span className="text-sm">Category</span>
            <input
              type="text"
              value={suggestions.category}
              onChange={(e) =>
                setSuggestions((s) => s && { ...s, category: e.target.value })
              }
              className="mt-1 block w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded p-2"
            />
          </label>
    
          {/* Checklist list */}
          <div className="mb-4">
            <span className="text-sm font-medium">Checklist</span>
            <ul className="list-disc list-inside mt-1 text-sm">
              {suggestions.checklist.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
    
          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button onClick={() => setSuggestions(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!suggestions) return;
                // Save edits
                await documentService.saveSuggestions(
                  suggestions.docId,
                  suggestions.category,
                  suggestions.checklist
                );
                // Close popover
                setSuggestions(null);
                // Refresh list
                await reload();
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    )}

      
      {/* Version History Modal */}
      {historyDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={()=>setHistoryDoc(null)}>
          <div
              className="
                bg-white text-slate-900
                dark:bg-slate-900 dark:text-slate-100
                p-6 rounded-lg shadow-lg
                border border-slate-200 dark:border-slate-700
              "
              onClick={(e) => e.stopPropagation()}
            >
            <h3 className="font-semibold mb-2">History for {historyDoc.name}</h3>
            {historyLoading?<p>Loading…</p>:versions.length===0?<p>No history.</p>:(
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Ver</TableCell>
                    <TableCell>Uploaded At</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map(v=>(
                    <TableRow key={v.id}>
                      <TableCell>{v.version}</TableCell>
                      <TableCell>{new Date(v.uploaded_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <a href={documentService.getDownloadUrl(v.storage_path)} target="_blank">Download</a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Button className="mt-4" onClick={()=>setHistoryDoc(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
