
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectData } from "@/pages/AddProject";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organizationService";
import { ProjectIntegrationsSelector } from "./ProjectIntegrationsSelector";
import { projectService } from "@/services/projectService";
import { INDUSTRY_OPTIONS } from "@/config/industry-widgets";

interface ProjectFormProps {
  onCreated?: (projectId: string) => void;
  showIntegrations?: boolean;
  projectId?: string;
}

export default function ProjectForm({ onCreated, showIntegrations = false, projectId }: ProjectFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ProjectData>({
    name: '',
    industry: '',
    location: '',
    description: '',
    projectType: ''
  });

  const { data: organization } = useQuery({
    queryKey: ['current-organization'],
    queryFn: () => organizationService.getCurrentUserOrganization(),
    enabled: !!user,
  });

  const projectTypesByIndustry: Record<string, string[]> = {
    'Construction': [
      'New Construction',
      'Renovation',
      'Expansion',
      'Facility Upgrade',
      'Infrastructure Development',
      'Site Preparation',
      'Building Maintenance',
      'Demolition'
    ],
    'Technology': [
      'Software Development',
      'System Integration',
      'Infrastructure Upgrade',
      'Digital Transformation',
      'Cybersecurity Implementation',
      'Data Migration',
      'Platform Modernization',
      'Mobile App Development'
    ],
    'Pharmaceutical': [
      'Drug Development',
      'Clinical Trial',
      'Regulatory Submission',
      'Manufacturing Scale-up',
      'Quality Validation',
      'Compliance Audit',
      'Process Optimization',
      'Facility Qualification'
    ],
    'Manufacturing': [
      'Production Line Setup',
      'Equipment Installation',
      'Process Improvement',
      'Quality System Implementation',
      'Capacity Expansion',
      'Automation Project',
      'Lean Manufacturing',
      'Safety Upgrade'
    ],
    'Healthcare': [
      'Facility Upgrade',
      'Equipment Installation',
      'Regulatory Compliance',
      'Process Improvement',
      'Technology Implementation',
      'Patient Safety Initiative',
      'Quality Improvement',
      'Electronic Health Records'
    ],
    'Food & Beverage': [
      'Product Development',
      'Manufacturing Scale-up',
      'Quality System Implementation',
      'Facility Expansion',
      'Compliance Update',
      'Equipment Upgrade',
      'Process Optimization',
      'Packaging Innovation'
    ],
    'Energy & Utilities': [
      'Power Plant Construction',
      'Grid Modernization',
      'Renewable Energy Installation',
      'Infrastructure Upgrade',
      'Environmental Compliance',
      'Safety System Implementation',
      'Smart Grid Deployment',
      'Maintenance Program'
    ]
  };

  const getProjectTypesForIndustry = (industry: string): string[] => {
    return projectTypesByIndustry[industry] || [
      'Process Improvement',
      'Technology Implementation',
      'Facility Upgrade',
      'Compliance Update',
      'Expansion',
      'System Integration',
      'Quality Enhancement',
      'Other'
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.industry && formData.location && organization) {
      try {
        const newProject = await projectService.createProject({
          name: formData.name,
          description: formData.description,
          industry: formData.industry,
          location: formData.location,
          project_type: formData.projectType,
          organization_id: organization.id,
          created_by: user!.id,
        });
        onCreated?.(newProject.id);
      } catch (error) {
        console.error("Failed to create project:", error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter project name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Industry *</Label>
        <Select 
          value={formData.industry} 
          onValueChange={(value) => setFormData({ ...formData, industry: value, projectType: '' })}
        >
          <SelectTrigger>
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
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="City, State/Province, Country"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectType">Project Type</Label>
        <Select value={formData.projectType} onValueChange={(value) => setFormData({ ...formData, projectType: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent>
            {getProjectTypesForIndustry(formData.industry).map((type) => (
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
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your project in detail..."
          rows={4}
        />
      </div>

      {showIntegrations && projectId && organization && (
        <div className="space-y-4">
          <ProjectIntegrationsSelector 
            projectId={projectId}
            organizationId={organization.id}
          />
        </div>
      )}

      <Button type="submit" className="w-full">
        Continue to AI Assistant
      </Button>
    </form>
  );
}
