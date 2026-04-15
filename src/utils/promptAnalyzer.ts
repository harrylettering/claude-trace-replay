import type { LogEntry, ParsedLogData } from '../types/log';
import type {
  PromptAnalysis,
  PromptIssue,
  PromptSuggestion,
  PromptStats,
  IssueType,
  Severity,
} from '../types/prompt';
import { isRealUserInput, extractUserText } from './logParser';

// Extract user prompts from log entries (only real user input, skipping tool_result)
function extractUserPrompts(entries: LogEntry[]): Array<{ entry: LogEntry; index: number; text: string }> {
  const prompts: Array<{ entry: LogEntry; index: number; text: string }> = [];

  entries.forEach((entry, index) => {
    if (isRealUserInput(entry)) {
      const text = extractUserText(entry);
      if (text.trim().length > 0) {
        prompts.push({ entry, index, text });
      }
    }
  });

  return prompts;
}

// Check whether the prompt is too short
function checkTooShort(text: string): PromptIssue | null {
  if (text.length < 20) {
    return {
      id: `too-short-${Date.now()}`,
      type: 'too_short',
      severity: 'high',
      title: 'Prompt is too short',
      description: 'The prompt may be missing important details and context',
      location: { entryIndex: -1, charStart: 0, charEnd: text.length },
      suggestion: 'Add more detail: describe the goal, provide context, explain constraints, and define the desired output format',
    };
  }
  if (text.length < 50) {
    return {
      id: `too-short-${Date.now()}`,
      type: 'too_short',
      severity: 'medium',
      title: 'Prompt is somewhat short',
      description: 'The prompt may not be specific enough',
      location: { entryIndex: -1, charStart: 0, charEnd: text.length },
      suggestion: 'Consider adding a role, step-by-step instructions, or examples to make the prompt richer',
    };
  }
  return null;
}

// Check whether structure is missing
function checkNoStructure(text: string): PromptIssue | null {
  const hasStructure =
    text.includes('1.') ||
    text.includes('2.') ||
    text.includes('•') ||
    text.includes('- ') ||
    text.includes('###') ||
    text.includes('**') ||
    text.toLowerCase().includes('step') ||
    text.toLowerCase().includes('please');

  if (text.length > 100 && !hasStructure) {
    return {
      id: `no-structure-${Date.now()}`,
      type: 'no_structure',
      severity: 'medium',
      title: 'Lacks structure',
      description: 'Long prompts are easier to follow when organized with lists, headings, or sections',
      location: { entryIndex: -1 },
      suggestion: 'Use numbered lists, bullet points, or headings to organize the prompt and improve readability',
    };
  }
  return null;
}

// Check whether a role is missing
function checkMissingRole(text: string): PromptIssue | null {
  const roleKeywords = [
    '作为',
    '充当',
    '你是一个',
    '请做一位',
    '扮演',
    'act as',
    'you are a',
    'as a',
  ];

  const hasRole = roleKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );

  if (text.length > 100 && !hasRole) {
    return {
      id: `missing-role-${Date.now()}`,
      type: 'missing_role',
      severity: 'low',
      title: 'Missing role setup',
      description: 'Giving the AI a role often leads to more professional and focused responses',
      location: { entryIndex: -1 },
      suggestion: 'Add a role at the start of the prompt, such as "Act as a senior software engineer..." or "Act as a product manager..."',
    };
  }
  return null;
}

// Check whether an output format is missing
function checkNoOutputFormat(text: string): PromptIssue | null {
  const formatKeywords = [
    'json',
    'markdown',
    'format',
    'output',
    'return',
    'list',
    'table',
  ];

  const hasFormat = formatKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );

  if (text.length > 150 && !hasFormat) {
    return {
      id: `no-output-format-${Date.now()}`,
      type: 'no_output_format',
      severity: 'low',
      title: 'Missing output format',
      description: 'Defining the expected output format helps the response match expectations',
      location: { entryIndex: -1 },
      suggestion: 'Specify the desired output format, for example "Return the answer as JSON" or "Use the following list format"',
    };
  }
  return null;
}

