import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanDetails {
  name: "Solo" | "Professional" | "Enterprise";
  users: number;
  projects: number;
  storage: string;
  aiRequests: number;
}

export default function CollapsiblePlanCard() {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem("planCardExpanded") !== "false";
  });

  // Mock plan data - in a real app, this would come from the subscription service
  const planDetails: PlanDetails = {
    name: "Professional",
    users: 5,
    projects: 10,
    storage: "100GB",
    aiRequests: 1000
  };

  useEffect(() => {
    localStorage.setItem("planCardExpanded", String(isExpanded));
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isExpanded) {
    // Collapsed state - just show the plan name with icon
    return (
      <div className="rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:shadow-md">
        <Button
          variant="ghost" 
          onClick={toggleExpanded}
          className="w-full flex items-center justify-between p-0 h-auto text-left font-normal"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Current Plan: {planDetails.name}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  // Expanded state - show full details
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:shadow-md">
      <Button
        variant="ghost"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-0 h-auto text-left font-normal mb-3"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold">Current Plan: {planDetails.name}</h3>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="font-semibold text-lg text-primary">{planDetails.users}</div>
          <div className="text-muted-foreground">Users</div>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="font-semibold text-lg text-primary">{planDetails.projects}</div>
          <div className="text-muted-foreground">Projects</div>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="font-semibold text-lg text-primary">{planDetails.storage}</div>
          <div className="text-muted-foreground">Storage</div>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="font-semibold text-lg text-primary">{planDetails.aiRequests}</div>
          <div className="text-muted-foreground">AI Requests</div>
        </div>
      </div>
    </div>
  );
}