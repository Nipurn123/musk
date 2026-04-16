import { forwardRef, type InputHTMLAttributes } from "react"
import { clsx } from "clsx"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label className="block text-sm font-medium text-textSecondary">{label}</label>}
        <div className="relative group">
          <div
            className={clsx(
              "absolute inset-0 rounded-xl transition-opacity duration-300",
              props.onFocus ? "opacity-100" : "opacity-0",
              "bg-gradient-to-r from-primary/20 to-accent/20 blur-xl",
            )}
          />
          <div className="relative">
            {leftIcon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted">{leftIcon}</div>}
            <input
              ref={ref}
              className={clsx(
                "w-full px-4 py-3",
                leftIcon && "pl-12",
                rightIcon && "pr-12",
                "bg-surface/50 border-2 border-border rounded-xl",
                "text-textPrimary placeholder:text-textMuted",
                "focus:outline-none focus:border-primary/50 focus:bg-surface",
                "hover:border-border/80",
                "transition-all duration-300",
                error && "border-error/50 focus:border-error",
                className,
              )}
              {...props}
            />
            {rightIcon && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted">{rightIcon}</div>}
          </div>
        </div>
        {error && <p className="text-xs text-error animate-fade-in">{error}</p>}
      </div>
    )
  },
)

Input.displayName = "Input"
