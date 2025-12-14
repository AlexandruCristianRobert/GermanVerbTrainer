/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme backgrounds (Hyperspace-inspired)
        dark: {
          950: '#050505',  // Darkest
          900: '#0a0a0a',  // Main background
          800: '#121212',  // Card backgrounds
          700: '#1a1a1a',  // Secondary backgrounds
          600: '#2a2a2a',  // Borders
          500: '#3a3a3a',  // Muted elements
          400: '#4a4a4a',  // Disabled states
        },
        // Accent colors (Cyan/Purple gradient palette)
        accent: {
          cyan: '#00d4ff',
          'cyan-dark': '#00a8cc',
          purple: '#a855f7',
          'purple-dark': '#7c3aed',
          pink: '#ec4899',
        },
        // Primary - now using cyan accent
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#00d4ff',
          600: '#00a8cc',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Success (keeping green)
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Error (Coral/Red)
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
        // Warning (Amber)
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
      backgroundImage: {
        // Gradient backgrounds
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
        'gradient-accent-reverse': 'linear-gradient(135deg, #a855f7 0%, #00d4ff 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow-accent': '0 0 30px rgba(0, 212, 255, 0.2), 0 0 60px rgba(168, 85, 247, 0.1)',
        'card-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 212, 255, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}