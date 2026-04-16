import { forwardRef, type ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"
import { clsx } from "clsx"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading = false, disabled, leftIcon, rightIcon, children, ...props },
    ref,
  ) => {
    const baseStyles = `
      relative inline-flex items-center justify-center gap-2 font-medium
      transition-all duration-200 ease-out
      disabled:opacity-50 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background
      active:scale-[0.98]
    `

    const variants = {
      primary: `
        bg-gradient-to-r from-primary to-accent
        text-white
        shadow-lg shadow-primary/25
        hover:shadow-xl hover:shadow-primary/30
        hover:brightness-110
      `,
      secondary: `
        bg-surface border-2 border-border
        text-textPrimary
        hover:bg-surface-hover hover:border-primary/30
      `,
      ghost: `
        bg-transparent
        text-textSecondary
        hover:bg-surface-hover hover:text-textPrimary
      `,
      danger: `
        bg-error
        text-white
        shadow-lg shadow-error/25
        hover:bg-error/90 hover:shadow-xl hover:shadow-error/30
      `,
    }

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-lg",
      md: "px-4 py-2.5 text-sm rounded-xl",
      lg: "px-6 py-3 text-base rounded-xl",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  },
)

Button.displayName = "Button"
