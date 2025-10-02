import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Download, Copy, FileText } from "lucide-react";
import { weeklyUpdateService } from "@/services/reports/weeklyUpdateService";
import { weeklyUpdatePdfService } from "@/services/pdf/weeklyUpdatePdf";
import { useToast } from "@/hooks/use-toast";
import type { WeeklyUpdateResult } from "@/types/canonical";

interface WeeklyUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: WeeklyUpdateResult;
  projectName: string;
}

export function WeeklyUpdateModal({
  isOpen,
  onClose,
  result,
  projectName
}: WeeklyUpdateModalProps) {
  const [citationsOpen, setCitationsOpen] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = () => {
    try {
      weeklyUpdatePdfService.exportWeeklyUpdatePdf({
        projectName,
        timeframeDays: result.timeframe.days,
        result
      });
      
      toast({
        title: "PDF Downloaded",
        description: "Weekly update has been saved as PDF",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await weeklyUpdateService.copyToClipboard(result, projectName);
      toast({
        title: "Copied",
        description: "Weekly update copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed", 
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      weeklyUpdateService.downloadMarkdown(result, projectName);
      toast({
        title: "Markdown Downloaded",
        description: "Weekly update has been saved as Markdown",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download Markdown",
        variant: "destructive",
      });
    }
  };

  const getCitationIcon = (type: string) => {
    switch (type) {
      case 'boxCsv':
        return '📊';
      case 'asanaTask':
        return '✓';
      case 'minutes':
        return '📝';
      default:
        return '📄';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Weekly Update Preview</span>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPdf} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleCopy} size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" onClick={handleDownloadMarkdown} size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Markdown
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="border-b pb-4">
              <h1 className="text-2xl font-bold mb-2">Weekly Update: {projectName}</h1>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
                <span><strong>Template:</strong> {result.template.name}</span>
                <span><strong>Timeframe:</strong> Last {result.timeframe.days} days</span>
              </div>
            </div>

            {/* Last Week Section */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Last Week</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {result.sections.lastWeek}
              </p>
            </div>

            <Separator />

            {/* This Week Section */}
            <div>
              <h2 className="text-xl font-semibold mb-3">This Week</h2>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {result.sections.thisWeek}
              </div>
            </div>

            {/* Risks Section */}
            {result.sections.risks.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="text-xl font-semibold mb-3 text-amber-600">Risks & Issues</h2>
                  <ul className="space-y-2">
                    {result.sections.risks.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-600 mt-1">⚠️</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Asks Section */}
            {result.sections.asks.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="text-xl font-semibold mb-3 text-blue-600">Asks & Support Needed</h2>
                  <ul className="space-y-2">
                    {result.sections.asks.map((ask, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-600 mt-1">🤝</span>
                        <span>{ask}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Citations Section */}
            {result.citations.length > 0 && (
              <>
                <Separator />
                <div>
                  <Collapsible open={citationsOpen} onOpenChange={setCitationsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <h2 className="text-xl font-semibold">Data Sources</h2>
                        {citationsOpen ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="space-y-2">
                        {result.citations.map((citation, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                            <span className="text-lg">{getCitationIcon(citation.type)}</span>
                            <div className="flex-1">
                              <Badge variant="outline" className="mb-1">
                                {citation.type}
                              </Badge>
                              <p className="text-sm">
                                {citation.note || citation.title || citation.id}
                              </p>
                              {citation.url && (
                                <a 
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View Source
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}