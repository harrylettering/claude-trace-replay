const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const os = require('os');

const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude', 'projects');

const { spawn, exec } = require('child_process');

// --- Retrospective prompt for Claude CLI ---
const LANGUAGE_RULE = `Output language rule:
- Respond in English by default.
- Use another language only when the user's custom instructions explicitly request it.`;

const CLI_ANALYSIS_PROMPT = `You are a top-tier AI collaboration expert. Read the following conversation log, which has already been structurally compressed, and produce a deep retrospective.

Return the following sections directly:
1. Collaboration summary: a one-sentence overview of performance.
2. Wins to keep: which practices should continue?
3. Pitfalls to avoid: which behaviors caused inefficiency or errors?
4. Optimization suggestions: three concrete improvements for future sessions.

Use clear Markdown formatting.

${LANGUAGE_RULE}`;

// --- Session comparison analysis prompt ---
const COMPARE_ANALYSIS_PROMPT = `You are a top-tier AI collaboration expert. Compare the following two conversation sessions, evaluate which one performed better, and provide a detailed analysis.

Return the following sections directly:
1. **Overall assessment**: which session performed better? (A / B / tie)
2. **Quality comparison**: compare answer quality, efficiency, tool usage, and execution reliability.
3. **Difference analysis**: identify the most important differences between the sessions.
4. **Recommendations**: provide concrete optimization suggestions based on this comparison.

Use clear Markdown formatting and support judgments with concrete data where possible.

${LANGUAGE_RULE}`;

// --- 智能无损压缩函数 ---
function compressLogContentForAnalysis(content, sourceLabel = 'uploaded content') {
    try {
        const lines = content.split('\n').filter(line => line.trim());
        const originalSize = Buffer.byteLength(content, 'utf-8');

        const compressedLines = [];

        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'unknown time';

                // User messages
                if (entry.type === 'user') {
                    let userText = '';
                    if (typeof entry.message?.content === 'string') {
                        userText = entry.message.content;
                    } else if (Array.isArray(entry.message?.content)) {
                        userText = entry.message.content
                            .filter(block => block.type === 'text')
                            .map(block => block.text)
                            .join('\n');
                    }
                    if (userText.trim()) {
                        compressedLines.push(`[${timestamp}] User: ${userText.trim()}`);
                    }
                    continue;
                }

                // Assistant messages
                if (entry.type === 'assistant') {
                    const contentBlocks = Array.isArray(entry.message?.content) ? entry.message.content : [];

                    // Extract thinking
                    const thinkingBlock = contentBlocks.find(block => block.type === 'thinking');
                    if (thinkingBlock?.thinking) {
                        const shortThinking = thinkingBlock.thinking.slice(0, 200) + (thinkingBlock.thinking.length > 200 ? '...' : '');
                        compressedLines.push(`[${timestamp}] Assistant thinking: ${shortThinking}`);
                    }

                    // Extract tool calls
                    const toolUseBlocks = contentBlocks.filter(block => block.type === 'tool_use');
                    for (const toolUse of toolUseBlocks) {
                        const name = toolUse.name.toLowerCase();
                        const input = toolUse.input || {};

                        if (name === 'bash' || name === 'execute_command') {
                            const cmd = (input.command || input.script || '').trim();
                            compressedLines.push(`[${timestamp}] Assistant ran command: ${cmd.slice(0, 300)}${cmd.length > 300 ? '...' : ''}`);
                        } else if (name === 'edit' || name === 'write' || name === 'str_replace_editor') {
                            const filePath = input.path || input.file_path || 'unknown file';
                            const action = input.command === 'view' ? 'viewed file' : 'modified file';
                            compressedLines.push(`[${timestamp}] Assistant ${action}: ${filePath}`);
                        } else if (name === 'delete' || name === 'remove') {
                            const filePath = input.path || input.file_path || 'unknown file';
                            compressedLines.push(`[${timestamp}] Assistant deleted file: ${filePath}`);
                        } else if (name === 'move' || name === 'rename' || name === 'mv') {
                            const from = input.source || input.from || 'old path';
                            const to = input.destination || input.to || 'new path';
                            compressedLines.push(`[${timestamp}] Assistant renamed/moved: ${from} -> ${to}`);
                        } else if (name === 'grep' || name === 'search' || name === 'find') {
                            const query = input.query || input.pattern || '';
                            compressedLines.push(`[${timestamp}] Assistant searched: ${query}`);
                        } else if (name === 'view' || name === 'read_file' || name === 'glob' || name === 'list_files' || name === 'ls') {
                            const path = input.path || input.pattern || input.file_path || '';
                            compressedLines.push(`[${timestamp}] Assistant read/listed files: ${path}`);
                        } else if (name === 'computer' || name === 'computer_use') {
                            const action = input.action || 'unknown action';
                            compressedLines.push(`[${timestamp}] Assistant used computer: ${action}`);
                        } else {
                            compressedLines.push(`[${timestamp}] Assistant called tool: ${name}`);
                        }
                    }

                    // Extract text replies
                    const textBlocks = contentBlocks.filter(block => block.type === 'text');
                    if (textBlocks.length > 0) {
                        const text = textBlocks.map(block => block.text).join('\n').trim();
                        if (text) {
                            compressedLines.push(`[${timestamp}] Assistant reply: ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`);
                        }
                    }

                    // Tool results (errors only)
                    if (Array.isArray(entry.message?.content)) {
                        const toolResultBlocks = entry.message.content.filter(block => block.type === 'tool_result' && block.is_error);
                        for (const result of toolResultBlocks) {
                            const errorContent = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
                            compressedLines.push(`[${timestamp}] Tool execution error: ${errorContent.slice(0, 300)}${errorContent.length > 300 ? '...' : ''}`);
                        }
                    }
                }
            } catch (e) {
                // Ignore malformed lines
                continue;
            }
        }

        const compressedContent = compressedLines.join('\n');
        const compressedSize = Buffer.byteLength(compressedContent, 'utf-8');
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        console.log(`[压缩完成] 原始大小: ${(originalSize/1024).toFixed(1)}KB → 压缩后: ${(compressedSize/1024).toFixed(1)}KB → 压缩率: ${compressionRatio}%`);

        return compressedContent;
    } catch (e) {
        console.error(`[压缩失败] ${sourceLabel}`, e);
        return null;
    }
}

