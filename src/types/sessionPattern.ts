
// Pattern types
export type PatternType =
  | 'coding_workflow'      // Coding workflow
  | 'debugging_flow'       // Debugging flow
  | 'analysis_pattern'     // Analysis pattern
  | 'writing_pattern'      // Writing pattern
  | 'planning_pattern'     // Planning pattern
  | 'research_pattern'     // Research pattern
  | 'review_pattern'       // Review pattern
  | 'testing_pattern'      // Testing pattern
  | 'multi_step_task'      // Multi-step task
  | 'custom';              // Custom

// Success rating
export type SuccessRating = 'excellent' | 'good' | 'moderate' | 'needs_improvement';

// Tool usage pattern
export interface ToolUsagePattern {
  toolName: string;
  frequency: number;
  averageDurationMs?: number;
  successRate: number;
  typicalInputs: string[];
}

// Prompt pattern
export interface PromptPattern {
  id: string;
  content: string;
  variables: string[];
  context: string;
  effectivenessScore: number;  // 0-100
  usageCount: number;
}

// Session pattern
export interface SessionPattern {
  id: string;
  name: string;
  description: string;
  type: PatternType;
  tags: string[];

  // Source session info
  sourceSessionId?: string;
  sourceSessionName?: string;

  // Pattern characteristics
  totalSteps: number;
  durationMs: number;
  tokenEfficiency: number;  // 0-100, higher is more efficient
  successRating: SuccessRating;

  // Tool usage
  toolPatterns: ToolUsagePattern[];

  // Key prompts
  keyPrompts: PromptPattern[];

  // Workflow description
  workflow: {
    stepDescription: string;
    stepType: 'user_input' | 'tool_call' | 'assistant_response';
    order: number;
  }[];

  // Best practices and recommendations
  bestPractices: string[];
  pitfalls: string[];

  // Metadata
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  isFavorite: boolean;
  isManual: boolean;  // Whether it was created manually
  authorNotes?: string;
}

// Pattern extraction config
export interface PatternExtractionConfig {
  minTokenEfficiency?: number;  // Minimum token efficiency
  minDurationMs?: number;       // Minimum session duration
  minSteps?: number;            // Minimum number of steps
  includeManualPatterns?: boolean;
}

// Pattern library export format
export interface PatternLibraryExport {
  version: string;
  exportedAt: number;
  patterns: SessionPattern[];
}

// Pattern type metadata
export const PATTERN_TYPE_INFO: Record<PatternType, { label: string; icon: string; color: string }> = {
  coding_workflow: { label: 'Coding Workflow', icon: '💻', color: 'from-blue-500 to-cyan-500' },
  debugging_flow: { label: 'Debugging Flow', icon: '🐛', color: 'from-red-500 to-rose-500' },
  analysis_pattern: { label: 'Analysis Pattern', icon: '📊', color: 'from-green-500 to-emerald-500' },
  writing_pattern: { label: 'Writing Pattern', icon: '✍️', color: 'from-purple-500 to-pink-500' },
  planning_pattern: { label: 'Planning Pattern', icon: '📋', color: 'from-indigo-500 to-blue-500' },
  research_pattern: { label: 'Research Pattern', icon: '🔍', color: 'from-amber-500 to-orange-500' },
  review_pattern: { label: 'Review Pattern', icon: '👀', color: 'from-teal-500 to-cyan-500' },
  testing_pattern: { label: 'Testing Pattern', icon: '✅', color: 'from-green-500 to-teal-500' },
  multi_step_task: { label: 'Multi-Step Task', icon: '🔄', color: 'from-violet-500 to-purple-500' },
  custom: { label: 'Custom', icon: '📦', color: 'from-slate-500 to-gray-500' },
};

// Success rating metadata
export const SUCCESS_RATING_INFO: Record<SuccessRating, { label: string; color: string; score: number }> = {
  excellent: { label: 'Excellent', color: 'text-green-400 bg-green-500/20', score: 90 },
  good: { label: 'Good', color: 'text-blue-400 bg-blue-500/20', score: 75 },
  moderate: { label: 'Moderate', color: 'text-amber-400 bg-amber-500/20', score: 50 },
  needs_improvement: { label: 'Needs Improvement', color: 'text-red-400 bg-red-500/20', score: 30 },
};

// Pattern type list
export const PATTERN_TYPES: Array<{ value: PatternType; label: string }> = [
  { value: 'coding_workflow', label: 'Coding Workflow' },
  { value: 'debugging_flow', label: 'Debugging Flow' },
  { value: 'analysis_pattern', label: 'Analysis Pattern' },
  { value: 'writing_pattern', label: 'Writing Pattern' },
  { value: 'planning_pattern', label: 'Planning Pattern' },
  { value: 'research_pattern', label: 'Research Pattern' },
  { value: 'review_pattern', label: 'Review Pattern' },
  { value: 'testing_pattern', label: 'Testing Pattern' },
  { value: 'multi_step_task', label: 'Multi-Step Task' },
  { value: 'custom', label: 'Custom' },
];
