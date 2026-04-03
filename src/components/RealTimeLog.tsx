
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Search, Filter, Download, FileText } from 'lucide-react';
import type { ParsedLogData, LogEntry } from '../types/log';
import { parseLog } from '../utils/logParser';

interface RealTimeLogProps {
  data: ParsedLogData;
  onDataUpdate: (data: ParsedLogData) => void;
}

type FilterType = 'all' | 'user' | 'assistant' | 'system' | 'tool';

export function RealTimeLog({ data, onDataUpdate }: RealTimeLogProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 过滤日志条目
  const filteredEntries = data.entries.filter(entry => {
    // 类型过滤
    if (filterType !== 'all') {
      if (filterType === 'tool') {
        // 工具消息需要检查内容
        const hasTool = entry.message?.content?.some?.((c: any) =>
          c.type === 'tool_use' || c.type === 'tool_result'
        );
        if (!hasTool) return false;
      } else if (entry.type !== filterType) {
        return false;
      }
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const contentStr = JSON.stringify(entry).toLowerCase();
      if (!contentStr.includes(query)) return false;
    }

    return true;
  });

  // 自动滚动
  useEffect(() => {
    if (autoScroll && !isPaused) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredEntries.length, autoScroll, isPaused]);

  // 文件拖放处理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const newData = parseLog(content);
        onDataUpdate(newData);
      };
      reader.readAsText(file);
    }
  };

  const getEntryBadgeColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'assistant': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'system': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'file-history-snapshot': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const formatContent = (entry: LogEntry) => {
    if (entry.type === 'user' || entry.type === 'assistant') {
      const msg = entry.message;
      if (msg?.content) {
        if (typeof msg.content === 'string') {
          return msg.content;
        }
        if (Array.isArray(msg.content)) {
          return msg.content.map((c: any) => {
            if (c.type === 'text') return c.text;
            if (c.type === 'thinking') return `[思考] ${c.thinking}`;
            if (c.type === 'tool_use') return `[工具调用] ${c.name}\n输入: ${JSON.stringify(c.input, null, 2)}`;
            if (c.type === 'tool_result') {
              const result = typeof c.content === 'string' ? c.content : JSON.stringify(c.content, null, 2);
              return `[工具结果]${c.is_error ? ' [错误]' : ''}\n${result}`;
            }
            return JSON.stringify(c);
          }).join('\n\n');
        }
      }
    }
    return JSON.stringify(entry, null, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">实时日志流</h2>
          <p className="text-slate-400">查看原始日志流并实时更新</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isPaused
                ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
            }`}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? '继续' : '暂停'}
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索日志内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 过滤器 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="user">用户消息</option>
              <option value="assistant">助手消息</option>
              <option value="system">系统消息</option>
              <option value="tool">工具消息</option>
            </select>
          </div>

          {/* 自动滚动 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">自动滚动</span>
          </label>
        </div>

        {/* 统计信息 */}
        <div className="mt-4 flex items-center gap-6 text-sm text-slate-400">
          <span>总计: {data.entries.length} 条</span>
          <span>显示: {filteredEntries.length} 条</span>
          {searchQuery && <span>搜索: "{searchQuery}"</span>}
        </div>
      </div>

      {/* 日志流 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
      >
        <div className="h-[600px] overflow-y-auto p-4 space-y-3">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry, index) => (
              <div key={entry.uuid || index} className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-xs rounded border ${getEntryBadgeColor(entry.type)}`}>
                      {entry.type}
                    </span>
                    {entry.isSidechain && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded border border-amber-500/30">
                        Sidechain
                      </span>
                    )}
                    {entry.isMeta && (
                      <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded border border-slate-500/30">
                        Meta
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <pre className="px-4 py-3 text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {formatContent(entry)}
                </pre>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <FileText className="w-12 h-12 text-slate-600 mb-4" />
              <p className="text-slate-400 mb-2">没有匹配的日志条目</p>
              <p className="text-slate-500 text-sm">尝试调整搜索条件或过滤器</p>
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* 拖放提示 */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 border-dashed text-center">
        <Download className="w-5 h-5 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">拖放新的日志文件到此处加载</p>
      </div>
    </div>
  );
}
