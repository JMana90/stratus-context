# Stratus — Edge Function Contracts (Canonical)

## salesforce_oauth
- GET  /salesforce_oauth/start?organizationId=<uuid>
  -> { authorize_url: string }

- GET  /salesforce_oauth/callback?code=...&state=...
  -> 302 redirect to FRONTEND_BASE_URL (status in querystring)

- GET  /salesforce_oauth/status?organizationId=<uuid>
  -> { provider: "salesforce", level: "organization", status: "connected" | "needs-auth" | "error", detail?: any }

- GET  /salesforce_oauth/record?sObject=<SObject>&id=<recordId>&organizationId=<uuid>
  -> {
       provider: "salesforce",
       sObject: string,
       id: string,
       record: object,
       link?: string   # Lightning URL
     }

## google_oauth
- GET  /google_oauth/start
- GET  /google_oauth/callback
- GET  /google_oauth/status
  -> { provider: "google", level: "user", status: "connected" | "needs-auth" | "error", detail?: any }

## google_send_mail
- POST /google_send_mail
  Body:
  {
    draftId: string,
    to: string[],
    cc?: string[],
    subject: string,
    includePdf?: boolean
  }
  -> { messageId: string } | typed error { code: "INSUFFICIENT_PERMISSIONS", ... }

## box_oauth
- GET  /box_oauth/start?organizationId=<uuid>
- GET  /box_oauth/callback
- GET  /box_oauth/status?organizationId=<uuid>
  -> { provider: "box", level: "organization", status: "connected" | "needs-auth" | "error", detail?: any }

## box_proxy
- GET  /box_proxy/list_csv_files?folderId=<optional>
  -> [ { id: string, name: string, path?: string, etag?: string } ]

- POST /box_proxy/csv_summary
  Body: { fileId: string }
  -> {
       fileId: string,
       etag?: string,
       columns: string[],
       rowCount: number,
       statusCounts?: Record<string, number>,
       overdueCount?: number,
       dueSoonCount?: number,
       inferred: { statusCol?: string, dueDateCol?: string, ownerCol?: string }
     }
  # typed errors: FILE_TOO_LARGE | TOO_MANY_ROWS | TOO_WIDE | UNSUPPORTED_ENCODING | MISSING_COLUMNS | PARSE_ERROR

## llm_weekly_update
- POST /llm_weekly_update
  Body: {
    templateId: string,
    projectId: string,
    timeframeDays?: number,
    boxSummaries?: any[],
    salesforceSnapshot?: any
  }
  -> { draftId: string, sections_json: any, timeframe_days: number }

# (Present if used) slack_oauth, outlook_oauth follow the same pattern:
# /<provider>_oauth/start, /callback, /status
