import { useState, useCallback, useMemo, useRef, useEffect, memo, useLayoutEffect } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Search, Eye, PanelTop } from 'lucide-react';
import type { ParsedLogData } from '../types/log';
import type { AgentAction } from '../types/agent';
import {
  getEntryIcon,
  getEntryColor,
  getMessagePreview,
} from '../utils/timelineHelpers';
import { filterEntries } from '../utils/searchFilter';
import type { SearchFilters } from '../types/search';
import { DEFAULT_FILTERS } from '../types/search';
import { AdvancedSearchFilter } from './AdvancedSearchFilter';
import { detectLoop } from '../utils/loopDetector';
import { PromptOptimizer } from './PromptOptimizer';
import { ActionCardRenderer } from './AgentActionCards';

const OVERSCAN_COUNT = 3;
const BASE_ITEM_HEIGHT = 150; // Base item height
type TimelineDensity = 'summary' | 'detail';

interface TimelineViewProps {
  data: ParsedLogData;
  onStartReplay?: (index: number) => void;
  cliResult?: string;
  isCliAnalyzing?: boolean;
  cliError?: string;
  onRunCliAnalysis?: (prompt?: string) => void;
}

interface EntryWithKey {
  entry: any;
  index: number;
  key: string;
}

interface DisplayTimelineItem {
  entries: any[];
  key: string;
  startIndex: number;
  stageStart?: TimelineStage;
}

type TimelineStage = 'user-request' | 'reasoning' | 'tool-work' | 'response' | 'other';

function getActionTone(actionType?: AgentAction['type']) {
  switch (actionType) {
    case 'TerminalCommand':
      return {
        chip: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        dot: 'bg-amber-400',
      };
    case 'CodeWrite':
    case 'CodeMove':
      return {
        chip: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
        dot: 'bg-blue-400',
      };
    case 'CodeDelete':
      return {
        chip: 'bg-red-500/10 text-red-300 border-red-500/20',
        dot: 'bg-red-400',
      };
    case 'CodeRead':
    case 'CodeSearch':
      return {
        chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        dot: 'bg-emerald-400',
      };
    case 'AgentThought':
      return {
        chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
        dot: 'bg-indigo-400',
      };
    case 'TaskResult':
      return {
        chip: 'bg-green-500/10 text-green-300 border-green-500/20',
        dot: 'bg-green-400',
      };
    default:
      return {
        chip: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
        dot: 'bg-slate-400',
      };
  }
}

function getActionSummary(entry: any): { title: string; detail: string; secondary?: string } {
  const action = entry.parsedAction as AgentAction | undefined;
  if (!action) {
    return {
      title: entry.type || 'Unknown Event',
      detail: getMessagePreview(entry),
    };
  }

  switch (action.type) {
    case 'CodeRead':
      return {
        title: 'Read Context',
        detail: action.filePath || 'Read file contents',
        secondary: action.content ? 'Content available' : undefined,
      };
    case 'CodeWrite':
      return {
        title: 'Edit File',
        detail: action.filePath || 'Update file',
        secondary: action.instruction,
      };
    case 'CodeDelete':
      return {
        title: 'Delete File',
        detail: action.filePath || 'Remove file',
        secondary: action.instruction,
      };
    case 'CodeMove':
      return {
        title: 'Move File',
        detail: `${action.sourcePath} -> ${action.targetPath}`,
      };
    case 'CodeSearch':
      return {
        title: 'Search Code',
        detail: action.query || 'Search project',
        secondary: action.path,
      };
    case 'TerminalCommand':
      return {
        title: action.exitCode > 0 ? 'Run Command Failed' : action.exitCode === -1 ? 'Run Command' : 'Run Command',
        detail: action.command || 'Execute terminal command',
        secondary: action.exitCode === -1 ? 'Still running' : `Exit code ${action.exitCode}`,
      };
    case 'AgentThought':
      return {
        title: 'Reasoning',
        detail: action.text,
      };
    case 'ScreenCapture':
      return {
        title: 'Capture Screen',
        detail: action.description || 'Take a screenshot',
      };
    case 'ComputerUse':
      return {
        title: 'GUI Interaction',
        detail: action.description || action.actionType,
        secondary: action.text,
      };
    case 'UserImage':
      return {
        title: 'User Image',
        detail: action.description || 'Image attachment',
      };
    case 'UserMessage':
      return {
        title: 'User Request',
        detail: action.content,
      };
    case 'AssistantText':
      return {
        title: 'Assistant Reply',
        detail: action.content,
      };
    case 'TaskCreate':
      return {
        title: 'Create Task',
        detail: action.subject,
        secondary: action.description,
      };
    case 'TaskUpdate':
      return {
        title: 'Update Task',
        detail: action.subject || action.taskId,
        secondary: action.status,
      };
    case 'TaskResult':
      return {
        title: action.isError ? 'Tool Error' : 'Tool Result',
        detail: action.content,
      };
    case 'GenericToolCall':
      return {
        title: 'Run Tool',
        detail: action.name,
        secondary: action.description,
      };
    default:
      return {
        title: 'Action',
        detail: getMessagePreview(entry),
      };
  }
}

