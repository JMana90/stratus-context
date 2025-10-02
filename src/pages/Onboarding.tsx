import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, ExternalLink } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProjectForm from "@/components/ProjectForm";
import { RequirementsCustomizer } from "@/components/RequirementsCustomizer";
import ProjectIntegrationsSetup from "@/components/setup/ProjectIntegrationsSetup";
import { OrganizationSetupModal } from "@/components/OrganizationSetupModal";
import { DashboardSetup } from "@/components/DashboardSetup";
import { projectService } from "@/services/projectService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationService } from "@/services/organizationService";
import { INDUSTRY_OPTIONS } from "@/config/industry-widgets";
import { PROJECT_TYPES_BY_INDUSTRY } from "@/constants/projects";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNewProjectDraft } from "@/hooks/useNewProjectDraft";
import { dashboardService } from "@/services/dashboardService";
import { getQuestionsForIndustry } from "@/constants/aiQuestions";
import type { IndustryKey } from "@/config/industry-widgets";
import { AIRequirementsAssistant } from "@/components/AIRequirementsAssistant";
import { normalizeWidgetIds } from "@/services/dashboardService";
import { subscriptionService } from "@/services/subscriptionService";

// keep at top with other imports/types
type Requirement = { id:string; category:string; title:string; description:string; required:boolean; source:string; };

// Normalizes the free-form "Industry" label into one of our 6 keys.
function normalizeIndustry(label: string | undefined | null): IndustryKey {
  const l = (label ?? "").toLowerCase();

  if (l.includes("software") || l.includes("tech")) return "software";
  if (l.includes("finance")) return "financial";
  if (l.includes("pharma") || l.includes("life")) return "pharma";
  if (l.includes("construct")) return "construction";
  if (l.includes("manufact")) return "manufacturing";
  return "general";
};

function deriveExtraWidgets(industry: string, answers: Record<string, any>): string[] {
  try {
    const extras: string[] = [];
    // Only suggest valid widget IDs that exist in the system
    if (industry === 'pharma') {
      if (answers?.hazmat || answers?.gxp || answers?.gxp_compliance) {
        extras.push('doc-repo'); // Pharma projects need good document management
      }
    }
    if (industry === 'software') {
      if (answers?.repo_provider || answers?.ci_cd || answers?.deployment_target) {
        extras.push('timeline'); // Software projects benefit from timeline tracking
      }
    }
    return Array.from(new Set(extras));
  } catch {
    return [];
  }
}

export interface ProjectData {
  name: string;
  industry: string;
  location: string;
  description: string;
  projectType: string;
}

export interface RequirementItem {
  id: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  source: string;
  customized?: boolean;
}

type OnboardingStep = 'project-setup' | 'ai-requirements' | 'customize-requirements' | 'integrations' | 'dashboard-setup' | 'complete';

