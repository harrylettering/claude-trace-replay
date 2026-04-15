import type { LogEntry, ToolCall, SessionStats, ParsedLogData } from '../types/log';
import type {
  AnalysisResult,
  Insight,
  ToolStats,
  PerformanceAnalysis,
  TokenAnalysis,
  PatternAnalysis,
  ErrorAnalysis,
  Severity,
  AnalysisCategory,
} from '../types/analysis';
import { DEFAULT_ANALYSIS } from '../types/analysis';
import { PRICING } from '../constants';

// Threshold constants
const PERFORMANCE_WARNING_THRESHOLD_MS = 30_000; // 30 seconds
const PERFORMANCE_CRITICAL_THRESHOLD_MS = 60_000; // 60 seconds
const HIGH_TOKEN_THRESHOLD = 50_000;
const TOKEN_EFFICIENCY_GOOD = 0.5; // Output/input > 0.5 is good
const TOKEN_EFFICIENCY_POOR = 0.1; // Output/input < 0.1 is poor
const ERROR_RATE_WARNING = 0.1; // 10% error rate
const ERROR_RATE_CRITICAL = 0.25; // 25% error rate

// Generate a unique ID
function generateId(): string {
  return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create an insight
function createInsight(
  category: AnalysisCategory,
  severity: Severity,
  title: string,
  description: string,
  options: Partial<Omit<Insight, 'id' | 'category' | 'severity' | 'title' | 'description'>> = {}
): Insight {
  return {
    id: generateId(),
    category,
    severity,
    title,
    description,
    ...options,
  };
}

// Compute median
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Analyze performance
function analyzePerformance(data: ParsedLogData): PerformanceAnalysis {
  const durations = data.turnDurations.map((d: any) => d.durationMs).filter((d: any) => d > 0);

  if (durations.length === 0) {
    return {
      avgTurnDuration: 0,
      medianTurnDuration: 0,
      minTurnDuration: 0,
      maxTurnDuration: 0,
      slowTurns: [],
      avgTurnsPerMinute: 0,
    };
  }

  const avgTurnDuration = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
  const medianTurnDuration = median(durations);
  const minTurnDuration = Math.min(...durations);
  const maxTurnDuration = Math.max(...durations);

  const slowTurns = data.turnDurations
    .filter(d => d.durationMs > avgTurnDuration * 2)
    .map((d, index) => ({
      index,
      duration: d.durationMs,
      timestamp: d.timestamp,
    }));

  const sessionDurationMinutes = data.stats.sessionDuration / 60_000;
  const avgTurnsPerMinute = sessionDurationMinutes > 0
    ? durations.length / sessionDurationMinutes
    : 0;

  return {
    avgTurnDuration,
    medianTurnDuration,
    minTurnDuration,
    maxTurnDuration,
    slowTurns,
    avgTurnsPerMinute,
  };
}

// Analyze token usage
function analyzeTokens(data: ParsedLogData): TokenAnalysis {
  const { tokenUsage, stats } = data;

  if (tokenUsage.length === 0) {
    return DEFAULT_ANALYSIS.tokenAnalysis;
  }

  const avgInputTokensPerTurn = stats.inputTokens / tokenUsage.length;
  const avgOutputTokensPerTurn = stats.outputTokens / tokenUsage.length;
  const avgTotalTokensPerTurn = stats.totalTokens / tokenUsage.length;

  let maxInputTokens = { value: 0, timestamp: '' };
  let maxOutputTokens = { value: 0, timestamp: '' };
  const highTokenEntries: TokenAnalysis['highTokenEntries'] = [];

  tokenUsage.forEach(t => {
    if (t.inputTokens > maxInputTokens.value) {
      maxInputTokens = { value: t.inputTokens, timestamp: t.timestamp };
    }
    if (t.outputTokens > maxOutputTokens.value) {
      maxOutputTokens = { value: t.outputTokens, timestamp: t.timestamp };
    }
    if (t.totalTokens > HIGH_TOKEN_THRESHOLD) {
      highTokenEntries.push({
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        totalTokens: t.totalTokens,
        timestamp: t.timestamp,
      });
    }
  });

  const tokenEfficiency = stats.inputTokens > 0
    ? stats.outputTokens / stats.inputTokens
    : 0;

  const inputCost = stats.inputTokens * (PRICING.INPUT_PER_MTOK / 1_000_000);
  const outputCost = stats.outputTokens * (PRICING.OUTPUT_PER_MTOK / 1_000_000);

  return {
    avgInputTokensPerTurn,
    avgOutputTokensPerTurn,
    avgTotalTokensPerTurn,
    maxInputTokens,
    maxOutputTokens,
    tokenEfficiency,
    highTokenEntries,
    estimatedCost: {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    },
  };
}

// Analyze tool usage
function analyzeTools(toolCalls: ToolCall[]): ToolStats[] {
  const toolMap = new Map<string, { count: number; successCount: number; errorCount: number; durations: number[] }>();

  toolCalls.forEach(call => {
    const existing = toolMap.get(call.name) || { count: 0, successCount: 0, errorCount: 0, durations: [] };
    existing.count++;
    if (call.isError) {
      existing.errorCount++;
    } else {
      existing.successCount++;
    }
    if (call.durationMs) {
      existing.durations.push(call.durationMs);
    }
    toolMap.set(call.name, existing);
  });

  return Array.from(toolMap.entries()).map(([name, stats]) => {
    const avgDuration = stats.durations.length > 0
      ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
      : undefined;
    const minDuration = stats.durations.length > 0 ? Math.min(...stats.durations) : undefined;
    const maxDuration = stats.durations.length > 0 ? Math.max(...stats.durations) : undefined;

    return {
      name,
      count: stats.count,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      successRate: stats.count > 0 ? stats.successCount / stats.count : 1,
      avgDuration,
      minDuration,
      maxDuration,
    };
  }).sort((a, b) => b.count - a.count);
}

// Analyze patterns
function analyzePatterns(entries: LogEntry[], stats: SessionStats): PatternAnalysis {
  const userMessageCount = entries.filter(e => e.type === 'user' && !e.isMeta).length;
  const assistantMessageCount = entries.filter(e => e.type === 'assistant').length;
  const toolMessageCount = entries.filter(e => {
    const content = e.message?.content;
    return Array.isArray(content) && content.some((c: any) =>
      c.type === 'tool_use' || c.type === 'tool_result'
    );
  }).length;

  const sidechainCount = entries.filter(e => e.isSidechain).length;

  // Compute conversation depth
  const depthMap = new Map<string, number>();
  let maxDepth = 0;

  entries.forEach(entry => {
    if (entry.uuid) {
      const parentDepth = entry.parentUuid ? (depthMap.get(entry.parentUuid) || 0) : 0;
      const currentDepth = parentDepth + 1;
      depthMap.set(entry.uuid, currentDepth);
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  });

  const avgMessagesPerTurn = stats.userMessages > 0
    ? stats.totalMessages / stats.userMessages
    : 0;

  return {
    userMessageCount,
    assistantMessageCount,
    toolMessageRatio: stats.totalMessages > 0 ? toolMessageCount / stats.totalMessages : 0,
    sidechainCount,
    hasSidechains: sidechainCount > 0,
    conversationDepth: maxDepth,
    avgMessagesPerTurn,
    longestMessageChain: [],
    peakActivityTimes: [],
  };
}

// Analyze errors
function analyzeErrors(toolCalls: ToolCall[], toolStats: ToolStats[]): ErrorAnalysis {
  const totalErrors = toolCalls.filter(t => t.isError).length;
  const errorRate = toolCalls.length > 0 ? totalErrors / toolCalls.length : 0;

  const errorsByTool: Record<string, number> = {};
  toolCalls.forEach(call => {
    if (call.isError) {
      errorsByTool[call.name] = (errorsByTool[call.name] || 0) + 1;
    }
  });

  const recentErrors = toolCalls
    .filter(t => t.isError)
    .slice(-5)
    .map(t => ({
      toolName: t.name,
      timestamp: t.timestamp,
    }));

  const frequentErrorTools = toolStats
    .filter(t => t.errorCount > 0 && t.successRate < 0.8)
    .map(t => t.name);

  return {
    totalErrors,
    errorRate,
    errorsByTool,
    recentErrors,
    frequentErrorTools,
  };
}

// Generate insights
function generateInsights(
  _data: ParsedLogData,
  performance: PerformanceAnalysis,
  tokenAnalysis: TokenAnalysis,
  toolStats: ToolStats[],
  patterns: PatternAnalysis,
  errors: ErrorAnalysis
): Insight[] {
  const insights: Insight[] = [];

  // Performance insights
  if (performance.maxTurnDuration > PERFORMANCE_CRITICAL_THRESHOLD_MS) {
    insights.push(createInsight(
      'performance',
      'critical',
      'Very slow responses detected',
      `Some requests took longer than ${Math.round(PERFORMANCE_CRITICAL_THRESHOLD_MS / 1000)} seconds`,
      {
        suggestions: ['Consider optimizing tool usage', 'Check network connectivity', 'Reduce the workload per request'],
        relatedEntryIds: performance.slowTurns.slice(0, 3).map(t => t.timestamp),
      }
    ));
  } else if (performance.maxTurnDuration > PERFORMANCE_WARNING_THRESHOLD_MS) {
    insights.push(createInsight(
      'performance',
      'warning',
      'Slow responses observed',
      `Some requests took longer than ${Math.round(PERFORMANCE_WARNING_THRESHOLD_MS / 1000)} seconds`,
      {
        suggestions: ['Consider splitting complex tasks', 'Optimize tool usage'],
      }
    ));
  }

  if (performance.slowTurns.length > 3) {
    insights.push(createInsight(
      'performance',
      'warning',
      'Repeated slow responses',
      `${performance.slowTurns.length} requests were more than twice the average response time`
    ));
  }

  // Token insights
  if (tokenAnalysis.highTokenEntries.length > 0) {
    insights.push(createInsight(
      'token_usage',
      'warning',
      'High token usage',
      `${tokenAnalysis.highTokenEntries.length} requests used more than ${HIGH_TOKEN_THRESHOLD} tokens`,
      {
        suggestions: ['Consider splitting long conversations', 'Use more concise prompts', 'Trim context periodically'],
      }
    ));
  }

  if (tokenAnalysis.tokenEfficiency < TOKEN_EFFICIENCY_POOR) {
    insights.push(createInsight(
      'token_usage',
      'warning',
      'Low token efficiency',
      `The output-to-input token ratio is low (${(tokenAnalysis.tokenEfficiency * 100).toFixed(1)}%)`,
      {
        suggestions: ['Refine prompts for more concise answers', 'Consider a more suitable model'],
      }
    ));
  } else if (tokenAnalysis.tokenEfficiency > TOKEN_EFFICIENCY_GOOD) {
    insights.push(createInsight(
      'token_usage',
      'info',
      'Good token efficiency',
      `The output-to-input token ratio is healthy (${(tokenAnalysis.tokenEfficiency * 100).toFixed(1)}%)`
    ));
  }

  if (tokenAnalysis.estimatedCost.totalCost > 1) {
    insights.push(createInsight(
      'token_usage',
      'warning',
      'Session cost is high',
      `The estimated session cost exceeded $${tokenAnalysis.estimatedCost.totalCost.toFixed(2)}`,
      {
        suggestions: ['Consider a more cost-effective model', 'Optimize context management'],
      }
    ));
  }

  // Tool-call insights
  const mostUsedTool = toolStats[0];
  if (mostUsedTool) {
    insights.push(createInsight(
      'tool_calls',
      'info',
      `Most used tool: ${mostUsedTool.name}`,
      `Used ${mostUsedTool.count} times with a ${(mostUsedTool.successRate * 100).toFixed(1)}% success rate`,
    ));
  }

  // Error insights
  if (errors.errorRate > ERROR_RATE_CRITICAL) {
    insights.push(createInsight(
      'errors',
      'critical',
      'Error rate is very high',
      `The tool-call error rate reached ${(errors.errorRate * 100).toFixed(1)}%`,
      {
        suggestions: ['Check tool configuration', 'Verify permissions', 'Review detailed error logs'],
      }
    ));
  } else if (errors.errorRate > ERROR_RATE_WARNING) {
    insights.push(createInsight(
      'errors',
      'warning',
      'Elevated error rate',
      `The tool-call error rate is ${(errors.errorRate * 100).toFixed(1)}%`,
      {
        suggestions: errors.frequentErrorTools.length > 0
          ? [`Focus on errors from these tools: ${errors.frequentErrorTools.join(', ')}`]
          : [],
      }
    ));
  }

  // Pattern insights
  if (patterns.hasSidechains) {
    insights.push(createInsight(
      'patterns',
      'info',
      'Sidechain usage detected',
      `The session contains ${patterns.sidechainCount} Sidechain messages`,
    ));
  }

  if (patterns.conversationDepth > 5) {
    insights.push(createInsight(
      'patterns',
      'info',
      'Deep conversation structure',
      `The maximum conversation depth reached ${patterns.conversationDepth} levels`,
    ));
  }

  if (patterns.toolMessageRatio > 0.5) {
    insights.push(createInsight(
      'patterns',
      'info',
      'Frequent tool usage',
      `Tool-related messages account for ${(patterns.toolMessageRatio * 100).toFixed(1)}% of the session`,
    ));
  }

  return insights;
}

// Generate summary
function generateSummary(
  stats: SessionStats,
  insights: Insight[],
  toolStats: ToolStats[],
  errors: ErrorAnalysis
): AnalysisResult['summary'] {
  const keyPoints: string[] = [];
  const strengths: string[] = [];
  const improvements: string[] = [];

  keyPoints.push(`${stats.totalMessages} messages in total`);
  keyPoints.push(`${stats.toolCalls} tool calls`);
  keyPoints.push(`${stats.totalTokens.toLocaleString()} tokens used`);

  // Compute strengths
  const criticalErrors = insights.filter(i => i.severity === 'critical');
  const warnings = insights.filter(i => i.severity === 'warning');

  if (errors.errorRate < 0.05) {
    strengths.push('Tool-call success rate is very high');
  }
  if (stats.modelsUsed.length > 0) {
    strengths.push(`Models used: ${stats.modelsUsed.join(', ')}`);
  }
  if (stats.toolCalls > 0 && toolStats.some(t => t.successRate > 0.9)) {
    strengths.push('Some tools were used very consistently');
  }

  // Compute improvement areas
  if (criticalErrors.length > 0) {
    improvements.push(`${criticalErrors.length} critical issues need attention`);
  }
  if (warnings.length > 0) {
    improvements.push(`${warnings.length} warnings should be reviewed`);
  }
  if (errors.frequentErrorTools.length > 0) {
    improvements.push(`Focus on frequently failing tools: ${errors.frequentErrorTools.join(', ')}`);
  }

  // Compute overall grade
  let grade: AnalysisResult['summary']['overallGrade'];
  if (criticalErrors.length === 0 && warnings.length <= 2) {
    grade = 'A';
  } else if (criticalErrors.length === 0 && warnings.length <= 5) {
    grade = 'B';
  } else if (criticalErrors.length <= 1) {
    grade = 'C';
  } else if (criticalErrors.length <= 3) {
    grade = 'D';
  } else {
    grade = 'F';
  }

  return {
    keyPoints,
    strengths,
    improvements: improvements.length > 0 ? improvements : ['Session quality looks solid. Keep it up.'],
    overallGrade: grade,
  };
}

// Main analysis function
export function analyzeSession(data: ParsedLogData): AnalysisResult {
  const { stats } = data;

  if (stats.totalMessages === 0) {
    return { ...DEFAULT_ANALYSIS, stats };
  }

  const performance = analyzePerformance(data);
  const tokenAnalysis = analyzeTokens(data);
  const toolStats = analyzeTools(data.toolCalls);
  const patterns = analyzePatterns(data.entries, stats);
  const errors = analyzeErrors(data.toolCalls, toolStats);
  const insights = generateInsights(data, performance, tokenAnalysis, toolStats, patterns, errors);
  const summary = generateSummary(stats, insights, toolStats, errors);

  return {
    stats,
    insights,
    performance,
    tokenAnalysis,
    toolStats,
    patterns,
    errors,
    summary,
  };
}