// Check whether examples are missing
function checkNoExamples(text: string): PromptIssue | null {
  const exampleKeywords = [
    'example',
    'for example',
    'e.g.',
  ];

  const hasExamples = exampleKeywords.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase())
  );

  const hasQuotes = text.includes('"') && text.split('"').length > 4;
  const hasCodeBlocks = text.includes('```');

  if (text.length > 200 && !hasExamples && !hasQuotes && !hasCodeBlocks) {
    return {
      id: `no-examples-${Date.now()}`,
      type: 'no_examples',
      severity: 'low',
      title: 'Missing examples',
      description: 'Examples help the AI understand your intent more precisely',
      location: { entryIndex: -1 },
      suggestion: 'Add 1-2 examples to demonstrate the expected output, using quotes or code blocks when helpful',
    };
  }
  return null;
}

// Check for overly negative phrasing
function checkNegative(text: string): PromptIssue | null {
  const negativePatterns = [
    /don't\s*/gi,
    /do not\s*/gi,
    /never\s*/gi,
    /avoid\s*/gi,
  ];

  let matchCount = 0;
  for (const pattern of negativePatterns) {
    const matches = text.match(pattern);
    if (matches) matchCount += matches.length;
  }

  if (matchCount >= 3) {
    return {
      id: `negative-${Date.now()}`,
      type: 'negative',
      severity: 'medium',
      title: 'Too much negative phrasing',
      description: 'Positive instructions are usually more effective than a long list of prohibitions',
      location: { entryIndex: -1 },
      suggestion: 'Rewrite "do not do X" as "please do Y" so the instruction stays clear and action-oriented',
    };
  }
  return null;
}

// Check for repeated content
function checkRepeated(text: string): PromptIssue | null {
  const sentences = text.split(/[。！？.!?\n]+/).filter((s) => s.trim().length > 10);

  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const similarity = calculateSimilarity(sentences[i], sentences[j]);
      if (similarity > 0.8) {
        return {
          id: `repeated-${Date.now()}`,
          type: 'repeated',
          severity: 'low',
          title: 'Repeated content detected',
          description: 'Very similar sentences may waste tokens',
          location: { entryIndex: -1 },
          suggestion: 'Merge or remove repeated statements to keep the prompt concise',
        };
      }
    }
  }
  return null;
}

// Compute string similarity (simple version)
function calculateSimilarity(a: string, b: string): number {
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(shorter, longer);
  return 1.0 - editDistance / longer.length;
}

// Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

// Generate suggestions
function generateSuggestions(text: string): PromptSuggestion[] {
  const suggestions: PromptSuggestion[] = [];

  // Suggest adding a role
  if (text.length > 100 && !text.includes('作为') && !text.includes('充当')) {
    suggestions.push({
      id: `suggestion-role-${Date.now()}`,
      original: text.slice(0, 100) + '...',
      improved: 'Act as a [role], and help me ' + text.slice(0, 100),
      explanation: 'Adding a role helps the AI respond from a more expert and focused perspective',
      impact: 'medium',
      category: 'Role Setup',
    });
  }

  // Suggest adding structure
  if (text.length > 150 && !text.includes('1.') && !text.includes('•')) {
    suggestions.push({
      id: `suggestion-structure-${Date.now()}`,
      original: text.slice(0, 150) + '...',
      improved: 'Please handle this in the following steps:\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\n' + text.slice(0, 100),
      explanation: 'Structured prompts are easier for the AI to understand and execute',
      impact: 'medium',
      category: 'Structure',
    });
  }

  // Suggest adding an output format
  if (text.length > 150 && !text.toLowerCase().includes('json') && !text.toLowerCase().includes('格式')) {
    suggestions.push({
      id: `suggestion-format-${Date.now()}`,
      original: text.slice(0, 100) + '...',
      improved: text.slice(0, 100) + '\n\nReturn the result as JSON with the following fields: [field list]',
      explanation: 'Clearly defining the output format helps ensure the response matches expectations',
      impact: 'large',
      category: 'Output Format',
    });
  }

  return suggestions;
}

