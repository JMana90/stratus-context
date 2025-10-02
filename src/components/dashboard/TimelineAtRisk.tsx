import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { actionItemsService } from "@/services/actionItemsService";
import { asanaService } from "@/services/asanaService";
import type { ProjectActionItem } from "@/types/canonical";
import { Calendar, Clock, AlertTriangle, ExternalLink, User, Save } from "lucide-react";
import { format, isAfter, isBefore, addDays, parseISO } from "date-fns";

interface TimelineItem {
  id: string;
  title: string;
  owner?: string;
  due_date?: string;
  status?: string;
  source: 'actionItem' | 'asana';
  url?: string;
  assigneeFirstName?: string;
  notes?: string;
  actionItem?: ProjectActionItem;
}

interface TimelineAtRiskProps {
  projectId: string;
}

export function TimelineAtRisk({ projectId }: TimelineAtRiskProps) {
  const [actionItems, setActionItems] = useState<ProjectActionItem[]>([]);
  const [asanaTasks, setAsanaTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [asanaConnected, setAsanaConnected] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    status: string;
    due_date: string;
    notes: string;
  } | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      // Load action items
      const items = await actionItemsService.listOpen(projectId);
      setActionItems(items);

      // Try to load Asana tasks if connected
      try {
        const response = await asanaService.listProjectTasks(projectId);
        const tasks = Array.isArray(response) ? response : (response?.tasks || []);
        setAsanaTasks(tasks);
        setAsanaConnected(true);
      } catch (error) {
        console.log('Asana not connected or failed to load tasks:', error);
        setAsanaTasks([]);
        setAsanaConnected(false);
      }
    } catch (error) {
      console.error('Failed to load timeline data:', error);
      toast({
        title: "Error loading data",
        description: "Could not load timeline information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const combineAndSortItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // Add action items
    actionItems.forEach(item => {
      items.push({
        id: item.id,
        title: item.title,
        owner: item.owner || 'Unassigned',
        due_date: item.due_date || undefined,
        status: item.status,
        source: 'actionItem',
        notes: item.notes || '',
        actionItem: item
      });
    });

    // Add Asana tasks
    asanaTasks.forEach(task => {
      items.push({
        id: task.gid,
        title: task.name,
        assigneeFirstName: task.assignee?.name || 'Unassigned',
        due_date: task.due_on || undefined,
        source: 'asana',
        url: task.permalink_url
      });
    });

    return items.filter(item => item.due_date).sort((a, b) => {
      if (!a.due_date || !b.due_date) return 0;
      return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
    });
  };

  const getAtRiskItems = () => {
    const now = new Date();
    const nextWeek = addDays(now, 7);
    
    return combineAndSortItems().filter(item => {
      if (!item.due_date) return false;
      const dueDate = parseISO(item.due_date);
      return isBefore(dueDate, now) || isBefore(dueDate, nextWeek);
    });
  };

  const getBucketedItems = () => {
    const items = combineAndSortItems();
    const now = new Date();
    const nextWeek = addDays(now, 7);

    const buckets = {
      overdue: [] as TimelineItem[],
      next7Days: [] as TimelineItem[],
      future: [] as TimelineItem[]
    };

    items.forEach(item => {
      if (!item.due_date) return;
      const dueDate = parseISO(item.due_date);
      
      if (isBefore(dueDate, now)) {
        buckets.overdue.push(item);
      } else if (isBefore(dueDate, nextWeek)) {
        buckets.next7Days.push(item);
      } else {
        buckets.future.push(item);
      }
    });

    return buckets;
  };

  const handleItemClick = (item: TimelineItem) => {
    if (item.source === 'asana' && item.url) {
      window.open(item.url, '_blank');
    } else if (item.source === 'actionItem') {
      setSelectedItem(item);
      setEditingItem({
        status: item.status || 'open',
        due_date: item.due_date || '',
        notes: item.notes || ''
      });
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedItem || !editingItem || selectedItem.source !== 'actionItem') return;

    try {
      await actionItemsService.update(selectedItem.id, {
        status: editingItem.status as 'open' | 'done' | 'blocked',
        due_date: editingItem.due_date || null,
        notes: editingItem.notes || null
      });
      await loadData();
      setSelectedItem(null);
      setEditingItem(null);
      toast({
        title: "Action item updated",
        description: "Changes have been saved successfully",
      });
    } catch (error) {
      console.error('Failed to update action item:', error);
      toast({
        title: "Update failed",
        description: "Could not save changes to action item",
        variant: "destructive",
      });
    }
  };

  const groupItemsByBucket = (buckets: { overdue: TimelineItem[]; next7Days: TimelineItem[]; future: TimelineItem[] }) => {
    const groups: { [key: string]: { [owner: string]: TimelineItem[] } } = {};

    Object.entries(buckets).forEach(([bucket, items]) => {
      groups[bucket] = groupItemsByOwner(items);
    });

    return groups;
  };

  const groupItemsByOwner = (items: TimelineItem[]) => {
    const groups: { [key: string]: TimelineItem[] } = {};

    items.forEach(item => {
      const owner = item.owner || item.assigneeFirstName || 'Unassigned';
      if (!groups[owner]) groups[owner] = [];
      groups[owner].push(item);
    });

    return groups;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading timeline...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bucketedItems = getBucketedItems();
  const atRiskItems = getAtRiskItems();
  const timelineGroups = groupItemsByBucket(bucketedItems);
  const atRiskGroups = groupItemsByOwner(atRiskItems);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
            <div className="flex items-center gap-2 ml-auto">
              {!asanaConnected && (
                <Badge variant="outline" className="text-xs">
                  Asana not included
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.values(bucketedItems).every(bucket => bucket.length === 0) ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                No upcoming items with due dates
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {bucketedItems.overdue.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Overdue ({bucketedItems.overdue.length})
                  </h4>
                  {Object.entries(groupItemsByOwner(bucketedItems.overdue)).map(([owner, items]) => (
                    <div key={owner} className="mb-4">
                      <h5 className="font-medium text-xs mb-2 text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {owner}
                      </h5>
                      <div className="space-y-1 ml-4">
                        {items.map(item => (
                          <div
                            key={`${item.source}-${item.id}`}
                            className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Due: {item.due_date && format(parseISO(item.due_date), 'MMM d')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                              {item.source === 'asana' && <ExternalLink className="h-3 w-3" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bucketedItems.next7Days.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Next 7 Days ({bucketedItems.next7Days.length})
                  </h4>
                  {Object.entries(groupItemsByOwner(bucketedItems.next7Days)).map(([owner, items]) => (
                    <div key={owner} className="mb-4">
                      <h5 className="font-medium text-xs mb-2 text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {owner}
                      </h5>
                      <div className="space-y-1 ml-4">
                        {items.map(item => (
                          <div
                            key={`${item.source}-${item.id}`}
                            className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Due: {item.due_date && format(parseISO(item.due_date), 'MMM d')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">Due Soon</Badge>
                              {item.source === 'asana' && <ExternalLink className="h-3 w-3" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bucketedItems.future.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Future ({bucketedItems.future.length})
                  </h4>
                  {Object.entries(groupItemsByOwner(bucketedItems.future)).map(([owner, items]) => (
                    <div key={owner} className="mb-4">
                      <h5 className="font-medium text-xs mb-2 text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {owner}
                      </h5>
                      <div className="space-y-1 ml-4">
                        {items.map(item => (
                          <div
                            key={`${item.source}-${item.id}`}
                            className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Due: {item.due_date && format(parseISO(item.due_date), 'MMM d')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.source === 'asana' ? 'Asana' : 'Action Item'}
                              </Badge>
                              {item.source === 'asana' && <ExternalLink className="h-3 w-3" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* At Risk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            At Risk ({atRiskItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atRiskItems.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                No items are currently at risk
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(atRiskGroups).map(([owner, items]) => (
                <div key={owner}>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {owner} ({items.length})
                  </h4>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div
                        key={`${item.source}-${item.id}`}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Due: {item.due_date && format(parseISO(item.due_date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            item.due_date && isBefore(parseISO(item.due_date), new Date()) 
                              ? 'destructive' 
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {item.due_date && isBefore(parseISO(item.due_date), new Date()) ? 'Overdue' : 'Due Soon'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Item Details Drawer */}
      <Sheet open={!!selectedItem} onOpenChange={() => {
        setSelectedItem(null);
        setEditingItem(null);
      }}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>Action Item Details</SheetTitle>
          </SheetHeader>
          {selectedItem && editingItem && (
            <div className="space-y-6 mt-6">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedItem.title}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Owner</Label>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                  {selectedItem.owner || 'Unassigned'}
                </div>
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                <Select value={editingItem.status} onValueChange={(value) => 
                  setEditingItem(prev => prev ? { ...prev, status: value } : null)
                }>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date" className="text-sm font-medium">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={editingItem.due_date}
                  onChange={(e) => setEditingItem(prev => 
                    prev ? { ...prev, due_date: e.target.value } : null
                  )}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem(prev => 
                    prev ? { ...prev, notes: e.target.value } : null
                  )}
                  placeholder="Add notes..."
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveEdits} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedItem(null);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}