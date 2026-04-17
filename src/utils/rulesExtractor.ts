import type { LogEntry } from '../types/log';
import type { AgentAction } from '../types/agent';

export interface Lesson {
  id: string;
  errorCommand: string;
  errorMessage: string;
  fixDescription: string;
  suggestedRule: string;
  severity: 'high' | 'medium' | 'low';
  entry?: LogEntry;
}

export function extractLessons(entries: LogEntry[]): Lesson[] {
  const lessons: Lesson[] = [];
  
  // Look for the pattern: failed command -> fix action -> successful validation.
  for (let i = 0; i < entries.length - 2; i++) {
    const current = entries[i].parsedAction;
    
    // 1. Find a failed terminal command.
    if (current?.type === 'TerminalCommand' && current.exitCode !== 0 && current.exitCode !== -1) {
      
      // 2. Look for a follow-up CodeWrite action as the fix.
      let fixAction: AgentAction | undefined;
      let fixIndex = -1;
      
      for (let j = i + 1; j < Math.min(i + 5, entries.length); j++) {
        if (entries[j].parsedAction?.type === 'CodeWrite') {
          fixAction = entries[j].parsedAction;
          fixIndex = j;
          break;
        }
      }
      
      // 3. Look for a successful validation after the fix.
      if (fixAction && fixIndex !== -1) {
        let successFound = false;
        for (let k = fixIndex + 1; k < Math.min(fixIndex + 5, entries.length); k++) {
          const action = entries[k].parsedAction;
          if (action?.type === 'TerminalCommand' && action.exitCode === 0 && action.command === current.command) {
            successFound = true;
            break;
          }
        }
        
        if (successFound) {
          lessons.push({
            id: `lesson_${entries[i].uuid}`,
            errorCommand: current.command,
            errorMessage: current.stderr || current.output,
            fixDescription: (fixAction as any).instruction || 'Applied code changes',
            suggestedRule: `When running "${current.command}" and encountering a similar error, first check and apply: ${(fixAction as any).instruction || 'the corresponding fix logic'}.`,
            severity: 'medium',
            entry: entries[i]
          });
        }
      }
    }
  }
  
  return lessons;
}
