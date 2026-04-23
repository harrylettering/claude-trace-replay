/**
 * Theme type definitions for Claude Trace Replay
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
}

/**
 * Canvas-specific color definitions
 */
export interface CanvasColors {
  // Background
  void: string;
  hexGrid: string;

  // Primary Hologram
  holoBase: string;
  holoBright: string;
  holoHot: string;

  // Agent States
  idle: string;
  thinking: string;
  tool_calling: string;
  complete: string;
  error: string;
  paused: string;
  waiting_permission: string;

  // Edge/Particle Colors
  dispatch: string;
  return: string;
  tool: string;
  message: string;

  // Context breakdown colors
  contextSystem: string;
  contextUser: string;
  contextToolResults: string;
  contextReasoning: string;
  contextSubagent: string;

  // UI Chrome
  nodeInterior: string;
  textPrimary: string;
  textDim: string;
  textMuted: string;

  // Glass card
  glassBg: string;
  glassBorder: string;
  glassHighlight: string;

  // Holo background/border opacities
  holoBg03: string;
  holoBg05: string;
  holoBg10: string;
  holoBorder06: string;
  holoBorder08: string;
  holoBorder10: string;
  holoBorder12: string;

  // Panel chrome
  panelBg: string;
  panelSeparator: string;

  // Discovery type colors
  discoveryFile: string;
  discoveryPattern: string;
  discoveryFinding: string;
  discoveryCode: string;

  // Canvas drawing — agent/tool card backgrounds
  cardBgDark: string;
  cardBg: string;
  cardBgSelected: string;
  cardBgError: string;
  cardBgSelectedHolo: string;

  // Canvas drawing — cost labels
  costText: string;
  costTextDim: string;
  costPillBg: string;
  costPillStroke: string;

  // Canvas drawing — cost panel bar fills
  barFillMain: string;
  barFillSub: string;
}

/**
 * UI color definitions for components
 */
export interface UIColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCanvas: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Border
  borderDefault: string;
  borderMuted: string;
  borderFocus: string;

  // Semantic colors (consistent across themes)
  user: string;
  assistant: string;
  system: string;
  tool: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

/**
 * Complete theme colors
 */
export interface ThemeColors {
  ui: UIColors;
  canvas: CanvasColors;
}

export type AgentState = 'idle' | 'thinking' | 'tool_calling' | 'complete' | 'error' | 'paused' | 'waiting_permission';
