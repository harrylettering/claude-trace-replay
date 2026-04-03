
import { useState } from 'react';
import { User, Bot, GitBranch, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import type { ParsedLogData, LogEntry } from '../types/log';

interface ConversationFlowProps {
  data: ParsedLogData;
}

interface FlatNode {
  entry: LogEntry;
  depth: number;
  isLastChild: boolean;
  parentDepths: boolean[]; // true = has more siblings at that depth
}

function getNodeIcon(type: string) {
  switch (type) {
    case 'user': return <User className="w-3.5 h-3.5" />;
    case 'assistant': return <Bot className="w-3.5 h-3.5" />;
    default: return <MessageSquare className="w-3.5 h-3.5" />;
  }
}

function getNodeColor(type: string) {
  switch (type) {
    case 'user': return 'bg-blue-500';
    case 'assistant': return 'bg-purple-500';
    case 'system': return 'bg-gray-500';
    case 'file-history-snapshot': return 'bg-amber-500';
    default: return 'bg-slate-500';
  }
}

function getNodeBorder(type: string) {
  switch (type) {
    case 'user': return 'border-blue-500/40 bg-blue-500/5';
    case 'assistant': return 'border-purple-500/40 bg-purple-500/5';
    case 'system': return 'border-gray-500/40 bg-gray-500/5';
    case 'file-history-snapshot': return 'border-amber-500/40 bg-amber-500/5';
    default: return 'border-slate-500/40 bg-slate-500/5';
  }
}

function getMessagePreview(entry: LogEntry): string {
  if (entry.type === 'user' || entry.type === 'assistant') {
    const msg = entry.message;
    if (msg?.content) {
      if (typeof msg.content === 'string') {
        if (msg.content.includes('<command-name>')) {
          const match = msg.content.match(/<command-name>(.*?)<\/command-name>/);
          if (match) return `命令: /${match[1]}`;
        }
        return msg.content.substring(0, 80);
      }
      if (Array.isArray(msg.content)) {
        const first = msg.content[0];
        if (first?.type === 'text') return first.text?.substring(0, 80) || '';
        if (first?.type === 'tool_use') return `工具: ${first.name}`;
        if (first?.type === 'tool_result') return '工具结果';
        if (first?.type === 'thinking') return '思考中...';
      }
    }
  }
  if (entry.type === 'file-history-snapshot') return '文件快照';
  if (entry.type === 'system' && entry.subtype === 'turn_duration') return `轮次: ${entry.messageCount} 条消息`;
  return entry.type;
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

export function ConversationFlow({ data }: ConversationFlowProps) {
  const { entries } = data;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  // Build tree
  const messageMap = new Map<string, TreeNode>();

  // 第一步：为所有有 uuid 的 entry 创建节点
  entries.forEach(entry => {
    if (entry.uuid) {
      messageMap.set(entry.uuid, { ...entry, children: [] });
    }
  });

  // 第二步：建立父子关系
  const childSet = new Set<string>();
  entries.forEach(entry => {
    if (entry.uuid && entry.parentUuid && messageMap.has(entry.parentUuid)) {
      messageMap.get(entry.parentUuid)!.children.push(messageMap.get(entry.uuid)!);
      childSet.add(entry.uuid);
    }
  });

  // 第三步：不是任何节点子节点的 entry 就是根节点
  const rootMessages: TreeNode[] = [];
  entries.forEach(entry => {
    if (entry.uuid && !childSet.has(entry.uuid)) {
      rootMessages.push(messageMap.get(entry.uuid)!);
    }
  });

  // 第四步：如果仍然没有根节点（例如所有 entry 都没有 uuid），将所有 entry 作为扁平列表
  if (rootMessages.length === 0 && entries.length > 0) {
    entries.forEach(entry => {
      rootMessages.push({ ...entry, children: [] });
    });
  }

  // Flatten with depth info
  const flatNodes: FlatNode[] = [];
  flattenTree(rootMessages, 0, [], flatNodes);

  // Filter out collapsed subtrees
  const visibleNodes: FlatNode[] = [];
  let skipUntilDepth: number | null = null;
  flatNodes.forEach(node => {
    const key = node.entry.uuid || '';
    if (skipUntilDepth !== null) {
      if (node.depth > skipUntilDepth) return;
      skipUntilDepth = null;
    }
    visibleNodes.push(node);
    if (collapsed.has(key) && messageMap.get(key)?.children.length) {
      skipUntilDepth = node.depth;
    }
  });

  const toggleCollapse = (key: string) => {
    const next = new Set(collapsed);
    next.has(key) ? next.delete(key) : next.add(key);
    setCollapsed(next);
  };

  const toggleDetails = (key: string) => {
    const next = new Set(expandedDetails);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedDetails(next);
  };

  const MAX_DEPTH_INDENT = 8; // cap visual indent at 8 levels

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">对话流程图</h2>
        <p className="text-slate-400">可视化消息层级和父子关系（共 {flatNodes.length} 条）</p>
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
                            <GitBranch className="w-3 h-3" />深度 {node.depth}
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
                        title="查看详情"
                      >
                        {isDetailExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {hasChildren && (
                        <button
                          onClick={() => toggleCollapse(key)}
                          className="px-1.5 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200"
                          title={isCollapsed ? '展开子消息' : '折叠子消息'}
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
              没有找到结构化的对话流
            </div>
          )}
        </div>
      </div>

      {/* 图例 */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="font-semibold mb-3 text-sm">图例</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { color: 'bg-blue-500', icon: <User className="w-3 h-3 text-white" />, label: '用户' },
            { color: 'bg-purple-500', icon: <Bot className="w-3 h-3 text-white" />, label: '助手' },
            { color: 'bg-amber-500', icon: <MessageSquare className="w-3 h-3 text-white" />, label: '文件' },
            { color: 'bg-gray-500', icon: <MessageSquare className="w-3 h-3 text-white" />, label: '系统' },
          ].map(({ color, icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center`}>{icon}</div>
              <span className="text-sm text-slate-300">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">分支深度</span>
          </div>
        </div>
      </div>
    </div>
  );
}
