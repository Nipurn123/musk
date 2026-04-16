/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--color-background) / <alpha-value>)",
        surface: "hsl(var(--color-surface) / <alpha-value>)",
        "surface-hover": "hsl(var(--color-surface-hover) / <alpha-value>)",
        "surface-active": "hsl(var(--color-surface-active) / <alpha-value>)",
        border: "hsl(var(--color-border) / <alpha-value>)",
        "border-subtle": "hsl(var(--color-border-subtle) / <alpha-value>)",
        textPrimary: "hsl(var(--color-text-primary) / <alpha-value>)",
        textSecondary: "hsl(var(--color-text-secondary) / <alpha-value>)",
        textMuted: "hsl(var(--color-text-muted) / <alpha-value>)",
        primary: "hsl(var(--color-primary) / <alpha-value>)",
        primaryHover: "hsl(var(--color-primary-hover) / <alpha-value>)",
        accent: "hsl(var(--color-accent) / <alpha-value>)",
        success: "hsl(var(--color-success) / <alpha-value>)",
        warning: "hsl(var(--color-warning) / <alpha-value>)",
        error: "hsl(var(--color-error) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      letterSpacing: {
        display: "-0.02em",
        label: "0.1em",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
