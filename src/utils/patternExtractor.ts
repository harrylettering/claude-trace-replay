import type { LogEntry, ParsedLogData, ToolCall } from '../types/log';
import type {
  SessionPattern,
  PatternType,
  SuccessRating,
  ToolUsagePattern,
  PromptPattern,
  PatternExtractionConfig,
} from '../types/sessionPattern';
import { isRealUserInput, extractUserText } from './logParser';

const DEFAULT_CONFIG: PatternExtractionConfig = {
  minTokenEfficiency: 30,
  minSteps: 3,
  includeManualPatterns: true,
};

// Estimate how successful the session was overall.
function analyzeSuccessRating(data: ParsedLogData): SuccessRating {
  const { stats, toolCalls } = data;

  let score = 50;

  // Tool-call success rate.
  if (stats.toolCalls > 0) {
    const successRate = toolCalls.filter(t => !t.isError).length / stats.toolCalls;
    score += (successRate - 0.5) * 30;
  } else {
    score += 10;
  }

  // Token efficiency, assuming shorter successful sessions are generally better.
  const tokenPerMessage = stats.totalTokens / Math.max(stats.totalMessages, 1);
  if (tokenPerMessage < 500) score += 15;
  else if (tokenPerMessage < 1000) score += 10;
  else if (tokenPerMessage < 2000) score += 5;

  // Additional score boost for strong tool-call reliability.
  const toolSuccessRate = stats.toolCalls > 0
    ? toolCalls.filter(t => !t.isError).length / stats.toolCalls
    : 1;
  if (toolSuccessRate >= 0.9) score += 15;
  else if (toolSuccessRate >= 0.7) score += 10;
  else if (toolSuccessRate >= 0.5) score += 5;

  // Convert the final score into a rating.
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  return 'needs_improvement';
}

