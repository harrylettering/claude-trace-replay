import type { AgentAction } from '../types/agent';
import type { LogEntry } from '../types/log';

export interface LoopWarning {
  type: 'LoopDetected';
  message: string;
  repeatedCommand?: string;
  failureCount: number;
}

// Inspect recent log entries and detect obvious loop patterns.
export function detectLoop(entries: LogEntry[]): LoopWarning | null {
  // Only inspect the most recent N entries that contain a valid AgentAction.
  const WINDOW_SIZE = 8;
  const recentActions: AgentAction[] = [];
  
  // Walk backward so we can collect the newest relevant actions first.
  for (let i = entries.length - 1; i >= 0; i--) {
    const action = entries[i].parsedAction;
    if (action) {
      // Ignore pure thinking events and focus on execution behavior.
      if (action.type !== 'AgentThought') {
         recentActions.push(action);
      }
    }
    if (recentActions.length >= WINDOW_SIZE) break;
  }

  // Restore forward chronological order.
  recentActions.reverse();

  // Pattern 1: repeated terminal failures with the same command.
  const failedCommands = recentActions.filter(
    (a): a is Extract<AgentAction, { type: 'TerminalCommand' }> => 
      a.type === 'TerminalCommand' && a.exitCode !== 0 && a.exitCode !== -1
  );

  if (failedCommands.length >= 3) {
    // Check whether the last three failures came from the same command.
    const lastThree = failedCommands.slice(-3);
    const cmd1 = lastThree[0].command.trim();
    const cmd2 = lastThree[1].command.trim();
    const cmd3 = lastThree[2].command.trim();

    // Keep the first heuristic simple and require an exact command match.
    if (cmd1 === cmd2 && cmd2 === cmd3) {
      return {
        type: 'LoopDetected',
        message: `The agent appears to be stuck in a loop. It has failed while running "${cmd1}" three times in a row. Please step in via the terminal, inspect the error, and provide a clearer recovery direction.`,
        repeatedCommand: cmd1,
        failureCount: failedCommands.length
      };
    }
  }

  return null;
}
