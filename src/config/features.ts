// Feature flags for gradual rollout of industry features
export const FEATURE_FLAGS = {
  INDUSTRY_PROFILES: true,
  AI_SUMMARIES: true,
  CHECKLIST_GENERATION: true,
  OFFICE_EXPORT: true,
  ACTIVITY_LOGGING: true,
  COMPLIANCE_FEATURES: true,
  PHARMA_FEATURES: true,
  CONSTRUCTION_FEATURES: true,
  MANUFACTURING_FEATURES: true,
} as const;

// Industry feature availability matrix
export const INDUSTRY_FEATURES = {
  software: {
    ai_summaries: FEATURE_FLAGS.AI_SUMMARIES,
    release_notes: true,
    code_reviews: FEATURE_FLAGS.CHECKLIST_GENERATION,
    knowledge_qa: false, // Requires additional AI setup
  },
  financial: {
    compliance_reports: FEATURE_FLAGS.COMPLIANCE_FEATURES,
    strict_rbac: true,
    office_export: FEATURE_FLAGS.OFFICE_EXPORT,
    legacy_import: true,
  },
  pharma: {
    sop_templates: FEATURE_FLAGS.PHARMA_FEATURES,
    audit_logs: FEATURE_FLAGS.ACTIVITY_LOGGING,
    training_tracking: FEATURE_FLAGS.PHARMA_FEATURES,
    document_linkages: true,
  },
  construction: {
    daily_logs: FEATURE_FLAGS.CONSTRUCTION_FEATURES,
    photo_extraction: false, // Requires OCR integration
    procore_webhooks: false, // Requires third-party integration
    safety_checklists: FEATURE_FLAGS.CHECKLIST_GENERATION,
  },
  manufacturing: {
    change_impact: FEATURE_FLAGS.MANUFACTURING_FEATURES,
    csv_import: true,
    traceability_matrix: FEATURE_FLAGS.OFFICE_EXPORT,
    erp_stubs: false, // Requires enterprise features
  },
} as const;