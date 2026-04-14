
// 提示词问题类型
export type IssueType =
  | 'vague'                // 模糊不清
  | 'too_short'            // 过于简短
  | 'missing_context'      // 缺少上下文
  | 'no_structure'         // 缺少结构
  | 'no_examples'          // 缺少示例
  | 'no_constraints'       // 缺少约束条件
  | 'no_output_format'     // 缺少输出格式
  | 'negative'             // 负面表述
  | 'passive'              // 被动语态
  | 'inefficient_token'    // Token 使用低效
  | 'repeated'             // 重复内容
  | 'missing_role'         // 缺少角色设定
  | 'missing_steps'        // 缺少步骤分解
  | 'other';               // 其他

// 问题严重程度
export type Severity = 'low' | 'medium' | 'high' | 'critical';

// 提示词问题
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

// 优化建议
export interface PromptSuggestion {
  id: string;
  original: string;
  improved: string;
  explanation: string;
  impact: 'small' | 'medium' | 'large';
  category: string;
}

// 提示词统计
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

// 经验洞察
export interface ExperienceInsight {
  type: 'success' | 'failure' | 'neutral';
  category: 'workflow' | 'communication' | 'tool_use' | 'technical';
  content: string;
  recommendation: string;
}

// 会话经验总结
export interface SessionExperience {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  insights: ExperienceInsight[];
  nextSteps: string[];
}

// 提示词分析结果
export interface PromptAnalysis {
  stats: PromptStats;
  issues: PromptIssue[];
  suggestions: PromptSuggestion[];
  bestPractices: string[];
  score: number;  // 0-100
  experience?: SessionExperience; // 新增：经验沉淀
}

// 提示词模板
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

// LLM 配置
export interface LLMConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
}

// 分析报告导出格式
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

// 模板库导出格式
export interface TemplateLibraryExport {
  version: string;
  exportedAt: number;
  templates: PromptTemplate[];
}

// 内置模板
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

// 默认 LLM 配置
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

// 问题类型显示名称
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

// 严重程度颜色
export const SEVERITY_COLORS: Record<Severity, string> = {
  low: 'text-blue-400 bg-blue-500/20',
  medium: 'text-amber-400 bg-amber-500/20',
  high: 'text-orange-400 bg-orange-500/20',
  critical: 'text-red-400 bg-red-500/20',
};

// 严重程度显示名称
export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
