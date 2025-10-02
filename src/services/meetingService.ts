import { supabase } from "@/integrations/supabase/client";

export interface MeetingMinute {
  id: string;
  project_id: string;
  occurred_at: string;
  title: string;
  minutes_json: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingMinuteInsert {
  project_id: string;
  occurred_at?: string;
  title: string;
  minutes_json: any;
  created_by: string;
}

export interface StructuredMinutes {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee: string;
    dueDate: string;
  }>;
  participants: string[];
  nextSteps: string[];
}

export const meetingService = {
  async createMinutes(projectId: string, rawNotes: string): Promise<{ summary: string; actions: string[] }> {
    // Call Netlify function per spec; handle failures gracefully
    let summary = "";
    let actions: string[] = [];
    try {
      const resp = await fetch("/.netlify/functions/lovable-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Summarize and output JSON: { summary: string, actions: string[] }\n\nNotes:\n${rawNotes}`,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        summary = json?.summary ?? "";
        actions = Array.isArray(json?.actions) ? json.actions as string[] : [];
      } else {
        throw new Error(`LLM call failed: ${resp.status}`);
      }
    } catch (e) {
      // Fall through; UI will show error if needed, but we avoid crashing
      throw e;
    }

    // Persist minutes (store payload in minutes_json to fit existing schema)
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("Not authenticated");

    await supabase
      .from("meeting_minutes")
      .insert({
        project_id: projectId,
        title: "Meeting Summary",
        minutes_json: { rawNotes, summary, actions },
        created_by: userId,
      });

    // Create tasks for actions
    if (actions.length > 0) {
      const tasks = actions.map((title) => ({
        project_id: projectId,
        title,
        status: "pending" as const,
        created_by: userId,
      }));
      const { error: taskErr } = await supabase.from("tasks").insert(tasks);
      if (taskErr) throw taskErr;
    }

    return { summary, actions };
  },

  async createMeetingMinutes(data: MeetingMinuteInsert): Promise<MeetingMinute> {
    const { data: result, error } = await supabase
      .from('meeting_minutes')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async listMeetingMinutes(projectId: string): Promise<MeetingMinute[]> {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .eq('project_id', projectId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMeetingMinutes(id: string): Promise<MeetingMinute | null> {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async generateStructuredMinutes(rawText: string, projectId: string): Promise<StructuredMinutes> {
    const { data, error } = await supabase.functions.invoke('llm_meeting_minutes', {
      body: { rawText, projectId }
    });

    if (error) throw error;
    return data;
  },

  async createTasksFromActionItems(projectId: string, actionItems: Array<{ task: string; assignee: string; dueDate: string }>, userId: string) {
    const { taskService } = await import("@/services/taskService");
    
    const tasks = actionItems.map(item => ({
      project_id: projectId,
      title: item.task,
      description: `Generated from meeting minutes - Assigned to: ${item.assignee}`,
      due_date: new Date(item.dueDate).toISOString(),
      status: 'pending' as const,
      created_by: userId,
    }));

    // Create tasks in batch
    const { data, error } = await supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (error) throw error;
    return data;
  },

  async updateMeetingMinutes(id: string, updates: Partial<Pick<MeetingMinute, 'title' | 'minutes_json' | 'occurred_at'>>): Promise<MeetingMinute> {
    const { data, error } = await supabase
      .from('meeting_minutes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMeetingMinutes(id: string): Promise<void> {
    const { error } = await supabase
      .from('meeting_minutes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};