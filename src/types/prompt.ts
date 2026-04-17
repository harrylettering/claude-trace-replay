
// Prompt issue types.
export type IssueType =
  | 'vague'                // Ambiguous
  | 'too_short'            // Too short
  | 'missing_context'      // Missing context
  | 'no_structure'         // Missing structure
  | 'no_examples'          // Missing examples
  | 'no_constraints'       // Missing constraints
  | 'no_output_format'     // Missing output format
  | 'negative'             // Negatively framed
  | 'passive'              // Passive voice
  | 'inefficient_token'    // Token-inefficient
  | 'repeated'             // Repetitive
  | 'missing_role'         // Missing role definition
  | 'missing_steps'        // Missing step breakdown
  | 'other';               // Other

// Issue severity.
export type Severity = 'low' | 'medium' | 'high' | 'critical';

// Prompt issue.
export interface PromptIssue {
  id: string;
  type: IssueType;
  severity: Severity;
  title: string;
  description: string;
  location: {
    entryIndex: number;
    charStart?: number;
    charEnd?: number;
  };
  suggestion: string;
}

// Optimization suggestion.
export interface PromptSuggestion {
  id: string;
  original: string;
  improved: string;
  explanation: string;
  impact: 'small' | 'medium' | 'large';
  category: string;
}

// Prompt statistics.
export interface PromptStats {
  totalPrompts: number;
  totalTokens: number;
  avgPromptLength: number;
  issuesByType: Record<IssueType, number>;
  issuesBySeverity: Record<Severity, number>;
  successRate: number;
  avgRetries: number;
  toolCallSuccessRate: number;
}

// Experience insight.
export interface ExperienceInsight {
  type: 'success' | 'failure' | 'neutral';
  category: 'workflow' | 'communication' | 'tool_use' | 'technical';
  content: string;
  recommendation: string;
}

// Session experience summary.
export interface SessionExperience {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  insights: ExperienceInsight[];
  nextSteps: string[];
}

// Prompt analysis result.
export interface PromptAnalysis {
  stats: PromptStats;
  issues: PromptIssue[];
  suggestions: PromptSuggestion[];
  bestPractices: string[];
  score: number;  // 0-100
  experience?: SessionExperience; // Added experiential learnings.
}

// Prompt template.
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'coding' | 'analysis' | 'writing' | 'planning' | 'other';
  tags: string[];
  content: string;
  variables: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  isBuiltIn: boolean;
}

// LLM configuration.
export interface LLMConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
}

// Analysis report export format.
export interface AnalysisReport {
  version: string;
  generatedAt: number;
  sessionInfo: {
    startTime?: number;
    endTime?: number;
    totalEntries: number;
  };
  analysis: PromptAnalysis;
  templates: PromptTemplate[];
}

// Template library export format.
export interface TemplateLibraryExport {
  version: string;
  exportedAt: number;
  templates: PromptTemplate[];
}

// Built-in templates.
export const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    id: 'built-in-code-review',
    name: 'Code Review',
    description: 'Review code quality, security, and maintainability in depth',
    category: 'coding',
    tags: ['code review', 'quality assurance', 'security'],
    content: `Please act as a senior code review expert and review the following code:

\`\`\`
{{CODE}}
\`\`\`

Please review it from the following angles:
1. **Code Quality** - readability, naming, and structure
2. **Potential Bugs** - logic errors, edge cases, exception handling
3. **Security** - vulnerabilities, injection risks, data validation
4. **Performance** - algorithm efficiency, resource usage, optimization ideas
5. **Best Practices** - design patterns and architectural soundness

Please rank issues by priority and provide concrete fixes.`,
    variables: ['CODE'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true,
  },
  {
    id: 'built-in-step-by-step',
    name: 'Step-by-Step Problem Solving',
    description: 'Guide the model through complex problems step by step',
    category: 'planning',
    tags: ['problem solving', 'step by step', 'reasoning'],
    content: `Please help me solve the following problem:

{{PROBLEM}}

Please follow these steps:
1. **Understand the Problem** - restate it and confirm understanding
2. **Analyze the Goal** - define the end goal and success criteria
3. **Make a Plan** - list the steps to solve it
4. **Execute the Plan** - work through each step and explain it
5. **Validate the Result** - check whether all requirements are satisfied

Please make every step clear and traceable.`,
    variables: ['PROBLEM'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true,
  },
  {
    id: 'built-in-data-analysis',
    name: 'Data Analysis',
    description: 'Analyze data in a structured way and generate insights',
    category: 'analysis',
    tags: ['data analysis', 'visualization', 'insights'],
    content: `Please analyze the following data:

{{DATA}}

Please cover the following:
1. **Data Overview** - data types, scale, and quality
2. **Descriptive Statistics** - key metrics and distributions
3. **Trend Analysis** - time series and pattern changes
4. **Anomaly Detection** - outliers and unusual cases
5. **Key Insights** - the most important findings
6. **Recommended Actions** - suggestions based on the analysis

Present the analysis in a clear structure.`,
    variables: ['DATA'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true,
  },
  {
    id: 'built-in-documentation',
    name: 'Documentation Generation',
    description: 'Generate high-quality technical documentation',
    category: 'writing',
    tags: ['documentation', 'technical writing', 'comments'],
    content: `Please write documentation for the following code or feature:

{{CONTENT}}

Please generate complete documentation including:
1. **Overview** - feature description and purpose
2. **API / Interface** - parameters, return values, examples
3. **Usage Examples** - code samples and invocation patterns
4. **Notes** - edge cases and limitations
5. **Related Links** - references and dependencies

Make sure the documentation is clear, accurate, and practical.`,
    variables: ['CONTENT'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true,
  },
];

// Default LLM configurations.
export const DEFAULT_LLM_CONFIGS: LLMConfig[] = [
  {
    id: 'openai-default',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    isDefault: true,
  },
  {
    id: 'anthropic-default',
    name: 'Anthropic (OpenAI Compatible)',
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-3-opus-20240229',
    isDefault: false,
  },
];

// User-facing labels for issue types.
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  vague: 'Vague',
  too_short: 'Too Short',
  missing_context: 'Missing Context',
  no_structure: 'No Structure',
  no_examples: 'No Examples',
  no_constraints: 'Missing Constraints',
  no_output_format: 'Missing Output Format',
  negative: 'Negative Framing',
  passive: 'Passive Voice',
  inefficient_token: 'Inefficient Token Usage',
  repeated: 'Repeated Content',
  missing_role: 'Missing Role Definition',
  missing_steps: 'Missing Step Breakdown',
  other: 'Other',
};

// Severity color mapping.
export const SEVERITY_COLORS: Record<Severity, string> = {
  low: 'text-blue-400 bg-blue-500/20',
  medium: 'text-amber-400 bg-amber-500/20',
  high: 'text-orange-400 bg-orange-500/20',
  critical: 'text-red-400 bg-red-500/20',
};

// User-facing labels for severity.
export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
