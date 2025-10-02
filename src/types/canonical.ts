export type CanonicalTask = {
  id: string;             // internal id
  title: string;
  status: "todo"|"doing"|"done";
  due?: string|null;      // ISO
  assignee?: string|null; // display name or provider id
  provider: "asana"|"jira"|"trello"|"clickup";
  external_id: string;    // provider task id
  url?: string;           // provider deep link
  source?: "Stratus"|"Manual"|"Import";
};
export type CanonicalProject = {
  id: string;
  name: string;
  industry: string;
  externals: { provider:string; external_id:string }[];
};

export type CsvSummary = {
  name: string;                 // e.g., 'RegTasks.csv'
  metrics?: {
    totalRows?: number;
    statusCounts?: Record<string, number>; // e.g., {'Open': 5, 'Delayed': 2}
    overdueCount?: number;
    dueSoonCount?: number;      // next 7 days
    recentlyModifiedCount?: number;
    truncated?: boolean;
    detectedColumns?: {
      status?: string;
      dueDate?: string;
      modified?: string;
      owner?: string;
    };
  };
  notes?: string[];             // freeform bullet hints from user
};

export type WeeklyUpdateResult = {
  sections: {
    lastWeek: string;
    thisWeek: string;
    risks: string[];
    asks: string[];
  };
  citations: Array<{
    type: 'actionItem' | 'asanaTask' | 'minutes' | 'csvSummary' | 'boxCsv' | 'salesforce';
    id?: string;
    note?: string;
    title?: string;
    url?: string;
  }>;
  timeframe: {
    days: number;
  };
  template: {
    id: string;
    name: string;
  };
};

export type CrmSnapshot = {
  provider: 'salesforce';
  sObject: string;
  id: string;
  record?: any;
  link?: string;
  fetchedAt: string;
  errorCode?: 'TOKEN_EXPIRED' | 'NOT_FOUND' | 'UNKNOWN';
};

export type TemplatePreferences = {
  timeframe: {
    days: number;
  };
  dataSources: {
    actionItems: boolean;
    minutes: boolean;
    asana: boolean;
    boxCsv?: boolean;
    salesforce?: boolean;
  };
  boxCsvSources?: Array<{ fileId: string; name: string }>;
  salesforceProject?: { sObject: string; id: string };
  includeSalesforceSnapshot?: boolean;
};

export type ProjectContact = {
  id: string; 
  project_id: string;
  name: string; 
  email: string; 
  role?: string; 
  phone?: string; 
  created_at: string; 
  updated_at: string;
};

export type ProjectActionItem = {
  id: string; 
  project_id: string;
  source: 'minutes'|'manual';
  title: string; 
  owner?: string; 
  owner_email?: string;
  due_date?: string; 
  status: 'open'|'done'|'blocked';
  asana_task_id?: string; 
  notes?: string;
  created_by: string; 
  created_at: string; 
  updated_at: string;
};

export type ProjectDashboardLayout = {
  id: string; 
  project_id: string; 
  role: 'pm'|'exec'|'qa_reg'|string;
  layout_json: { widgets?: string[] };
  is_default: boolean; 
  created_at: string; 
  updated_at: string;
};
