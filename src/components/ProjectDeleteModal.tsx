// src/components/ProjectDeleteModal.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** OPTIONAL: show a project name in the prompt */
  projectName?: string;
  /** Set true while the delete mutation is running (disables the button) */
  isDeleting?: boolean;
  /** The actual delete action – REQUIRED */
  onConfirm: (options?: { exportBeforeDelete: boolean; format: "md" | "json" }) => void | Promise<void>;
};

export default function ProjectDeleteModal({
  isOpen,
  onClose,
  projectName,
  isDeleting = false,
  onConfirm,
}: Props) {
  // ✅ Hooks must be inside the function body
  const [exportBeforeDelete, setExportBeforeDelete] = React.useState<boolean>(true);
  const [exportFormat, setExportFormat] = React.useState<"md" | "json">("md");

  return (
    <Dialog
      open={isOpen}
      // If TS complains about the callback signature, use the wrapper:
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <DialogContent>
        <DialogTitle>Delete Project</DialogTitle>

        <p className="text-sm text-slate-400">
          Are you sure you want to delete{" "}
          <strong>{projectName ?? "this project"}</strong>? This action cannot
          be undone.
        </p>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={exportBeforeDelete}
              onChange={(e) => setExportBeforeDelete(e.target.checked)}
            />
            <span className="text-sm">Export project summary before deletion</span>
          </label>

          <div className="flex items-center gap-2 pl-6">
            <span className="text-xs w-28">Format:</span>
            <select
              className="border rounded p-1 text-sm"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as "md" | "json")}
              disabled={!exportBeforeDelete}
            >
              <option value="md">Markdown (.md)</option>
              <option value="json">JSON (.json)</option>
            </select>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              onConfirm({
                exportBeforeDelete,
                format: exportFormat,
              })
            }
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
