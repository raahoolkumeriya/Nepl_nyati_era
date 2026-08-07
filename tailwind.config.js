/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#050811',
          900: '#070b14',
          850: '#0b1120',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
          500: '#475569',
        },
        neon: {
          cyan: '#00f2fe',
          blue: '#00c6ff',
          violet: '#7928ca',
          pink: '#ff007a',
          emerald: '#00ff87',
          amber: '#ffb703',
          purple: '#9d4edd',
        },
        // Legacy mapping for compatibility
        warm: {
          950: '#070b14',
          900: '#0b1120',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
          500: '#475569',
          400: '#64748b',
        },
        sand: {
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#94a3b8',
          600: '#64748b',
          700: '#475569',
          800: '#334155',
        },
        terracotta: {
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
        },
        cricket: {
          emerald: '#00ff87',
          gold: '#ffb703',
          crimson: '#ff007a',
          cyan: '#00f2fe',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        serif: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 242, 254, 0.35)',
        'neon-pink': '0 0 20px rgba(255, 0, 122, 0.35)',
        'neon-emerald': '0 0 20px rgba(0, 255, 135, 0.35)',
        'neon-violet': '0 0 25px rgba(121, 40, 202, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'fade-in-up': 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shake': 'shake 0.6s ease-in-out',
      },
      keyframes: {
        glowPulse: {
          '0%': { boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 242, 254, 0.6)' },
        },
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(12px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-8px)' },
          '30%': { transform: 'translateX(8px)' },
          '45%': { transform: 'translateX(-6px)' },
          '60%': { transform: 'translateX(6px)' },
          '75%': { transform: 'translateX(-3px)' },
          '90%': { transform: 'translateX(3px)' },
        },
      },
    },
  },
  plugins: [],
}
