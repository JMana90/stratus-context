// src/components/IndustrySelector.tsx
import React, { useEffect, useState } from "react";
import { INDUSTRY_OPTIONS, type IndustryKey } from "@/config/industry-widgets";
import { industryService } from "@/services/industryService";
import { Button } from "@/components/ui/button";

export function IndustrySelector({
  projectId,
  onComplete,
}: { projectId: string; onComplete?: () => void }) {
  const [industry, setIndustry] = useState<IndustryKey>("software");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const profile = await industryService.getIndustryProfile(projectId);
      if (profile) {
        setExisting(profile.industry);
        setIndustry(profile.industry as IndustryKey);
      }
    })();
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    try {
      await industryService.setIndustryProfile(projectId, industry);
      await industryService.seedTemplatesIfMissing(industry);
      onComplete?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 border rounded space-y-3">
      <h3 className="text-lg font-semibold">Project Industry</h3>
      <select
        value={industry}
        onChange={(e) => setIndustry(e.target.value as IndustryKey)}
        className="border rounded p-2 w-full"
      >
        {INDUSTRY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {existing ? `Current: ${existing}` : "First‑time setup"}
        </span>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
