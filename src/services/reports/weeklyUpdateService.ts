import { supabase } from "@/integrations/supabase/client";
import type { WeeklyUpdateResult, CsvSummary, CrmSnapshot } from "@/types/canonical";

export class WeeklyUpdateService {
  /**
   * Generate weekly update from template
   */
  async generateFromTemplate(
    projectId: string,
    organizationId: string,
    projectTemplateId?: string,
    days = 7,
    csvSummaries?: CsvSummary[],
    boxSummaries?: any[],
    salesforceSnapshot?: any,
    crmSnapshot?: any
  ): Promise<WeeklyUpdateResult> {
    // Get template to check for tokens and preferences
    let templateMarkdown = '';
    let templatePrefs: any = null;
    
    if (projectTemplateId) {
      const { data: templateData } = await supabase
        .from('project_templates')
        .select(`
          preferences_json,
          templates!inner(
            id,
            name,
            body
          )
        `)
        .eq('id', projectTemplateId)
        .eq('project_id', projectId)
        .single();
        
      if (templateData) {
        templateMarkdown = templateData.templates.body || '';
        templatePrefs = templateData.preferences_json;
      }
    }

    // Fetch CRM snapshot if needed for token expansion
    let crmMd = '';
    if (templatePrefs?.includeSalesforceSnapshot && templatePrefs?.salesforceProject) {
      try {
        const crmSnapshot = await this.getSalesforceSnapshot(
          organizationId,
          templatePrefs.salesforceProject
        );
        
        if (crmSnapshot.record && !crmSnapshot.errorCode) {
          const record = crmSnapshot.record;
          crmMd = [
            '## CRM Status (Salesforce)',
            `- **Name:** ${record.Name ?? '—'}`,
            `- **Stage/Status:** ${record.StageName ?? record.Status__c ?? '—'}`,
            `- **Due/Close Date:** ${record.CloseDate ?? record.Due_Date__c ?? '—'}`,
            `- **Owner:** ${record.Owner?.Name ?? '—'}`,
            `- **Account/Client:** ${record.Account?.Name ?? '—'}`,
            crmSnapshot.link ? `- **Open in Salesforce:** ${crmSnapshot.link}` : null,
            `- **As of:** ${new Date().toISOString()}`,
          ].filter(Boolean).join('\n');
        }
      } catch (error) {
        console.error('Failed to fetch CRM snapshot for template:', error);
      }
    }

    const { data, error } = await supabase.functions.invoke('llm_weekly_update', {
      body: {
        projectId,
        organizationId,
        projectTemplateId,
        days,
        csvSummaries,
        boxSummaries,
        salesforceSnapshot,
        crmSnapshot,
        templateMarkdown,
        crmMd,
        includeSalesforceSnapshot: templatePrefs?.includeSalesforceSnapshot
      }
    });

    if (error) {
      throw new Error(`Failed to generate weekly update: ${error.message}`);
    }

    return data as WeeklyUpdateResult;
  }