function compressLogForAnalysis(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return compressLogContentForAnalysis(content, filePath);
    } catch (e) {
        console.error('[读取日志失败]', e);
        return null;
    }
}

// --- 扫描工具：增加排除逻辑与全路径显示 ---
function getRecentSessions() {
    if (!fs.existsSync(CLAUDE_BASE_DIR)) {
        return [];
    }
    
    const sessions = [];
    const now = Date.now();
    // 扩大检索范围到 1 小时，确保稳定性，同时避免展示过旧数据
    const SCAN_WINDOW = 24 * 60 * 60 * 1000;

    try {
        const projects = fs.readdirSync(CLAUDE_BASE_DIR);

        projects.forEach(project => {
            // 排除 subagents 文件夹
            if (project === 'subagents') return;

            const projectPath = path.join(CLAUDE_BASE_DIR, project);
            if (!fs.statSync(projectPath).isDirectory()) return;

            const files = fs.readdirSync(projectPath);
            files.forEach(file => {
                if (!file.endsWith('.jsonl')) return;
                
                const filePath = path.join(projectPath, file);
                try {
                    const stats = fs.statSync(filePath);
// 收集活跃会话
if (now - stats.mtimeMs <= SCAN_WINDOW) {
    sessions.push({
        id: file, // 完整的文件名
        folderName: project.replace(/^-Users-/, '').replace(/^-Users/, ''), // 去掉 -Users 前缀
        fullPath: filePath,
        lastUpdated: stats.mtime,
        size: (stats.size / 1024).toFixed(1) + ' KB'
    });
}
                } catch (e) {
                    // 忽略单个文件读取错误
                }
            });
        });
    } catch (err) {
        console.error('[Discovery] 扫描出错:', err);
    }

    // 按时间倒序
    return sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
}

// --- 监听器类 ---
class LogFileWatcher {
    constructor(ws) {
        this.ws = ws;
        this.watcher = null;
        this.currentPos = 0;
        this.activeFile = null;
    }

    watchPath(filePath) {
        if (this.watcher) this.watcher.close();
        this.activeFile = filePath;
        this.currentPos = 0; 

        console.log(`[Watcher] 开启实时监听: ${filePath}`);
        
        // 挂载监听
        this.watcher = chokidar.watch(filePath, { 
            persistent: true,
            ignoreInitial: false 
        });
        
        // 初始读取
        this.readNewLines();
        
        this.watcher.on('change', () => this.readNewLines());
    }

