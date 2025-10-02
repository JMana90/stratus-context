import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Download } from "lucide-react";
import { weeklyUpdateService } from "@/services/reports/weeklyUpdateService";
import { weeklyUpdatePdfService } from "@/services/pdf/weeklyUpdatePdf";
import { useToast } from "@/hooks/use-toast";
import type { WeeklyUpdateResult } from "@/types/canonical";

interface PastDraftsProps {
  projectId: string;
  projectName: string;
}

export function PastDrafts({ projectId, projectName }: PastDraftsProps) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<WeeklyUpdateResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadDrafts();
  }, [projectId]);

  const loadDrafts = async () => {
    try {
      const data = await weeklyUpdateService.listDrafts(projectId);
      setDrafts(data || []);
    } catch (error) {
      console.error("Failed to load drafts:", error);
      toast({
        title: "Error",
        description: "Failed to load past drafts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDraft = (draft: any) => {
    const result = weeklyUpdateService.draftToResult(draft);
    setSelectedDraft(result);
    setShowPreview(true);
  };

  const handleDownloadPDF = (draft: any) => {
    const result = weeklyUpdateService.draftToResult(draft);
    weeklyUpdatePdfService.exportWeeklyUpdatePdf({
      projectName,
      timeframeDays: result.timeframe.days,
      result,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Past Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Past Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No drafts found. Generate your first weekly update to see it here.
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {draft.templates?.name || 'Unknown Template'} • {draft.timeframe_days} days
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDraft(draft)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(draft)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Past Weekly Update</DialogTitle>
          </DialogHeader>

          {selectedDraft && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{projectName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDraft.template.name} • Last {selectedDraft.timeframe.days} days
                  </p>
                </div>
                <Badge variant="secondary">Past Draft</Badge>
              </div>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Last Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{selectedDraft.sections.lastWeek}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{selectedDraft.sections.thisWeek}</p>
                  </CardContent>
                </Card>

                {selectedDraft.sections.risks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Risks & Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {selectedDraft.sections.risks.map((risk, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-destructive">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {selectedDraft.sections.asks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Asks & Support Needed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {selectedDraft.sections.asks.map((ask, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{ask}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    weeklyUpdatePdfService.exportWeeklyUpdatePdf({
                      projectName,
                      timeframeDays: selectedDraft.timeframe.days,
                      result: selectedDraft,
                    });
                  }}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}