  /**
   * Get Salesforce CRM snapshot
   */
  async getSalesforceSnapshot(
    organizationId: string, 
    salesforceProject: { sObject: string; id: string }
  ): Promise<CrmSnapshot> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No authenticated session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salesforce_oauth/record?sObject=${encodeURIComponent(salesforceProject.sObject)}&id=${encodeURIComponent(salesforceProject.id)}&organizationId=${organizationId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.data.session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          provider: 'salesforce',
          sObject: salesforceProject.sObject,
          id: salesforceProject.id,
          fetchedAt: new Date().toISOString(),
          errorCode: errorData.code === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 
                    response.status === 404 ? 'NOT_FOUND' : 'UNKNOWN'
        };
      }

      const data = await response.json();
      return {
        provider: 'salesforce',
        sObject: data.sObject,
        id: data.id,
        record: data.record,
        link: data.link,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to fetch Salesforce snapshot:', error);
      return {
        provider: 'salesforce',
        sObject: salesforceProject.sObject,
        id: salesforceProject.id,
        fetchedAt: new Date().toISOString(),
        errorCode: 'UNKNOWN'
      };
    }
  }

  /**
   * Get Box CSV summaries for a project with ETag caching
   */
  async getBoxCsvSummaries(
    organizationId: string, 
    boxCsvSources: Array<{ fileId: string; name: string; lastSummary?: any }>,
    forceRefresh: boolean = false
  ): Promise<Array<{ source: any; summary?: any; error?: any; needsUpdate: boolean }>> {
    if (!boxCsvSources?.length) return [];

    const results: Array<{ source: any; summary?: any; error?: any; needsUpdate: boolean }> = [];
    
    // First, get current file info to check ETags
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('No authenticated session');
    }

    for (const source of boxCsvSources) {
      try {
        // Check if we can use cache
        const canUseCache = !forceRefresh && 
                           source.lastSummary?.etag && 
                           source.lastSummary?.summary;

        if (canUseCache) {
          // Get current etag to compare
          const listResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/box_proxy/list_csv_files?organizationId=${organizationId}&folderId=0`,
            {
              headers: {
                'Authorization': `Bearer ${session.data.session.access_token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (listResponse.ok) {
            const listData = await listResponse.json();
            const currentFile = listData.files?.find((f: any) => f.id === source.fileId);
            
            // If etag matches, use cache
            if (currentFile?.etag === source.lastSummary.etag) {
              results.push({
                source,
                summary: source.lastSummary.summary,
                needsUpdate: false
              });
              continue;
            }
          }
        }

        // Fetch fresh summary
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/box_proxy/csv_summary`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.data.session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              organizationId,
              fileId: source.fileId
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.push({
            source,
            summary: data,
            needsUpdate: true
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          results.push({
            source,
            error: errorData,
            needsUpdate: true
          });
        }
      } catch (error) {
        console.error(`Failed to get Box CSV summary for ${source.name}:`, error);
        results.push({
          source,
          error: { code: 'FETCH_ERROR', message: 'Network error' },
          needsUpdate: true
        });
      }
    }

    return results;
  }

  /**
   * Update Box CSV source cache in preferences
   */
  async updateBoxCsvCache(
    projectTemplateId: string,
    fileId: string,
    summary: any
  ): Promise<void> {
    try {
      // Get current preferences
      const { data: template } = await supabase
        .from('project_templates')
        .select('preferences_json')
        .eq('id', projectTemplateId)
        .single();

      if (!template) return;

      const prefs = (template.preferences_json || {}) as any;
      const sources = prefs.boxCsvSources || [];
      
      // Update the specific source
      const updatedSources = sources.map((source: any) => {
        if (source.fileId === fileId) {
          return {
            ...source,
            lastSummary: {
              etag: summary.etag,
              summarized_at: new Date().toISOString(),
              summary
            }
          };
        }
        return source;
      });

      // Save updated preferences
      await supabase
        .from('project_templates')
        .update({
          preferences_json: {
            ...(prefs as any),
            boxCsvSources: updatedSources
          }
        })
        .eq('id', projectTemplateId);
    } catch (error) {
      console.error('Failed to update Box CSV cache:', error);
    }
  }

  /**
   * Convert result to Markdown format
   */
  toMarkdown(result: WeeklyUpdateResult, projectName: string): string {
    const { sections, citations, timeframe, template } = result;
    const date = new Date().toLocaleDateString();

    let markdown = `# Weekly Update: ${projectName}\n\n`;
    markdown += `**Date:** ${date}\n`;
    markdown += `**Template:** ${template.name}\n`;
    markdown += `**Timeframe:** Last ${timeframe.days} days\n\n`;

    markdown += `## Last Week\n\n${sections.lastWeek}\n\n`;

    markdown += `## This Week\n\n${sections.thisWeek}\n\n`;

    if (sections.risks.length > 0) {
      markdown += `## Risks & Issues\n\n`;
      sections.risks.forEach(risk => {
        markdown += `- ${risk}\n`;
      });
      markdown += `\n`;
    }

    if (sections.asks.length > 0) {
      markdown += `## Asks & Support Needed\n\n`;
      sections.asks.forEach(ask => {
        markdown += `- ${ask}\n`;
      });
      markdown += `\n`;
    }

    if (citations.length > 0) {
      markdown += `## Data Sources\n\n`;
      citations.forEach(citation => {
        markdown += `- ${citation.type}: ${citation.note || citation.title || citation.id}\n`;
      });
    }

    return markdown;
  }

  /**
   * Download Markdown file
   */
  downloadMarkdown(result: WeeklyUpdateResult, projectName: string): void {
    const markdown = this.toMarkdown(result, projectName);
    const date = new Date().toISOString().split('T')[0];
    const filename = `Stratus_WeeklyUpdate_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.md`;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Copy Markdown to clipboard
   */
  async copyToClipboard(result: WeeklyUpdateResult, projectName: string): Promise<void> {
    const markdown = this.toMarkdown(result, projectName);
    await navigator.clipboard.writeText(markdown);
  }

  /**
   * Get project templates
   */
  async getProjectTemplates(projectId: string) {
    const { data, error } = await supabase
      .from('project_templates')
      .select(`
        id,
        is_default,
        templates!inner(
          id,
          name,
          content
        )
      `)
      .eq('project_id', projectId)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Template query error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * List past update drafts
   */
  async listDrafts(projectId: string) {
    const { data, error } = await supabase
      .from('update_drafts')
      .select(`
        id,
        sections_json,
        timeframe_days,
        created_at,
        template_id,
        templates!inner(name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch drafts: ${error.message}`);
    }

    return data;
  }

  /**
   * Transform draft to preview result
   */
  draftToResult(draft: any): WeeklyUpdateResult {
    return {
      sections: draft.sections_json,
      citations: [],
      timeframe: { days: draft.timeframe_days },
      template: { id: draft.template_id, name: draft.templates?.name || 'Unknown Template' }
    };
  }

  /**
   * Create or update project template
   */
  async saveProjectTemplate(
    projectId: string,
    organizationId: string,
    templateData: {
      name: string;
      content: string;
      preferences: any;
      isDefault?: boolean;
      scheduleRrule?: string;
    }
  ) {
    // First create the template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        name: templateData.name,
        body: templateData.content,
        format: 'markdown',
        organization_id: organizationId
      })
      .select()
      .single();

    if (templateError) {
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    // Compute initial next_run_at if schedule is provided
    let nextRunAt = null;
    if (templateData.scheduleRrule) {
      try {
        nextRunAt = this.parseNextRunFromRRule(templateData.scheduleRrule);
      } catch (error) {
        console.warn('Failed to parse RRULE, will compute on server:', error);
      }
    }

    // Then create the project template
    const { data: projectTemplate, error: projectTemplateError } = await supabase
      .from('project_templates')
      .insert({
        project_id: projectId,
        template_id: template.id,
        preferences: templateData.preferences,
        is_default: templateData.isDefault || false,
        schedule_rrule: templateData.scheduleRrule || null,
        next_run_at: nextRunAt
      })
      .select()
      .single();

    if (projectTemplateError) {
      throw new Error(`Failed to create project template: ${projectTemplateError.message}`);
    }

    return { template, projectTemplate };
  }

  /**
   * Update project template schedule
   */
  async updateTemplateSchedule(
    projectTemplateId: string,
    scheduleRrule: string | null
  ) {
    let nextRunAt = null;
    if (scheduleRrule) {
      try {
        nextRunAt = this.parseNextRunFromRRule(scheduleRrule);
      } catch (error) {
        console.warn('Failed to parse RRULE, will compute on server:', error);
      }
    }

    const { error } = await supabase
      .from('project_templates')
      .update({
        schedule_rrule: scheduleRrule,
        next_run_at: nextRunAt
      })
      .eq('id', projectTemplateId);

    if (error) {
      throw new Error(`Failed to update template schedule: ${error.message}`);
    }
  }

  /**
   * Trigger scheduled drafts manually (for testing)
   */
  async triggerScheduledDrafts(): Promise<any> {
    const { data, error } = await supabase.functions.invoke('schedule_drafts', {
      method: 'GET'
    });

    if (error) {
      throw new Error(`Failed to trigger scheduled drafts: ${error.message}`);
    }

    return data;
  }

  /**
   * Send email via Gmail OAuth
   */
  async sendEmail(draftId: string, payload: {
    to: string[];
    cc?: string[];
    subject: string;
    includePdf?: boolean;
  }): Promise<{ id: string; threadId: string; toCount: number }> {
    const { data, error } = await supabase.functions.invoke('google_send_mail', {
      body: {
        draftId,
        ...payload
      }
    });

    if (error) {
      if (error.message?.includes('INSUFFICIENT_PERMISSIONS') || error.details?.code === 'INSUFFICIENT_PERMISSIONS') {
        const insufficientError = new Error('INSUFFICIENT_PERMISSIONS');
        (insufficientError as any).code = 'INSUFFICIENT_PERMISSIONS';
        throw insufficientError;
      }
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  }

  /**
   * Build tracker CSV from weekly update result
   */
  buildTrackerCsv(result: WeeklyUpdateResult, projectName: string): string {
    const rows: string[] = [];
    const header = "Type,Text,Owner,DueDate,Source,CreatedAt";
    rows.push(header);
    
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const seenItems = new Set<string>(); // For deduplication by Text + DueDate
    
    // Process risks
    result.sections.risks.forEach(risk => {
      const owner = this.extractOwnerFromText(risk);
      const dueDate = this.extractDueDateFromText(risk);
      const source = this.inferSourceFromCitations(result.citations, risk);
      const key = `${risk.trim()}|${dueDate}`;
      
      if (!seenItems.has(key)) {
        seenItems.add(key);
        rows.push(this.csvEscape("Risk", risk.trim(), owner, dueDate, source, now));
      }
    });
    
    // Process asks
    result.sections.asks.forEach(ask => {
      const owner = this.extractOwnerFromText(ask);
      const dueDate = this.extractDueDateFromText(ask);
      const source = this.inferSourceFromCitations(result.citations, ask);
      const key = `${ask.trim()}|${dueDate}`;
      
      if (!seenItems.has(key)) {
        seenItems.add(key);
        rows.push(this.csvEscape("Ask", ask.trim(), owner, dueDate, source, now));
      }
    });
    
    return rows.join('\n');
  }

  /**
   * Download tracker CSV
   */
  downloadTrackerCsv(result: WeeklyUpdateResult, projectName: string): void {
    const csvContent = this.buildTrackerCsv(result, projectName);
    const date = new Date().toISOString().split('T')[0];
    const filename = `tracker-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}-${date}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Extract owner from text (simple heuristics)
   */
  private extractOwnerFromText(text: string): string {
    // Look for patterns like "John Smith" or "@john" or "assigned to John"
    const patterns = [
      /@(\w+)/,
      /assigned to ([A-Za-z\s]+)/i,
      /owner:?\s*([A-Za-z\s]+)/i,
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/ // First Last name pattern
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return "";
  }

  /**
   * Extract due date from text (simple heuristics)
   */
  private extractDueDateFromText(text: string): string {
    const datePatterns = [
      /due (\d{4}-\d{2}-\d{2})/i,
      /by (\d{4}-\d{2}-\d{2})/i,
      /deadline:?\s*(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }
    
    return "";
  }

  /**
   * Infer source from citations based on content similarity
   */
  private inferSourceFromCitations(citations: Array<{ type: string; note?: string; title?: string }>, text: string): string {
    // Map citation types to source names
    const sourceMap: Record<string, string> = {
      'actionItem': 'ActionItem',
      'asanaTask': 'Asana',
      'csvSummary': 'CSV',
      'minutes': 'ActionItem' // Meeting minutes often create action items
    };
    
    // Check if any citation content relates to this text
    for (const citation of citations) {
      if (citation.note && text.toLowerCase().includes(citation.note.toLowerCase().slice(0, 20))) {
        return sourceMap[citation.type] || citation.type;
      }
      if (citation.title && text.toLowerCase().includes(citation.title.toLowerCase().slice(0, 20))) {
        return sourceMap[citation.type] || citation.type;
      }
    }
    
    // Default source based on available citations
    if (citations.some(c => c.type === 'csvSummary')) return 'CSV';
    if (citations.some(c => c.type === 'asanaTask')) return 'Asana';
    if (citations.some(c => c.type === 'actionItem')) return 'ActionItem';
    
    return 'Box'; // Default fallback
  }

  /**
   * Escape CSV fields properly
   */
  private csvEscape(type: string, text: string, owner: string, dueDate: string, source: string, createdAt: string): string {
    const fields = [type, text, owner, dueDate, source, createdAt];
    return fields.map(field => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(',');
  }

  /**
   * Simple RRULE parser for client-side next run preview
   */
  parseNextRunFromRRule(rrule: string, lastRun?: Date): Date {
    const now = new Date();
    const base = lastRun || now;
    
    try {
      // Parse basic weekly RRULE (FREQ=WEEKLY;BYDAY=FR;BYHOUR=9)
      const rules = rrule.split(';').reduce((acc, rule) => {
        const [key, value] = rule.split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      if (rules.FREQ !== 'WEEKLY') {
        // Default to weekly if not specified
        const nextWeek = new Date(base);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
      }

      const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
      const targetDay = rules.BYDAY ? dayMap[rules.BYDAY as keyof typeof dayMap] : 5; // Default Friday
      const targetHour = rules.BYHOUR ? parseInt(rules.BYHOUR, 10) : 9; // Default 9am

      const next = new Date(base);
      const currentDay = next.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      
      // If it's the same day but we've passed the hour, go to next week
      if (daysUntilTarget === 0 && next.getHours() >= targetHour) {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + daysUntilTarget);
      }
      
      next.setHours(targetHour, 0, 0, 0);
      return next;
    } catch (error) {
      console.error('RRULE parsing failed:', error);
      // Default to weekly from now
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(9, 0, 0, 0);
      return nextWeek;
    }
  }
}

export const weeklyUpdateService = new WeeklyUpdateService();