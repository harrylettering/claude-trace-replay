/**
 * Light theme color definitions
 */

import type { ThemeColors } from '../types'

export const lightColors: ThemeColors = {
  ui: {
    // Backgrounds
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',
    bgCanvas: '#f8fafc',

    // Text
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',

    // Border
    borderDefault: '#e2e8f0',
    borderMuted: '#f1f5f9',
    borderFocus: '#3b82f6',

    // Semantic colors (consistent across themes)
    user: '#3b82f6',
    assistant: '#8b5cf6',
    system: '#6b7280',
    tool: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },

  canvas: {
    // Background - lighter base for light theme
    void: '#f8fafc',
    hexGrid: '#e2e8f0',

    // Primary Hologram - slightly darker for contrast on light bg
    holoBase: '#0891b2',
    holoBright: '#06b6d4',
    holoHot: '#164e63',

    // Agent States - adjusted for light theme visibility
    idle: '#0891b2',
    thinking: '#0891b2',
    tool_calling: '#d97706',
    complete: '#059669',
    error: '#dc2626',
    paused: '#6b7280',
    waiting_permission: '#ea580c',

    // Edge/Particle Colors
    dispatch: '#7c3aed',
    return: '#059669',
    tool: '#d97706',
    message: '#0891b2',

    // Context breakdown colors
    contextSystem: '#9ca3af',
    contextUser: '#0891b2',
    contextToolResults: '#d97706',
    contextReasoning: '#7c3aed',
    contextSubagent: '#059669',

    // UI Chrome - adjusted for light theme
    nodeInterior: 'rgba(255, 255, 255, 0.9)',
    textPrimary: '#0f172a',
    textDim: '#47556990',
    textMuted: '#94a3b850',

    // Glass card - lighter variant
    glassBg: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(8, 145, 178, 0.2)',
    glassHighlight: 'rgba(8, 145, 178, 0.05)',

    // Holo background/border opacities - adjusted for light theme
    holoBg03: 'rgba(8, 145, 178, 0.03)',
    holoBg05: 'rgba(8, 145, 178, 0.05)',
    holoBg10: 'rgba(8, 145, 178, 0.1)',
    holoBorder06: 'rgba(8, 145, 178, 0.08)',
    holoBorder08: 'rgba(8, 145, 178, 0.12)',
    holoBorder10: 'rgba(8, 145, 178, 0.15)',
    holoBorder12: 'rgba(8, 145, 178, 0.2)',

    // Panel chrome
    panelBg: 'rgba(255, 255, 255, 0.95)',
    panelSeparator: 'rgba(8, 145, 178, 0.1)',

    // Discovery type colors
    discoveryFile: '#0891b2',
    discoveryPattern: '#7c3aed',
    discoveryFinding: '#059669',
    discoveryCode: '#d97706',

    // Canvas drawing — agent/tool card backgrounds
    cardBgDark: 'rgba(248, 250, 252, 0.9)',
    cardBg: 'rgba(255, 255, 255, 0.9)',
    cardBgSelected: 'rgba(241, 245, 249, 0.95)',
    cardBgError: 'rgba(254, 242, 242, 0.95)',
    cardBgSelectedHolo: 'rgba(8, 145, 178, 0.1)',

    // Canvas drawing — cost labels
    costText: '#059669',
    costTextDim: '#05966990',
    costPillBg: 'rgba(241, 245, 249, 0.9)',
    costPillStroke: 'rgba(5, 150, 105, 0.3)',

    // Canvas drawing — cost panel bar fills
    barFillMain: 'rgba(8, 145, 178, 0.2)',
    barFillSub: 'rgba(124, 58, 237, 0.2)',
  },
}
