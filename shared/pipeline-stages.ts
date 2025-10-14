
// Pipeline stage definitions with confirmation status
export const PIPELINE_STAGES = {
  new: {
    label: 'New',
    value: 'new',
    requiresConfirmation: false,
    isQualified: false,
    description: 'Initial lead stage'
  },
  contacted: {
    label: 'Contacted',
    value: 'contacted',
    requiresConfirmation: false,
    isQualified: false,
    description: 'Lead has been contacted'
  },
  qualified: {
    label: 'Qualified',
    value: 'qualified',
    requiresConfirmation: true,
    isQualified: true,
    description: 'Lead has been qualified by agent'
  },
  proposal: {
    label: 'Proposal',
    value: 'proposal',
    requiresConfirmation: true,
    isQualified: true,
    description: 'Proposal stage in deal pipeline'
  },
  contract: {
    label: 'Contract',
    value: 'contract',
    requiresConfirmation: true,
    isQualified: true,
    description: 'Contract stage'
  },
  negotiation: {
    label: 'Negotiation',
    value: 'negotiation',
    requiresConfirmation: true,
    isQualified: true,
    description: 'Active negotiation stage'
  },
  'closed won': {
    label: 'Closed Won',
    value: 'closed won',
    requiresConfirmation: true,
    isQualified: true,
    description: 'Deal successfully closed'
  },
  'closed_won': {
    label: 'Closed Won',
    value: 'closed_won',
    requiresConfirmation: true,
    isQualified: true,
    description: 'Deal successfully closed (alt format)'
  },
  lost: {
    label: 'Lost',
    value: 'lost',
    requiresConfirmation: true,
    isQualified: false,
    description: 'Deal lost'
  },
  'closed_lost': {
    label: 'Closed Lost',
    value: 'closed_lost',
    requiresConfirmation: true,
    isQualified: false,
    description: 'Deal closed as lost'
  }
} as const;

export type PipelineStage = keyof typeof PIPELINE_STAGES;

// Helper function to get stage configuration
export function getStageConfig(stage: string) {
  return PIPELINE_STAGES[stage as PipelineStage] || {
    label: stage,
    value: stage,
    requiresConfirmation: false,
    isQualified: false,
    description: 'Unknown stage'
  };
}

// Helper function to check if stage requires confirmation
export function stageRequiresConfirmation(stage: string): boolean {
  return getStageConfig(stage).requiresConfirmation;
}

// Helper function to check if stage is qualified
export function isStageQualified(stage: string): boolean {
  return getStageConfig(stage).isQualified;
}

// Export all stages as array
export const ALL_STAGES = Object.values(PIPELINE_STAGES);

// Export stages that require confirmation
export const CONFIRMED_STAGES = ALL_STAGES.filter(stage => stage.requiresConfirmation);

// Export qualified stages
export const QUALIFIED_STAGES = ALL_STAGES.filter(stage => stage.isQualified);
