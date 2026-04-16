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
              "opacity-0 group-focus-within:opacity-100",
              "bg-gradient-to-r from-primary/20 to-accent/20 blur-xl",
            )}
          />
          <div className="relative">
            {leftIcon && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted transition-colors duration-200 group-focus-within:text-primary">
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              className={clsx(
                "w-full px-4 py-3",
                leftIcon && "pl-12",
                rightIcon && "pr-12",
                "bg-surface/50 border-2 border-border rounded-xl",
                "text-textPrimary placeholder:text-textMuted/70 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-50",
                "focus:outline-none focus:border-primary/50 focus:bg-surface focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                "hover:border-border/80",
                "transition-all duration-200",
                "shadow-sm focus:shadow-md focus:shadow-primary/5",
                error && "border-error/50 focus:border-error focus-visible:ring-error/30",
                className,
              )}
              {...props}
            />
            {rightIcon && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted transition-colors duration-200 group-focus-within:text-accent">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        {error && (
          <p className="text-xs text-error animate-slide-up-fade flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-error" />
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = "Input"