// Extract text from an entry
function extractTextFromEntry(entry: LogEntry): string {
  return extractUserText(entry);
}

// Calculate success rate (based on tool-call success, retries, etc.)
function calculateSuccessRate(entries: LogEntry[]): number {
  let toolCalls = 0;
  let successfulToolCalls = 0;
  let retries = 0;

  entries.forEach((entry, index) => {
    // Detect tool calls
    if (entry.type === 'assistant' && entry.message?.content) {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        const hasToolUse = content.some((c) => c.type === 'tool_use');
        if (hasToolUse) {
          toolCalls++;
          // Simplified heuristic: assume most tool calls succeed
          successfulToolCalls++;
        }
      }
    }

    // Detect retries (simple heuristic)
    if (isRealUserInput(entry) && index > 0) {
      const text = extractTextFromEntry(entry);
      if (text.includes('不对') || text.includes('错了') || text.includes('重新') || text.toLowerCase().includes('wrong') || text.toLowerCase().includes('incorrect') || text.toLowerCase().includes('redo') || text.toLowerCase().includes('again')) {
        retries++;
      }
    }
  });

  if (toolCalls === 0) {
    return Math.max(0, Math.min(100, 90 - retries * 10));
  }

  return Math.round((successfulToolCalls / toolCalls) * 100);
}

// Calculate average retries
function calculateAvgRetries(entries: LogEntry[]): number {
  let retries = 0;
  let userMessages = 0;

  entries.forEach((entry, index) => {
    if (isRealUserInput(entry)) {
      userMessages++;
      if (index > 0) {
        const text = extractTextFromEntry(entry);
        if (text.includes('不对') || text.includes('错了') || text.includes('重新') || text.toLowerCase().includes('wrong') || text.toLowerCase().includes('incorrect') || text.toLowerCase().includes('redo') || text.toLowerCase().includes('again')) {
          retries++;
        }
      }
    }
  });

  return userMessages > 0 ? retries / userMessages : 0;
}

// Calculate tool-call success rate
function calculateToolCallSuccessRate(entries: LogEntry[]): number {
  let toolCalls = 0;
  let errors = 0;

  entries.forEach((entry) => {
    // Detect tool calls
    if (entry.type === 'assistant' && entry.message?.content) {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        const hasToolUse = content.some((c) => c.type === 'tool_use');
        if (hasToolUse) toolCalls++;
      }
    }
    // Detect errors
    if (entry.type === 'system' && entry.message?.content) {
      const text = String(entry.message.content).toLowerCase();
      if (text.includes('error') || text.includes('错误') || text.includes('failed')) {
        errors++;
      }
    }
  });

  if (toolCalls === 0) return 100;
  return Math.max(0, Math.round(((toolCalls - errors) / toolCalls) * 100));
}