function getGroupingKey(entry: any): string | null {
  const action = entry.parsedAction as AgentAction | undefined;
  const role = entry.message?.role || entry.type || 'event';
  if (!action) return null;

  switch (action.type) {
    case 'CodeRead':
      return `${role}:CodeRead`;
    case 'AgentThought':
      return `${role}:AgentThought`;
    case 'CodeSearch':
      return `${role}:CodeSearch`;
    case 'GenericToolCall':
      return `${role}:GenericToolCall:${action.name}`;
    default:
      return null;
  }
}

function getStageForEntry(entry: any): TimelineStage {
  const action = entry.parsedAction as AgentAction | undefined;
  if (!action) return 'other';

  switch (action.type) {
    case 'UserMessage':
    case 'UserImage':
      return 'user-request';
    case 'AgentThought':
    case 'CodeRead':
      return 'reasoning';
    case 'CodeSearch':
    case 'CodeWrite':
    case 'CodeDelete':
    case 'CodeMove':
    case 'TerminalCommand':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskResult':
    case 'GenericToolCall':
    case 'ComputerUse':
    case 'ScreenCapture':
      return 'tool-work';
    case 'AssistantText':
      return 'response';
    default:
      return 'other';
  }
}

function getStageMeta(stage: TimelineStage) {
  switch (stage) {
    case 'user-request':
      return {
        label: 'User Request',
        description: 'A new user intent enters the session.',
        chip: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
      };
    case 'reasoning':
      return {
        label: 'Reasoning',
        description: 'The model is reading context and forming a plan.',
        chip: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300',
      };
    case 'tool-work':
      return {
        label: 'Tool Work',
        description: 'Concrete execution work is happening.',
        chip: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
      };
    case 'response':
      return {
        label: 'Response',
        description: 'Results are being packaged back to the user.',
        chip: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
      };
    default:
      return {
        label: 'Other',
        description: 'Supporting events and uncategorized records.',
        chip: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
      };
  }
}

function buildDisplayItems(entries: EntryWithKey[], density: TimelineDensity): DisplayTimelineItem[] {
  if (density !== 'summary') {
    return entries.map(({ entry, index, key }) => ({
      entries: [entry],
      key,
      startIndex: index,
    }));
  }

  const items: DisplayTimelineItem[] = [];
  let previousStage: TimelineStage | null = null;

  for (const current of entries) {
    const currentStage = getStageForEntry(current.entry);
    const currentGroupingKey = getGroupingKey(current.entry);
    const previous = items[items.length - 1];
    const previousEntry = previous?.entries[previous.entries.length - 1];
    const stageChanged = currentStage !== previousStage;

    if (previous && currentGroupingKey && previousEntry && getGroupingKey(previousEntry) === currentGroupingKey) {
      previous.entries.push(current.entry);
      continue;
    }

    items.push({
      entries: [current.entry],
      key: current.key,
      startIndex: current.index,
      stageStart: stageChanged ? currentStage : undefined,
    });

    previousStage = currentStage;
  }

  return items;
}

