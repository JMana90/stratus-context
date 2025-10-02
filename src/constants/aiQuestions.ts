// src/constants/aiQuestions.ts
import type { IndustryKey } from "@/config/industry-widgets";

/** A single question descriptor used by the onboarding wizard */
export type Question = {
  id: string;
  label: string;
  type: "text" | "boolean" | "select";
  options?: string[];
};

/** Always-asked questions (lightweight, not industry-specific) */
export const BASE_QUESTIONS: Question[] = [
  { id: "success_criteria", label: "What does success look like for this project?", type: "text" },
  { id: "deadline", label: "What is your target completion date?", type: "text" },
];

/** Per-industry questions. Keep this minimal + obviously relevant. */
export const INDUSTRY_QUESTIONS: Record<IndustryKey, Question[]> = {
  general: [],
  software: [
    {
      id: "repo",
      label: "Where will code be stored?",
      type: "select",
      options: ["GitHub", "GitLab", "Bitbucket", "Other", "Not sure"],
    },
    {
      id: "deployment",
      label: "What's your deployment environment?",
      type: "select",
      options: ["Cloud (AWS/Azure/GCP)", "On-premises", "Hybrid", "Not sure"],
    },
    {
      id: "cicd",
      label: "Do you need CI/CD pipeline setup?",
      type: "boolean",
    },
    {
      id: "security",
      label: "What security requirements do you have?",
      type: "select",
      options: ["SOC 2", "ISO 27001", "PCI DSS", "Basic security", "Not sure"],
    },
  ],
  financial: [
    {
      id: "reg",
      label: "Primary regulatory framework?",
      type: "select",
      options: ["SOX", "PCI DSS", "GDPR", "Other", "Not sure"],
    },
    { id: "pii", label: "Will you process PII?", type: "boolean" },
  ],
  pharma: [
    { id: "hazmat", label: "Will you handle hazardous materials?", type: "boolean" },
    { id: "gxp", label: "Is GxP / 21 CFR Part 11 compliance required?", type: "boolean" },
    {
      id: "standards",
      label: "Which standards apply to your project?",
      type: "select",
      options: ["cGMP", "ICH Guidelines", "ISO 13485", "USP", "Multiple", "Not sure"],
    },
    {
      id: "clinical",
      label: "Does this involve clinical trials?",
      type: "boolean",
    },
  ],
  construction: [
    { id: "permits", label: "Are building permits required?", type: "boolean" },
    { id: "hazmat", label: "Will you handle hazardous materials?", type: "boolean" },
    {
      id: "safety",
      label: "What safety protocols are needed?",
      type: "select",
      options: ["OSHA standards", "Local safety codes", "Industry-specific", "Not sure"],
    },
    {
      id: "environmental",
      label: "Are there environmental considerations?",
      type: "boolean",
    },
  ],
  manufacturing: [
    { id: "gmp", label: "Is GMP/ISO compliance needed?", type: "boolean" },
    {
      id: "quality",
      label: "What quality standards apply?",
      type: "select",
      options: ["ISO 9001", "Six Sigma", "Lean Manufacturing", "Other", "Not sure"],
    },
    {
      id: "environmental",
      label: "Are there environmental regulations?",
      type: "boolean",
    },
  ],
};

/** Normalize common display labels → our internal keys */
const ALIASES: Record<string, IndustryKey> = {
  "software / tech": "software",
  "financial services": "financial",
  "pharma / life sciences": "pharma",
  "construction / engineering": "construction",
  "manufacturing / industrial": "manufacturing",
};

/**
 * Helper to build the final list for a given industry.
 * Falls back to `general` if the key is unknown.
 */
export function getQuestionsForIndustry(industry: string | IndustryKey): Question[] {
  const raw = String(industry ?? "general").toLowerCase().trim();
  const key = (ALIASES[raw] ?? (raw as IndustryKey));
  const per = INDUSTRY_QUESTIONS[key] ?? INDUSTRY_QUESTIONS.general;
  return [...BASE_QUESTIONS, ...per];
}
