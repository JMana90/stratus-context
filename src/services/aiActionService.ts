import { supabase } from "@/integrations/supabase/client";

export interface AIActionSuggestion {
  id: string;
  title: string;
  description: string;
  actionType: 'task' | 'phase' | 'milestone';
  projectId: string;
  phaseId?: string;
}

export interface AIExecutionDraft {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  suggestedDueDate: string;
  dependencies: string[];
  taskId: string;
  projectId: string;
  phaseId?: string;
}

export const aiActionService = {
  async suggestNextAction({ 
    projectId, 
    phaseId 
  }: { 
    projectId: string; 
    phaseId?: string; 
  }): Promise<AIActionSuggestion> {
    try {
      const { data, error } = await supabase.functions.invoke('suggest_tasks', {
        body: {
          project_id: projectId,
          phase_id: phaseId,
        },
      });

      if (error) throw error;

      // Transform the response into our expected format
      const suggestion: AIActionSuggestion = {
        id: crypto.randomUUID(),
        title: data.tasks?.[0]?.title || "AI Suggested Task",
        description: data.tasks?.[0]?.description || "No description available",
        actionType: 'task',
        projectId,
        phaseId,
      };

      return suggestion;
    } catch (error) {
      console.error('Error suggesting next action:', error);
      throw new Error('Failed to get AI suggestion');
    }
  },

  async draftExecution({
    projectId,
    phaseId,
    taskId,
  }: {
    projectId: string;
    phaseId?: string;
    taskId: string;
  }): Promise<AIExecutionDraft> {
    try {
      // For now, return a mock draft
      // In the future, this could call an AI service to generate execution plans
      const draft: AIExecutionDraft = {
        id: crypto.randomUUID(),
        title: "Execute Task",
        description: "AI-generated execution plan for this task",
        estimatedHours: 4,
        suggestedDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        dependencies: [],
        taskId,
        projectId,
        phaseId,
      };

      return draft;
    } catch (error) {
      console.error('Error drafting execution:', error);
      throw new Error('Failed to draft execution plan');
    }
  },
};