import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, FileText, Trash2, AlertCircle, TrendingUp, Mail, X, RefreshCw, FileSpreadsheet } from "lucide-react";
import { weeklyUpdateService } from "@/services/reports/weeklyUpdateService";
import { supabase } from "@/integrations/supabase/client";
import { weeklyUpdatePdfService } from "@/services/pdf/weeklyUpdatePdf";
import { contactsService } from "@/services/contactsService";
import { PastDrafts } from "@/components/reports/PastDrafts";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import type { CsvSummary, WeeklyUpdateResult, ProjectContact, CrmSnapshot } from "@/types/canonical";

interface WeeklyUpdateGeneratorProps {
  projectId: string;
  projectName: string;
  organizationId: string;
}

export function WeeklyUpdateGenerator({ projectId, projectName, organizationId }: WeeklyUpdateGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [csvSummaries, setCsvSummaries] = useState<CsvSummary[]>([]);
  const [boxSummaries, setBoxSummaries] = useState<any[]>([]);
  const [loadingBoxSummaries, setLoadingBoxSummaries] = useState(false);
  const [boxErrors, setBoxErrors] = useState<Record<string, string>>({});
  const [salesforceSnapshot, setSalesforceSnapshot] = useState<any>(null);
  const [loadingSalesforceSnapshot, setLoadingSalesforceSnapshot] = useState(false);
  const [crmSnapshot, setCrmSnapshot] = useState<CrmSnapshot | null>(null);
  const [crmFetchError, setCrmFetchError] = useState<string | null>(null);
  const [result, setResult] = useState<WeeklyUpdateResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [csvError, setCsvError] = useState<string>("");
  const [organizationIdResolved, setOrganizationIdResolved] = useState<string>("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contacts, setContacts] = useState<ProjectContact[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [includePdf, setIncludePdf] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [lastRecipients, setLastRecipients] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Resolve organizationId from project context
  useEffect(() => {
    const resolveOrgId = async () => {
      try {
        const { data: project } = await supabase
          .from("projects")
          .select("organization_id")
          .eq("id", projectId)
          .single();
        
        if (project?.organization_id) {
          setOrganizationIdResolved(project.organization_id);
        }
      } catch (error) {
        console.error("Failed to resolve organization ID:", error);
      }
    };
    
    resolveOrgId();
  }, [projectId]);

  // Load template preferences and data when template changes
  useEffect(() => {
    const currentTemplate = templates.find(t => t.id === selectedTemplateId);
    if (currentTemplate?.preferences && organizationIdResolved) {
      loadBoxSummaries(currentTemplate.preferences);
      loadSalesforceSnapshot(currentTemplate.preferences);
      loadCrmSnapshot(currentTemplate.preferences);
    }
  }, [selectedTemplateId, templates, organizationIdResolved]);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await weeklyUpdateService.getProjectTemplates(projectId);
      if (data && Array.isArray(data)) {
        setTemplates(data);
        // Auto-select default template
        const defaultTemplate = data.find((t: any) => t && t.is_default);
        if (defaultTemplate && 'id' in defaultTemplate) {
          setSelectedTemplateId(String(defaultTemplate.id));
        }
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      setTemplates([]);
    }
  }, [projectId]);

  const handleOpen = () => {
    setIsOpen(true);
    setCsvError("");
    loadTemplates();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setCsvError("");

    Array.from(files).forEach(file => {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Check file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
          setCsvError(`File ${file.name} is too large (max 2MB)`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const csvText = e.target?.result as string;
          try {
            const summary = parseCSVToSummary(file.name, csvText);
            setCsvSummaries(prev => [...prev, summary]);
          } catch (error) {
            setCsvError(`Failed to parse ${file.name}: ${error}`);
          }
        };
        reader.readAsText(file);
      } else {
        setCsvError(`File ${file.name} is not a CSV file`);
      }
    });
    
    // Reset input
    event.target.value = '';
  };

  const parseCSVToSummary = (fileName: string, csvText: string): CsvSummary => {
    const ROW_LIMIT = 2000;
    
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parsed.errors.length > 0) {
      throw new Error(`CSV parsing error: ${parsed.errors[0].message}`);
    }

    const data = parsed.data;
    const truncated = data.length > ROW_LIMIT;
    const rows = truncated ? data.slice(0, ROW_LIMIT) : data;

    // Auto-detect columns (case-insensitive)
    const headers = Object.keys(rows[0] || {});
    const statusCol = headers.find(h => 
      /status|state/i.test(h)
    );
    const dueDateCol = headers.find(h => 
      /due|deadline|date/i.test(h)
    );
    const modifiedCol = headers.find(h => 
      /modified|updated|lastmodified/i.test(h)
    );
    const ownerCol = headers.find(h => 
      /owner|assigned|assignee/i.test(h)
    );

    const statusCounts: Record<string, number> = {};
    let overdueCount = 0;
    let dueSoonCount = 0;
    let recentlyModifiedCount = 0;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    (rows as any[]).forEach(row => {
      if (statusCol && row[statusCol]) {
        const status = String(row[statusCol]).trim();
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }

      if (dueDateCol && row[dueDateCol]) {
        const dueDate = new Date(row[dueDateCol]);
        if (!isNaN(dueDate.getTime())) {
          if (dueDate < now) overdueCount++;
          else if (dueDate <= weekFromNow) dueSoonCount++;
        }
      }

      if (modifiedCol && row[modifiedCol]) {
        const modifiedDate = new Date(row[modifiedCol]);
        if (!isNaN(modifiedDate.getTime()) && modifiedDate >= weekAgo) {
          recentlyModifiedCount++;
        }
      }
    });

    return {
      name: fileName,
      metrics: {
        totalRows: data.length,
        truncated,
        statusCounts: Object.keys(statusCounts).length > 0 ? statusCounts : undefined,
        overdueCount: overdueCount > 0 ? overdueCount : undefined,
        dueSoonCount: dueSoonCount > 0 ? dueSoonCount : undefined,
        recentlyModifiedCount: recentlyModifiedCount > 0 ? recentlyModifiedCount : undefined,
        detectedColumns: {
          status: statusCol,
          dueDate: dueDateCol,
          modified: modifiedCol,
          owner: ownerCol
        }
      },
      notes: []
    };
  };

  const addNoteToCSV = (index: number, note: string) => {
    setCsvSummaries(prev => prev.map((csv, i) => 
      i === index 
        ? { ...csv, notes: [...(csv.notes || []), note] }
        : csv
    ));
  };

  const removeCSV = (index: number) => {
    setCsvSummaries(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    if (!organizationIdResolved) {
      toast({
        title: "Error", 
        description: "Organization context not resolved",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
        const updateResult = await weeklyUpdateService.generateFromTemplate(
          projectId,
          organizationIdResolved,
          selectedTemplateId,
          7,
          csvSummaries.length > 0 ? csvSummaries : undefined,
          boxSummaries.length > 0 ? boxSummaries : undefined,
          salesforceSnapshot,
          crmSnapshot
        );
      
      setResult(updateResult);
      setShowPreview(true);
      setIsOpen(false);
      
      toast({
        title: "Success",
        description: "Weekly update generated successfully",
      });
    } catch (error: any) {
      let errorMessage = "Failed to generate update";
      
      if (error.message?.includes("Authorization")) {
        errorMessage = "Authentication failed. Please refresh and try again.";
      } else if (error.message?.includes("CORS")) {
        errorMessage = "Connection error. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) return;
    weeklyUpdatePdfService.exportWeeklyUpdatePdf({
      projectName,
      timeframeDays: result.timeframe.days,
      result,
    });
  };

  const handleCopyToClipboard = async () => {
    if (!result) return;
    try {
      await weeklyUpdateService.copyToClipboard(result, projectName);
      toast({
        title: "Success",
        description: "Copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;
    weeklyUpdateService.downloadMarkdown(result, projectName);
  };

  const loadBoxSummaries = async (templatePrefs: any, forceRefresh: boolean = false) => {
    if (!templatePrefs?.boxCsvSources?.length) {
      setBoxSummaries([]);
      setBoxErrors({});
      return;
    }

    setLoadingBoxSummaries(true);
    setBoxErrors({});
    
    try {
      const results = await weeklyUpdateService.getBoxCsvSummaries(
        organizationIdResolved,
        templatePrefs.boxCsvSources,
        forceRefresh
      );
      
      const summaries: any[] = [];
      const errors: Record<string, string> = {};
      
      for (const result of results) {
        if (result.summary) {
          summaries.push({
            ...result.summary,
            name: result.source.name,
            fileId: result.source.fileId,
            lastSummary: result.source.lastSummary
          });
          
          // Update cache if needed
          if (result.needsUpdate && selectedTemplateId) {
            await weeklyUpdateService.updateBoxCsvCache(
              selectedTemplateId,
              result.source.fileId,
              result.summary
            );
          }
        } else if (result.error) {
          errors[result.source.fileId] = result.error.code || 'UNKNOWN';
        }
      }
      
      setBoxSummaries(summaries);
      setBoxErrors(errors);
      
    } catch (error) {
      console.error('Box summaries error:', error);
      toast({
        title: "Error loading Box CSVs",
        description: "Failed to load Box CSV summaries",
        variant: "destructive",
      });
      setBoxSummaries([]);
      setBoxErrors({});
    } finally {
      setLoadingBoxSummaries(false);
    }
  };

  const refreshBoxSummaries = async () => {
    const currentTemplate = templates.find(t => t.id === selectedTemplateId);
    if (currentTemplate?.preferences) {
      toast({
        title: "Refreshing...",
        description: "Updating Box CSV summaries",
      });
      await loadBoxSummaries(currentTemplate.preferences, true);
      toast({
        title: "Refreshed",
        description: "Box CSV summaries updated",
      });
    }
  };

  const refreshSingleBoxSummary = async (fileId: string) => {
    const currentTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!currentTemplate?.preferences?.boxCsvSources) return;
    
    const source = currentTemplate.preferences.boxCsvSources.find((s: any) => s.fileId === fileId);
    if (!source) return;

    try {
      const results = await weeklyUpdateService.getBoxCsvSummaries(
        organizationIdResolved,
        [source],
        true
      );
      
      if (results[0]?.summary) {
        // Update the specific summary
        setBoxSummaries(prev => prev.map(summary => 
          summary.fileId === fileId 
            ? { ...results[0].summary, name: source.name, fileId, lastSummary: { summarized_at: new Date().toISOString() } }
            : summary
        ));
        
        // Clear any error for this file
        setBoxErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fileId];
          return newErrors;
        });
        
        // Update cache
        if (selectedTemplateId) {
          await weeklyUpdateService.updateBoxCsvCache(
            selectedTemplateId,
            fileId,
            results[0].summary
          );
        }
        
        toast({
          title: "Refreshed",
          description: `${source.name} updated`,
        });
      } else if (results[0]?.error) {
        setBoxErrors(prev => ({ ...prev, [fileId]: results[0].error.code || 'UNKNOWN' }));
      }
    } catch (error) {
      console.error('Failed to refresh Box summary:', error);
    }
  };

  const loadSalesforceSnapshot = async (templatePrefs: any) => {
    if (!templatePrefs?.salesforceProject) {
      setSalesforceSnapshot(null);
      return;
    }

    setLoadingSalesforceSnapshot(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salesforce_oauth/record?organizationId=${organizationIdResolved}&sObject=${templatePrefs.salesforceProject.sObject}&id=${templatePrefs.salesforceProject.id}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load Salesforce snapshot');
      }

      const data = await response.json();
      setSalesforceSnapshot({
        provider: 'salesforce',
        sObject: templatePrefs.salesforceProject.sObject,
        id: templatePrefs.salesforceProject.id,
        record: data.record,
        link: data.link,
        lastFetched: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Salesforce snapshot error:', error);
      if (error.message?.includes('401') || error.message?.includes('TOKEN_EXPIRED')) {
        setSalesforceSnapshot({ error: 'TOKEN_EXPIRED' });
      } else if (error.message?.includes('404') || error.message?.includes('NOT_FOUND')) {
        setSalesforceSnapshot({ error: 'NOT_FOUND' });
      } else {
        setSalesforceSnapshot({ error: 'FETCH_ERROR' });
      }
    } finally {
      setLoadingSalesforceSnapshot(false);
    }
  };

  const loadCrmSnapshot = async (templatePrefs: any) => {
    if (!templatePrefs?.salesforceProject || !templatePrefs?.includeSalesforceSnapshot) {
      setCrmSnapshot(null);
      setCrmFetchError(null);
      return;
    }

    setCrmFetchError(null);
    try {
      const snapshot = await weeklyUpdateService.getSalesforceSnapshot(
        organizationIdResolved,
        templatePrefs.salesforceProject
      );
      
      if (snapshot.errorCode) {
        setCrmFetchError(snapshot.errorCode);
        setCrmSnapshot(null);
      } else {
        setCrmSnapshot(snapshot);
        setCrmFetchError(null);
      }
    } catch (error) {
      console.error('CRM snapshot error:', error);
      setCrmFetchError('UNKNOWN');
      setCrmSnapshot(null);
    }
  };

  const refreshSalesforceSnapshot = async () => {
    const currentTemplate = templates.find(t => t.id === selectedTemplateId);
    if (currentTemplate?.preferences) {
      toast({
        title: "Refreshing...",
        description: "Updating Salesforce snapshot",
      });
      await loadSalesforceSnapshot(currentTemplate.preferences);
      toast({
        title: "Refreshed",
        description: "Salesforce snapshot updated",
      });
    }
  };

  const loadContacts = useCallback(async () => {
    try {
      const contactsList = await contactsService.list(projectId);
      setContacts(contactsList);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      setContacts([]);
    }
  }, [projectId]);

  const handleSendEmail = () => {
    setShowSendModal(true);
    setEmailSubject(`${projectName} — Weekly Update (${new Date().toLocaleDateString()})`);
    setSelectedRecipients(lastRecipients.length > 0 ? lastRecipients : []);
    setIncludePdf(false);
    loadContacts();
    
    // Set draft ID if we have a result
    if (result?.template?.id) {
      setSelectedDraftId(result.template.id);
    }
  };

  const handleSendEmailSubmit = async () => {
    if (selectedRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDraftId) {
      toast({
        title: "Error",
        description: "No draft selected for sending",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const emailResult = await weeklyUpdateService.sendEmail(selectedDraftId, {
        to: selectedRecipients,
        subject: emailSubject,
        includePdf
      });

      // Remember recipients for next time
      setLastRecipients(selectedRecipients);

      toast({
        title: "Sent via Gmail",
        description: `Successfully sent to ${emailResult.toCount} recipient(s) • ID: ${emailResult.id}`,
      });

      setShowSendModal(false);
    } catch (error: any) {
      if (error.code === "INSUFFICIENT_PERMISSIONS" || error.message?.includes("INSUFFICIENT_PERMISSIONS")) {
        toast({
          title: "Connect Google to send",
          description: "Gmail send scope missing or expired. Please reconnect your Google account.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('/integrations', '_blank')}
            >
              Connect
            </Button>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send email",
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const toggleRecipient = (email: string, checked: boolean) => {
    setSelectedRecipients(prev => 
      checked 
        ? [...prev, email]
        : prev.filter(r => r !== email)
    );
  };

  const handleDownloadTrackerCsv = () => {
    if (!result) return;
    weeklyUpdateService.downloadTrackerCsv(result, projectName);
  };

  const hasNoTemplates = templates.length === 0;

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleOpen}
        disabled={hasNoTemplates}
        className="flex items-center gap-2"
      >
        <TrendingUp className="h-4 w-4" />
        Generate Weekly Update
      </Button>

      {hasNoTemplates && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Create a template first to generate weekly updates.
          </AlertDescription>
        </Alert>
      )}

      <PastDrafts projectId={projectId} projectName={projectName} />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Weekly Update</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.templates.name}
                      {template.is_default && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>CSV Files (Optional)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="mt-2">
                    <Input
                      type="file"
                      multiple
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                      <Button variant="outline" asChild>
                        <span>Upload CSV Files</span>
                      </Button>
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV files will be auto-analyzed for status, due dates, and recent changes (max 2MB each)
                  </p>
                </div>
              </div>
              
              {csvError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{csvError}</AlertDescription>
                </Alert>
              )}
            </div>

            {boxSummaries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Box CSV Summaries
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshBoxSummaries}
                    disabled={loadingBoxSummaries}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </Label>
                <div className="space-y-2">
                  {boxSummaries.map((summary) => {
                    const lastUpdated = summary.lastSummary?.summarized_at 
                      ? new Date(summary.lastSummary.summarized_at)
                      : new Date();
                    const minutesAgo = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60));
                    
                    return (
                      <div key={summary.fileId} className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs flex-1">
                          {summary.name} · Last updated {minutesAgo} min ago · {summary.rowCount} rows
                          {summary.overdueCount && ` · ${summary.overdueCount} overdue`}
                          {summary.dueSoonCount && ` · ${summary.dueSoonCount} due soon`}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshSingleBoxSummary(summary.fileId)}
                          disabled={loadingBoxSummaries}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Box CSV Error Messages */}
            {Object.entries(boxErrors).map(([fileId, errorCode]) => {
              const errorMessages = {
                'FILE_TOO_LARGE': 'This file is over 5 MB. Try filtering or splitting it.',
                'TOO_MANY_ROWS': 'Over 25,000 rows. Summaries work best on smaller slices.',
                'TOO_WIDE': 'More than 100 columns. Reduce width or pick a narrower export.',
                'UNSUPPORTED_ENCODING': 'Use UTF-8 CSV.',
                'MISSING_COLUMNS': "Couldn't find Status/Due/Owner columns.",
                'PARSE_ERROR': 'Failed to parse CSV file.',
                'FETCH_ERROR': 'Network error loading file.',
                'UNKNOWN': 'Unknown error occurred.'
              };
              
              const message = errorMessages[errorCode as keyof typeof errorMessages] || errorMessages.UNKNOWN;
              
              return (
                <Alert key={fileId} className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {message}
                  </AlertDescription>
                </Alert>
              );
            })}

            {salesforceSnapshot && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Salesforce Snapshot</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refreshSalesforceSnapshot}
                    disabled={loadingSalesforceSnapshot}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingSalesforceSnapshot ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="p-3 border rounded bg-muted/50">
                  {salesforceSnapshot.error ? (
                    <div className="space-y-2">
                      {salesforceSnapshot.error === 'TOKEN_EXPIRED' && (
                        <div className="text-sm text-destructive">
                          Token expired. <Button variant="link" size="sm" onClick={() => window.open('/integrations', '_blank')}>Reconnect Salesforce</Button>
                        </div>
                      )}
                      {salesforceSnapshot.error === 'NOT_FOUND' && (
                        <div className="text-sm text-destructive">Record not found</div>
                      )}
                      {salesforceSnapshot.error === 'FETCH_ERROR' && (
                        <div className="text-sm text-destructive">Failed to fetch record</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{salesforceSnapshot.sObject}</span>
                        <Badge variant="outline" className="text-xs">
                          {salesforceSnapshot.id?.slice(-4)}
                        </Badge>
                      </div>
                      {salesforceSnapshot.record && (
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          {salesforceSnapshot.record.Name && (
                            <div><span className="font-medium">Name:</span> {salesforceSnapshot.record.Name}</div>
                          )}
                          {(salesforceSnapshot.record.StageName || salesforceSnapshot.record.Status__c) && (
                            <div><span className="font-medium">Stage:</span> {salesforceSnapshot.record.StageName || salesforceSnapshot.record.Status__c}</div>
                          )}
                          {(salesforceSnapshot.record.CloseDate || salesforceSnapshot.record.Due_Date__c) && (
                            <div><span className="font-medium">Due:</span> {salesforceSnapshot.record.CloseDate || salesforceSnapshot.record.Due_Date__c}</div>
                          )}
                          {salesforceSnapshot.record.Owner?.Name && (
                            <div><span className="font-medium">Owner:</span> {salesforceSnapshot.record.Owner.Name}</div>
                          )}
                          {salesforceSnapshot.record.Account?.Name && (
                            <div><span className="font-medium">Account:</span> {salesforceSnapshot.record.Account.Name}</div>
                          )}
                        </div>
                      )}
                      {salesforceSnapshot.lastFetched && (
                        <div className="text-xs text-muted-foreground">
                          Last fetched: {new Date(salesforceSnapshot.lastFetched).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {crmFetchError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Couldn't fetch Salesforce snapshot ({crmFetchError}). The rest of your update is ready.
                  {crmFetchError === 'TOKEN_EXPIRED' && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => window.open('/integrations', '_blank')}
                      className="ml-2 p-0 h-auto"
                    >
                      Reconnect Salesforce
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {csvSummaries.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files</Label>
                {csvSummaries.map((csv, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{csv.name}</span>
                          <Badge variant="secondary">
                            {csv.metrics?.totalRows || 0} rows
                          </Badge>
                          {csv.metrics?.truncated && (
                            <Badge variant="outline" className="text-orange-600">
                              Truncated (2000 limit)
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          {csv.metrics?.detectedColumns && (
                            <div className="text-xs text-muted-foreground">
                              Detected: {Object.entries(csv.metrics.detectedColumns)
                                .filter(([, value]) => value)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ') || 'No key columns detected'}
                            </div>
                          )}
                          
                          {csv.metrics?.statusCounts && (
                            <div className="text-sm text-muted-foreground">
                              Status: {Object.entries(csv.metrics.statusCounts)
                                .map(([status, count]) => `${count} ${status}`)
                                .join(', ')}
                            </div>
                          )}
                          
                          {(csv.metrics?.overdueCount || csv.metrics?.dueSoonCount || csv.metrics?.recentlyModifiedCount) && (
                            <div className="text-sm text-muted-foreground">
                              {csv.metrics?.overdueCount && `${csv.metrics.overdueCount} overdue`}
                              {csv.metrics?.overdueCount && (csv.metrics?.dueSoonCount || csv.metrics?.recentlyModifiedCount) && ', '}
                              {csv.metrics?.dueSoonCount && `${csv.metrics.dueSoonCount} due soon`}
                              {csv.metrics?.dueSoonCount && csv.metrics?.recentlyModifiedCount && ', '}
                              {csv.metrics?.recentlyModifiedCount && `${csv.metrics.recentlyModifiedCount} recently updated`}
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <Input
                            placeholder="Add notes (optional)"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                addNoteToCSV(index, e.currentTarget.value.trim());
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          {csv.notes && csv.notes.length > 0 && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              Notes: {csv.notes.join('; ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCSV(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleGenerate} 
                disabled={isLoading || !selectedTemplateId}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Update
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Weekly Update Preview</DialogTitle>
          </DialogHeader>

          {result && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{projectName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {result.template.name} • Last {result.timeframe.days} days
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={result.citations.some(c => c.type === 'actionItem') ? 'default' : 'secondary'}>
                    Action Items {result.citations.some(c => c.type === 'actionItem') ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={result.citations.some(c => c.type === 'minutes') ? 'default' : 'secondary'}>
                    Minutes {result.citations.some(c => c.type === 'minutes') ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={result.citations.some(c => c.type === 'csvSummary') ? 'default' : 'secondary'}>
                    CSV {result.citations.some(c => c.type === 'csvSummary') ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={result.citations.some(c => c.type === 'asanaTask') ? 'default' : 'secondary'}>
                    Asana {result.citations.some(c => c.type === 'asanaTask') ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={result.citations.some(c => c.type === 'boxCsv') ? 'default' : 'secondary'}>
                    Box CSV {result.citations.some(c => c.type === 'boxCsv') ? '✓' : '✗'}
                  </Badge>
                  <Badge variant={result.citations.some(c => c.type === 'salesforce') ? 'default' : 'secondary'}>
                    Salesforce {result.citations.some(c => c.type === 'salesforce') ? '✓' : '✗'}
                  </Badge>
                </div>
              </div>

              {salesforceSnapshot && salesforceSnapshot.record && (
                <Card>
                  <CardHeader className="pb-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <CardTitle className="text-base">Salesforce Snapshot</CardTitle>
                         {salesforceSnapshot.link && (
                           <a 
                             href={salesforceSnapshot.link}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-xs text-primary hover:underline"
                           >
                             Open in Salesforce
                           </a>
                         )}
                       </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {salesforceSnapshot.sObject}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={refreshSalesforceSnapshot}
                          disabled={loadingSalesforceSnapshot}
                        >
                          <RefreshCw className={`h-3 w-3 ${loadingSalesforceSnapshot ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {salesforceSnapshot.record.Name && (
                        <div>
                          <span className="font-medium text-muted-foreground">Name:</span>
                          <div>{salesforceSnapshot.record.Name}</div>
                        </div>
                      )}
                      {(salesforceSnapshot.record.StageName || salesforceSnapshot.record.Status__c) && (
                        <div>
                          <span className="font-medium text-muted-foreground">Stage:</span>
                          <div>{salesforceSnapshot.record.StageName || salesforceSnapshot.record.Status__c}</div>
                        </div>
                      )}
                      {(salesforceSnapshot.record.CloseDate || salesforceSnapshot.record.Due_Date__c) && (
                        <div>
                          <span className="font-medium text-muted-foreground">Due Date:</span>
                          <div>{salesforceSnapshot.record.CloseDate || salesforceSnapshot.record.Due_Date__c}</div>
                        </div>
                      )}
                      {salesforceSnapshot.record.Owner?.Name && (
                        <div>
                          <span className="font-medium text-muted-foreground">Owner:</span>
                          <div>{salesforceSnapshot.record.Owner.Name}</div>
                        </div>
                      )}
                      {salesforceSnapshot.record.Account?.Name && (
                        <div>
                          <span className="font-medium text-muted-foreground">Account:</span>
                          <div className="truncate">{salesforceSnapshot.record.Account.Name}</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Last fetched: {salesforceSnapshot.lastFetched ? new Date(salesforceSnapshot.lastFetched).toLocaleTimeString() : 'Unknown'}
                      </span>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <a 
                          href={`https://lightning.force.com/lightning/r/${salesforceSnapshot.sObject}/${salesforceSnapshot.id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in Salesforce
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {salesforceSnapshot && salesforceSnapshot.error && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Salesforce Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {salesforceSnapshot.error === 'TOKEN_EXPIRED' && (
                        <div className="text-sm text-destructive">
                          Token expired. <Button variant="link" size="sm" className="h-auto p-0" onClick={() => window.open('/integrations', '_blank')}>Reconnect Salesforce</Button>
                        </div>
                      )}
                      {salesforceSnapshot.error === 'NOT_FOUND' && (
                        <div className="text-sm text-destructive">Record not found</div>
                      )}
                      {salesforceSnapshot.error === 'FETCH_ERROR' && (
                        <div className="text-sm text-destructive">Failed to fetch record</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Last Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{result.sections.lastWeek}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{result.sections.thisWeek}</p>
                  </CardContent>
                </Card>

                {result.sections.risks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Risks & Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {result.sections.risks.map((risk, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-destructive">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.sections.asks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Asks & Support Needed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {result.sections.asks.map((ask, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{ask}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.citations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Data Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.citations.map((citation, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium capitalize">{citation.type}:</span>{' '}
                            {citation.note || citation.title || citation.id}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button onClick={handleSendEmail} className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send via Email
                </Button>
                <Button onClick={handleDownloadPDF}>
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => weeklyUpdateService.downloadTrackerCsv(result, projectName)}>
                  Export Tracker CSV
                </Button>
                <Button variant="outline" onClick={handleCopyToClipboard}>
                  Copy
                </Button>
                <Button variant="outline" onClick={handleDownloadMarkdown}>
                  Download Markdown
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Email Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Weekly Update via Email</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject"
              />
            </div>

            <div>
              <Label>Recipients</Label>
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contacts found for this project</p>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`contact-${contact.id}`}
                          checked={selectedRecipients.includes(contact.email)}
                          onCheckedChange={(checked) => 
                            toggleRecipient(contact.email, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`contact-${contact.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {contact.name} ({contact.email})
                          {contact.role && <span className="text-muted-foreground"> - {contact.role}</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedRecipients.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedRecipients.length} recipient(s) selected
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="include-pdf"
                checked={includePdf}
                onCheckedChange={setIncludePdf}
              />
              <Label htmlFor="include-pdf">Attach as Markdown file (PDF not available)</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSendModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmailSubmit} 
                disabled={isSending || selectedRecipients.length === 0}
              >
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}