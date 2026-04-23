/**
 * Theme store with persistence
 * Manages light/dark/system theme preference
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode, ThemeState } from './types'

interface ThemeStore extends ThemeState {
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (resolvedMode: 'light' | 'dark') => {
  const root = document.documentElement
  if (resolvedMode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      resolvedMode: 'dark',

      setMode: (mode: ThemeMode) => {
        const resolvedMode = mode === 'system' ? getSystemTheme() : mode
        applyTheme(resolvedMode)
        set({ mode, resolvedMode })
      },

      toggleTheme: () => {
        const currentMode = get().mode
        const modes: ThemeMode[] = ['light', 'dark', 'system']
        const currentIndex = modes.indexOf(currentMode)
        const nextMode = modes[(currentIndex + 1) % modes.length]
        get().setMode(nextMode)
      },
    }),
    {
      name: 'theme-preference',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedMode = state.mode === 'system' ? getSystemTheme() : state.mode
          applyTheme(resolvedMode)
          state.resolvedMode = resolvedMode
        }
      },
    }
  )
)

// Subscribe to system theme changes when in 'system' mode
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    const state = useThemeStore.getState()
    if (state.mode === 'system') {
      const newResolvedMode = e.matches ? 'dark' : 'light'
      applyTheme(newResolvedMode)
      useThemeStore.setState({ resolvedMode: newResolvedMode })
    }
  })
}
