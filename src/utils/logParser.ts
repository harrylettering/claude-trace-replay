import type { LogEntry, ParsedLogData, SessionStats, ToolCall, UsageData } from '../types/log';

// Sanitize token values - cap at reasonable max to prevent anomalies
function sanitizeTokenValue(val: any): number {
  const num = typeof val === 'number' ? val : parseInt(val, 10);
  if (isNaN(num) || num < 0) return 0;
  // Cap at 10M tokens per entry - anything larger is likely a parsing error
  if (num > 10_000_000) return 0;
  return num;
}

// Helper to extract token usage from any nested location in the entry
function extractTokenUsage(entry: any): { inputTokens: number; outputTokens: number; totalTokens: number } | null {
  // Only extract from assistant messages - this is where token usage should be
  if (entry.type !== 'assistant') {
    return null;
  }

  // Try common locations for token usage
  const locations = [
    entry.message?.usage,
    entry.usage,
  ];

  for (const usage of locations) {
    if (usage) {
      const inputTokens = sanitizeTokenValue(
        usage.input_tokens ?? usage.inputTokens ?? usage.input ?? 0
      );
      const outputTokens = sanitizeTokenValue(
        usage.output_tokens ?? usage.outputTokens ?? usage.output ?? 0
      );
      const totalTokens = sanitizeTokenValue(
        usage.total_tokens ?? usage.totalTokens ?? usage.total ?? (inputTokens + outputTokens)
      );

      if (inputTokens > 0 || outputTokens > 0) {
        return {
          inputTokens,
          outputTokens,
          totalTokens: totalTokens > 0 ? totalTokens : inputTokens + outputTokens,
        };
      }
    }
  }

  return null;
}

// Helper to get a valid timestamp from an entry
function getTimestamp(entry: any): number {
  const ts = entry.timestamp || entry.time || entry.created_at || entry.created;
  if (!ts) return NaN;

  if (typeof ts === 'number') return ts;
  return new Date(ts).getTime();
}

export function parseLog(content: string): ParsedLogData {
  const lines = content.split('\n').filter(line => line.trim());
  const entries: LogEntry[] = [];
  const toolCalls: ToolCall[] = [];
  const tokenUsage: ParsedLogData['tokenUsage'] = [];
  const turnDurations: ParsedLogData['turnDurations'] = [];
  const fileHistory: ParsedLogData['fileHistory'] = [];

  const pendingToolCalls = new Map<string, ToolCall>();
  let validTimestamps: number[] = [];

  lines.forEach(line => {
    try {
      const entry = JSON.parse(line) as LogEntry;
      entries.push(entry);

      // Collect valid timestamps
      const ts = getTimestamp(entry);
      if (!isNaN(ts)) {
        validTimestamps.push(ts);
      }

      // Try to extract token usage from this entry
      const usage = extractTokenUsage(entry);
      if (usage) {
        tokenUsage.push({
          timestamp: entry.timestamp || new Date().toISOString(),
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        });
      }

      // Process assistant messages for tool calls
      if (entry.type === 'assistant' && entry.message) {
        const msg = entry.message;

        // Tool use
        const contentArray = msg.content || msg;
        if (Array.isArray(contentArray)) {
          contentArray.forEach((contentItem: any) => {
            if (contentItem && (contentItem.type === 'tool_use' || contentItem.tool_use)) {
              const toolUse = contentItem.tool_use || contentItem;
              const toolCall: ToolCall = {
                id: toolUse.id || toolUse.tool_use_id || Math.random().toString(),
                name: toolUse.name || toolUse.tool_name || 'unknown',
                input: toolUse.input || toolUse.tool_input || {},
                timestamp: entry.timestamp || new Date().toISOString(),
              };
              pendingToolCalls.set(toolCall.id, toolCall);
            }
          });
        }
      }

      // Process user messages for tool results
      if (entry.type === 'user' && entry.message) {
        const msg = entry.message;
        const contentArray = msg.content || msg;
        if (Array.isArray(contentArray)) {
          contentArray.forEach((contentItem: any) => {
            if (contentItem && (contentItem.type === 'tool_result' || contentItem.tool_result)) {
              const result = contentItem.tool_result || contentItem;
              const toolCall = pendingToolCalls.get(result.tool_use_id || result.id);
              if (toolCall) {
                toolCall.result = result.content || result.output || result;
                toolCall.isError = result.is_error || result.error || false;
                toolCalls.push(toolCall);
                pendingToolCalls.delete(result.tool_use_id || result.id);
              }
            }
          });
        }
      }

      // Process system turn duration
      if (entry.type === 'system' && (entry.subtype === 'turn_duration' || entry.durationMs)) {
        turnDurations.push({
          timestamp: entry.timestamp || new Date().toISOString(),
          durationMs: entry.durationMs || entry.duration || 0,
          messageCount: entry.messageCount || 0,
        });
      }

      // Process file history snapshots
      if (entry.type === 'file-history-snapshot' || entry.snapshot) {
        fileHistory.push({
          timestamp: entry.timestamp || new Date().toISOString(),
          messageId: entry.uuid || entry.messageId || '',
          files: entry.snapshot?.trackedFileBackups || entry.snapshot || {},
        });
      }
    } catch (e) {
      console.warn('Failed to parse line:', e);
    }
  });

  // Add any remaining pending tool calls
  toolCalls.push(...pendingToolCalls.values());

  const stats = calculateStats(entries, tokenUsage, toolCalls, turnDurations, fileHistory, validTimestamps);

  return {
    entries,
    stats,
    toolCalls,
    tokenUsage,
    turnDurations,
    fileHistory,
  };
}

function calculateStats(
  entries: LogEntry[],
  tokenUsage: ParsedLogData['tokenUsage'],
  toolCalls: ToolCall[],
  turnDurations: ParsedLogData['turnDurations'],
  fileHistory: ParsedLogData['fileHistory'],
  validTimestamps: number[]
): SessionStats {
  const userMessages = entries.filter(e => e.type === 'user' && !e.isMeta).length;
  const assistantMessages = entries.filter(e => e.type === 'assistant').length;

  // Calculate token totals - make sure to handle cases where totalTokens isn't provided
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  tokenUsage.forEach(t => {
    const inTok = t.inputTokens || 0;
    const outTok = t.outputTokens || 0;
    const totTok = t.totalTokens || (inTok + outTok);

    inputTokens += inTok;
    outputTokens += outTok;
    totalTokens += totTok;
  });

  // Calculate session duration from valid timestamps
  let sessionDuration = 0;
  if (validTimestamps.length >= 2) {
    const firstTime = Math.min(...validTimestamps);
    const lastTime = Math.max(...validTimestamps);
    sessionDuration = lastTime - firstTime;
  }

  // Get unique models
  const modelsUsed = new Set<string>();
  entries.forEach(entry => {
    const model = entry.message?.model || entry.model;
    if (model) {
      modelsUsed.add(model);
    }
  });

  return {
    totalMessages: entries.length,
    userMessages,
    assistantMessages,
    toolCalls: toolCalls.length,
    totalTokens,
    inputTokens,
    outputTokens,
    sessionDuration,
    filesModified: fileHistory.length,
    modelsUsed: Array.from(modelsUsed),
  };
}

export function formatDuration(ms: number): string {
  if (isNaN(ms) || ms <= 0) return '0m 0s';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatTokens(tokens: number): string {
  if (isNaN(tokens) || tokens < 0) return '0';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}
