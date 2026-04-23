/**
 * Theme toggle button component
 * Cycles through light → dark → system modes
 */

import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '../../themes/themeStore'

export function ThemeToggle() {
  const { mode, toggleTheme } = useThemeStore()

  const getIcon = () => {
    switch (mode) {
      case 'light':
        return <Sun className="w-5 h-5" />
      case 'dark':
        return <Moon className="w-5 h-5" />
      case 'system':
        return <Monitor className="w-5 h-5" />
    }
  }

  const getLabel = () => {
    switch (mode) {
      case 'light':
        return 'Light theme'
      case 'dark':
        return 'Dark theme'
      case 'system':
        return 'System theme'
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      title={getLabel()}
      aria-label={getLabel()}
    >
      {getIcon()}
    </button>
  )
}
