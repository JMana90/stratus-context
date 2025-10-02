export type WidgetId =
  | "project-status"    // top-row Project Overview
  | "next-task"
  | "action-items"      // always-on (do not count toward wizard total)
  | "timeline"
  | "budget-overview"
  | "document-repository"
  | "contacts-list"
  | "project-photos"
  | "delay-tracker"
  | "gantt-chart"       // feature-flagged, hidden if not implemented
  | "time-tracking";    // feature-flagged, hidden if not implemented

export interface WidgetMeta {
  label: string;
  requires?: "crm" | "comm";
  featureFlag?: boolean;
}

export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  "project-status": {
    label: "Project Status"
  },
  "next-task": {
    label: "Next Task"
  },
  "action-items": {
    label: "Action Items"
  },
  "timeline": {
    label: "Timeline"
  },
  "budget-overview": {
    label: "Budget Overview",
    requires: "crm"
  },
  "document-repository": {
    label: "Document Repository"
  },
  "contacts-list": {
    label: "Contacts List",
    requires: "crm"
  },
  "project-photos": {
    label: "Project Photos"
  },
  "delay-tracker": {
    label: "Delay Tracker"
  },
  "gantt-chart": {
    label: "Gantt Chart",
    featureFlag: true
  },
  "time-tracking": {
    label: "Time Tracking",
    featureFlag: true
  }
};

// Always-on widgets that don't count toward selection total
export const ALWAYS_ON_WIDGETS: WidgetId[] = ["action-items"];

// Get selectable widgets (excludes always-on ones)
export function getSelectableWidgets(): WidgetId[] {
  return Object.keys(WIDGET_META).filter(
    id => !ALWAYS_ON_WIDGETS.includes(id as WidgetId)
  ) as WidgetId[];
}

// Check if widget is available based on integrations
export function isWidgetAvailable(
  widgetId: WidgetId, 
  connectedIntegrations: { crm?: boolean; comm?: boolean } = {}
): boolean {
  const meta = WIDGET_META[widgetId];
  
  // Hide feature-flagged widgets that aren't implemented
  if (meta.featureFlag) {
    return false; // Hide gantt-chart and time-tracking for now
  }
  
  // Check integration requirements
  if (meta.requires === "crm" && !connectedIntegrations.crm) {
    return false;
  }
  if (meta.requires === "comm" && !connectedIntegrations.comm) {
    return false;
  }
  
  return true;
}

// Get all widgets that should be rendered (selected + always-on)
export function getAllActiveWidgets(selectedIds: WidgetId[]): WidgetId[] {
  return [...new Set([...selectedIds, ...ALWAYS_ON_WIDGETS])];
}