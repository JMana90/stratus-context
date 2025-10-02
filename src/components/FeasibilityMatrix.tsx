import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";

const feasibilityData = {
  software: {
    name: "Software/Tech",
    features: [
      { name: "AI status summaries", status: "possible", note: "Edge function + OpenAI" },
      { name: "Release note drafts", status: "possible", note: "Template generation" },
      { name: "Jira/GitHub webhooks", status: "edge_function", note: "Webhook handlers needed" },
      { name: "Knowledge Q&A", status: "paid_tier", note: "Requires vector database" },
    ],
  },
  financial: {
    name: "Financial Services",
    features: [
      { name: "AI compliance templates", status: "possible", note: "Template generation" },
      { name: "Strict RBAC/RLS", status: "possible", note: "Supabase RLS policies" },
      { name: "Office export", status: "edge_function", note: "Document generation libs" },
      { name: "CSV data import", status: "possible", note: "File upload + parsing" },
      { name: "Bank-grade security", status: "not_feasible", note: "Requires enterprise features" },
    ],
  },
  pharma: {
    name: "Pharma/Life Sciences",
    features: [
      { name: "SOP/checklist templates", status: "possible", note: "Industry templates" },
      { name: "Audit-style activity log", status: "possible", note: "Activity logging table" },
      { name: "Training/cert tracking", status: "possible", note: "User metadata tracking" },
      { name: "Document linkages", status: "possible", note: "Foreign key relationships" },
      { name: "Veeva integration", status: "not_feasible", note: "Enterprise DMS integration" },
    ],
  },
  construction: {
    name: "Construction/Engineering",
    features: [
      { name: "Daily log templates", status: "possible", note: "Form templates" },
      { name: "Photo/PDF text extraction", status: "paid_tier", note: "OCR service required" },
      { name: "Procore webhooks", status: "edge_function", note: "API integration stubs" },
      { name: "Autodesk placeholders", status: "edge_function", note: "Webhook ingestion" },
    ],
  },
  manufacturing: {
    name: "Manufacturing/Industrial",
    features: [
      { name: "Change impact templates", status: "possible", note: "AI-generated tasks" },
      { name: "CSV/ERP import stubs", status: "possible", note: "File processing" },
      { name: "Traceability matrix export", status: "edge_function", note: "CSV generation" },
      { name: "Full ERP integration", status: "not_feasible", note: "Enterprise middleware" },
    ],
  },
};

const statusConfig = {
  possible: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Possible Now" },
  edge_function: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Needs Edge Function" },
  paid_tier: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100", label: "Needs Paid Tier" },
  not_feasible: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Not Feasible" },
};

export function FeasibilityMatrix() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Industry Feature Feasibility Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {Object.entries(feasibilityData).map(([key, industry]) => (
              <div key={key} className="space-y-3">
                <h3 className="text-lg font-semibold">{industry.name}</h3>
                <div className="grid gap-2">
                  {industry.features.map((feature, index) => {
                    const config = statusConfig[feature.status as keyof typeof statusConfig];
                    const Icon = config.icon;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className="font-medium">{feature.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`${config.bg} ${config.color}`}>
                            {config.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{feature.note}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}