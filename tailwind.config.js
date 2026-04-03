
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
