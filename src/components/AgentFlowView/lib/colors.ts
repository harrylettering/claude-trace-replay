/**
 * Holographic color palette and role color definitions.
 * Re-exports from centralized theme system for backward compatibility.
 */

// Re-export from centralized theme module
export {
  COLORS,
  useThemeColors,
  getThemeColors,
  getCanvasColors,
  getStateColor
} from '../../../themes/colors'

export type { AgentState } from '../../../themes/types'
