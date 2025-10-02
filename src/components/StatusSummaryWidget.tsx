import React, { useState, useEffect } from "react";
import { industryService } from "@/services/industryService";
import type { Database } from "@/integrations/supabase/types";

type StatusSummaryRow = Database["public"]["Tables"]["status_summaries"]["Row"];
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, TrendingUp } from "lucide-react";

interface StatusSummaryWidgetProps {
  projectId: string;
}

export function StatusSummaryWidget({ projectId }: StatusSummaryWidgetProps) {
  const [summaries, setSummaries] = useState<StatusSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSummaries();
  }, [projectId]);

  const loadSummaries = async () => {
    try {
      const data = await industryService.getStatusSummaries(projectId);
      setSummaries(data);
    } catch (error) {
      console.error("Failed to load summaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      // Call the edge function
      const { data, error } = await supabase.functions.invoke("llm_summarize_status", {
        body: { project_id: projectId }
      });

      if (error) throw error;

      // Save the summary
      await industryService.createStatusSummary(projectId);
      await industryService.logActivity(projectId, "status_summary_generated", { summary_length: data.summary.length });
      
      // Reload summaries
      await loadSummaries();
      
      toast({
        title: "Summary Generated",
        description: "Project status summary has been created",
      });
    } catch (error) {
      console.error("Failed to generate summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate status summary",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Status Summary
          </div>
          <Button
            size="sm"
            onClick={generateSummary}
            disabled={isGenerating}
            className="gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summaries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No status summaries yet.</p>
            <p className="text-sm">Click "Generate" to create your first AI-powered summary.</p>
          </div>
        ) : (
          <ScrollArea className="h-60">
            <div className="space-y-4">
              {summaries.map((summary, index) => (
                <div key={summary.id}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-muted-foreground">
                        {new Date(summary.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-line">{summary.summary}</p>
                  </div>
                  {index < summaries.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}