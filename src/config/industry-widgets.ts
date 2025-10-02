export type IndustryKey = "general" | "software" | "financial" | "pharma" | "construction" | "manufacturing";

export type WidgetId =
  | "budget-overview"
  | "project-contacts"
  | "doc-repo"
  | "project-photos"
  | "delay-tracker"
  | "timeline" // combined timeline+gantt
  | "meeting-minutes";

// Defaults that will be applied to the dashboard row (OPTIONAL widgets)
export const INDUSTRY_WIDGETS: Record<IndustryKey, WidgetId[]> = {
  general:       ["budget-overview", "project-contacts", "doc-repo", "project-photos", "delay-tracker", "meeting-minutes"],
  construction:  ["budget-overview", "project-contacts", "doc-repo", "project-photos", "delay-tracker"],
  manufacturing: ["budget-overview", "project-contacts", "doc-repo", "project-photos", "delay-tracker"],
  pharma:        ["budget-overview", "project-contacts", "doc-repo", "delay-tracker"],
  financial:     ["budget-overview", "project-contacts", "doc-repo", "delay-tracker"],
  software:      ["budget-overview", "project-contacts", "doc-repo", "delay-tracker"],
};

export const INDUSTRY_OPTIONS = [
  { value: "construction", label: "Construction / Engineering" },
  { value: "manufacturing", label: "Manufacturing / Industrial" },
  { value: "pharma", label: "Pharma / Life Sciences" },
  { value: "financial", label: "Financial Services" },
  { value: "software", label: "Software / Tech" },
  { value: "general", label: "General" },
];

//= Recommended add‑ons shown in setup (NOT applied unless user checks the box)
export const INDUSTRY_RECOMMENDED: Record<IndustryKey, WidgetId[]> = {
  general:       ["timeline", "meeting-minutes"],
  construction:  ["timeline", "meeting-minutes"],
  manufacturing: ["timeline", "meeting-minutes"],
  pharma:        ["timeline", "meeting-minutes"],
  financial:     ["timeline", "meeting-minutes"],
  software:      ["timeline", "meeting-minutes"],
};

// Widget synonyms for normalizing legacy/label IDs
export const WIDGET_SYNONYMS: Record<string, WidgetId> = {
  "gantt-chart": "timeline",
  "time-tracking": "timeline", 
  "contacts-list": "project-contacts",
  "document-repository": "doc-repo",
};