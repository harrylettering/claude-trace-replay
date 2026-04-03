
import { useState } from 'react';
import { User, Bot, Settings, FileText, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import type { ParsedLogData, LogEntry } from '../types/log';

interface TimelineViewProps {
  data: ParsedLogData;
}

function getEntryIcon(type: string) {
  switch (type) {
    case 'user':
      return <User className="w-4 h-4" />;
    case 'assistant':
      return <Bot className="w-4 h-4" />;
    case 'system':
      return <Settings className="w-4 h-4" />;
    case 'file-history-snapshot':
      return <FileText className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getEntryColor(type: string) {
  switch (type) {
    case 'user':
      return 'bg-blue-500';
    case 'assistant':
      return 'bg-purple-500';
    case 'system':
      return 'bg-gray-500';
    case 'file-history-snapshot':
      return 'bg-amber-500';
    default:
      return 'bg-slate-500';
  }
}

function getEntryBg(type: string) {
  switch (type) {
    case 'user':
      return 'bg-blue-500/10 border-blue-500/30';
    case 'assistant':
      return 'bg-purple-500/10 border-purple-500/30';
    case 'system':
      return 'bg-gray-500/10 border-gray-500/30';
    case 'file-history-snapshot':
      return 'bg-amber-500/10 border-amber-500/30';
    default:
      return 'bg-slate-500/10 border-slate-500/30';
  }
}

function getMessagePreview(entry: LogEntry) {
  if (entry.type === 'user' || entry.type === 'assistant') {
    const msg = entry.message;
    if (msg?.content) {
      if (typeof msg.content === 'string') {
        return msg.content.substring(0, 100);
      }
      if (Array.isArray(msg.content)) {
        const first = msg.content[0];
        if (first?.type === 'text') {
          return first.text?.substring(0, 100) || '';
        }
        if (first?.type === 'tool_use') {
          return `工具调用: ${first.name}`;
        }
        if (first?.type === 'tool_result') {
          return '工具结果';
        }
        if (first?.type === 'thinking') {
          return '思考中...';
        }
      }
    }
  }
  if (entry.type === 'file-history-snapshot') {
    return '文件历史快照';
  }
  if (entry.type === 'system' && entry.subtype === 'turn_duration') {
    return `轮次时长: ${entry.durationMs}ms`;
  }
  return entry.type;
}

export function TimelineView({ data }: TimelineViewProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpand = (uuid: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(uuid)) {
      newExpanded.delete(uuid);
    } else {
      newExpanded.add(uuid);
    }
    setExpandedEntries(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">会话时间线</h2>
        <p className="text-slate-400">查看完整的消息流和时间序列</p>
      </div>

      <div className="relative">
        {/* 时间线 */}
        <div className="space-y-4">
          {data.entries.map((entry, index) => (
            <div key={entry.uuid || index} className="relative flex gap-4">
              {/* 时间点 */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full ${getEntryColor(entry.type)} flex items-center justify-center text-white z-10`}>
                  {getEntryIcon(entry.type)}
                </div>
                {index < data.entries.length - 1 && (
                  <div className="w-0.5 flex-1 bg-slate-700 mt-2" />
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0 pb-4">
                <div className={`rounded-lg border p-4 overflow-hidden ${getEntryBg(entry.type)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-semibold capitalize shrink-0">{entry.type}</span>
                      {entry.isSidechain && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full shrink-0">
                          Sidechain
                        </span>
                      )}
                      {entry.isMeta && (
                        <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full shrink-0">
                          Meta
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400 text-sm">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => toggleExpand(entry.uuid || index.toString())}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        {expandedEntries.has(entry.uuid || index.toString()) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-slate-300 text-sm">
                    {(() => { const p = getMessagePreview(entry); return p.length >= 100 ? p + '...' : p; })()}
                  </div>

                  {/* 展开的详情 */}
                  {expandedEntries.has(entry.uuid || index.toString()) && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <pre className="text-xs text-slate-400 overflow-x-auto max-h-96 bg-slate-900/50 p-3 rounded w-full">
                        {JSON.stringify(entry, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