// Main analysis function
export function analyzePrompts(data: ParsedLogData): PromptAnalysis {
  const entries = data.entries;
  const userPrompts = extractUserPrompts(entries);

  const allIssues: PromptIssue[] = [];
  const allSuggestions: PromptSuggestion[] = [];
  const issuesByType: Record<IssueType, number> = {
    vague: 0, too_short: 0, missing_context: 0, no_structure: 0,
    no_examples: 0, no_constraints: 0, no_output_format: 0,
    negative: 0, passive: 0, inefficient_token: 0, repeated: 0,
    missing_role: 0, missing_steps: 0, other: 0,
  };
  const issuesBySeverity: Record<Severity, number> = {
    low: 0, medium: 0, high: 0, critical: 0,
  };

  let totalLength = 0;

  userPrompts.forEach(({ index, text }) => {
    totalLength += text.length;

    const checks = [
      checkTooShort,
      checkNoStructure,
      checkMissingRole,
      checkNoOutputFormat,
      checkNoExamples,
      checkNegative,
      checkRepeated,
    ];

    checks.forEach((check) => {
      const issue = check(text);
      if (issue) {
        issue.location.entryIndex = index;
        allIssues.push(issue);
        issuesByType[issue.type]++;
        issuesBySeverity[issue.severity]++;
      }
    });

    const suggestions = generateSuggestions(text);
    allSuggestions.push(...suggestions);
  });

  // Compute stats
  const successRate = calculateSuccessRate(entries);
  const avgRetries = calculateAvgRetries(entries);
  const toolCallSuccessRate = calculateToolCallSuccessRate(entries);

  const stats: PromptStats = {
    totalPrompts: userPrompts.length,
    totalTokens: estimateTokens(entries),
    avgPromptLength: userPrompts.length > 0 ? Math.round(totalLength / userPrompts.length) : 0,
    issuesByType,
    issuesBySeverity,
    successRate,
    avgRetries,
    toolCallSuccessRate,
  };

  // Best practices
  const bestPractices = generateBestPractices(allIssues, stats);

  // Compute overall score
  const score = calculateScore(stats, allIssues);

  return {
    stats,
    issues: allIssues,
    suggestions: allSuggestions,
    bestPractices,
    score,
  };
}

// Estimate token usage (rough estimate)
function estimateTokens(entries: LogEntry[]): number {
  let totalChars = 0;
  entries.forEach((entry) => {
    totalChars += JSON.stringify(entry).length;
  });
  return Math.round(totalChars / 4); // Rough estimate: 4 characters ~= 1 token
}

// Generate best-practice suggestions
function generateBestPractices(_issues: PromptIssue[], stats: PromptStats): string[] {
  const practices: string[] = [];

  if (stats.issuesByType.too_short > 0) {
    practices.push('Provide enough detail in the prompt, including the goal, context, and constraints');
  }
  if (stats.issuesByType.no_structure > 0) {
    practices.push('Use lists, headings, or sections to organize long prompts');
  }
  if (stats.issuesByType.missing_role > 0) {
    practices.push('Assign the AI a professional role to get more targeted responses');
  }
  if (stats.issuesByType.no_output_format > 0) {
    practices.push('Clearly define the expected output format');
  }
  if (stats.issuesByType.no_examples > 0) {
    practices.push('Provide 1-2 examples that demonstrate the desired output');
  }
  if (stats.issuesByType.negative > 0) {
    practices.push('Prefer positive instructions over prohibitions');
  }
  if (stats.issuesByType.repeated > 0) {
    practices.push('Keep prompts concise and avoid repeated phrasing');
  }

  // Add general best practices when no specific issues are present
  if (practices.length === 0) {
    practices.push('Describe the request using clear and specific language');
    practices.push('Break complex tasks into multiple steps');
    practices.push('Provide relevant context');
    practices.push('Define acceptance criteria and output format clearly');
  }

  return practices.slice(0, 6); // Return up to 6 items
}

// Calculate the overall score
function calculateScore(stats: PromptStats, issues: PromptIssue[]): number {
  let score = 100;

  // Deduct points by severity
  const severityPenalty: Record<Severity, number> = {
    low: 3,
    medium: 8,
    high: 15,
    critical: 25,
  };

  issues.forEach((issue) => {
    score -= severityPenalty[issue.severity];
  });

  // Adjust by success rate
  score += (stats.successRate - 70) * 0.2;

  // Adjust by tool-call success rate
  score += (stats.toolCallSuccessRate - 80) * 0.1;

  return Math.max(0, Math.min(100, Math.round(score)));
}
