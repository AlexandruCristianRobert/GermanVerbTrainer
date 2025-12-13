/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Midnight Steel (Primary - Dark blue-grays)
        primary: {
          50: '#f4f6f9',
          100: '#e8ecf1',
          200: '#d6dde7',
          300: '#b8c4d6',
          400: '#94a5c0',
          500: '#7889ac',
          600: '#64719b',
          700: '#56608d',
          800: '#4a5175',
          900: '#3f455f',
          950: '#2a2d3d',
        },
        // Emerald City (Success/Accent - Vibrant greens)
        success: {
          50: '#edf9f5',
          100: '#d4f1e5',
          200: '#ace2d0',
          300: '#78cdb5',
          400: '#43b296',
          500: '#27967c',
          600: '#1b7965',
          700: '#186153',
          800: '#174d43',
          900: '#164038',
          950: '#0a2421',
        },
        // Complementary Error (Coral/Red)
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Warm Warning (Amber)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
      },
    },
  },
  plugins: [],
}