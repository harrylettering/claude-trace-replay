import { User, Bot, MessageSquare } from 'lucide-react';
import type { LogEntry } from '../types/log';
import { UI_COLORS, CONVERSATION_PREVIEW_LENGTH } from '../constants';

export function getNodeIcon(type: string) {
  switch (type) {
    case 'user': return <User className="w-3.5 h-3.5" />;
    case 'assistant': return <Bot className="w-3.5 h-3.5" />;
    default: return <MessageSquare className="w-3.5 h-3.5" />;
  }
}

export function getNodeColor(type: string) {
  switch (type) {
    case 'user': return UI_COLORS.user.dot;
    case 'assistant': return UI_COLORS.assistant.dot;
    case 'system': return UI_COLORS.system.dot;
    default: return UI_COLORS.default.dot;
  }
}

export function getNodeBorder(type: string) {
  switch (type) {
    case 'user': return `${UI_COLORS.user.bg} ${UI_COLORS.user.border}`;
    case 'assistant': return `${UI_COLORS.assistant.bg} ${UI_COLORS.assistant.border}`;
    case 'system': return `${UI_COLORS.system.bg} ${UI_COLORS.system.border}`;
    default: return `${UI_COLORS.default.bg} ${UI_COLORS.default.border}`;
  }
}

export function getMessagePreview(entry: LogEntry): string {
  if (entry.type === 'user' || entry.type === 'assistant') {
    const msg = entry.message;
    if (msg?.content) {
      if (typeof msg.content === 'string') {
        if (msg.content.includes('<command-name>')) {
          const match = msg.content.match(/<command-name>(.*?)<\/command-name>/);
          if (match) return `Command: /${match[1]}`;
        }
        return msg.content.substring(0, CONVERSATION_PREVIEW_LENGTH);
      }
      if (Array.isArray(msg.content)) {
        const first = msg.content[0];
        if (first?.type === 'text' && 'text' in first) return (first.text as string)?.substring(0, CONVERSATION_PREVIEW_LENGTH) || '';
        if (first?.type === 'tool_use' && 'name' in first) return `Tool: ${first.name}`;
        if (first?.type === 'tool_result') return 'Tool result';
        if (first?.type === 'thinking') return 'Thinking...';
      }
    }
  }
  if (entry.type === 'system' && entry.subtype === 'turn_duration') return `Turn: ${entry.messageCount} messages`;
  return entry.type;
}
