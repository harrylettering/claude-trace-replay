// 会话步骤类型
export interface SessionStep {
  id: string;
  type: 'user_prompt' | 'system_prompt' | 'tool_call' | 'assistant_response';
  title: string;
  description?: string;
  content: string;
  variables: string[];
  order: number;
  isOptional?: boolean;
}

// 会话模板分类
export type SessionTemplateCategory =
  | 'code_development'
  | 'data_analysis'
  | 'content_creation'
  | 'research'
  | 'planning'
  | 'debugging'
  | 'code_review'
  | 'documentation'
  | 'testing'
  | 'other';

// 会话模板
export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  category: SessionTemplateCategory;
  tags: string[];
  steps: SessionStep[];
  variables: string[];
  estimatedDurationMinutes?: number;
  useCases: string[];
  bestPractices: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  isBuiltIn: boolean;
  author?: string;
  version?: string;
}

// 会话实例（从模板创建的具体会话）
export interface SessionInstance {
  id: string;
  templateId: string;
  templateVersion?: string;
  variableValues: Record<string, string>;
  currentStepIndex: number;
  completedStepIds: string[];
  startTime?: number;
  completedAt?: number;
  status: 'draft' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  notes?: string;
}

// 模板库导出格式
export interface SessionTemplateLibraryExport {
  version: string;
  exportedAt: number;
  templates: SessionTemplate[];
}

// 分类显示信息
export const CATEGORY_INFO: Record<SessionTemplateCategory, { label: string; icon: string; color: string }> = {
  code_development: { label: 'Code Development', icon: '💻', color: 'from-blue-500 to-cyan-500' },
  data_analysis: { label: 'Data Analysis', icon: '📊', color: 'from-green-500 to-emerald-500' },
  content_creation: { label: 'Content Creation', icon: '✍️', color: 'from-purple-500 to-pink-500' },
  research: { label: 'Research', icon: '🔍', color: 'from-amber-500 to-orange-500' },
  planning: { label: 'Planning', icon: '📋', color: 'from-indigo-500 to-blue-500' },
  debugging: { label: 'Debugging', icon: '🐛', color: 'from-red-500 to-rose-500' },
  code_review: { label: 'Code Review', icon: '👀', color: 'from-teal-500 to-cyan-500' },
  documentation: { label: 'Documentation', icon: '📝', color: 'from-pink-500 to-rose-500' },
  testing: { label: 'Testing', icon: '✅', color: 'from-green-500 to-teal-500' },
  other: { label: 'Other', icon: '📦', color: 'from-slate-500 to-gray-500' },
};

// 分类列表
export const CATEGORIES: Array<{ value: SessionTemplateCategory; label: string }> = [
  { value: 'code_development', label: 'Code Development' },
  { value: 'data_analysis', label: 'Data Analysis' },
  { value: 'content_creation', label: 'Content Creation' },
  { value: 'research', label: 'Research' },
  { value: 'planning', label: 'Planning' },
  { value: 'debugging', label: 'Debugging' },
  { value: 'code_review', label: 'Code Review' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'testing', label: 'Testing' },
  { value: 'other', label: 'Other' },
];

