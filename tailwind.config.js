/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0B132B',        // Background ultra dark navy
          surface: '#141E38',   // Main card/surface navy
          card: '#1C2951',      // Higher elevation card
          border: '#283866',    // Slate navy borders
          input: '#0F172A',     // Inputs background
          primary: '#2563EB',   // Electric Blue
          primaryHover: '#1D4ED8',
          accent: '#38BDF8',    // Sky blue highlight
          success: '#10B981',   // Emerald
          successDark: '#047857',
          warning: '#F59E0B',   // Amber
          danger: '#EF4444',    // Ruby red
          dangerDark: '#B91C1C',
          text: '#F8FAFC',      // Crisp light text
          muted: '#94A3B8'      // Secondary text
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
