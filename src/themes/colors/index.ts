/**
 * Theme colors exports
 * Provides useThemeColors hook and getStateColor function
 */

import { useThemeStore } from '../themeStore'
import { darkColors } from './dark'
import { lightColors } from './light'
import type { ThemeColors, AgentState, CanvasColors } from '../types'

export { darkColors } from './dark'
export { lightColors } from './light'

/**
 * React hook to get current theme colors
 * Returns dark or light colors based on resolved theme mode
 */
export function useThemeColors(): ThemeColors {
  const resolvedMode = useThemeStore((state) => state.resolvedMode)
  return resolvedMode === 'dark' ? darkColors : lightColors
}

/**
 * Get theme colors without hook (for non-React contexts)
 */
export function getThemeColors(): ThemeColors {
  const state = useThemeStore.getState()
  return state.resolvedMode === 'dark' ? darkColors : lightColors
}

/**
 * Get canvas colors for a specific theme mode
 */
export function getCanvasColors(isDark: boolean): CanvasColors {
  return isDark ? darkColors.canvas : lightColors.canvas
}

/**
 * Get state color for agent states
 * Returns appropriate color based on current theme
 */
export function getStateColor(state: AgentState): string {
  const colors = getThemeColors()
  return colors.canvas[state]
}

/**
 * Legacy COLORS export for backward compatibility
 * Always returns dark theme colors
 */
export const COLORS = darkColors.canvas
