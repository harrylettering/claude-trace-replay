import type { LogEntry } from '../types/log';
import type { SearchFilters, SearchResult, SearchMode, MessageTypeFilter } from '../types/search';

// Check whether a string matches the query.
function matchesQuery(
  text: string,
  query: string,
  searchMode: SearchMode,
  caseSensitive: boolean
): boolean {
  if (!query) return true;

  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  switch (searchMode) {
    case 'exact':
      return searchText === searchQuery;
    case 'regex':
      try {
        const regex = new RegExp(query, caseSensitive ? '' : 'i');
        return regex.test(text);
      } catch {
        // Fall back to a plain substring match when the regex is invalid.
        return searchText.includes(searchQuery);
      }
    case 'simple':
    default:
      return searchText.includes(searchQuery);
  }
}

// Get the searchable text for an entry by serializing the raw payload.
function getEntrySearchText(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// Check whether the entry type matches the filter.
function matchesMessageType(entry: LogEntry, types: MessageTypeFilter[]): boolean {
  if (types.includes('all')) return true;

  if (types.includes('tool')) {
    // Treat entries with tool usage or tool results as tool messages.
    const content = entry.message?.content;
    const hasTool = Array.isArray(content) && content.some((c: any) =>
      c.type === 'tool_use' || c.type === 'tool_result'
    );
    if (hasTool) return true;
  }

  return types.includes(entry.type as MessageTypeFilter);
}

// Check whether the tool name matches.
function matchesToolName(entry: LogEntry, toolNames: string[]): boolean {
  if (toolNames.length === 0) return true;

  const content = entry.message?.content;
  if (!Array.isArray(content)) return false;

  return content.some((c: any) => {
    if (c.type === 'tool_use' || c.tool_use) {
      const toolUse = c.tool_use || c;
      const name = toolUse.name || toolUse.tool_name;
      return name && toolNames.includes(name);
    }
    return false;
  });
}

// Check whether the entry falls inside the selected time range.
function matchesTimeRange(entry: LogEntry, timeRange: { startTime?: string; endTime?: string }): boolean {
  const entryTime = new Date(entry.timestamp).getTime();

  if (timeRange.startTime) {
    const startTime = new Date(timeRange.startTime).getTime();
    if (entryTime < startTime) return false;
  }

  if (timeRange.endTime) {
    const endTime = new Date(timeRange.endTime).getTime();
    if (entryTime > endTime) return false;
  }

  return true;
}

// Check whether token counts match the requested range.
function matchesTokenRange(entry: LogEntry, tokenRange: {
  minInput?: number;
  maxInput?: number;
  minOutput?: number;
  maxOutput?: number;
  minTotal?: number;
  maxTotal?: number;
}): boolean {
  // If no token filter is active, or the entry has no token data, allow it through.
  const hasTokenFilter =
    tokenRange.minInput !== undefined ||
    tokenRange.maxInput !== undefined ||
    tokenRange.minOutput !== undefined ||
    tokenRange.maxOutput !== undefined ||
    tokenRange.minTotal !== undefined ||
    tokenRange.maxTotal !== undefined;

  if (!hasTokenFilter) return true;

  // Extract token data from the entry.
  const usage = entry.message?.usage || (entry as any).usage;
  if (!usage) return false;

  const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens :
    typeof usage.inputTokens === 'number' ? usage.inputTokens : 0;
  const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens :
    typeof usage.outputTokens === 'number' ? usage.outputTokens : 0;
  const totalTokens = typeof usage.total_tokens === 'number' ? usage.total_tokens :
    typeof usage.totalTokens === 'number' ? usage.totalTokens : (inputTokens + outputTokens);

  if (tokenRange.minInput !== undefined && inputTokens < tokenRange.minInput) return false;
  if (tokenRange.maxInput !== undefined && inputTokens > tokenRange.maxInput) return false;
  if (tokenRange.minOutput !== undefined && outputTokens < tokenRange.minOutput) return false;
  if (tokenRange.maxOutput !== undefined && outputTokens > tokenRange.maxOutput) return false;
  if (tokenRange.minTotal !== undefined && totalTokens < tokenRange.minTotal) return false;
  if (tokenRange.maxTotal !== undefined && totalTokens > tokenRange.maxTotal) return false;

  return true;
}

function hasParsedActionError(entry: LogEntry): boolean {
  const action = entry.parsedAction;
  if (!action) return false;

  if (action.type === 'TaskResult') {
    return Boolean(action.isError);
  }

  return false;
}

// Check whether the entry includes an error.
function hasErrors(entry: LogEntry): boolean {
  if (entry._category === 'TOOL_ERROR' || hasParsedActionError(entry)) return true;

  const content = entry.message?.content;
  if (!Array.isArray(content)) return false;

  return content.some((c: any) => {
    if (c.type === 'tool_result' || c.tool_result) {
      const result = c.tool_result || c;
      return result.is_error || result.error;
    }
    return false;
  });
}

// Check whether the entry includes tool-related blocks.
function hasTools(entry: LogEntry): boolean {
  const content = entry.message?.content;
  if (!Array.isArray(content)) return false;

  return content.some((c: any) =>
    c.type === 'tool_use' || c.tool_use || c.type === 'tool_result' || c.tool_result
  );
}

// Main filtering function.
export function filterEntries(
  entries: LogEntry[],
  filters: SearchFilters
): SearchResult {
  const filtered: LogEntry[] = [];
  let matchCount = 0;

  for (const entry of entries) {
    // Message-type filter.
    if (!matchesMessageType(entry, filters.messageTypes)) continue;

    // Tool-name filter.
    if (!matchesToolName(entry, filters.toolNames)) continue;

    // Time-range filter.
    if (!matchesTimeRange(entry, filters.timeRange)) continue;

    // Token-range filter.
    if (!matchesTokenRange(entry, filters.tokenRange)) continue;

    // Error-only filter.
    if (filters.onlyWithErrors && !hasErrors(entry)) continue;

    // Tool-only filter.
    if (filters.onlyWithTools && !hasTools(entry)) continue;

    // Sidechain-only filter.
    if (filters.onlySidechain && !entry.isSidechain) continue;

    // Query matching.
    const searchText = getEntrySearchText(entry);
    const matches = matchesQuery(
      searchText,
      filters.query,
      filters.searchMode,
      filters.caseSensitive
    );

    if (!matches) continue;

    if (filters.query) matchCount++;
    filtered.push(entry);
  }

  return {
    entries: filtered,
    totalCount: entries.length,
    filteredCount: filtered.length,
    matchCount: filters.query ? matchCount : filtered.length,
  };
}

// Collect all distinct tool names.
export function getToolNames(entries: LogEntry[]): string[] {
  const toolNames = new Set<string>();

  for (const entry of entries) {
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;

    for (const c of content) {
      const item = c as any;
      if (item.type === 'tool_use' || item.tool_use) {
        const toolUse = item.tool_use || item;
        const name = toolUse.name || toolUse.tool_name;
        if (name) {
          toolNames.add(name);
        }
      }
    }
  }

  return Array.from(toolNames).sort();
}

// Validate a regex pattern.
export function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

// Highlight matching text.
export function highlightText(
  text: string,
  query: string,
  searchMode: SearchMode,
  caseSensitive: boolean
): { parts: Array<{ text: string; highlight: boolean }> } {
  if (!query) return { parts: [{ text, highlight: false }] };

  const parts: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  try {
    const flags = caseSensitive ? 'g' : 'gi';
    let regex: RegExp;

    switch (searchMode) {
      case 'regex':
        regex = new RegExp(query, flags);
        break;
      case 'exact':
        regex = new RegExp(`^${escapeRegex(query)}$`, flags);
        break;
      case 'simple':
      default:
        regex = new RegExp(escapeRegex(query), flags);
    }

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
      }
      parts.push({ text: match[0], highlight: true });
      lastIndex = match.index + match[0].length;

      // Prevent infinite loops from zero-length regex matches.
      if (match[0].length === 0) break;
    }
  } catch {
    // If regex construction fails, skip highlighting.
    return { parts: [{ text, highlight: false }] };
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  if (parts.length === 0) {
    parts.push({ text, highlight: false });
  }

  return { parts };
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