// Calculate a token efficiency score (0-100).
function calculateTokenEfficiency(data: ParsedLogData): number {
  const { stats } = data;

  // Base score.
  let score = 50;

  // Tokens per message: both extremes are usually bad.
  const tokenPerMessage = stats.totalMessages > 0
    ? stats.totalTokens / stats.totalMessages
    : 0;

  if (tokenPerMessage >= 100 && tokenPerMessage <= 500) {
    score += 20;
  } else if (tokenPerMessage >= 50 && tokenPerMessage <= 1000) {
    score += 10;
  } else if (tokenPerMessage > 0) {
    score -= 10;
  }

  // Input/output ratio: a balanced ratio is usually healthier.
  const ioRatio = stats.outputTokens > 0
    ? stats.inputTokens / stats.outputTokens
    : 1;
  if (ioRatio >= 0.5 && ioRatio <= 2) {
    score += 20;
  } else if (ioRatio >= 0.25 && ioRatio <= 4) {
    score += 10;
  }

  // Tool-call efficiency when tools are present.
  if (stats.toolCalls > 0) {
    const toolsPerMessage = stats.toolCalls / stats.assistantMessages;
    if (toolsPerMessage >= 0.5 && toolsPerMessage <= 2) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Analyze tool usage patterns.
function analyzeToolPatterns(toolCalls: ToolCall[]): ToolUsagePattern[] {
  const toolMap = new Map<string, {
    count: number;
    totalDuration: number;
    successCount: number;
    inputs: Set<string>;
  }>();

  toolCalls.forEach((tool) => {
    const existing = toolMap.get(tool.name) || {
      count: 0,
      totalDuration: 0,
      successCount: 0,
      inputs: new Set<string>(),
    };

    existing.count++;
    existing.totalDuration += tool.durationMs || 0;
    if (!tool.isError) existing.successCount++;

    // Store simplified input samples.
    const inputStr = JSON.stringify(tool.input).slice(0, 100);
    if (inputStr) existing.inputs.add(inputStr);

    toolMap.set(tool.name, existing);
  });

  return Array.from(toolMap.entries()).map(([name, data]) => ({
    toolName: name,
    frequency: data.count,
    averageDurationMs: data.count > 0 ? Math.round(data.totalDuration / data.count) : undefined,
    successRate: data.count > 0 ? data.successCount / data.count : 0,
    typicalInputs: Array.from(data.inputs).slice(0, 3),
  }));
}

// Extract key prompt patterns.
function extractKeyPrompts(entries: LogEntry[]): PromptPattern[] {
  const prompts: PromptPattern[] = [];

  entries.forEach((entry, index) => {
    if (!isRealUserInput(entry)) return;

    const text = extractUserText(entry);
    if (!text || text.length < 20) return;

    const variables = extractVariables(text);
    const context = extractContext(entries, index);

    prompts.push({
      id: `prompt-${Date.now()}-${index}`,
      content: text,
      variables,
      context,
      effectivenessScore: estimatePromptEffectiveness(text),
      usageCount: 1,
    });
  });

  // Return the most relevant prompts, capped at five.
  return prompts
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, 5);
}

// Extract template variables.
function extractVariables(_text: string): string[] {
  const variables: string[] = [];
  // Placeholder heuristic: this can later be improved with stronger NLP.
  return variables;
}

// Extract prompt context.
function extractContext(entries: LogEntry[], currentIndex: number): string {
  const contextParts: string[] = [];

  // Look at the few messages immediately before the prompt.
  for (let i = Math.max(0, currentIndex - 3); i < currentIndex; i++) {
    const entry = entries[i];
    if (entry.type === 'assistant') {
      contextParts.push('assistant_response');
    } else if (entry.type === 'user') {
      contextParts.push('user_message');
    }
  }

  return contextParts.join(' → ');
}

// Estimate prompt effectiveness (0-100).
function estimatePromptEffectiveness(text: string): number {
  let score = 50;

  // Length factor: extremely short or long prompts are less effective.
  if (text.length >= 50 && text.length <= 500) score += 20;
  else if (text.length >= 30 && text.length <= 1000) score += 10;

  // Structure factor: prompts with explicit structure tend to perform better.
  if (text.includes('1.') || text.includes('•') || text.includes('please')) score += 15;

  // Clarity factor: explicit requests usually perform better.
  if (text.includes('please') || text.includes('need') || text.includes('help me')) score += 10;

  return Math.max(0, Math.min(100, score));
}

// Infer the overall pattern type.
function inferPatternType(data: ParsedLogData): PatternType {
  const { toolCalls, entries } = data;

  // Tool-usage analysis.
  const toolNames = new Set(toolCalls.map(t => t.name));
  const hasCodingTools = toolNames.has('Edit') || toolNames.has('Write') || toolNames.has('Read') || toolNames.has('Grep') || toolNames.has('Glob');
  const hasDebugTools = toolNames.has('Bash') && toolCalls.some(t => t.input && JSON.stringify(t.input).includes('test'));
  const hasSearchTools = toolNames.has('WebSearch') || toolNames.has('WebFetch');
  const hasReviewPattern = entries.some(e => {
    const text = extractUserText(e);
    return text && (text.includes('review') || text.includes('inspect') || text.includes('check'));
  });
  const hasTestPattern = entries.some(e => {
    const text = extractUserText(e);
    return text && (text.includes('test') || text.includes('testing'));
  });

  // Multi-step flow analysis.
  const userInputCount = entries.filter(e => isRealUserInput(e)).length;
  const isMultiStep = userInputCount >= 3;

  if (hasDebugTools) return 'debugging_flow';
  if (hasReviewPattern) return 'review_pattern';
  if (hasTestPattern) return 'testing_pattern';
  if (hasCodingTools) return 'coding_workflow';
  if (hasSearchTools) return 'research_pattern';
  if (isMultiStep) return 'multi_step_task';

  return 'custom';
}

// Extract a compact workflow description.
function extractWorkflow(entries: LogEntry[]): SessionPattern['workflow'] {
  const workflow: SessionPattern['workflow'] = [];
  let order = 0;

  entries.forEach((entry) => {
    if (isRealUserInput(entry)) {
      const text = extractUserText(entry);
      workflow.push({
        stepDescription: text ? text.slice(0, 100) + (text.length > 100 ? '...' : '') : 'User input',
        stepType: 'user_input',
        order: order++,
      });
    } else if (entry.type === 'assistant') {
      const content = entry.message?.content;
      if (Array.isArray(content)) {
        const hasToolUse = content.some(c => c.type === 'tool_use');
        if (hasToolUse) {
          workflow.push({
            stepDescription: 'Tool call',
            stepType: 'tool_call',
            order: order++,
          });
        }
      }
    }
  });

  return workflow;
}

// Extract a pattern from a single session.
export function extractPatternFromSession(
  data: ParsedLogData,
  sessionName?: string,
  sessionId?: string,
  config: PatternExtractionConfig = DEFAULT_CONFIG
): SessionPattern | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { stats, toolCalls, entries } = data;

  // Basic guard rails.
  if (stats.totalMessages < (cfg.minSteps || 3)) {
    return null;
  }

  const successRating = analyzeSuccessRating(data);
  const tokenEfficiency = calculateTokenEfficiency(data);

  if (tokenEfficiency < (cfg.minTokenEfficiency || 30)) {
    return null;
  }

  const durationMs = stats.sessionDuration;

  const pattern: SessionPattern = {
    id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: generatePatternName(data, successRating),
    description: generatePatternDescription(data),
    type: inferPatternType(data),
    tags: generateTags(data),

    sourceSessionId: sessionId,
    sourceSessionName: sessionName,

    totalSteps: entries.filter(e => isRealUserInput(e)).length,
    durationMs,
    tokenEfficiency,
    successRating,

    toolPatterns: analyzeToolPatterns(toolCalls),
    keyPrompts: extractKeyPrompts(entries),
    workflow: extractWorkflow(entries),

    bestPractices: generateBestPractices(data, successRating),
    pitfalls: generatePitfalls(data, successRating),

    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    isFavorite: false,
    isManual: false,
  };

  return pattern;
}

