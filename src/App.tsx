import { useState, useCallback } from 'react'
import { BarChart2, MessageSquare, Clock, Wrench, Zap, FileText, Upload, History, Download } from 'lucide-react'
import { parseLog } from './utils/logParser'
import type { ParsedLogData } from './types/log'
import { FileUpload } from './components/FileUpload'
import { SessionOverview } from './components/SessionOverview'
import { TokenDashboard } from './components/TokenDashboard'
import { TimelineView } from './components/TimelineView'
import { ConversationFlow } from './components/ConversationFlow'
import { ToolAnalysis } from './components/ToolAnalysis'
import { PerformanceView } from './components/PerformanceView'
import { RealTimeLog } from './components/RealTimeLog'
import { FileHistory } from './components/FileHistory'
import { ExportPanel } from './components/ExportPanel'

type ViewId = 'overview' | 'tokens' | 'timeline' | 'conversation' | 'tools' | 'performance' | 'realtime' | 'history' | 'export'

const navItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '会话概览', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'tokens', label: 'Token 统计', icon: <Zap className="w-4 h-4" /> },
  { id: 'timeline', label: '时间轴', icon: <Clock className="w-4 h-4" /> },
  { id: 'conversation', label: '对话流程', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'tools', label: '工具分析', icon: <Wrench className="w-4 h-4" /> },
  { id: 'performance', label: '性能视图', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'realtime', label: '日志查看', icon: <FileText className="w-4 h-4" /> },
  { id: 'history', label: '文件历史', icon: <History className="w-4 h-4" /> },
  { id: 'export', label: '导出', icon: <Download className="w-4 h-4" /> },
]

export default function App() {
  const [logData, setLogData] = useState<ParsedLogData | null>(null)
  const [currentView, setCurrentView] = useState<ViewId>('overview')
  const [error, setError] = useState<string | null>(null)

  const handleFileLoad = useCallback((content: string) => {
    try {
      const parsed = parseLog(content)
      setLogData(parsed)
      setError(null)
      setCurrentView('overview')
    } catch (e) {
      setError('解析日志失败，请检查文件格式')
      console.error(e)
    }
  }, [])

  const renderView = () => {
    if (!logData) return null
    switch (currentView) {
      case 'overview': return <SessionOverview data={logData} />
      case 'tokens': return <TokenDashboard data={logData} />
      case 'timeline': return <TimelineView data={logData} />
      case 'conversation': return <ConversationFlow data={logData} />
      case 'tools': return <ToolAnalysis data={logData} />
      case 'performance': return <PerformanceView data={logData} />
      case 'realtime': return <RealTimeLog data={logData} onDataUpdate={setLogData} />
      case 'history': return <FileHistory data={logData} />
      case 'export': return <ExportPanel data={logData} />
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">Claude Log Visualizer</h1>
        </div>
        <div className="flex items-center gap-3">
          {!logData && (
            <div className="w-48">
              <FileUpload onFileLoad={handleFileLoad} isDark={true} />
            </div>
          )}
          {logData && (
            <button
              onClick={() => setLogData(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors border-slate-600 hover:bg-slate-700"
            >
              <Upload className="w-4 h-4" />
              重新上传
            </button>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {logData && (
          <aside className="w-48 border-r min-h-screen p-3 border-slate-700 bg-slate-800/30">
            <nav className="space-y-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {!logData ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <BarChart2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Claude Log Visualizer</h2>
                <p className="text-sm mb-6 text-slate-400">
                  上传 Claude Code 日志文件 (.jsonl) 开始分析
                </p>
              </div>
              <div className="w-80">
                <FileUpload onFileLoad={handleFileLoad} isDark={true} />
              </div>
            </div>
          ) : (
            renderView()
          )}
        </main>
      </div>
    </div>
  )
}