// Single timeline entry component.
const TimelineEntry = memo(function TimelineEntry({
  item,
  index,
  isExpanded,
  onToggle,
  totalItems,
  density,
  onMeasure,
}: {
  item: DisplayTimelineItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  totalItems: number;
  density: TimelineDensity;
  onMeasure?: (height: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const entry = item.entries[0];
  const groupedCount = item.entries.length;
  const preview = useMemo(() => getMessagePreview(entry), [entry]);
  const previewWithEllipsis = preview.length >= 100 ? preview + '...' : preview;
  const action = (entry.parsedAction as AgentAction | undefined) ?? undefined;
  const summary = useMemo(() => getActionSummary(entry), [entry]);
  const tone = getActionTone(action?.type);
  const roleLabel = entry.message?.role || entry.type || 'event';
  const stageMeta = getStageMeta(item.stageStart || 'other');

  // Measure the rendered height and report it to the parent.
  useLayoutEffect(() => {
    if (cardRef.current && onMeasure) {
      onMeasure(cardRef.current.offsetHeight);
    }
  }, [isExpanded, onMeasure, item]);

  useEffect(() => {
    if (!cardRef.current || !onMeasure) return;

    const element = cardRef.current;
    const observer = new ResizeObserver(() => {
      onMeasure(element.offsetHeight);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [onMeasure, item]);

  return (
    <div ref={cardRef} className="relative pb-3">
      {density === 'summary' && item.stageStart && (
        <div className="mb-3 pl-12">
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${stageMeta.chip}`}>
                {stageMeta.label}
              </span>
              <p className="text-xs text-slate-500">{stageMeta.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex gap-4">
        {/* Timeline marker */}
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full ${getEntryColor(entry.type)} flex items-center justify-center text-white z-10 shadow-lg relative group`}>
            {getEntryIcon(entry.type)}
            <div className="absolute inset-0 rounded-full animate-pulse-dot opacity-30 bg-current" style={{animationDelay: `${Math.min(index, 20) * 0.1}s`}}></div>
          </div>
          {index < totalItems - 1 && (
            <div className="w-0.5 flex-1 bg-gradient-to-b from-slate-600 to-slate-800 mt-2" style={{ minHeight: '2rem' }} />
          )}
        </div>

        {/* Entry content */}
        <div className={`flex-1 min-w-0 ${entry.isForked ? 'opacity-40 grayscale-[0.5]' : ''}`}>
          <div className={`cyber-card overflow-hidden transition-all ${density === 'summary' ? 'p-4' : 'p-5'} ${entry.isForked ? 'border-dashed border-slate-700 bg-slate-800/10' : ''} ${entry.parsedAction?.type === 'TerminalCommand' && (entry.parsedAction as any).exitCode !== 0 && (entry.parsedAction as any).exitCode !== -1 ? 'cyber-card-error' : ''}`}>
            <div className={`flex items-start justify-between gap-2 ${density === 'summary' ? 'mb-2' : 'mb-3'}`}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{roleLabel}</span>
                {entry.isForked && (
                  <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-[9px] rounded-full shrink-0 border border-slate-600 uppercase font-black">
                    Ghost
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-500 font-mono text-[10px]">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                {groupedCount > 1 && (
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-300">
                    {groupedCount} merged
                  </span>
                )}
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-slate-300 text-sm">
              {density === 'summary' ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                        <h3 className="text-sm font-black text-slate-100 tracking-wide truncate">{summary.title}</h3>
                        {action && (
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest shrink-0 ${tone.chip}`}>
                            {action.type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-200/90 leading-relaxed break-words">
                        {summary.detail || previewWithEllipsis}
                      </p>
                      {groupedCount > 1 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.entries
                            .slice(0, 3)
                            .map((groupEntry, previewIndex) => {
                              const detail = getActionSummary(groupEntry).detail;
                              if (!detail) return null;
                              return (
                                <span
                                  key={groupEntry.uuid || `${item.key}-preview-${previewIndex}`}
                                  className="max-w-full rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-1 text-[11px] leading-tight text-cyan-200/85"
                                >
                                  {detail}
                                </span>
                              );
                            })}
                          {groupedCount > 3 && (
                            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] leading-tight text-slate-400">
                              +{groupedCount - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      {summary.secondary && (
                        <p className="mt-1 text-xs text-slate-500 break-words">
                          {summary.secondary}
                        </p>
                      )}
                    </div>
                    {action?.usage && (
                      <div className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-200">
                        {action.usage.total.toLocaleString()} tokens
                      </div>
                    )}
                  </div>
                </div>
              ) : entry.parsedAction ? (
                <ActionCardRenderer action={entry.parsedAction} />
              ) : (
                <p className="leading-relaxed opacity-80">{previewWithEllipsis}</p>
              )}
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-1">
                {density === 'summary' ? (
                  <div className="space-y-4">
                    {item.entries.map((groupEntry: any, groupIndex: number) => (
                      <div key={groupEntry.uuid || `${item.key}-${groupIndex}`} className="rounded-2xl border border-slate-800/70 bg-slate-950/30 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {groupEntry.message?.role || groupEntry.type || 'event'}
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-200">
                              {getActionSummary(groupEntry).title}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(groupEntry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {groupEntry.parsedAction && (
                          <div className="mb-4">
                            <ActionCardRenderer action={groupEntry.parsedAction} />
                          </div>
                        )}
                        <pre className="text-[10px] text-blue-400/70 overflow-x-auto max-h-72 bg-black/40 p-4 rounded-xl w-full font-mono leading-relaxed">
                          {JSON.stringify(groupEntry, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-[10px] text-blue-400/70 overflow-x-auto max-h-96 bg-black/40 p-4 rounded-xl w-full font-mono leading-relaxed">
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Virtual list with dynamic row heights.
function DynamicVirtualList({
  items,
  expandedEntries,
  onToggleExpand,
  containerHeight,
  density,
}: {
  items: DisplayTimelineItem[];
  expandedEntries: Set<string>;
  onToggleExpand: (key: string) => void;
  containerHeight: number;
  density: TimelineDensity;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  // Store row heights in a ref to avoid unnecessary rerenders.
  const heightsRef = useRef<number[]>([]);
  const [version, setVersion] = useState(0); // Used to trigger layout refreshes.
  const measureRafRef = useRef<number | null>(null);

  const scheduleLayoutRefresh = useCallback(() => {
    if (measureRafRef.current !== null) return;
    measureRafRef.current = requestAnimationFrame(() => {
      measureRafRef.current = null;
      setVersion(v => v + 1);
    });
  }, []);

  // Initialize the height cache.
  useEffect(() => {
    const estimatedHeight = density === 'summary' ? 120 : BASE_ITEM_HEIGHT;
    heightsRef.current = new Array(items.length).fill(estimatedHeight);
    setVersion(v => v + 1);
  }, [items.length, density]);

  // Re-measure rows after expand/collapse state changes.
  useEffect(() => {
    // Wait for the DOM to settle, then re-measure.
    const timeout = setTimeout(() => {
      setVersion(v => v + 1);
    }, 100);
    return () => clearTimeout(timeout);
  }, [expandedEntries]);

  useEffect(() => {
    return () => {
      if (measureRafRef.current !== null) {
        cancelAnimationFrame(measureRafRef.current);
      }
    };
  }, []);

  // Measure a single row height.
  const handleMeasure = useCallback((index: number, height: number) => {
    if (heightsRef.current[index] !== height) {
      heightsRef.current[index] = height;
      scheduleLayoutRefresh();
    }
  }, [scheduleLayoutRefresh]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Compute cumulative heights (the top offset for each row).
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
      positions.push(cumulative);
      cumulative += heightsRef.current[i] || BASE_ITEM_HEIGHT;
    }
    return positions;
  }, [items.length, version]);

  const totalHeight = itemPositions.length > 0
    ? itemPositions[itemPositions.length - 1] + (heightsRef.current[itemPositions.length - 1] || BASE_ITEM_HEIGHT)
    : 0;

  // Compute the visible range.
  const findVisibleRange = useCallback(() => {
    const heights = heightsRef.current;
    let startIndex = 0;
    let endIndex = items.length - 1;

    // Find the first row that intersects the viewport.
    for (let i = 0; i < items.length; i++) {
      const itemTop = itemPositions[i];
      const itemBottom = itemTop + (heights[i] || BASE_ITEM_HEIGHT);
      if (itemBottom >= scrollTop) {
        startIndex = Math.max(0, i - OVERSCAN_COUNT);
        break;
      }
    }

    // Find the last row that still intersects the viewport.
    for (let i = items.length - 1; i >= 0; i--) {
      const itemTop = itemPositions[i];
      if (itemTop <= scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + OVERSCAN_COUNT);
        break;
      }
    }

    return { startIndex, endIndex };
  }, [items.length, itemPositions, scrollTop, containerHeight]);

  const { startIndex, endIndex } = findVisibleRange();

  // Render the visible rows.
  const visibleRows: JSX.Element[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i];
    const isExpanded = expandedEntries.has(item.key);
    const top = itemPositions[i];

    visibleRows.push(
      <div
        key={item.key}
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: 0,
          right: 0,
        }}
      >
        <TimelineEntry
          item={item}
          index={i}
          isExpanded={isExpanded}
          onToggle={() => onToggleExpand(item.key)}
          totalItems={items.length}
          density={density}
          onMeasure={(height) => handleMeasure(i, height)}
        />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      className="custom-scrollbar"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleRows}
      </div>
    </div>
  );
}

function FlowTimelineList({
  items,
  expandedEntries,
  onToggleExpand,
  containerHeight,
  density,
}: {
  items: DisplayTimelineItem[];
  expandedEntries: Set<string>;
  onToggleExpand: (key: string) => void;
  containerHeight: number;
  density: TimelineDensity;
}) {
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      className="custom-scrollbar pr-1"
    >
      {items.map((item, index) => (
        <TimelineEntry
          key={item.key}
          item={item}
          index={index}
          isExpanded={expandedEntries.has(item.key)}
          onToggle={() => onToggleExpand(item.key)}
          totalItems={items.length}
          density={density}
        />
      ))}
    </div>
  );
}

export function TimelineView({ data, cliResult, isCliAnalyzing, cliError, onRunCliAnalysis }: TimelineViewProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [density, setDensity] = useState<TimelineDensity>('summary');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Watch for container height changes.
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleExpand = useCallback((uuid: string) => {
    setExpandedEntries(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(uuid)) {
        newExpanded.delete(uuid);
      } else {
        newExpanded.add(uuid);
      }
      return newExpanded;
    });
  }, []);

  // Filter the entries.
  const searchResult = useMemo(() => {
    try {
      return filterEntries(data?.entries || [], filters);
    } catch (e) {
      console.error('Failed to filter entries:', e);
      return { entries: [], filteredCount: 0, totalCount: 0 };
    }
  }, [data?.entries, filters]);
  const filteredEntries = searchResult.entries;

  // Precompute stable entry keys.
  const entriesWithKeys = useMemo(() => {
    try {
      return filteredEntries.map((entry, index) => ({
        entry,
        index,
        key: entry.uuid || `fallback-${index}`,
      }));
    } catch (e) {
      console.error('Failed to process entries:', e);
      return [];
    }
  }, [filteredEntries]);

  const displayItems = useMemo(() => buildDisplayItems(entriesWithKeys, density), [entriesWithKeys, density]);

  // Detect whether the agent appears to be stuck in a loop.
  const loopWarning = useMemo(() => {
    try {
      return detectLoop(data?.entries || []);
    } catch (e) {
      console.error('Failed to detect loop:', e);
      return null;
    }
  }, [data?.entries]);

  if (!data || !data.entries) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-400">No log data available</p>
      </div>
    );
  }

  const listHeight = containerHeight - 200;

  return (
    <div className="flex gap-10 items-start h-[calc(100vh-180px)] overflow-hidden">
      {/* Left: Scrollable Timeline */}
      <div className="flex-1 overflow-hidden pr-6 h-full flex flex-col" ref={containerRef}>
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Session Timeline</h2>
              <p className="text-slate-400 text-sm">
                Track each action and reasoning step from the AI coding session
                {entriesWithKeys.length > 1000 && (
                  <span className="ml-2 text-amber-500/70 text-xs">
                    (virtualized list over {entriesWithKeys.length.toLocaleString()} entries)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-1">
              <button
                onClick={() => setDensity('summary')}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  density === 'summary'
                    ? 'bg-cyan-500/10 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Summary
              </button>
              <button
                onClick={() => setDensity('detail')}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  density === 'detail'
                    ? 'bg-indigo-500/10 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <PanelTop className="w-3.5 h-3.5" />
                Detail
              </button>
            </div>
          </div>
        </div>

        <AdvancedSearchFilter
          entries={data.entries}
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={searchResult.filteredCount}
          totalCount={searchResult.totalCount}
        />

        {entriesWithKeys.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-800">
            <div className="text-center">
              <Search className="w-8 h-8 text-slate-800 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-bold">No matching log entries</p>
            </div>
          </div>
        ) : (
          density === 'summary' ? (
            <FlowTimelineList
              items={displayItems}
              expandedEntries={expandedEntries}
              onToggleExpand={toggleExpand}
              containerHeight={Math.max(listHeight, 200)}
              density={density}
            />
          ) : (
            <DynamicVirtualList
              items={displayItems}
              expandedEntries={expandedEntries}
              onToggleExpand={toggleExpand}
              containerHeight={Math.max(listHeight, 200)}
              density={density}
            />
          )
        )}

        {loopWarning && (
          <div className="relative flex gap-4 mt-4">
            <div className="flex flex-col items-center">
               <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white z-10 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)]">
                  <AlertTriangle className="w-4 h-4" />
               </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl border border-red-500/50 bg-red-950/20 p-6 overflow-hidden relative shadow-2xl">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-rose-400 to-red-600 bg-[length:200%_100%] animate-[gradient_2s_linear_infinite]" />
                 <div className="flex items-start gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
                    <div>
                       <h3 className="text-lg font-black text-red-400 mb-1 uppercase tracking-tight">Agent Loop Detected</h3>
                       <p className="text-red-200/70 text-sm leading-relaxed mb-4">{loopWarning.message}</p>
                       <div className="p-4 bg-black/40 rounded-xl border border-red-500/20 font-mono text-[11px] text-red-300 shadow-inner">
                          <strong className="text-red-500/80 block mb-1 uppercase tracking-widest text-[9px]">Failing Command:</strong>
                          <span className="select-all opacity-90">{loopWarning.repeatedCommand}</span>
                          <span className="ml-4 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-black">FAIL COUNT: {loopWarning.failureCount}</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Insight Panel */}
      <aside className="w-[400px] h-full sticky top-0 animate-in slide-in-from-right-4 duration-500">
        <PromptOptimizer
          data={data}
          cliResult={cliResult}
          isCliAnalyzing={isCliAnalyzing}
          cliError={cliError}
          onRunCliAnalysis={onRunCliAnalysis}
        />
      </aside>
    </div>
  );
}
