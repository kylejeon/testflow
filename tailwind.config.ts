/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        keyframes: {
          'pulse-bright': {
            '0%, 100%': { backgroundColor: '#EEF0F4' },
            '50%':       { backgroundColor: '#F8FAFC' },
          },
        },
        animation: {
          'pulse-bright': 'pulse-bright 1.5s ease-in-out infinite',
        },
        colors: {
          // Brand colors: Indigo palette (replaces teal)
          brand: {
            50:  "#EEF2FF",
            100: "#E0E7FF",
            200: "#C7D2FE",
            300: "#A5B4FC",
            400: "#818CF8",
            500: "#6366F1",
            600: "#4F46E5",
            700: "#4338CA",
            800: "#3730A3",
            900: "#312E81",
            950: "#1E1B4B",
          },
          // Accent colors: Violet palette
          accent: {
            50:  "#F5F3FF",
            100: "#EDE9FE",
            200: "#DDD6FE",
            300: "#C4B5FD",
            400: "#A78BFA",
            500: "#8B5CF6",
            600: "#7C3AED",
            700: "#6D28D9",
          },
          // Status colors: UNCHANGED — universal language, do not modify
          // status-passed:   #10B981 (emerald-500)
          // status-failed:   #EF4444 (red-500)
          // status-blocked:  #F59E0B (amber-500)
          // status-retest:   #8B5CF6 (violet-500 = accent-500)
          // status-untested: #94A3B8 (slate-400)
        },
      },
    },
    plugins: [],
  }
