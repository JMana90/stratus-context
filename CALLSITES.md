# Stratus — Frontend Call Sites → Edge Functions

## OrganizationIntegrations.tsx
- Status checks (user-level):  GET /google_oauth/status            (Authorization header required)
- Status checks (org-level):   GET /salesforce_oauth/status?organizationId=<uuid>
                               GET /box_oauth/status?organizationId=<uuid>
- Connect buttons:             GET /<provider>_oauth/start?organizationId=<uuid>  (org-level providers: salesforce, box, asana)

## ProjectIntegrationsSetup.tsx
- Calls startOAuth(provider, 'org', projectId, organizationId) for org-level connectors

## ProjectIntegrationsSelector.tsx
- Same as above; ensures organizationId is passed for org-level providers

## services/integrationService.ts
- Builds authorize URLs: GET /<provider>_oauth/start?organizationId=<uuid>  (adds query param only if org id provided)
- Builds status URLs:    GET /<provider>_oauth/status[?organizationId=<uuid>]

## WeeklyUpdateGenerator.tsx / services/reports/weeklyUpdateService.ts
- Salesforce Snapshot (optional): GET /salesforce_oauth/record?sObject=&id=&organizationId=
- Box sources:
  - GET  /box_proxy/list_csv_files?folderId?
  - POST /box_proxy/csv_summary { fileId }
- Draft generation:                POST /llm_weekly_update
- Email distribution:              POST /google_send_mail

## TemplateManager*.tsx
- Stores Box selections in project_templates.preferences_json.boxCsvSources
- Stores Salesforce sObject/recordId in template prefs (for snapshot chip)
- Schedule (RRULE) fields saved with project_templates
