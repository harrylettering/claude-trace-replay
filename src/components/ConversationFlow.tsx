import { useState, useMemo, useCallback } from 'react';
import { GitBranch, ChevronDown, ChevronRight, User, Bot, MessageSquare } from 'lucide-react';
import type { ParsedLogData, LogEntry } from '../types/log';
import {
  getNodeIcon,
  getNodeColor,
  getNodeBorder,
  getMessagePreview,
} from '../utils/conversationHelpers';

interface ConversationFlowProps {
  data: ParsedLogData;
}

interface FlatNode {
  entry: LogEntry;
  depth: number;
  isLastChild: boolean;
  parentDepths: boolean[];
}

type TreeNode = LogEntry & { children: TreeNode[] };

function flattenTree(nodes: TreeNode[], depth: number, parentDepths: boolean[], result: FlatNode[]) {
  nodes.forEach((node, i) => {
    const isLast = i === nodes.length - 1;
    result.push({
      entry: node,
      depth,
      isLastChild: isLast,
      parentDepths: [...parentDepths],
    });
    if (node.children.length > 0) {
      flattenTree(node.children, depth + 1, [...parentDepths, !isLast], result);
    }
  });
}

const MAX_DEPTH_INDENT = 8;

export function ConversationFlow({ data }: ConversationFlowProps) {
  const { entries } = data;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  // Cache the tree build with useMemo.
  const { flatNodes, messageMap } = useMemo(() => {
    const messageMap = new Map<string, TreeNode>();
    const childSet = new Set<string>();

    // Step 1: create a node for every entry that has a UUID.
    entries.forEach(entry => {
      if (entry.uuid) {
        messageMap.set(entry.uuid, { ...entry, children: [] });
      }
    });

    // Step 2: connect parent-child relationships.
    entries.forEach(entry => {
      if (entry.uuid && entry.parentUuid && messageMap.has(entry.parentUuid)) {
        messageMap.get(entry.parentUuid)!.children.push(messageMap.get(entry.uuid)!);
        childSet.add(entry.uuid);
      }
    });

    // Step 3: entries that are not children of any other node become roots.
    const rootMessages: TreeNode[] = [];
    entries.forEach(entry => {
      if (entry.uuid && !childSet.has(entry.uuid)) {
        rootMessages.push(messageMap.get(entry.uuid)!);
      }
    });

    // Step 4: if no roots exist (for example, no entries have UUIDs), fall back to a flat list.
    if (rootMessages.length === 0 && entries.length > 0) {
      entries.forEach(entry => {
        rootMessages.push({ ...entry, children: [] });
      });
    }

    // Flatten with depth info
    const flatNodes: FlatNode[] = [];
    flattenTree(rootMessages, 0, [], flatNodes);

    return { flatNodes, messageMap, rootMessages };
  }, [entries]);

  // Cache the visible node filtering.
  const visibleNodes = useMemo(() => {
    const result: FlatNode[] = [];
    let skipUntilDepth: number | null = null;
    flatNodes.forEach(node => {
      const key = node.entry.uuid || '';
      if (skipUntilDepth !== null) {
        if (node.depth > skipUntilDepth) return;
        skipUntilDepth = null;
      }
      result.push(node);
      if (collapsed.has(key) && messageMap.get(key)?.children.length) {
        skipUntilDepth = node.depth;
      }
    });
    return result;
  }, [flatNodes, collapsed, messageMap]);

  // Memoize event handlers.
  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleDetails = useCallback((key: string) => {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Conversation Flow</h2>
        <p className="text-slate-400">Visualize message hierarchy and parent-child relationships ({flatNodes.length} total)</p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="divide-y divide-slate-700/50">
          {visibleNodes.length > 0 ? visibleNodes.map((node) => {
            const key = node.entry.uuid || '';
            const hasChildren = (messageMap.get(key)?.children.length ?? 0) > 0;
            const isCollapsed = collapsed.has(key);
            const isDetailExpanded = expandedDetails.has(key);
            const indentDepth = Math.min(node.depth, MAX_DEPTH_INDENT);
            const preview = getMessagePreview(node.entry);

            return (
              <div key={key || node.entry.timestamp} className="group">
                <div className="flex items-stretch">
                  {/* Thread guide lines */}
                  {Array.from({ length: indentDepth }).map((_, i) => (
                    <div key={i} className="w-6 shrink-0 flex justify-center">
                      <div className={`w-px h-full ${node.parentDepths[i] ? 'bg-slate-600' : 'bg-transparent'}`} />
                    </div>
                  ))}
                  {node.depth > MAX_DEPTH_INDENT && (
                    <div className="w-6 shrink-0 flex items-center justify-center">
                      <span className="text-slate-500 text-xs">·</span>
                    </div>
                  )}

                  {/* Content row */}
                  <div className="flex-1 min-w-0 flex items-start gap-2 px-3 py-2.5">
                    {/* Branch connector */}
                    {node.depth > 0 && (
                      <div className="flex flex-col items-center shrink-0 mt-1" style={{ width: 16 }}>
                        <div className="w-3 h-3 border-b border-l border-slate-600 rounded-bl" />
                      </div>
                    )}

                    {/* Node icon */}
                    <div className={`w-6 h-6 rounded-full ${getNodeColor(node.entry.type)} flex items-center justify-center text-white shrink-0 mt-0.5`}>
                      {getNodeIcon(node.entry.type)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm capitalize">{node.entry.type}</span>
                        {node.entry.isSidechain && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">Sidechain</span>
                        )}
                        {node.depth > 0 && (
                          <span className="text-slate-600 text-xs flex items-center gap-0.5">
                            <GitBranch className="w-3 h-3" />Depth {node.depth}
                          </span>
                        )}
                        <span className="text-slate-500 text-xs">{new Date(node.entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-400 text-sm mt-0.5 truncate">
                        {preview.length >= 80 ? preview + '...' : preview}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleDetails(key)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300"
                        title="View details"
                      >
                        {isDetailExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {hasChildren && (
                        <button
                          onClick={() => toggleCollapse(key)}
                          className="px-1.5 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200"
                          title={isCollapsed ? 'Expand child messages' : 'Collapse child messages'}
                        >
                          {isCollapsed ? `+${messageMap.get(key)!.children.length}` : '−'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isDetailExpanded && (
                  <div className={`border-t border-slate-700/50 ${getNodeBorder(node.entry.type)}`}>
                    <div style={{ paddingLeft: `${(indentDepth + (node.depth > 0 ? 1 : 0)) * 24 + 12}px` }} className="pr-4 py-3">
                      <pre className="text-xs text-slate-400 overflow-auto max-h-64 bg-slate-900/60 p-3 rounded">
                        {JSON.stringify(node.entry, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="text-center py-12 text-slate-400">
              No structured conversation flow found
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="font-semibold mb-3 text-sm">Legend</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { color: 'bg-blue-500', icon: <User className="w-3 h-3 text-white" />, label: 'User' },
            { color: 'bg-purple-500', icon: <Bot className="w-3 h-3 text-white" />, label: 'Assistant' },
            { color: 'bg-amber-500', icon: <MessageSquare className="w-3 h-3 text-white" />, label: 'File' },
            { color: 'bg-gray-500', icon: <MessageSquare className="w-3 h-3 text-white" />, label: 'System' },
          ].map(({ color, icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center`}>{icon}</div>
              <span className="text-sm text-slate-300">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">Branch Depth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
