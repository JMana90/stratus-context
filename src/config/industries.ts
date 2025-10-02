// src/config/industries.ts
export type IndustryKey =
  | "software"
  | "financial"
  | "pharma"
  | "construction"
  | "manufacturing"
  | "general";

export const INDUSTRY_OPTIONS: Array<{ key: IndustryKey; label: string }> = [
  { key: "software", label: "Software / Tech" },
  { key: "financial", label: "Financial Services" },
  { key: "pharma", label: "Pharma / Life Sciences" },
  { key: "construction", label: "Construction / Engineering" },
  { key: "manufacturing", label: "Manufacturing / Industrial" },
  { key: "general", label: "General (Custom)" },
];

// Minimal default template library (you can expand anytime)
export const DEFAULT_TEMPLATES: Record<
  Exclude<IndustryKey, "general">,
  Array<{ key: string; items: string[] }>
> = {
  software: [
    { key: "release-readiness", items: ["QA signoff", "Changelog drafted", "Rollback plan", "Stakeholder comms"] },
    { key: "sprint-close", items: ["Demo prepared", "Bugs triaged", "Retrospective notes", "Velocity recorded"] },
  ],
  financial: [
    { key: "quarterly-compliance", items: ["SOX evidences", "Access reviews", "Reconciliation complete", "Exception log reviewed"] },
  ],
  pharma: [
    { key: "ind-pack", items: ["Form 1571", "CMC summary", "Nonclinical overview", "Clinical protocol synopsis"] },
  ],
  construction: [
    { key: "permit-package", items: ["Site plan", "Zoning letter", "Environmental assessment", "Fee receipt"] },
  ],
  manufacturing: [
    { key: "ecn-checklist", items: ["Spec updated", "BOM impact", "Work instruction updated", "Training completed"] },
  ],
};
