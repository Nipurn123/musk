/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--color-background) / <alpha-value>)",
        surface: "hsl(var(--color-surface) / <alpha-value>)",
        surfaceHover: "hsl(var(--color-surface-hover) / <alpha-value>)",
        border: "hsl(var(--color-border) / <alpha-value>)",
        textPrimary: "hsl(var(--color-text-primary) / <alpha-value>)",
        textSecondary: "hsl(var(--color-text-secondary) / <alpha-value>)",
        textMuted: "hsl(var(--color-text-muted) / <alpha-value>)",
        primary: "hsl(var(--color-primary) / <alpha-value>)",
        primaryHover: "hsl(var(--color-primary-hover) / <alpha-value>)",
        primaryGlow: "hsl(var(--color-primary-glow) / <alpha-value>)",
        success: "hsl(var(--color-success) / <alpha-value>)",
        warning: "hsl(var(--color-warning) / <alpha-value>)",
        error: "hsl(var(--color-error) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
