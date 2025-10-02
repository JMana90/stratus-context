import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, CheckCircle, Edit3, ArrowLeft } from "lucide-react";
import { ProjectData, RequirementItem } from "@/pages/Onboarding";
import { getQuestionsForIndustry, type Question } from "@/constants/aiQuestions";
import { useToast } from "@/hooks/use-toast";

interface AIRequirementsAssistantProps {
  projectData: ProjectData;
  onComplete: (requirements: RequirementItem[]) => void;
  onBack: () => void;
}

type QuestionAnswer = {
  questionId: string;
  question: string;
  answer: string;
  type: "text" | "boolean" | "select";
};

export function AIRequirementsAssistant({ projectData, onComplete, onBack }: AIRequirementsAssistantProps) {
  const [currentStep, setCurrentStep] = useState<"questions" | "analysis" | "customize">("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load questions for the project's industry
    const industryQuestions = getQuestionsForIndustry(projectData.industry);
    setQuestions(industryQuestions);

    // Try to restore answers from sessionStorage
    const savedAnswers = sessionStorage.getItem("onboarding:ai");
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        setAnswers(parsed);
      } catch (e) {
        console.warn("Failed to parse saved AI answers");
      }
    }
  }, [projectData.industry]);

  // Save answers to sessionStorage whenever they change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem("onboarding:ai", JSON.stringify(answers));
    }
  }, [answers]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleQuestionsComplete();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionsComplete = async () => {
    setCurrentStep("analysis");
    setIsAnalyzing(true);

    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate requirements based on answers
    const generatedRequirements = generateRequirementsFromAnswers();
    setRequirements(generatedRequirements);
    setIsAnalyzing(false);
    setCurrentStep("customize");
  };

  const generateRequirementsFromAnswers = (): RequirementItem[] => {
    const reqs: RequirementItem[] = [];
    let reqId = 1;

    // Base requirements for all projects
    reqs.push({
      id: `req-${reqId++}`,
      category: 'Project Management',
      title: 'Project Timeline Management',
      description: `Manage project timeline and milestones${answers.deadline ? ` with target completion: ${answers.deadline}` : ''}`,
      required: true,
      source: 'Project Analysis'
    });

    reqs.push({
      id: `req-${reqId++}`,
      category: 'Project Management', 
      title: 'Success Criteria Definition',
      description: answers.success_criteria || 'Define clear success criteria and deliverables',
      required: true,
      source: 'Project Analysis'
    });

    // Industry-specific requirements based on answers
    if (projectData.industry === 'software') {
      if (answers.repo) {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Development',
          title: 'Code Repository Setup',
          description: `Set up code repository using ${answers.repo}`,
          required: true,
          source: 'Development Requirements'
        });
      }

      if (answers.deployment) {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Deployment',
          title: 'Deployment Environment',
          description: `Configure ${answers.deployment} deployment environment`,
          required: true,
          source: 'Infrastructure Requirements'
        });
      }

      if (answers.cicd === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Development',
          title: 'CI/CD Pipeline',
          description: 'Set up continuous integration and deployment pipeline',
          required: false,
          source: 'Development Requirements'
        });
      }

      if (answers.security) {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Security',
          title: 'Security Compliance',
          description: `Implement ${answers.security} security requirements`,
          required: true,
          source: 'Security Requirements'
        });
      }
    }

    if (projectData.industry === 'pharma') {
      if (answers.hazmat === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Safety',
          title: 'Hazardous Materials Handling',
          description: 'Implement proper protocols for hazardous materials handling',
          required: true,
          source: 'Safety Requirements'
        });
      }

      if (answers.gxp === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Compliance',
          title: 'GxP Compliance',
          description: 'Ensure GxP and 21 CFR Part 11 compliance throughout the project',
          required: true,
          source: 'Regulatory Requirements'
        });
      }

      if (answers.standards) {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Standards',
          title: 'Industry Standards Compliance',
          description: `Adhere to ${answers.standards} standards and guidelines`,
          required: true,
          source: 'Industry Standards'
        });
      }

      if (answers.clinical === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Clinical',
          title: 'Clinical Trial Protocols',
          description: 'Implement clinical trial protocols and documentation requirements',
          required: true,
          source: 'Clinical Requirements'
        });
      }
    }

    if (projectData.industry === 'construction') {
      if (answers.permits === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Legal',
          title: 'Building Permits',
          description: 'Obtain all required building permits and approvals',
          required: true,
          source: 'Legal Requirements'
        });
      }

      if (answers.safety) {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Safety',
          title: 'Safety Protocols',
          description: `Implement ${answers.safety} safety protocols`,
          required: true,
          source: 'Safety Requirements'
        });
      }

      if (answers.environmental === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Environmental',
          title: 'Environmental Impact Assessment',
          description: 'Conduct environmental impact assessment and mitigation',
          required: true,
          source: 'Environmental Requirements'
        });
      }
    }

    if (projectData.industry === 'manufacturing') {
      if (answers.gmp === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Quality',
          title: 'GMP Compliance',
          description: 'Ensure Good Manufacturing Practices compliance',
          required: true,
          source: 'Quality Requirements'
        });
      }

      if (answers.quality) {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Quality',
          title: 'Quality Standards',
          description: `Implement ${answers.quality} quality management system`,
          required: true,
          source: 'Quality Requirements'
        });
      }
    }

    if (projectData.industry === 'financial') {
      if (answers.reg) {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Compliance',
          title: 'Regulatory Compliance',
          description: `Ensure compliance with ${answers.reg} regulations`,
          required: true,
          source: 'Regulatory Requirements'
        });
      }

      if (answers.pii === 'true') {
        reqs.push({
          id: `req-${reqId++}`,
          category: 'Privacy',
          title: 'PII Protection',
          description: 'Implement proper personally identifiable information protection measures',
          required: true,
          source: 'Privacy Requirements'
        });
      }
    }

    return reqs;
  };

  const handleRequirementToggle = (reqId: string) => {
    setRequirements(prev => prev.map(req => 
      req.id === reqId ? { ...req, required: !req.required } : req
    ));
  };

  const handleRequirementEdit = (reqId: string, field: 'title' | 'description', value: string) => {
    setRequirements(prev => prev.map(req => 
      req.id === reqId ? { ...req, [field]: value } : req
    ));
  };

  const handleContinue = () => {
    // Save final requirements and answers to sessionStorage
    sessionStorage.setItem("onboarding:ai-reqs", JSON.stringify(requirements));
    onComplete(requirements);
  };

  // Questions step
  if (currentStep === "questions") {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Understanding Your Project</h3>
          <p className="text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{currentQuestion.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuestion.type === "text" && (
              <Textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Your answer..."
                rows={3}
              />
            )}
            
            {currentQuestion.type === "boolean" && (
              <div className="flex gap-4">
                <Button
                  variant={answers[currentQuestion.id] === 'true' ? 'default' : 'outline'}
                  onClick={() => handleAnswerChange(currentQuestion.id, 'true')}
                >
                  Yes
                </Button>
                <Button
                  variant={answers[currentQuestion.id] === 'false' ? 'default' : 'outline'}
                  onClick={() => handleAnswerChange(currentQuestion.id, 'false')}
                >
                  No
                </Button>
              </div>
            )}
            
            {currentQuestion.type === "select" && currentQuestion.options && (
              <Select
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {currentQuestion.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={currentQuestionIndex === 0 ? onBack : handlePrevQuestion}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentQuestionIndex === 0 ? 'Back' : 'Previous'}
          </Button>
          <Button
            onClick={handleNextQuestion}
            disabled={!answers[currentQuestion.id]}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Analyze Project' : 'Next'}
          </Button>
        </div>
      </div>
    );
  }

  // Analysis step
  if (currentStep === "analysis") {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">Analyzing Your Project</h3>
        <p className="text-muted-foreground">
          Generating requirements based on your {projectData.industry} project details...
        </p>
      </div>
    );
  }

  // Customize step - unified analysis summary + requirements editing
  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <div className="text-center">
        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Analysis Complete</h3>
        <p className="text-muted-foreground">
          Based on your {projectData.industry} project in {projectData.location}, we've identified {requirements.length} requirements.
          Review and customize them below.
        </p>
      </div>

      {/* Requirements Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Customize Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requirements.map((req) => (
            <div key={req.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={req.required}
                  onCheckedChange={() => handleRequirementToggle(req.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Input
                    value={req.title}
                    onChange={(e) => handleRequirementEdit(req.id, 'title', e.target.value)}
                    className="font-medium"
                  />
                  <Textarea
                    value={req.description}
                    onChange={(e) => handleRequirementEdit(req.id, 'description', e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-secondary px-2 py-1 rounded">{req.category}</span>
                    <span>•</span>
                    <span>{req.source}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep("questions")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Questions
        </Button>
        <Button onClick={handleContinue}>
          Continue to Dashboard Setup
        </Button>
      </div>
    </div>
  );
}