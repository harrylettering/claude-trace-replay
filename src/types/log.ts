
export interface LogEntry {
  type: 'user' | 'assistant' | 'system' | 'permission-mode' | 'file-history-snapshot';
  uuid?: string;
  timestamp: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  message?: any;
  sessionId?: string;
  version?: string;
  gitBranch?: string;
  cwd?: string;
  userType?: string;
  entrypoint?: string;
  slug?: string;
  toolUseResult?: boolean;
  sourceToolAssistantUUID?: string;
  isMeta?: boolean;
  permissionMode?: string;
  snapshot?: any;
  isSnapshotUpdate?: boolean;
  subtype?: string;
  durationMs?: number;
  messageCount?: number;
}

export interface UsageData {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  timestamp: string;
  result?: any;
  isError?: boolean;
  durationMs?: number;
}

export interface SessionStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  sessionDuration: number;
  filesModified: number;
  modelsUsed: string[];
}

export interface ParsedLogData {
  entries: LogEntry[];
  stats: SessionStats;
  toolCalls: ToolCall[];
  tokenUsage: Array<{
    timestamp: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }>;
  turnDurations: Array<{
    timestamp: string;
    durationMs: number;
    messageCount: number;
  }>;
  fileHistory: Array<{
    timestamp: string;
    messageId: string;
    files: any;
  }>;
}
