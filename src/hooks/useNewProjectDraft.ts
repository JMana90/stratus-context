import { useCallback, useEffect, useMemo, useState } from "react";

export type NewProjectDraft = {
  name: string;
  industry: string; // "general" | …
  location?: string;
  type?: string; // project type option
  integrations?: { salesforce?: boolean; slack?: boolean; gmail?: boolean; outlook?: boolean; [key: string]: any };
  recommendedWidgets?: string[]; // chosen checkboxes
};

const STORAGE_KEY = "stratus:new-project-draft";

function loadDraft(): NewProjectDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        name: "",
        industry: "general",
        ...parsed,
      } as NewProjectDraft;
    }
  } catch {}
  return {
    name: "",
    industry: "general",
  };
}

export function useNewProjectDraft(): [
  NewProjectDraft,
  (patch: Partial<NewProjectDraft>) => void,
  () => void
] {
  const [draft, setDraft] = useState<NewProjectDraft>(() => loadDraft());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  const patch = useCallback((patch: Partial<NewProjectDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setDraft({ name: "", industry: "general" });
  }, []);

  return [draft, patch, clear];
}