// Generate a pattern name.
function generatePatternName(data: ParsedLogData, rating: SuccessRating): string {
  const type = inferPatternType(data);
  const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const ratingLabel = rating === 'excellent' ? 'Excellent' :
                     rating === 'good' ? 'Good' :
                     rating === 'moderate' ? 'Moderate' : 'Needs Improvement';

  return `${typeLabel} Pattern (${ratingLabel})`;
}

// Generate a pattern description.
function generatePatternDescription(data: ParsedLogData): string {
  const { stats } = data;
  return `${stats.totalMessages} conversation steps, ${stats.toolCalls} tool calls, ${stats.totalTokens.toLocaleString()} tokens consumed`;
}

// Generate tags.
function generateTags(data: ParsedLogData): string[] {
  const tags: string[] = [];
  const { toolCalls, stats } = data;

  // Add tool-based tags.
  const toolNames = new Set(toolCalls.map(t => t.name));
  if (toolNames.has('Edit') || toolNames.has('Write')) tags.push('Code Editing');
  if (toolNames.has('Read')) tags.push('File Reading');
  if (toolNames.has('Grep') || toolNames.has('Glob')) tags.push('Code Search');
  if (toolNames.has('Bash')) tags.push('Command Execution');
  if (toolNames.has('WebSearch') || toolNames.has('WebFetch')) tags.push('Web Search');

  // Add stats-based tags.
  if (stats.totalTokens > 10000) tags.push('High Token Usage');
  if (stats.toolCalls > 5) tags.push('Multi-Tool Session');
  if (stats.totalMessages > 10) tags.push('Long Conversation');

  return tags;
}

// Generate best practices.
function generateBestPractices(data: ParsedLogData, rating: SuccessRating): string[] {
  const practices: string[] = [];
  const { toolCalls } = data;

  if (rating === 'excellent' || rating === 'good') {
    practices.push('This pattern performs well for the current task type.');
  }

  const successRate = toolCalls.length > 0
    ? toolCalls.filter(t => !t.isError).length / toolCalls.length
    : 1;
  if (successRate >= 0.8) {
    practices.push('Tool-call success rate is high, so the pattern is reusable.');
  }

  return practices;
}

// Generate pitfalls.
function generatePitfalls(data: ParsedLogData, rating: SuccessRating): string[] {
  const pitfalls: string[] = [];

  if (rating === 'needs_improvement' || rating === 'moderate') {
    pitfalls.push('This pattern likely needs refinement before it is reused.');
  }

  const { toolCalls } = data;
  const errorRate = toolCalls.length > 0
    ? toolCalls.filter(t => t.isError).length / toolCalls.length
    : 0;
  if (errorRate > 0.3) {
    pitfalls.push('Tool-call failure rate is high, so parameters should be reviewed.');
  }

  return pitfalls;
}

// Extract patterns from multiple sessions in batch.
export function extractPatternsFromSessions(
  sessions: Array<{ data: ParsedLogData; name?: string; id?: string }>,
  config: PatternExtractionConfig = DEFAULT_CONFIG
): SessionPattern[] {
  const patterns: SessionPattern[] = [];

  sessions.forEach(({ data, name, id }) => {
    const pattern = extractPatternFromSession(data, name, id, config);
    if (pattern) {
      patterns.push(pattern);
    }
  });

  return patterns;
}