function buildSeedRequirements(
  industry: IndustryKey,
  answers: Record<string, any>
): RequirementItem[] {
  const out: RequirementItem[] = [];

  // Always helpful, regardless of industry
  out.push(
    {
      id: "timeline",
      category: "PROJECT MANAGEMENT",
      title: "Project Timeline Management",
      description: "Manage project timeline based on specified requirements and constraints.",
      required: true,
      source: "Project Analysis",
    },
    {
      id: "budget",
      category: "BUDGET MANAGEMENT",
      title: "Budget Control and Monitoring",
      description: "Monitor and control project budget according to specified constraints.",
      required: true,
      source: "Project Analysis",
    }
  );

  // Industry specifics
  if (industry === "pharma") {
    out.push({
      id: "local-compliance",
      category: "LOCAL COMPLIANCE",
      title: `Local Regulatory Compliance`,
      description: `Ensure compliance with all local regulations and requirements in ${answers?.location || "your jurisdiction"}.`,
      required: true,
      source: "Local Regulations",
    });
  }

  if (industry === "construction" || industry === "manufacturing") {
    out.push({
      id: "safety-standards",
      category: "SAFETY",
      title: "Safety Standards & Permitting",
      description: "Confirm permits and safety measures are in place prior to work.",
      required: true,
      source: "Industry Standards",
    });
  }

  if (industry === "software") {
    // Only if user indicated repo/CI/deployment context
    if (answers?.repo || answers?.repo_provider || answers?.deployment) {
      out.push({
        id: "devops",
        category: "ENGINEERING",
        title: "DevOps Pipeline Setup",
        description: "Establish CI/CD, environments, and basic release workflow.",
        required: false,
        source: "Project Analysis",
      });
    }
  }

  // De-dupe by id (just in case)
  const seen = new Set<string>();
  return out.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

const Onboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('project-setup');
  const [projectData, setProjectData] = useState<(ProjectData & { organizationId: string }) | null>(null);
  const [aiRequirements, setAIRequirements] = useState<RequirementItem[]>(() => {
    try { 
      return JSON.parse(sessionStorage.getItem("onboarding:ai-reqs") || "[]"); 
    } catch { 
      return []; 
    }
  });
  const [finalRequirements, setFinalRequirements] = useState<RequirementItem[]>([]);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [createdProjectId, setCreatedProjectId] = React.useState<string | null>(null);
  const [showOrgSetup, setShowOrgSetup] = useState(false);
  const [selectedDashboardWidgets, setSelectedDashboardWidgets] = useState<string[]>([]);
  const [draft, patchDraft, clearDraft] = useNewProjectDraft();
  const industryKey = normalizeIndustry(draft?.industry) as IndustryKey;
  const selectedIdsRaw = draft?.recommendedWidgets ?? []; // or whatever your array is called
  const selectedCount = React.useMemo(
     () => normalizeWidgetIds(selectedIdsRaw).length,
    [selectedIdsRaw]
     );
  // Use ONLY the new industry-aware questions from constants
  const questions = React.useMemo(() => getQuestionsForIndustry(industryKey), [industryKey]);

const WIZARD_KEY = "wizard:new-project";

// keep these two states here (they are needed elsewhere)
const [aiAnswers, setAiAnswers] = useState<Record<string, any>>({});
const [analysisBanner, setAnalysisBanner] = useState<{ count: number } | null>(null);

// DO NOT re-declare industryKey or questions here
// (they’re already defined above using getQuestionsForIndustry)

  // Load wizard state on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(WIZARD_KEY);
      if (raw) {
        const ws = JSON.parse(raw);
        patchDraft({
          name: ws.name ?? draft.name,
          industry: ws.industry ?? draft.industry,
          location: ws.location ?? draft.location,
          type: ws.projectType ?? draft.type,
          recommendedWidgets: ws.selectedWidgets ?? draft.recommendedWidgets,
          integrations: ws.integrations ?? draft.integrations,
        });
        if (ws.description) {
          setProjectData(prev => ({
            ...(prev || {
              name: ws.name || '',
              industry: ws.industry || 'general',
              location: ws.location || '',
              projectType: ws.projectType || '',
            }),
            description: ws.description,
            organizationId: organization?.id,
          }) as any);
        }
        if (ws.aiPrefill) setAiAnswers(ws.aiPrefill);
      }
    } catch {}
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Persist wizard state on changes
useEffect(() => {
  try {
    const payload = {
      name: draft.name,
      industry: draft.industry,
      location: draft.location ?? '',
      projectType: draft.type ?? '',
      description: projectData?.description ?? '',
      integrations: draft.integrations ?? {},
      selectedWidgets: draft.recommendedWidgets ?? [],
      aiPrefill: aiAnswers ?? null,
    };
    sessionStorage.setItem(WIZARD_KEY, JSON.stringify(payload));
  } catch {}
}, [draft, projectData, aiAnswers]);

  // Additional persistence for onboarding-specific keys
  useEffect(() => {
    try {
      const s = sessionStorage.getItem('onboarding:draft');
      if (s) {
        const parsed = JSON.parse(s);
        patchDraft(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem('onboarding:draft', JSON.stringify(draft)); } catch {}
  }, [draft]);
  useEffect(() => {
    try {
      const s = sessionStorage.getItem('onboarding:ai');
      if (s) setAiAnswers(JSON.parse(s));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem('onboarding:ai', JSON.stringify(aiAnswers)); } catch {}
  }, [aiAnswers]);

const { data: organization, isLoading: orgLoading } = useQuery({
  queryKey: ['current-organization'],
  queryFn: () => organizationService.getCurrentUserOrganization(),
  enabled: !!user,
});

  // Check if user needs to create an organization
  useEffect(() => {
    if (user && !orgLoading && !organization) {
      setShowOrgSetup(true);
    }
  }, [user, organization, orgLoading]);

  // Check if user has any existing integrations
  const { data: hasExistingIntegrations, isLoading: loadingIntegrations } = useQuery({
    queryKey: ["existing-integrations", user?.id],
    enabled: !!user?.id && !!organization?.id,
    queryFn: async () => {
      if (!organization?.id) return false;
      
      const { data: connections } = await supabase
        .from("integration_connections")
        .select("id")
        .eq("organization_id", organization.id)
        .limit(1);
        
      return (connections?.length || 0) > 0;
    },
  });

  const checkExistingIntegrationsForGate = () => {
    return hasExistingIntegrations === false && !loadingIntegrations;
  };

  // Subscription + existing projects (for onboarding guard)
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
    enabled: !!user,
  });
  
  const { data: existingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,organization_id,created_at,updated_at')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  // If user already has projects (and they didn't explicitly click "New Project"),
  // or if they're over quota, route them to a dashboard instead of showing the wizard.
  useEffect(() => {
    if (!organization || !subscription || !existingProjects) return;
  
    // If they didn't come from a "New Project" CTA, assume they want to resume work
    const startedFromCTA = (location.state as any)?.from === 'new-project';
  
    const count = existingProjects.length;
    const max = subscription.maxProjects ?? Infinity;
    const overQuota = count >= max;
  
    // Prefer the most-recent project; fallback to first
    const target = existingProjects[0];
  
    // Case A: user navigated to onboarding directly (not CTA) AND they already have a project
    if (!startedFromCTA && count > 0 && target?.id) {
      navigate(`/projects/${encodeURIComponent(target.id)}`, { replace: true });
      return;
    }
  
    // Case B: user clicked "New Project" but is at/over the plan limit
    if (startedFromCTA && overQuota && target?.id) {
      toast({
        title: "Project limit reached",
        description: `Your ${subscription.name} plan allows ${max} active project${max === 1 ? '' : 's'}.`,
        variant: "destructive",
      });
      navigate(`/projects/${encodeURIComponent(target.id)}`, { replace: true });
    }
  }, [organization, subscription, existingProjects, location.state, navigate, toast]);

  
  const steps: { key: OnboardingStep; title: string; description: string }[] = [
    { key: 'project-setup', title: 'Project Details', description: 'Tell us about your project' },
    { key: 'ai-requirements', title: 'AI Analysis', description: 'Let AI analyze your requirements' },
    { key: 'customize-requirements', title: 'Customize', description: 'Review and customize requirements' },
    { key: 'integrations', title: 'Integrations', description: 'Connect your tools' },
    { key: 'dashboard-setup', title: 'Dashboard Setup', description: 'Customize your dashboard' },
    { key: 'complete', title: 'Complete', description: "You're ready to go!" },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  // Persist and restore current step to strengthen back/forward UX
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('onboarding:step') as OnboardingStep | null;
      if (saved && steps.some(s => s.key === saved)) {
        setCurrentStep(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('onboarding:step', currentStep); } catch {}
  }, [currentStep]);

  const handleProjectSubmit = (data: ProjectData & { organizationId: string }) => {
    setProjectData(data);
    setCurrentStep('ai-requirements');
  };

  const handleAIComplete = (requirements: RequirementItem[]) => {
    setAIRequirements(requirements);
    try {
      sessionStorage.setItem("onboarding:ai-reqs", JSON.stringify(requirements));
    } catch {}
    setCurrentStep('customize-requirements');
  };
  const handleCustomizationComplete = async (requirements: RequirementItem[]) => {
    if (!projectData || !user) return;

    try {
      // Check quota before creating project
      const { subscriptionService } = await import('@/services/subscriptionService');
      await subscriptionService.ensureCanCreateProject(projectData.organizationId);

      const project = await projectService.createProjectWithCap(
        projectData.organizationId,
        projectData.name,
        projectData.industry,
        projectData.location,
        projectData.description,
        projectData.projectType
      );

      console.log("Project created:", project.id);
      setCreatedProjectId(project.id);
      setCreatedProject(project);
      setFinalRequirements(requirements);

      // Try to persist AI Q&A context (ignore if column not present yet)
      try {
        await projectService.updateProject(project.id, { ai_context: aiAnswers } as any);
      } catch {}

      // Apply defaults plus extras derived from answers
      try {
        const extras = deriveExtraWidgets(draft.industry, aiAnswers);
        await dashboardService.applyIndustryDefaults(project.id, draft.industry, extras);
      } catch (e) {
        console.error('Failed to apply industry defaults', e);
      }
      
      // If user chose widgets earlier in the wizard, apply them to the dashboard now
      if (draft?.recommendedWidgets && draft.recommendedWidgets.length > 0) {
        try {
          await dashboardService.setWidgets(project.id, draft.recommendedWidgets);
        } catch (e) {
          console.error('Failed to set widgets', e);
        }
      }
      
      toast({
        title: "Project Created!",
        description: `${projectData.name} has been created successfully.`,
      });

      setCurrentStep('integrations');
    } catch (error: any) {
      console.error("Error creating project:", error);
      
      // Handle quota exceeded error with specific messaging
      if (error.code === "PROJECT_QUOTA_EXCEEDED") {
        const { subscriptionService } = await import('@/services/subscriptionService');
        const tier = await subscriptionService.getCurrentSubscription();
        toast({
          title: "Project Limit Reached",
          description: `You've reached the project limit for your ${tier.name} plan. Upgrade to create more projects.`,
          variant: "destructive",
        });
        console.log("Project creation blocked by quota:", error.message);
        return;
      }
      
      // Check if it's a project limit error (fallback for different error formats)
      if (error.message && error.message.includes("Project limit reached")) {
        toast({
          title: "Project Limit Reached",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create project",
          variant: "destructive",
        });
      }
    }
  };

  const handleIntegrationsComplete = () => {
    setCurrentStep('dashboard-setup');
  };

  const handleDashboardSetupComplete = async () => {
    if (!createdProjectId) return;
    
    try {
      const selectedIdsRaw = draft?.recommendedWidgets ?? [];
      const normalizedIds = normalizeWidgetIds(selectedIdsRaw);
      // Apply normalized widget IDs to the dashboard
      await dashboardService.applySelectedWidgets(createdProjectId, normalizedIds);
      setSelectedDashboardWidgets(normalizedIds); // Store normalized IDs for accurate count
      setCurrentStep('complete');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOrganizationSetupComplete = (org: any) => {
    setShowOrgSetup(false);
    queryClient.invalidateQueries({ queryKey: ['current-organization'] });
    
    toast({
      title: "Organization created!",
      description: "You can now create your first project.",
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {

      case 'project-setup': 
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Tell Us About Your Project</h2>
              <p className="text-muted-foreground">
                This information helps our AI provide better recommendations for your specific needs.
              </p>
            </div>
            {/* Controlled form using session-persisted draft */}
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="organization"
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <input type="hidden" name="industry" value={draft.industry} />
                <Select
                  value={draft.industry}
                  onValueChange={(value) => {
                    const list = PROJECT_TYPES_BY_INDUSTRY[value] ?? PROJECT_TYPES_BY_INDUSTRY.general;
                    const keep = (draft.type ?? '') && list.includes(draft.type as string);
                    patchDraft({ industry: value, type: keep ? draft.type : '' });
                  }}
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  name="location"
                  autoComplete="address-level2"
                  value={draft.location ?? ''}
                  onChange={(e) => patchDraft({ location: e.target.value })}
                  placeholder="City, State/Province, Country"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type</Label>
                <input type="hidden" name="projectType" value={draft.type ?? ''} />
                <Select
                  value={draft.type ?? ''}
                  onValueChange={(value) => patchDraft({ type: value })}
                >
                  <SelectTrigger id="projectType">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(PROJECT_TYPES_BY_INDUSTRY[draft.industry] ?? PROJECT_TYPES_BY_INDUSTRY.general).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  autoComplete="off"
                  value={projectData?.description ?? ''}
                  onChange={(e) => setProjectData(prev => ({
                    ...(prev || { name: draft.name, industry: draft.industry, location: draft.location || '', projectType: draft.type || '' }),
                    description: e.target.value,
                    organizationId: organization?.id,
                  }) as any)}
                  placeholder="Describe your project in detail..."
                  rows={4}
                />
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  disabled={currentStepIndex === 0}
                  onClick={() => {
                    const prevIndex = Math.max(0, currentStepIndex - 1);
                    setCurrentStep(steps[prevIndex].key);
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!draft.name || !draft.industry) return;
                    if (organization) {
                      setProjectData({
                        name: draft.name,
                        industry: draft.industry,
                        location: draft.location || '',
                        description: projectData?.description || '',
                        projectType: draft.type || '',
                        organizationId: organization.id,
                      });
                    }
                    setCurrentStep('ai-requirements');
                  }}
                  disabled={!draft.name || !draft.industry}
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to AI Assistant
                </Button>
              </div>
              </div>

            </div>
        );
    
      case "ai-requirements": {
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">AI Requirements Analysis</h2>
              <p className="text-muted-foreground">
                Answer a few questions, then we’ll analyze and propose requirements.
              </p>
            </div>
      
            {/* Industry-aware questions from constants/aiQuestions.ts */}
            <div className="space-y-4 max-w-2xl mx-auto">
              {questions.map((q) => (
                <div key={q.id} className="space-y-2">
                  <Label htmlFor={`q-${q.id}`}>{q.label}</Label>
      
                  {q.type === "text" && (
                    <Input
                      id={`q-${q.id}`}
                      value={(aiAnswers as any)?.[q.id] ?? ""}
                      onChange={(e) =>
                        setAiAnswers((prev: any) => ({
                          ...(prev || {}),
                          [q.id]: e.target.value,
                        }))
                      }
                    />
                  )}
      
                  {q.type === "boolean" && (
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        id={`q-${q.id}`}
                        type="checkbox"
                        checked={!!(aiAnswers as any)?.[q.id]}
                        onChange={(e) =>
                          setAiAnswers((prev: any) => ({
                            ...(prev || {}),
                            [q.id]: e.target.checked,
                          }))
                        }
                      />
                      <span>Yes</span>
                    </label>
                  )}
      
                  {q.type === "select" && (
                    <Select
                      value={(aiAnswers as any)?.[q.id] ?? ""}
                      onValueChange={(v) =>
                        setAiAnswers((prev: any) => ({
                          ...(prev || {}),
                          [q.id]: v,
                        }))
                      }
                    >
                      <SelectTrigger id={`q-${q.id}`}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {(q.options || []).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
      
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setCurrentStep("project-setup")}>
                Back
              </Button>
      
              {/* Advance to your existing "analysis" or "customize requirements" step */}
              <Button
                onClick={() => {
                  // 1) Build seed requirements from current industry + answers
                  const seed = buildSeedRequirements(industryKey, aiAnswers);
              
                  // 2) Save in state + persist to session so the next step can read it
                  setAIRequirements(seed);
                  try {
                    sessionStorage.setItem("onboarding:ai-reqs", JSON.stringify(seed));
                  } catch {}
              
                  // 3) Advance
                  setCurrentStep("customize-requirements");
                }}
              >
                Next
              </Button>
            </div>
          </div>
        );
      };

      case 'customize-requirements':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Customize Your Requirements</h2>
              <p className="text-muted-foreground">
                Review and customize the requirements for your project.
              </p>
            </div>
            <RequirementsCustomizer
              requirements={aiRequirements}
              onComplete={handleCustomizationComplete}
            />
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setCurrentStep('ai-requirements')}>Back</Button>
            </div>
          </div>
        );

      case 'integrations':
        if (!createdProject || !organization) {
          return (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Connect Your Tools</h2>
                <p className="text-muted-foreground">
                  Setting up integrations...
                </p>
              </div>
            </div>
          );
        }
        
        // Check if user needs to go through integrations setup first
        if (checkExistingIntegrationsForGate()) {
          const currentPath = `/onboarding`;
          return (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold">Connect Your Tools</h2>
                <p className="text-muted-foreground">
                  Select the integrations you need for this project. You can add more later.
                </p>
              </div>
              
              <Alert className="border-primary/20 bg-primary/5">
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>First, you need to set up your integrations.</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/integrations/setup?after=${encodeURIComponent(currentPath)}&project=${createdProject.id}`)}
                    >
                      Set up integrations
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          );
        }
        
        return (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold">Connect Your Tools</h2>
              <p className="text-muted-foreground">
                Select the integrations you need for this project. You can add more later.
              </p>
            </div>

            <ProjectIntegrationsSetup
              projectId={createdProject.id}
              organizationId={organization?.id || ''}
              onComplete={handleIntegrationsComplete}
            />
            </div>
          );

      case 'dashboard-setup': {
         // Count the widgets selected in the draft (no hooks in a switch case)
        const selectedIdsRaw = draft?.recommendedWidgets ?? [];
        const selectedCount = normalizeWidgetIds(selectedIdsRaw).length;

        if (!createdProject || !organization) {
          return (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Setting up your dashboard...</p>
            </div>
          );
        }
      
        return (
          <div className="space-y-6">
            {/* Header with selected count */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Customize Your Dashboard</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the widgets you want to appear for this project.
                </p>
              </div>
      
              {/* ← This is the count badge */}
              <div className="text-xs text-muted-foreground">
                Selected: {selectedCount} widget{selectedCount !== 1 ? "s" : ""}
              </div>
            </div>
      
            <DashboardSetup 
              projectId={createdProject.id}
              organizationId={organization.id}
              projectType={draft?.type}
              onComplete={() => setCurrentStep('complete')}
              draft={draft}
              patchDraft={patchDraft}
            />
          </div>
        );
      }

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">You're All Set!</h2>
              <p className="text-lg text-muted-foreground">
                Your project "{createdProject?.name}" has been created and you're ready to start managing it.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="font-semibold mb-2">Your Dashboard is Ready!</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {selectedDashboardWidgets.length} widgets configured</li>
                <li>• Connected integrations available</li>
                <li>• Ready to track project progress</li>
                <li>• Customize anytime from settings</li>
              </ul>
            </div>

            <Button onClick={handleCompleteOnboarding} size="lg">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

const handleCompleteOnboarding = React.useCallback(async () => {
  try {
    const projectId = createdProjectId || createdProject?.id;
    if (projectId) {
      const selectedIdsRaw = draft?.recommendedWidgets ?? [];
      const normalizedIds = normalizeWidgetIds(selectedIdsRaw);
      // Apply normalized widgets and clean up session storage
      await dashboardService.applySelectedWidgets(projectId, normalizedIds);
      
    sessionStorage.removeItem("onboarding:draft");
    sessionStorage.removeItem("onboarding:ai-reqs");
      sessionStorage.removeItem("wizard:new-project");
      
      console.log("Project created:", projectId);
      navigate(`/projects/${encodeURIComponent(projectId)}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }

    // Invalidate all project-related queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["user-projects"] }),
    ]);
  } catch (e) {
    console.error("Error completing onboarding:", e);
    // Still navigate even if cleanup fails
    const id = createdProjectId || createdProject?.id;
    if (id) {
      navigate(`/projects/${encodeURIComponent(id)}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }
}, [createdProjectId, createdProject?.id, queryClient, navigate, draft?.recommendedWidgets]);



  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        
        <div className="container mx-auto px-6 py-6">
          {/* Progress Header */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                disabled={currentStepIndex === 0}
                onClick={() => {
                  if (currentStepIndex === 0) return;
                  const prevIndex = Math.max(0, currentStepIndex - 1);
                  setCurrentStep(steps[prevIndex].key);
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              
              <div className="flex-1 mx-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progressPercentage)}% Complete
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              
              <div className="w-16"></div> {/* Spacer for alignment */}
            </div>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold">{steps[currentStepIndex].title}</h1>
              <p className="text-muted-foreground">{steps[currentStepIndex].description}</p>
            </div>
          </div>

          {/* Main Content */}
          <Card className="max-w-4xl mx-auto bg-card border-border">
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Organization Setup Modal */}
      <OrganizationSetupModal
        isOpen={showOrgSetup}
        onClose={() => setShowOrgSetup(false)}
        onComplete={handleOrganizationSetupComplete}
      />
    </>
  );
};

export default Onboarding;