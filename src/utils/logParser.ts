
import type { LogEntry, ParsedLogData, SessionStats, ToolCall, UsageData } from '../types/log';

export function parseLog(content: string): ParsedLogData {
  const lines = content.split('\n').filter(line => line.trim());
  const entries: LogEntry[] = [];
  const toolCalls: ToolCall[] = [];
  const tokenUsage: ParsedLogData['tokenUsage'] = [];
  const turnDurations: ParsedLogData['turnDurations'] = [];
  const fileHistory: ParsedLogData['fileHistory'] = [];

  const pendingToolCalls = new Map<string, ToolCall>();

  lines.forEach(line => {
    try {
      const entry = JSON.parse(line) as LogEntry;
      entries.push(entry);

      // Process assistant messages for tool calls and token usage
      if (entry.type === 'assistant' && entry.message) {
        const msg = entry.message;

        // Token usage
        if (msg.usage) {
          const usage = msg.usage as UsageData;
          tokenUsage.push({
            timestamp: entry.timestamp,
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            totalTokens: usage.total_tokens || 0,
          });
        }

        // Tool use
        if (msg.content && Array.isArray(msg.content)) {
          msg.content.forEach((contentItem: any) => {
            if (contentItem.type === 'tool_use') {
              const toolCall: ToolCall = {
                id: contentItem.id,
                name: contentItem.name,
                input: contentItem.input,
                timestamp: entry.timestamp,
              };
              pendingToolCalls.set(toolCall.id, toolCall);
            }
          });
        }
      }

      // Process user messages for tool results
      if (entry.type === 'user' && entry.message) {
        const msg = entry.message;
        if (msg.content && Array.isArray(msg.content)) {
          msg.content.forEach((contentItem: any) => {
            if (contentItem.type === 'tool_result') {
              const toolCall = pendingToolCalls.get(contentItem.tool_use_id);
              if (toolCall) {
                toolCall.result = contentItem.content;
                toolCall.isError = contentItem.is_error;
                toolCalls.push(toolCall);
                pendingToolCalls.delete(contentItem.tool_use_id);
              }
            }
          });
        }
      }

      // Process system turn duration
      if (entry.type === 'system' && entry.subtype === 'turn_duration') {
        turnDurations.push({
          timestamp: entry.timestamp,
          durationMs: entry.durationMs || 0,
          messageCount: entry.messageCount || 0,
        });
      }

      // Process file history snapshots
      if (entry.type === 'file-history-snapshot' && entry.snapshot) {
        fileHistory.push({
          timestamp: entry.timestamp,
          messageId: entry.uuid || '',
          files: entry.snapshot.trackedFileBackups || {},
        });
      }
    } catch (e) {
      console.warn('Failed to parse line:', e);
    }
  });

  // Add any remaining pending tool calls
  toolCalls.push(...pendingToolCalls.values());

  const stats = calculateStats(entries, tokenUsage, toolCalls, turnDurations, fileHistory);

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
  fileHistory: ParsedLogData['fileHistory']
): SessionStats {
  const userMessages = entries.filter(e => e.type === 'user' && !e.isMeta).length;
  const assistantMessages = entries.filter(e => e.type === 'assistant').length;
  const totalTokens = tokenUsage.reduce((sum, t) => sum + t.totalTokens, 0);
  const inputTokens = tokenUsage.reduce((sum, t) => sum + t.inputTokens, 0);
  const outputTokens = tokenUsage.reduce((sum, t) => sum + t.outputTokens, 0);

  // Calculate session duration
  let sessionDuration = 0;
  if (entries.length >= 2) {
    const firstTime = new Date(entries[0].timestamp).getTime();
    const lastTime = new Date(entries[entries.length - 1].timestamp).getTime();
    sessionDuration = lastTime - firstTime;
  }

  // Get unique models
  const modelsUsed = new Set<string>();
  entries.forEach(entry => {
    if (entry.type === 'assistant' && entry.message?.model) {
      modelsUsed.add(entry.message.model);
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
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}
