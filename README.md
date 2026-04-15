# Claude Log Visualization

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 3" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

<p align="center">
  A visualization and analysis workspace for Claude Code session logs.
  Explore conversation structure, token usage, tool activity, replay flows, AI retrospectives, and session-to-session comparisons in one interface.
</p>

## Overview

Claude Log Visualization turns raw Claude Code `.jsonl` logs into an interactive analysis dashboard.
It is designed for debugging AI-assisted workflows, understanding multi-step tool execution, reviewing prompt quality, and extracting reusable collaboration patterns from real coding sessions.

The app focuses on three layers:

- Session observability: overview metrics, timelines, token charts, log streams, and file history
- Flow understanding: conversation trees, agent flow playback, and step-by-step tool relationships
- Higher-level analysis: AI retrospectives, prompt optimization, session comparison, and reusable patterns

## Screenshots

### Core Dashboards

| Session Overview | Token Usage |
| --- | --- |
| ![Session Overview](docs/screenshots/session-overview.png) | ![Token Usage](docs/screenshots/token-usage.png) |

| Session Timeline | Conversation Flow |
| --- | --- |
| ![Session Timeline](docs/screenshots/session-timeline.png) | ![Conversation Flow](docs/screenshots/conversation-flow.png) |

| Session Compare | AI Analysis |
| --- | --- |
| ![Session Compare](docs/screenshots/session-compare.png) | ![AI Analysis](docs/screenshots/ai-analysis.png) |

### Agent Flow

| Tool Return to Main Agent | Assistant Return to Main Agent |
| --- | --- |
| ![Agent Flow Bash Return](docs/screenshots/agent-flow-bash.png) | ![Agent Flow Assistant Return](docs/screenshots/agent-flow-assistant.png) |

## Features

### Analysis Views

- Session Overview with message counts, token totals, model usage, duration, and tool-call stats
- Session Timeline with expandable cards, search, filtering, and diff-oriented event inspection
- Token Usage charts for per-request and aggregate token behavior
- Conversation Flow for parent-child message structure and hierarchy inspection
- Real-Time Log view for raw event browsing and filtering
- Session Compare for side-by-side metrics across two runs

### Agent Workflow Visualization

- Animated Agent Flow playback centered on `Main Agent`
- Step-aware `Current Step` panel showing who called whom and what happened
- Tool-category-aware rendering for file, shell, task, network, agent, and planning operations
- Replay controls with speed adjustment, restart, and viewport reset

### AI and Prompt Analysis

- AI retrospective analysis with strengths, weaknesses, and next-step recommendations
- Prompt quality analysis with issue detection and optimization suggestions
- Reusable prompt templates and session pattern extraction
- Multi-session aggregation for broader trend analysis

### Workflow Utilities

- Advanced search with text matching, message-type filtering, tool filtering, and token/time constraints
- Session replay for chronological walkthroughs
- Export support for analysis outputs and session artifacts
- Template libraries for prompts and session structures

## Quick Start

### Requirements

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/your-username/claude-log-visualization.git
cd claude-log-visualization
npm install
```

### Run

```bash
npm run dev
```

Then open `http://localhost:3000`.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How It Works

1. Load a Claude Code `.jsonl` session log.
2. The parser normalizes entries into messages, tool calls, token usage, relationships, and derived analysis data.
3. The UI exposes multiple synchronized views so you can inspect the same session from different angles.
4. Higher-level modules generate summaries, prompt guidance, and reusable patterns from the parsed session data.

## Main Views

| View | Purpose |
| --- | --- |
| Session Overview | High-level stats for a single session |
| AI Analysis | Retrospective insights and recommendations |
| Prompt Optimizer | Prompt quality review and improvement ideas |
| Session Compare | Side-by-side comparison across two sessions |
| Token Usage | Token trends and spikes |
| Session Timeline | Chronological action inspection |
| Conversation Flow | Parent-child conversation structure |
| Agent Flow | Animated call-and-return visualization |
| Real-Time Log | Raw event stream inspection |

## Supported Log Data

The project is built around Claude Code session logs in `.jsonl` format.
Typical entries include:

- `user`
- `assistant`
- `system`
- tool-use / tool-result content blocks
- permission and metadata events
- file history snapshots

Common fields used by the parser include:

- `uuid`
- `parentUuid`
- `timestamp`
- `type`
- `message`
- `isSidechain`
- `isMeta`

## Tech Stack

- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- Recharts
- Framer Motion
- Lucide React
- html2canvas
- Zustand
- XYFlow / React Flow

## Project Structure

```text
claude-log-visualization/
├── docs/
│   └── screenshots/          # README demo images
├── src/
│   ├── components/           # UI modules and dashboards
│   ├── hooks/                # Playback and interaction hooks
│   ├── types/                # Domain types
│   ├── utils/                # Parsing, analysis, and data helpers
│   ├── App.tsx               # Application shell
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styling
├── package.json
└── README.md
```

## Development Notes

- `npm run dev` starts the Vite development server
- `npm run build` runs TypeScript compilation and the production build
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint

## Contributing

Contributions are welcome.
If you plan to extend the parser, add new visualizations, or improve the README, a focused issue or PR with screenshots is especially helpful.

## License

MIT
