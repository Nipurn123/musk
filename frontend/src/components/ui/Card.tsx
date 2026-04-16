import { type ReactNode } from "react"
import { clsx } from "clsx"

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
  glow?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover = false, gradient = false, glow = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative rounded-2xl p-6",
        "glass-strong",
        hover && "hover-lift cursor-pointer",
        glow && "hover-glow",
        gradient && "border-gradient",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={clsx("mb-4 pb-4 border-b border-border/50", className)}>{children}</div>
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <h3 className={clsx("text-lg font-bold text-textPrimary", className)}>{children}</h3>
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return <p className={clsx("text-sm text-textSecondary mt-1", className)}>{children}</p>
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={clsx("", className)}>{children}</div>
}
