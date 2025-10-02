
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Save } from "lucide-react";
import { RequirementItem } from "@/pages/AddProject";

interface RequirementsCustomizerProps {
  requirements: RequirementItem[];
  onComplete: (requirements: RequirementItem[]) => void;
}

export function RequirementsCustomizer({ requirements, onComplete }: RequirementsCustomizerProps) {
  const [editableRequirements, setEditableRequirements] = useState<RequirementItem[]>(requirements);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRequirement, setNewRequirement] = useState<Partial<RequirementItem>>({
    category: '',
    title: '',
    description: '',
    required: false,
    source: 'Custom'
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleRequirementUpdate = (id: string, updates: Partial<RequirementItem>) => {
    setEditableRequirements(prev =>
      prev.map(req =>
        req.id === id
          ? { ...req, ...updates, customized: true }
          : req
      )
    );
  };

  const handleRequirementDelete = (id: string) => {
    setEditableRequirements(prev => prev.filter(req => req.id !== id));
  };

  const handleAddRequirement = () => {
    if (newRequirement.title && newRequirement.description) {
      const newReq: RequirementItem = {
        id: Date.now().toString(),
        category: newRequirement.category || 'Custom',
        title: newRequirement.title,
        description: newRequirement.description,
        required: newRequirement.required || false,
        source: 'Custom',
        customized: true
      };
      
      setEditableRequirements(prev => [...prev, newReq]);
      setNewRequirement({
        category: '',
        title: '',
        description: '',
        required: false,
        source: 'Custom'
      });
      setShowAddForm(false);
    }
  };

  return (
<div className="space-y-6">
  <div className="text-center">
    <h3 className="text-lg font-semibold mb-2">Customize Your Requirements</h3>
    <p className="text-muted-foreground">
      Review, edit, or add additional requirements for your project.
    </p>
  </div>

<div className="space-y-4">
  {editableRequirements.map((req) => (
    <Card key={req.id} className={`bg-card text-card-foreground border border-border rounded-lg ${req.customized ? "bg-muted/40" : ""}`}>
      <CardContent className="p-4">
        {editingId === req.id ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`category-${req.id}`}>Category</Label>
                <Input
                  id={`category-${req.id}`}
                  value={req.category}
                  onChange={(e) => handleRequirementUpdate(req.id, { category: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`title-${req.id}`}>Title</Label>
                <Input
                  id={`title-${req.id}`}
                  value={req.title}
                  onChange={(e) => handleRequirementUpdate(req.id, { title: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`description-${req.id}`}>Description</Label>
              <Textarea
                id={`description-${req.id}`}
                value={req.description}
                onChange={(e) => handleRequirementUpdate(req.id, { description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`required-${req.id}`}
                  checked={req.required}
                  onCheckedChange={(checked) => handleRequirementUpdate(req.id, { required: checked })}
                />
                <Label htmlFor={`required-${req.id}`}>Required</Label>
              </div>
              <Button
                size="sm"
                onClick={() => setEditingId(null)}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{req.category}</span>
                <h4 className="font-semibold">{req.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                  {req.required ? "Required" : "Optional"}
                </span>
                {req.customized && (
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    Customized
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{req.description}</p>
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Source: {req.source}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(req.id)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRequirementDelete(req.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  ))}
</div>

      {showAddForm ? (
<Card className="border-dashed border-2 border-border bg-card text-card-foreground rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Add Custom Requirement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-category">Category</Label>
                <Input
                  id="new-category"
                  value={newRequirement.category || ''}
                  onChange={(e) => setNewRequirement({ ...newRequirement, category: e.target.value })}
                  placeholder="e.g., Custom Standards"
                />
              </div>
              <div>
                <Label htmlFor="new-title">Title</Label>
                <Input
                  id="new-title"
                  value={newRequirement.title || ''}
                  onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                  placeholder="Requirement title"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newRequirement.description || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                placeholder="Describe the requirement..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="new-required"
                  checked={newRequirement.required || false}
                  onCheckedChange={(checked) => setNewRequirement({ ...newRequirement, required: checked })}
                />
                <Label htmlFor="new-required">Required</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddRequirement}>
                  Add Requirement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="w-full border-dashed border-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Requirement
        </Button>
      )}

      <div className="pt-4 border-t">
        <Button onClick={() => onComplete(editableRequirements)} className="w-full">
          Create Project with {editableRequirements.length} Requirements
        </Button>
      </div>
    </div>
  );
}