// 步骤类型显示信息
export const STEP_TYPE_INFO: Record<SessionStep['type'], { label: string; icon: string; color: string }> = {
  user_prompt: { label: 'User Prompt', icon: '👤', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  system_prompt: { label: 'System Prompt', icon: '⚙️', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  tool_call: { label: 'Tool Call', icon: '🔧', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  assistant_response: { label: 'Assistant Reply', icon: '🤖', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

// 内置会话模板
export const BUILT_IN_SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'built-in-full-code-dev',
    name: 'Complete Code Development Workflow',
    description: 'An end-to-end workflow from requirements analysis to final delivery',
    category: 'code_development',
    tags: ['end-to-end workflow', 'code development', 'best practices'],
    variables: ['PROJECT_NAME', 'REQUIREMENTS', 'TECH_STACK', 'DELIVERABLES'],
    estimatedDurationMinutes: 60,
    useCases: [
      'New feature development',
      'Project refactoring',
      'Technical solution implementation'
    ],
    bestPractices: [
      'Understand requirements before writing code',
      'Validate each phase step by step',
      'Record key decisions as you go'
    ],
    steps: [
      {
        id: 'step-1',
        type: 'user_prompt',
        title: 'Requirements Analysis',
        description: 'Clarify the project requirements and goals',
        content: `I need to build a project called "{{PROJECT_NAME}}".

Requirements:
{{REQUIREMENTS}}

Please help me:
1. Analyze and clarify the key requirements
2. Identify potential technical challenges
3. Raise questions that need clarification
4. Recommend an overall project scope`,
        variables: ['PROJECT_NAME', 'REQUIREMENTS'],
        order: 1,
      },
      {
        id: 'step-2',
        type: 'user_prompt',
        title: 'Technical Design',
        description: 'Design the architecture and implementation approach',
        content: `Tech stack: {{TECH_STACK}}

Based on the confirmed requirements, please provide:
1. An overall architecture design
2. A breakdown of key modules
3. Data structure design
4. Core algorithms / flow explanations
5. Rationale for the technical choices`,
        variables: ['TECH_STACK'],
        order: 2,
      },
      {
        id: 'step-3',
        type: 'user_prompt',
        title: 'Implementation',
        description: 'Start building the solution in code',
        content: `Please implement the solution according to the technical design.

Deliverables: {{DELIVERABLES}}

Please provide:
1. Complete working code
2. Necessary comments and explanations
3. A short description of the code structure
4. Explanations of key implementation details`,
        variables: ['DELIVERABLES'],
        order: 3,
      },
      {
        id: 'step-4',
        type: 'user_prompt',
        title: 'Code Review and Optimization',
        description: 'Review quality and improve the implementation',
        content: `Please review the code that was just generated:
1. Code quality review
2. Security checks
3. Performance optimization suggestions
4. Code style consistency
5. Best-practice improvements`,
        variables: [],
        order: 4,
      },
      {
        id: 'step-5',
        type: 'user_prompt',
        title: 'Testing and Validation',
        description: 'Write tests and validate the behavior',
        content: `Please provide the following for the code:
1. Unit tests
2. Integration tests if needed
3. Test case explanations
4. Edge-case validation
5. Usage examples`,
        variables: [],
        order: 5,
      },
      {
        id: 'step-6',
        type: 'user_prompt',
        title: 'Documentation Wrap-up',
        description: 'Write docs and summarize the project',
        content: `Please create the following for this project:
1. A README
2. A quick-start guide
3. API documentation where applicable
4. A project summary and lessons learned
5. Suggestions for future improvements`,
        variables: [],
        order: 6,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true,
  },
  {
    id: 'built-in-data-analysis',
    name: 'Data Analysis Workflow',
    description: 'A structured workflow for data analysis and insight generation',
    category: 'data_analysis',
    tags: ['data analysis', 'insights', 'visualization'],
    variables: ['DATA_DESCRIPTION', 'ANALYSIS_GOAL', 'DATA_SOURCE'],
    estimatedDurationMinutes: 30,
    useCases: [
      'Dataset exploration',
      'Business data analysis',
      'Experiment result analysis'
    ],
    bestPractices: [
      'Understand the full dataset before diving into details',
      'Use visualization to aid understanding',
      'Validate hypotheses instead of only hunting for supporting evidence'
    ],
    steps: [
      {
        id: 'da-step-1',
        type: 'user_prompt',
        title: 'Data Overview',
        description: 'Understand the basic characteristics of the data',
        content: `I need to analyze the following data:

Data description: {{DATA_DESCRIPTION}}
Data source: {{DATA_SOURCE}}
Analysis goal: {{ANALYSIS_GOAL}}

Please start with:
1. Data type and structure analysis
2. Data quality assessment
3. Key statistical indicators
4. Initial observations`,
        variables: ['DATA_DESCRIPTION', 'DATA_SOURCE', 'ANALYSIS_GOAL'],
        order: 1,
      },
      {
        id: 'da-step-2',
        type: 'user_prompt',
        title: 'Deep Analysis',
        description: 'Perform a deeper analysis of the data',
        content: `Please perform a deep analysis:
1. Trend analysis and pattern recognition
2. Outlier and anomaly detection
3. Correlation analysis
4. Key findings and insights
5. Goal-oriented interpretation`,
        variables: [],
        order: 2,
      },
      {
        id: 'da-step-3',
        type: 'user_prompt',
        title: 'Visualization Recommendations',
        description: 'Recommend suitable data visualizations',
        content: `Please suggest appropriate visualization approaches:
1. Visualizations for key metrics
2. Ways to display trends and patterns
3. Visualizations for comparative analysis
4. Recommended visualization tools / libraries
5. Suggestions for interactive analysis`,
        variables: [],
        order: 3,
      },
      {
        id: 'da-step-4',
        type: 'user_prompt',
        title: 'Conclusions and Recommendations',
        description: 'Summarize results and provide recommendations',
        content: `Please provide a final summary:
1. Key conclusions (3-5 items)
2. Actionable recommendations
3. Risks and considerations
4. Suggested next analysis directions
5. Decision-support information`,
        variables: [],
        order: 4,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true,
  },
  {
    id: 'built-in-bug-debug',
    name: 'Debugging Workflow',
    description: 'A systematic workflow for diagnosing and fixing issues',
    category: 'debugging',
    tags: ['debugging', 'problem diagnosis', 'bug fixing'],
    variables: ['PROBLEM_DESC', 'ENV_INFO', 'ERROR_LOG'],
    estimatedDurationMinutes: 45,
    useCases: [
      'Bug fixes',
      'Problem diagnosis',
      'Performance issue investigation'
    ],
    bestPractices: [
      'Reproduce the issue before isolating the cause',
      'Eliminate possibilities systematically',
      'Document the investigation process for future reference'
    ],
    steps: [
      {
        id: 'db-step-1',
        type: 'user_prompt',
        title: 'Problem Description',
        description: 'Clarify and describe the issue',
        content: `I ran into a problem:

Problem description: {{PROBLEM_DESC}}
Environment info: {{ENV_INFO}}
Error log: {{ERROR_LOG}}

Please help me:
1. Understand and clarify the issue
2. Identify the key symptoms
3. Collect the required diagnostic information
4. Make an initial classification of the problem`,
        variables: ['PROBLEM_DESC', 'ENV_INFO', 'ERROR_LOG'],
        order: 1,
      },
      {
        id: 'db-step-2',
        type: 'user_prompt',
        title: 'Reproduction and Validation',
        description: 'Confirm how to reproduce the issue',
        content: `Please help me design a reproduction and validation plan:
1. Minimal reproduction steps
2. Hypotheses that need to be tested
3. Diagnostic commands / test suggestions
4. Key information that should be collected
5. Validation criteria`,
        variables: [],
        order: 2,
      },
      {
        id: 'db-step-3',
        type: 'user_prompt',
        title: 'Root Cause Analysis',
        description: 'Investigate the underlying cause',
        content: `Based on the collected information, please perform a root cause analysis:
1. A ranked list of possible causes
2. A validation method for each cause
3. The elimination process
4. The most likely root cause
5. An impact-scope assessment`,
        variables: [],
        order: 3,
      },
      {
        id: 'db-step-4',
        type: 'user_prompt',
        title: 'Fix Plan',
        description: 'Design and implement a fix',
        content: `Please provide a fix plan:
1. Multiple possible fixes
2. A comparison and recommendation
3. Fix code / implementation steps
4. Regression test suggestions
5. Preventive measures`,
        variables: [],
        order: 4,
      },
      {
        id: 'db-step-5',
        type: 'user_prompt',
        title: 'Summary and Notes',
        description: 'Summarize the issue and lessons learned',
        content: `Please summarize this debugging session:
1. Root cause summary
2. Fix explanation
3. Lessons learned
4. Preventive recommendations
5. Suggested documentation updates`,
        variables: [],
        order: 5,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isBuiltIn: true,
  },
];
