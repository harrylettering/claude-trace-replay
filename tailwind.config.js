
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        muted: 'var(--text-muted)',
        border: 'var(--border-default)',

        // Surface colors (card/panel backgrounds)
        surface: {
          DEFAULT: 'var(--bg-secondary)',
          hover: 'var(--bg-tertiary)',
        },

        // Content colors (text)
        content: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },

        // Semantic colors (consistent across themes)
        user: '#3b82f6',
        assistant: '#8b5cf6',
        system: '#6b7280',
        tool: '#f59e0b',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
