/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: {
          900: '#1C1E20', // App background
          700: '#2B2E31', // Mimic background / Canvas
          500: '#4A4E52', // Borders, inactive elements
          100: '#E8E9EA', // Primary text / lines
        },
        running: {
          teal: '#4FA69C', // Normal running operation
        },
        alarm: {
          high: '#E13B3B', // High severity
          medium: '#E1A73B', // Medium severity
          low: '#3B8FE1', // Low severity / Info
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Archivo Narrow"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '2px',
        'md': '2px',
        'lg': '2px',
      }
    },
  },
  plugins: [],
}
