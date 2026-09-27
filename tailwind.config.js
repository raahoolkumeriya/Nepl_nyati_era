/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        '3xl': '1792px',
        '4xl': '2160px',
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px min
        'xs': ['0.8125rem', { lineHeight: '1.125rem' }],   // 13px (was 12px)
        'sm': ['0.9375rem', { lineHeight: '1.375rem' }],   // 15px (was 14px)
        'base': ['1.0625rem', { lineHeight: '1.625rem' }], // 17px (was 16px)
        'lg': ['1.1875rem', { lineHeight: '1.75rem' }],    // 19px (was 18px)
        'xl': ['1.3125rem', { lineHeight: '1.875rem' }],   // 21px (was 20px)
        '2xl': ['1.625rem', { lineHeight: '2.125rem' }],   // 26px (was 24px)
        '3xl': ['2rem', { lineHeight: '2.5rem' }],         // 32px (was 30px)
        '4xl': ['2.5rem', { lineHeight: '2.875rem' }],      // 40px (was 36px)
        '5xl': ['3.25rem', { lineHeight: '1.1' }],         // 52px (was 48px)
        '6xl': ['4rem', { lineHeight: '1.05' }],           // 64px (was 60px)
        '7xl': ['5rem', { lineHeight: '1' }],              // 80px (was 72px)
      },
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
        serif: ['Newsreader', 'Georgia', 'serif'],
        display: ['Newsreader', 'Outfit', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'anthropic-warm': '0 20px 30px -10px rgba(20, 20, 19, 0.08), 0 1px 3px 0 rgba(20, 20, 19, 0.04)',
        'neon-cyan': '0 0 20px rgba(0, 242, 254, 0.35)',
        'neon-pink': '0 0 20px rgba(255, 0, 122, 0.35)',
        'neon-emerald': '0 0 20px rgba(0, 255, 135, 0.35)',
        'neon-violet': '0 0 25px rgba(121, 40, 202, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'subtle-lift': 'subtleLift 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