    readNewLines() {
        if (!this.activeFile || !fs.existsSync(this.activeFile)) return;
        const stats = fs.statSync(this.activeFile);
        
        if (stats.size > this.currentPos) {
            const stream = fs.createReadStream(this.activeFile, {
                start: this.currentPos,
                end: stats.size
            });

            let buffer = '';
            stream.on('data', (chunk) => {
                buffer += chunk.toString();
                if (buffer.includes('\n')) {
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    lines.forEach(line => {
                        if (line.trim()) {
                            this.sendToFrontend('log-entry', line);
                        }
                    });
                }
            });
            this.currentPos = stats.size;
        } else if (stats.size < this.currentPos) {
            this.currentPos = stats.size;
        }
    }

    sendToFrontend(type, payload) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        }
    }

    stop() {
        if (this.watcher) this.watcher.close();
    }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    const watcher = new LogFileWatcher(ws);

    ws.on('message', (message) => {
        try {
            const { type, data } = JSON.parse(message);
            if (type === 'get-discovery-list') {
                const list = getRecentSessions();
                ws.send(JSON.stringify({ type: 'discovery-list', payload: list }));
            } else if (type === 'start-watch') {
                console.log(`[DEBUG] 收到 start-watch: ${data.path}`);
                watcher.watchPath(data.path);
            } else if (type === 'run-claude-analysis') {
                console.log('[DEBUG] 收到 run-claude-analysis 请求:', JSON.stringify(data));
                const targetPath = data?.path || watcher.activeFile;
                const rawContent = typeof data?.content === 'string' ? data.content : '';
                const customPrompt = data?.prompt;

                if (!targetPath && !rawContent) {
                    console.error('[DEBUG] 分析失败: 未提供有效路径或日志内容');
                    ws.send(JSON.stringify({ type: 'claude-analysis-error', payload: 'No active file path or uploaded log content was provided.' }));
                    return;
                }

                console.log(`[DEBUG] 确认分析来源: ${targetPath || 'offline uploaded content'}`);
                console.log(`[DEBUG] 使用自定义prompt: ${customPrompt ? '是' : '否（使用默认）'}`);
                ws.send(JSON.stringify({ type: 'claude-analysis-start' }));

                try {
                    // 先压缩日志
                    const sourceContent = targetPath ? fs.readFileSync(targetPath, 'utf-8') : rawContent;
                    const compressedContent = compressLogContentForAnalysis(sourceContent, targetPath || 'offline uploaded content');
                    if (!compressedContent) {
                        ws.send(JSON.stringify({ type: 'claude-analysis-error', payload: 'Failed to compress the log. Please check the file content.' }));
                        return;
                    }

                    // 写临时文件
                    const tempFilePath = path.join(os.tmpdir(), `claude_compressed_${Date.now()}.txt`);
                    fs.writeFileSync(tempFilePath, compressedContent, 'utf-8');
                    console.log(`[临时文件] 已写入: ${tempFilePath}`);

                    // Use custom prompt or default prompt, while keeping language adaptation stable.
                    const finalPrompt = customPrompt
                        ? `${customPrompt}\n\n${LANGUAGE_RULE}`
                        : CLI_ANALYSIS_PROMPT;

                    // 用shell执行命令，和run_claude.sh逻辑一致
                    const command = `cat "${tempFilePath}" | claude -p "${finalPrompt.replace(/"/g, '\\"')}"`;
                    console.log(`[执行命令] ${command.slice(0, 200)}...`);

                    const claudeProcess = exec(command, { shell: '/bin/bash' });

                    let fullOutput = '';

                    claudeProcess.stdout.on('data', (chunk) => {
                        const text = chunk.toString();
                        fullOutput += text;
                        console.log(`[DEBUG] Claude Output: ${text.slice(0, 20)}...`);
                        ws.send(JSON.stringify({ type: 'claude-analysis-chunk', payload: text }));
                    });

                    claudeProcess.stderr.on('data', (chunk) => {
                        const text = chunk.toString();
                        console.error(`[DEBUG] Claude Stderr: ${text}`);
                        // 过滤掉一些常见的无用输出
                        if (!text.includes('Progress')) {
                            ws.send(JSON.stringify({ type: 'claude-analysis-chunk', payload: `\n[CLI Info]: ${text}` }));
                        }
                    });

                    claudeProcess.on('error', (err) => {
                        console.error('[DEBUG] Claude Process Error:', err);
                        // 清理临时文件
                        fs.unlinkSync(tempFilePath);
                        ws.send(JSON.stringify({ type: 'claude-analysis-error', payload: `启动 Claude 失败: ${err.message}。请确保已安装 claude cli 并在环境变量中。` }));
                    });

                    claudeProcess.on('close', (code) => {
                        console.log(`[DEBUG] Claude CLI 进程结束. Exit Code: ${code}`);
                        // 清理临时文件
                        try { fs.unlinkSync(tempFilePath); } catch (e) {}

                        if (code !== 0 && !fullOutput) {
                            ws.send(JSON.stringify({ type: 'claude-analysis-error', payload: `分析进程异常退出 (Code: ${code})。请检查本地 claude 是否可用。` }));
                        } else {
                            ws.send(JSON.stringify({ type: 'claude-analysis-end', payload: fullOutput }));
                        }
                    });

                } catch (err) {
                    console.error('[DEBUG] Execution Exception:', err);
                    ws.send(JSON.stringify({ type: 'claude-analysis-error', payload: `执行异常: ${err.message}` }));
                }
            } else if (type === 'compare-sessions-analysis') {
                // 会话对比分析
                const { sessionA, sessionB } = data || {};
                console.log('[DEBUG] 收到 compare-sessions-analysis 请求');

                if (!sessionA || !sessionB) {
                    ws.send(JSON.stringify({ type: 'compare-analysis-error', payload: '缺少会话数据' }));
                    return;
                }

                ws.send(JSON.stringify({ type: 'compare-analysis-start' }));

                try {
                    // 将两个会话内容拼接成对比格式
                    const compareContent = `【会话 A】\n${sessionA}\n\n【会话 B】\n${sessionB}`;

                    // 写临时文件
                    const tempFilePath = path.join(os.tmpdir(), `claude_compare_${Date.now()}.txt`);
                    fs.writeFileSync(tempFilePath, compareContent, 'utf-8');
                    console.log(`[临时文件] 已写入: ${tempFilePath}`);

                    // 用shell执行命令
                    const command = `cat "${tempFilePath}" | claude -p "${COMPARE_ANALYSIS_PROMPT.replace(/"/g, '\\"')}"`;
                    console.log(`[执行命令] ${command.slice(0, 200)}...`);

                    const claudeProcess = exec(command, { shell: '/bin/bash' });

                    let fullOutput = '';

                    claudeProcess.stdout.on('data', (chunk) => {
                        const text = chunk.toString();
                        fullOutput += text;
                        ws.send(JSON.stringify({ type: 'compare-analysis-chunk', payload: text }));
                    });

                    claudeProcess.stderr.on('data', (chunk) => {
                        const text = chunk.toString();
                        if (!text.includes('Progress')) {
                            ws.send(JSON.stringify({ type: 'compare-analysis-chunk', payload: `\n[CLI Info]: ${text}` }));
                        }
                    });

                    claudeProcess.on('error', (err) => {
                        console.error('[DEBUG] Claude Process Error:', err);
                        try { fs.unlinkSync(tempFilePath); } catch (e) {}
                        ws.send(JSON.stringify({ type: 'compare-analysis-error', payload: `启动 Claude 失败: ${err.message}` }));
                    });

                    claudeProcess.on('close', (code) => {
                        console.log(`[DEBUG] Claude CLI 进程结束. Exit Code: ${code}`);
                        try { fs.unlinkSync(tempFilePath); } catch (e) {}

                        if (code !== 0 && !fullOutput) {
                            ws.send(JSON.stringify({ type: 'compare-analysis-error', payload: `分析进程异常退出 (Code: ${code})` }));
                        } else {
                            ws.send(JSON.stringify({ type: 'compare-analysis-end', payload: fullOutput }));
                        }
                    });

                } catch (err) {
                    console.error('[DEBUG] Execution Exception:', err);
                    ws.send(JSON.stringify({ type: 'compare-analysis-error', payload: `执行异常: ${err.message}` }));
                }
            }
        } catch (e) { }
    });

    ws.on('close', () => watcher.stop());
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`✅ Discovery Server Ready: http://localhost:${PORT}`);
});
