import React, { useState, useEffect } from "react";
import SectionCard from "./SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CheckSquare, ArrowRight } from "lucide-react";
import { meetingService, type MeetingMinute, type StructuredMinutes } from "@/services/meetingService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Feature flag for meeting minutes
const ENABLE_MEETING_MINUTES = true;

interface MeetingMinutesCardProps {
  projectId: string;
}

export default function MeetingMinutesCard({ projectId }: MeetingMinutesCardProps) {
  const [rawText, setRawText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [structuredMinutes, setStructuredMinutes] = useState<StructuredMinutes | null>(null);
  const [recentMinutes, setRecentMinutes] = useState<MeetingMinute[]>([]);
  const [recentLoading, setRecentLoading] = React.useState(false);
  const [recentError, setRecentError] = React.useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [genSummary, setGenSummary] = useState<string | null>(null);
  const [genActions, setGenActions] = useState<string[] | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Don't render if feature flag is disabled
  if (!ENABLE_MEETING_MINUTES) {
    return null;
  }

  useEffect(() => {
    loadRecentMinutes();
  }, [projectId]);

  const loadRecentMinutes = async () => {
    try {
      const minutes = await meetingService.listMeetingMinutes(projectId);
      setRecentMinutes(minutes.slice(0, 3)); // Show only 3 most recent
    } catch (error) {
      console.error("Failed to load meeting minutes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMinutes = async () => {
    if (!rawText.trim()) {
      toast({
        title: "Error",
        description: "Please enter meeting notes to process.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const structured = await meetingService.generateStructuredMinutes(rawText, projectId);
      setStructuredMinutes(structured);
      setMeetingTitle(structured.title);
    } catch (error) {
      console.error("Failed to generate minutes:", error);
      toast({
        title: "Error",
        description: "Failed to generate structured minutes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveMinutes = async () => {
    if (!structuredMinutes || !user) return;

    try {
      await meetingService.createMeetingMinutes({
        project_id: projectId,
        title: meetingTitle || structuredMinutes.title,
        minutes_json: structuredMinutes,
        created_by: user.id,
      });

      toast({
        title: "Success",
        description: "Meeting minutes saved successfully.",
      });

      // Reset form
      setRawText("");
      setStructuredMinutes(null);
      setMeetingTitle("");
      await loadRecentMinutes();
    } catch (error) {
      console.error("Failed to save minutes:", error);
      toast({
        title: "Error",
        description: "Failed to save meeting minutes.",
        variant: "destructive",
      });
    }
  };

  const handleCreateActionItems = async () => {
    if (!structuredMinutes?.actionItems || !user) return;

    setCreatingTasks(true);
    try {
      await meetingService.createTasksFromActionItems(
        projectId,
        structuredMinutes.actionItems,
        user.id
      );

      toast({
        title: "Success",
        description: `Created ${structuredMinutes.actionItems.length} action items as tasks.`,
      });
    } catch (error) {
      console.error("Failed to create action items:", error);
      toast({
        title: "Error",
        description: "Failed to create action items as tasks.",
        variant: "destructive",
      });
    } finally {
      setCreatingTasks(false);
    }
  };

  return (
    <SectionCard title="Meeting Minutes" className="space-y-4">
      {/* Input Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="meeting-notes">Raw Meeting Notes</Label>
          <Textarea
            id="meeting-notes"
            placeholder="Paste your meeting notes here..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>
        
        <Button 
          onClick={handleGenerateMinutes}
          disabled={processing || !rawText.trim()}
          className="w-full"
        >
          {processing ? "Generating Minutes..." : "Generate Minutes"}
        </Button>
        <Button
          onClick={async () => {
            if (!rawText.trim()) {
              toast({ title: "Error", description: "Please enter meeting notes to process.", variant: "destructive" });
              return;
            }
            setProcessing(true);
            try {
              const res = await meetingService.createMinutes(projectId, rawText);
              setGenSummary(res.summary);
              setGenActions(res.actions);
              toast({ title: "Success", description: `Created ${res.actions.length} action items.` });
            } catch (e) {
              console.error(e);
              toast({ title: "LLM Error", description: "Failed to generate summary/actions.", variant: "destructive" });
            } finally {
              setProcessing(false);
            }
          }}
          disabled={processing || !rawText.trim()}
          variant="outline"
          className="w-full"
        >
          {processing ? "Processing…" : "Generate Summary & Actions"}
        </Button>
      </div>

      {/* Generated Summary & Actions (Netlify function path) */}
      {(genSummary || (genActions && genActions.length > 0)) && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Generated Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {genSummary && (
              <p className="text-sm text-muted-foreground">{genSummary}</p>
            )}
            {genActions && genActions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Actions Created</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {genActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Structured Minutes Preview */}
      {structuredMinutes && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Meeting Title</Label>
              <Input
                id="meeting-title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Enter meeting title..."
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{structuredMinutes.summary}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Key Points
              </h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {structuredMinutes.keyPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants
              </h4>
              <div className="flex flex-wrap gap-1">
                {structuredMinutes.participants.map((participant, idx) => (
                  <Badge key={idx} variant="secondary">{participant}</Badge>
                ))}
              </div>
            </div>

            {structuredMinutes.actionItems.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Action Items
                </h4>
                <div className="space-y-2">
                  {structuredMinutes.actionItems.map((item, idx) => (
                    <div key={idx} className="text-sm p-2 bg-muted rounded">
                      <div className="font-medium">{item.task}</div>
                      <div className="text-muted-foreground">
                        Assigned to: {item.assignee} • Due: {item.dueDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveMinutes} size="sm">
                Save Minutes
              </Button>
              {structuredMinutes.actionItems.length > 0 && (
                <Button 
                  onClick={handleCreateActionItems}
                  disabled={creatingTasks}
                  variant="outline" 
                  size="sm"
                >
                  {creatingTasks ? "Creating..." : "Create Action Items"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Minutes */}
      <div className="mt-6">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Recent Minutes
        </h4>
      
        {recentLoading ? (
          <div className="text-sm text-muted-foreground">Loading recent minutes…</div>
        ) : recentError ? (
          <div className="text-sm text-red-600 dark:text-red-400">{recentError}</div>
        ) : recentMinutes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recent minutes yet.</div>
        ) : (
          <div className="space-y-2">
            {recentMinutes.slice(0, 3).map((minute) => (
              <div key={minute.id} className="text-sm p-2 bg-muted rounded">
                <div className="font-medium">{minute.title || "Untitled"}</div>
                <div className="text-muted-foreground">
                  {new Date(minute.occurred_at || minute.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}