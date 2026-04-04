# Claude Log Visualization

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 3" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

<p align="center">
  功能强大的 Claude Code 会话日志可视化分析工具，帮助你深入理解和分析 AI 会话过程。
</p>

<p align="center">
  <img width="1835" alt="Screenshot" src="https://github.com/user-attachments/assets/84b01bfa-dd56-4405-8d5d-08353753b752" />

</p>

## ✨ 功能特性

### 📊 核心功能

| 功能 | 描述 |
|------|------|
| **会话概览** | 完整的会话统计信息、Token 使用情况、成本估算、模型列表 |
| **时间线视图** | 可展开的消息时间线，支持高级搜索和过滤 |
| **Token 统计** | 详细的 Token 使用图表和累计曲线 |
| **对话流程** | 树形结构可视化消息层级和父子关系 |
| **工具分析** | 工具调用频率、执行时间、成功率统计 |
| **性能分析** | 响应时间分布、慢查询识别、性能指标 |
| **实时日志流** | 原始日志查看、搜索过滤、自动滚动 |
| **文件历史** | 文件快照时间线、备份文件列表 |
| **数据导出** | JSON/CSV/HTML/JSONL 多格式导出 |

### 🚀 高级功能

| 功能 | 描述 |
|------|------|
| **🔍 高级搜索与过滤** | 支持简单搜索、精确匹配、正则表达式；按消息类型、工具名称、时间范围、Token 范围过滤 |
| **🧠 AI 智能分析** | 自动检测问题、生成洞察、性能评分（A-F 等级）、改进建议 |
| **🔄 会话对比** | 双会话对比分析、差异高亮、指标对比、可视化对比 |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

## 📖 使用说明

### 1. 上传日志文件

- 点击或拖拽上传 Claude Code 生成的 `.jsonl` 格式日志文件
- 支持大文件解析，带有加载进度显示

### 2. 浏览视图

使用左侧导航栏切换不同的分析视图：

1. **会话概览** - 查看整体统计和成本估算
2. **AI 分析** - 获取智能洞察和改进建议
3. **会话对比** - 加载两个会话进行对比分析
4. **Token 统计** - 查看 Token 使用趋势和详情
5. **时间轴** - 按时间顺序浏览消息流
6. **对话流程** - 查看消息的层级结构
7. **工具分析** - 分析工具调用情况
8. **性能视图** - 查看响应时间和性能指标
9. **日志查看** - 查看原始日志流
10. **文件历史** - 查看文件变更历史
11. **导出** - 导出分析结果
12. **调试面板** - 查看原始解析数据

### 3. 搜索与过滤

在时间轴和日志视图中使用高级搜索功能：

- **搜索模式**: 简单搜索 / 精确匹配 / 正则表达式
- **区分大小写**: 可选的大小写敏感搜索
- **类型过滤**: 按消息类型多选
- **工具过滤**: 按工具名称过滤
- **时间范围**: 指定开始和结束时间
- **Token 范围**: 按 Token 使用量过滤
- **标志过滤**: 仅显示有错误/有工具/Sidechain 的消息

### 4. AI 分析

AI 分析功能提供：

- **总体评分**: A-F 等级综合评价
- **智能洞察**: 自动检测性能、Token 使用、错误等问题
- **优势分析**: 识别会话中的优势
- **改进建议**: 针对问题提供具体建议
- **详细指标**: Token 效率、错误率、性能统计等

### 5. 会话对比

会话对比功能支持：

- **双会话加载**: 分别加载两个会话文件
- **默认会话**: 如果已有会话，自动填入会话 A
- **指标对比**: 消息数、Token、工具调用等
- **差异高亮**: 绿色表示变好，红色表示变差
- **工具对比**: 两侧 Top 5 工具使用排行
- **模型对比**: 使用的模型列表对比

## 🛠️ 技术栈

- **React 18** - UI 框架
- **TypeScript 5** - 类型安全
- **Vite 5** - 构建工具
- **Tailwind CSS 3** - 样式框架
- **Recharts** - 图表库
- **Lucide React** - 图标库
- **clsx + tailwind-merge** - 样式工具

## 📁 项目结构

```
claude-log-visualization/
├── src/
│   ├── components/              # React 组件
│   │   ├── FileUpload.tsx        # 文件上传组件
│   │   ├── SessionOverview.tsx   # 会话概览
│   │   ├── TimelineView.tsx      # 时间线视图
│   │   ├── TokenDashboard.tsx    # Token 统计仪表板
│   │   ├── ConversationFlow.tsx  # 对话流程图
│   │   ├── ToolAnalysis.tsx      # 工具使用分析
│   │   ├── PerformanceView.tsx   # 性能分析视图
│   │   ├── RealTimeLog.tsx       # 实时日志流
│   │   ├── FileHistory.tsx       # 文件历史
│   │   ├── ExportPanel.tsx       # 数据导出
│   │   ├── DebugPanel.tsx        # 调试面板
│   │   ├── AdvancedSearchFilter.tsx  # 高级搜索过滤器
│   │   ├── AIAnalysis.tsx        # AI 智能分析
│   │   └── SessionCompare.tsx    # 会话对比
│   ├── types/                   # TypeScript 类型定义
│   │   ├── log.ts               # 日志相关类型
│   │   ├── search.ts            # 搜索过滤类型
│   │   └── analysis.ts          # 分析相关类型
│   ├── utils/                   # 工具函数
│   │   ├── logParser.ts         # 日志解析器
│   │   ├── timelineHelpers.ts   # 时间线辅助函数
│   │   ├── conversationHelpers.tsx # 对话流程辅助函数
│   │   ├── searchFilter.ts      # 搜索过滤引擎
│   │   └── analysisEngine.ts    # AI 分析引擎
│   ├── constants.ts             # 常量配置
│   ├── App.tsx                  # 主应用组件
│   ├── main.tsx                 # 应用入口
│   └── index.css                # 全局样式
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 📝 日志格式

工具支持 Claude Code 生成的 JSONL 格式日志文件。每条日志是 JSON 对象，包含以下主要类型：

| 类型 | 描述 |
|------|------|
| `user` | 用户消息 |
| `assistant` | 助手消息（AI） |
| `system` | 系统消息 |
| `file-history-snapshot` | 文件历史快照 |
| `permission-mode` | 权限模式 |

每个日志条目可能包含以下字段：
- `uuid` - 消息唯一标识
- `parentUuid` - 父消息标识
- `timestamp` - 时间戳
- `type` - 消息类型
- `message` - 消息内容
- `isSidechain` - 是否为 sidechain
- `isMeta` - 是否为元数据

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 💡 功能路线图

- [x] 高级搜索与过滤
- [x] AI 智能分析（规则引擎）
- [x] 会话对比
- [ ] 书签与标记
- [ ] 配置与自定义
- [ ] 键盘快捷键
- [ ] 更多可视化
- [ ] 增强导出
- [ ] 多标签支持
- [ ] 实时监控模式

---

<p align="center">
  如果你觉得这个项目有帮助，请给它一个 ⭐️ Star！
</p>
