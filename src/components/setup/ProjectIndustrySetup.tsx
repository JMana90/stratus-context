// src/components/setup/ProjectIndustrySetup.tsx
import React from "react";
import SectionCard from "@/components/cards/SectionCard";
import { industryService } from "@/services/industryService";
import { INDUSTRY_OPTIONS, type IndustryKey } from "@/config/industry-widgets";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { NewProjectDraft } from "@/hooks/useNewProjectDraft";
import { Badge } from "@/components/ui/badge";
import { dashboardService } from "@/services/dashboardService";
import { normalizeWidgetIds } from "@/services/dashboardService";

/**
 * Recommended add-ons by industry.
 * These are *optional* widgets layered on top of industry defaults.
 */
const RECOMMENDED_ADDONS_BY_INDUSTRY: Record<IndustryKey, string[]> = {
  general:       ["project-photos", "delay-tracker"],
  construction:  ["project-photos", "delay-tracker"],
  manufacturing: ["project-photos", "delay-tracker"],
  pharma:        [],
  financial:     [],
  software:      [],
};

type Props = {
  projectId: string;
  onSaved: () => void;
  onBack?: () => void;
  /** Wizard flow only */
  draft?: NewProjectDraft;
  patchDraft?: (patch: Partial<NewProjectDraft>) => void;
};

export default function ProjectIndustrySetup({
  projectId,
  onSaved,
  onBack,
  draft,
  patchDraft,
}: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Are we in the wizard (draft present) or standalone?
  const usingDraft = Boolean(draft && patchDraft);

  // Industry source:
  // - wizard: from draft.industry
  // - standalone: load from industry profile (fallback to "general")
  const [industry, setIndustry] = React.useState<IndustryKey>(
    (draft?.industry as IndustryKey) || "general"
  );

  // Available suggested add-ons for this industry (from defaults helper)
  const [availableAddons, setAvailableAddons] = React.useState<string[]>([]);
  // Local selection state only for standalone mode
  const [addons, setAddons] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState<boolean>(false);

  const selectedIds = usingDraft ? (draft?.recommendedWidgets ?? []) : [];
  const selectedCount = React.useMemo(
    () => normalizeWidgetIds(selectedIds).length,
    [selectedIds]
  );
  
  // Load industry when not using draft (standalone mode)
  React.useEffect(() => {
    if (usingDraft) return; // wizard provides industry in draft
    let active = true;
    (async () => {
      try {
        const prof = await industryService.getIndustryProfile(projectId);
        if (!active) return;
        const key = (prof?.industry?.toLowerCase() ?? "general") as IndustryKey;
        setIndustry(key);
      } catch {
        // keep "general"
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId, usingDraft]);

  // Load available industry defaults & suggested add-ons
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        // If you have a helper that returns { core, addons }:
        //   const defs = await dashboardService.getDefaultWidgets(industry);
        //   setAvailableAddons(defs.addons ?? []);
        //
        // If not, use the local RECOMMENDED_ADDONS_BY_INDUSTRY map:
        const rec = RECOMMENDED_ADDONS_BY_INDUSTRY[industry] ?? [];
        if (!active) return;
        setAvailableAddons(rec);

        // Initialize wizard draft recommendedWidgets to []
        if (usingDraft && patchDraft) {
          const current = draft?.recommendedWidgets ?? [];
          if (!current || current.length === 0) {
            patchDraft({ recommendedWidgets: [] });
          }
        } else {
          // standalone: clear local selection on industry change
          setAddons([]);
        }
      } catch (e) {
        console.error("Failed to load industry defaults", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [industry, usingDraft, draft, patchDraft]);

  // Helpers for selecting add-ons
  const toggleAddon = (id: string) => {
    if (usingDraft && patchDraft) {
      const cur = (draft?.recommendedWidgets ?? []) as string[];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      patchDraft({ recommendedWidgets: next });
      return;
    }
    setAddons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const industryLabel =
    INDUSTRY_OPTIONS.find((i) => i.value === industry)?.label ?? industry;

  return (
    <SectionCard title="Recommended Add-Ons">
      <div className="space-y-4">
        {/* Header + controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Industry: {industryLabel}</Badge>

          <button
            className="px-3 py-1 border rounded"
            onClick={() => (onBack ? onBack() : navigate(-1))}
          >
            Back
          </button>

            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={saving}
              onClick={async () => {
                if (usingDraft) {
                  // In the wizard, defaults & finalization happen later as part of project creation.
                  onSaved();
                  return;
                }
                try {
                  setSaving(true);

                  // Standalone:
                  // 1) Apply industry defaults
                  await dashboardService.applyIndustryDefaults(projectId, industry);

                  // 2) Append selected add-ons (avoid duplicates)
                  if (addons.length > 0) {
                    const current = await dashboardService.getWidgets(projectId);
                    const merged = Array.from(new Set([...(current ?? []), ...addons]));
                    await dashboardService.setWidgets(projectId, merged);
                  }

                  toast({ title: "Saved", description: "Dashboard updated with recommended add-ons." });
                } catch (e) {
                  console.error(e);
                  toast({ title: "Error", description: "Failed to apply changes.", variant: "destructive" });
                } finally {
                  setSaving(false);
                  onSaved();
                }
              }}
            >
              {saving ? "Applying…" : "Save & Continue"}
            </button>

          <span className="text-xs text-muted-foreground">
            Selected: {selectedCount} widget{selectedCount !== 1 ? "s" : ""}
          </span>
          
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={saving}
            onClick={async () => {
              try {
                if (usingDraft && patchDraft) {
                  // Wizard: just clear selected add-ons in draft
                  patchDraft({ recommendedWidgets: [] });
                } else {
                  // Standalone: revert project dashboard to industry defaults
                  await dashboardService.applyIndustryDefaults(projectId, industry);
                  setAddons([]);
                }
                toast({ title: "Reset", description: "Restored industry defaults." });
              } catch (e) {
                console.error(e);
                toast({ title: "Error", description: "Could not reset defaults.", variant: "destructive" });
              }
            }}
          >
            Reset to Defaults
          </button>
        </div>

        {/* Add-on selector */}
        <div className="mt-2">
          <div className="text-sm font-medium mb-2">Select recommended add-ons</div>
          <p className="text-xs text-muted-foreground mb-2">
            These are optional. Industry defaults have already been applied (or will be during project creation).
          </p>

          <div className="flex flex-wrap gap-3">
            {availableAddons.length === 0 ? (
              <div className="text-sm text-muted-foreground">No suggestions for this industry.</div>
            ) : (
              availableAddons.map((id) => {
                const checked = usingDraft
                  ? ((draft?.recommendedWidgets ?? []) as string[]).includes(id)
                  : addons.includes(id);

                return (
                  <label key={id} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={() => toggleAddon(id)}
                      name={`addon-${id}`}
                    />
                    <span className="capitalize">{id.replace(/-/g, " ")}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
