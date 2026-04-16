/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--color-background) / <alpha-value>)',
        surface: 'hsl(var(--color-surface) / <alpha-value>)',
        surfaceHover: 'hsl(var(--color-surface-hover) / <alpha-value>)',
        surfaceActive: 'hsl(var(--color-surface-active) / <alpha-value>)',
        border: 'hsl(var(--color-border) / <alpha-value>)',
        borderSubtle: 'hsl(var(--color-border-subtle) / <alpha-value>)',
        textPrimary: 'hsl(var(--color-text-primary) / <alpha-value>)',
        textSecondary: 'hsl(var(--color-text-secondary) / <alpha-value>)',
        textMuted: 'hsl(var(--color-text-muted) / <alpha-value>)',
        primary: 'hsl(var(--color-primary) / <alpha-value>)',
        primaryHover: 'hsl(var(--color-primary-hover) / <alpha-value>)',
        primaryGlow: 'hsl(var(--color-primary-glow) / <alpha-value>)',
        accent: 'hsl(var(--color-accent) / <alpha-value>)',
        accentGlow: 'hsl(var(--color-accent-glow) / <alpha-value>)',
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        error: 'hsl(var(--color-error) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'glow': 'var(--shadow-glow)',
        'elevated': 'var(--shadow-elevated)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px hsl(var(--color-primary) / 0.3)' },
          '50%': { boxShadow: '0 0 40px hsl(var(--color-primary) / 0.6)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.22, 1.36, 0.55, 1)',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};