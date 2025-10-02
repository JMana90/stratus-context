import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Plus, Trash2, Check } from "lucide-react";

interface ActionItem {
  title: string;
  owner?: string;
  owner_email?: string;
  due_date?: string;
  status: 'open' | 'blocked' | 'done';
}

interface ActionItemsExtractorProps {
  projectId: string;
  minutesText: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function ActionItemsExtractor({ 
  projectId, 
  minutesText, 
  onSuccess, 
  onClose 
}: ActionItemsExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ActionItem[]>([]);
  const [step, setStep] = useState<'extract' | 'review'>('extract');
  const { toast } = useToast();

  const extractActionItems = async () => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('llm_meeting_minutes', {
        body: {
          projectId,
          minutesText,
          mode: 'preview'
        }
      });

      if (error) throw error;

      const items = data?.actionItems || [];
      setExtractedItems(items);
      setStep('review');
      
      toast({
        title: "Action items extracted",
        description: `Found ${items.length} potential action items`,
      });
    } catch (error) {
      console.error('Failed to extract action items:', error);
      toast({
        title: "Extraction failed",
        description: "Could not extract action items from the minutes",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const updateItem = (index: number, field: keyof ActionItem, value: string) => {
    const updated = [...extractedItems];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedItems(updated);
  };

  const addItem = () => {
    setExtractedItems([...extractedItems, {
      title: '',
      owner: '',
      owner_email: '',
      due_date: '',
      status: 'open'
    }]);
  };

  const removeItem = (index: number) => {
    setExtractedItems(extractedItems.filter((_, i) => i !== index));
  };

  const approveItems = async () => {
    const validItems = extractedItems.filter(item => item.title.trim());
    
    if (validItems.length === 0) {
      toast({
        title: "No valid items",
        description: "Please add at least one action item with a title",
        variant: "destructive",
      });
      return;
    }

    setIsApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('llm_meeting_minutes', {
        body: {
          projectId,
          minutesText: JSON.stringify(validItems), // Pass items as minutesText for approval
          mode: 'approve'
        }
      });

      if (error) throw error;

      toast({
        title: "Action items saved",
        description: `Successfully created ${validItems.length} action items`,
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save action items:', error);
      toast({
        title: "Save failed",
        description: "Could not save action items",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (step === 'extract') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Extract Action Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            AI will analyze the meeting minutes and extract actionable tasks with owners and due dates.
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm font-medium mb-2">Minutes Preview:</div>
            <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
              {minutesText.slice(0, 500)}...
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={extractActionItems}
              disabled={isExtracting}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {isExtracting ? 'Extracting...' : 'Extract Action Items'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            Review & Approve Action Items
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={addItem}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Review the extracted action items below. You can edit, add, or remove items before saving.
        </div>

        {extractedItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground mb-4">
              No action items were extracted. You can add some manually.
            </div>
            <Button onClick={addItem} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Action Item
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Title</TableHead>
                  <TableHead className="w-[150px]">Owner</TableHead>
                  <TableHead className="w-[150px]">Due Date</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Textarea
                        value={item.title}
                        onChange={(e) => updateItem(index, 'title', e.target.value)}
                        placeholder="Enter task description..."
                        className="min-h-[60px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.owner || ''}
                        onChange={(e) => updateItem(index, 'owner', e.target.value)}
                        placeholder="Owner name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.due_date || ''}
                        onChange={(e) => updateItem(index, 'due_date', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={item.status} 
                        onValueChange={(value: 'open' | 'blocked' | 'done') => updateItem(index, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('extract')}>
            Back
          </Button>
          <Button 
            onClick={approveItems}
            disabled={isApproving || extractedItems.filter(item => item.title.trim()).length === 0}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            {isApproving ? 'Saving...' : `Approve ${extractedItems.filter(item => item.title.trim()).length} Items`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}