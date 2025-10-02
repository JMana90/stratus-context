import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2, FileText } from "lucide-react";
import { weeklyUpdateService } from "@/services/reports/weeklyUpdateService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TemplatePreferences } from "@/types/canonical";

interface TemplateManagerProps {
  projectId: string;
  organizationId: string;
  onClose?: () => void;
  onSaved?: () => void;
}

export function TemplateManager({ projectId, organizationId, onClose, onSaved }: TemplateManagerProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [scheduleRrule, setScheduleRrule] = useState("");
  const [nextRunPreview, setNextRunPreview] = useState<string>("");
  const [preferences, setPreferences] = useState<TemplatePreferences>({
    timeframe: {
      days: 7,
    },
    dataSources: {
      actionItems: true,
      minutes: true,
      asana: false,
    },
  });
  const [isDefault, setIsDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTestingSchedule, setIsTestingSchedule] = useState(false);
  const [showBoxCsvSelector, setShowBoxCsvSelector] = useState(false);
  const [selectedBoxCsvs, setSelectedBoxCsvs] = useState<Array<{ fileId: string; name: string }>>([]);
  const [boxCsvs, setBoxCsvs] = useState<Array<{ id: string; name: string; path: string }>>([]);
  const [loadingBoxCsvs, setLoadingBoxCsvs] = useState(false);
  const [salesforceProject, setSalesforceProject] = useState<{ sObject: string; id: string }>({ sObject: 'Opportunity', id: '' });
  
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  const loadTemplates = async () => {
    try {
      const data = await weeklyUpdateService.getProjectTemplates(projectId);
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const updateNextRunPreview = (rrule: string) => {
    if (!rrule.trim()) {
      setNextRunPreview("");
      return;
    }

    try {
      const nextRun = weeklyUpdateService.parseNextRunFromRRule(rrule);
      setNextRunPreview(nextRun.toLocaleString());
    } catch (error) {
      setNextRunPreview("Will compute on server");
    }
  };

  const handleScheduleChange = (value: string) => {
    setScheduleRrule(value);
    updateNextRunPreview(value);
  };

  const handleDataSourceToggle = (source: keyof TemplatePreferences['dataSources'], enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      dataSources: {
        ...prev.dataSources,
        [source]: enabled,
      },
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save selected Box CSVs and Salesforce project to preferences
      const updatedPreferences = {
        ...preferences,
        boxCsvSources: selectedBoxCsvs.length > 0 ? selectedBoxCsvs : undefined,
        salesforceProject: salesforceProject.id ? salesforceProject : undefined,
        includeSalesforceSnapshot: preferences.includeSalesforceSnapshot,
      };

      await weeklyUpdateService.saveProjectTemplate(projectId, organizationId, {
        name: name.trim(),
        content: content || `# ${name}\n\nWeekly update template for project insights.`,
        preferences: updatedPreferences,
        isDefault,
        scheduleRrule: scheduleRrule.trim() || undefined,
      });

      toast({
        title: "Success",
        description: "Template saved successfully",
      });

      // Reset form
      setName("");
      setContent("");
      setScheduleRrule("");
      setNextRunPreview("");
      setIsDefault(false);
      setSelectedBoxCsvs([]);
      setSalesforceProject({ sObject: 'Opportunity', id: '' });
      
      await loadTemplates();
      onSaved?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSchedule = async () => {
    setIsTestingSchedule(true);
    try {
      const result = await weeklyUpdateService.triggerScheduledDrafts();
      toast({
        title: "Schedule Test Complete",
        description: `Processed ${result.processed} templates. Check update drafts.`,
      });
      console.log('Schedule test result:', result);
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to trigger scheduled drafts",
        variant: "destructive",
      });
    } finally {
      setIsTestingSchedule(false);
    }
  };

  const loadBoxCsvs = async () => {
    setLoadingBoxCsvs(true);
    try {
      const response = await fetch(`/supabase/functions/v1/box_proxy/list_csv_files?organizationId=${organizationId}&folderId=0`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load CSV files');
      }

      const data = await response.json();

      setBoxCsvs(data.files || []);
    } catch (error: any) {
      toast({
        title: "Error loading Box CSVs",
        description: error.message || "Failed to load CSV files from Box",
        variant: "destructive",
      });
      setBoxCsvs([]);
    } finally {
      setLoadingBoxCsvs(false);
    }
  };

  const handleBoxCsvToggle = (csv: { id: string; name: string }, checked: boolean) => {
    if (checked) {
      setSelectedBoxCsvs(prev => [...prev, { fileId: csv.id, name: csv.name }]);
    } else {
      setSelectedBoxCsvs(prev => prev.filter(item => item.fileId !== csv.id));
    }
  };

  const defaultContent = `# Weekly Project Update

## Last Week
[Automatically generated from your data sources]

## This Week  
[AI-generated planning based on your project data]

## Risks & Issues
[Identified risks from task delays and project data]

## Asks & Support Needed
[Generated requests based on project status]`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Update Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Executive Summary, PM Dashboard"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="template-content">Template Content (Markdown)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = textarea.value;
                    const token = '{{CRM_STATUS}}';
                    const newText = text.substring(0, start) + token + text.substring(end);
                    setContent(newText);
                    // Set cursor after the inserted token
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + token.length, start + token.length);
                    }, 0);
                  }
                }}
              >
                Insert CRM Status
              </Button>
            </div>
            <Textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={defaultContent}
              rows={8}
            />
            <p className="text-sm text-muted-foreground mt-1">
              AI will populate sections based on your data sources. Use &#123;&#123;CRM_STATUS&#125;&#125; to place the Salesforce snapshot anywhere in your update.
            </p>
          </div>

            <div className="space-y-4">
              <h4 className="font-medium">Data Sources</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Action Items</Label>
                  <p className="text-sm text-muted-foreground">
                    Include tracked action items and their status
                  </p>
                </div>
                <Switch
                  checked={preferences.dataSources.actionItems}
                  onCheckedChange={(checked) => handleDataSourceToggle('actionItems', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Meeting Minutes</Label>
                  <p className="text-sm text-muted-foreground">
                    Include recent meeting summaries
                  </p>
                </div>
                <Switch
                  checked={preferences.dataSources.minutes}
                  onCheckedChange={(checked) => handleDataSourceToggle('minutes', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Asana Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Pull task status and updates
                  </p>
                </div>
                <Switch
                  checked={preferences.dataSources.asana}
                  onCheckedChange={(checked) => handleDataSourceToggle('asana', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Box CSV Files</Label>
                  <p className="text-sm text-muted-foreground">
                    Include data from Box CSV analysis
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={preferences.dataSources.boxCsv || false}
                    onCheckedChange={(checked) => handleDataSourceToggle('boxCsv', checked)}
                  />
                  {preferences.dataSources.boxCsv && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        loadBoxCsvs();
                        setShowBoxCsvSelector(true);
                      }}
                    >
                      Choose Files
                    </Button>
                  )}
                </div>
              </div>

              {selectedBoxCsvs.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium">Selected Box CSVs:</p>
                  {selectedBoxCsvs.map((csv, index) => (
                    <div key={csv.fileId} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{csv.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedBoxCsvs(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Salesforce Project</Label>
                  <p className="text-sm text-muted-foreground">
                    Link to a Salesforce record for project context
                  </p>
                </div>
                <Switch
                  checked={preferences.dataSources.salesforce || false}
                  onCheckedChange={(checked) => handleDataSourceToggle('salesforce', checked)}
                />
              </div>

              {preferences.dataSources.salesforce && (
                <div className="space-y-3 ml-4 pl-4 border-l">
                  <div>
                    <Label htmlFor="sf-sobject">sObject</Label>
                    <Input
                      id="sf-sobject"
                      value={salesforceProject.sObject}
                      onChange={(e) => setSalesforceProject(prev => ({ ...prev, sObject: e.target.value }))}
                      placeholder="Opportunity, Project__c, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="sf-record-id">Record ID</Label>
                    <Input
                      id="sf-record-id"
                      value={salesforceProject.id}
                      onChange={(e) => setSalesforceProject(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="18-character Salesforce ID"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Salesforce snapshot in updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Add CRM data to generated weekly updates
                      </p>
                    </div>
                    <Switch
                      checked={preferences.includeSalesforceSnapshot ?? true}
                      onCheckedChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        includeSalesforceSnapshot: checked
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

          <div>
            <Label>Timeframe (days)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={preferences.timeframe.days}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                timeframe: {
                  days: Math.max(1, parseInt(e.target.value) || 7),
                },
              }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="is-default">Set as default template</Label>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium">Schedule (Optional)</h4>
            <div>
              <Label htmlFor="schedule-rrule">RRULE</Label>
              <Input
                id="schedule-rrule"
                value={scheduleRrule}
                onChange={(e) => handleScheduleChange(e.target.value)}
                placeholder="FREQ=WEEKLY;BYDAY=FR;BYHOUR=9"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Weekly schedule format. Example: FREQ=WEEKLY;BYDAY=FR;BYHOUR=9 (Fridays at 9am)
              </p>
            </div>
            {nextRunPreview && (
              <div className="text-sm">
                <span className="font-medium">Next run: </span>
                <span className="text-muted-foreground">{nextRunPreview}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Template"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestSchedule} 
              disabled={isTestingSchedule}
            >
              {isTestingSchedule ? "Testing..." : "Run Schedule Now (Test)"}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
          </CardContent>
        </Card>

        {/* Box CSV Selection Dialog */}
        <Dialog open={showBoxCsvSelector} onOpenChange={setShowBoxCsvSelector}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Box CSV Files</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {loadingBoxCsvs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading CSV files...</span>
                </div>
              ) : boxCsvs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No CSV files found in your Box account</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {boxCsvs.map((csv) => (
                    <div key={csv.id} className="flex items-center space-x-3 p-3 border rounded">
                      <Checkbox
                        checked={selectedBoxCsvs.some(selected => selected.fileId === csv.id)}
                        onCheckedChange={(checked) => handleBoxCsvToggle(csv, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{csv.name}</p>
                        {csv.path && <p className="text-xs text-muted-foreground truncate">{csv.path}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowBoxCsvSelector(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowBoxCsvSelector(false)}>
                  Done ({selectedBoxCsvs.length} selected)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.templates?.name || 'Unnamed Template'}</span>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    {template.schedule_rrule && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Schedule: {template.schedule_rrule}
                        {template.next_run_at && (
                          <span className="ml-2">
                            Next: {new Date(template.next_run_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}