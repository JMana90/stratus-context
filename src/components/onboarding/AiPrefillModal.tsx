import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AiPrefillAnswers = {
  targetDate: string;
  budgetRange: string;
  stakeholders: number;
  primaryRisk: string;
  successCriteria: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (answers: AiPrefillAnswers) => void;
};

export default function AiPrefillModal({ open, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<AiPrefillAnswers>({
    targetDate: "",
    budgetRange: "",
    stakeholders: 0,
    primaryRisk: "",
    successCriteria: "",
  });

  const canSubmit = form.targetDate && form.budgetRange && form.primaryRisk && form.successCriteria;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick AI Prefill</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetDate">Target completion date</Label>
            <Input
              id="targetDate"
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Budget range</Label>
            <Select
              value={form.budgetRange}
              onValueChange={(v) => setForm((f) => ({ ...f, budgetRange: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<50k">Under $50k</SelectItem>
                <SelectItem value="50k-250k">$50k – $250k</SelectItem>
                <SelectItem value="250k-1m">$250k – $1M</SelectItem>
                <SelectItem value=">1m">Over $1M</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stakeholders">Key stakeholders count</Label>
            <Input
              id="stakeholders"
              type="number"
              min={0}
              value={form.stakeholders}
              onChange={(e) => setForm((f) => ({ ...f, stakeholders: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Primary risk area</Label>
            <Select
              value={form.primaryRisk}
              onValueChange={(v) => setForm((f) => ({ ...f, primaryRisk: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="scope">Scope</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="successCriteria">Success criteria</Label>
            <Textarea
              id="successCriteria"
              rows={3}
              placeholder="What does success look like?"
              value={form.successCriteria}
              onChange={(e) => setForm((f) => ({ ...f, successCriteria: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSubmit(form)}
            disabled={!canSubmit}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
