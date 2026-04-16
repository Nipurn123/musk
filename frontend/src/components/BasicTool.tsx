import React, { useState } from "react"
import { ChevronRight, LucideIcon } from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface BasicToolProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  children?: React.ReactNode
  defaultOpen?: boolean
}

export function BasicTool({ icon: Icon, title, subtitle, children, defaultOpen = false }: BasicToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="relative group/tool mb-2.5 animate-slide-up-fade">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl opacity-0 group-hover/tool:opacity-100 transition-opacity duration-300 blur-sm" />
      <div className="relative border border-border/40 rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-border/60 transition-all duration-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover/40 transition-all text-left group/btn"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/15 rounded-lg blur-sm opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200" />
            <div className="relative w-8.5 h-8.5 flex items-center justify-center rounded-lg bg-surface/80 border border-border/40 group-hover/btn:border-primary/30 group-hover/btn:bg-primary/5 transition-all duration-200">
              <Icon className="w-4 h-4 text-primary/80 group-hover/btn:text-primary transition-colors" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-textPrimary tracking-tight group-hover/btn:text-textPrimary transition-colors">{title}</div>
            {subtitle && <div className="text-xs text-textMuted truncate mt-0.5 font-mono">{subtitle}</div>}
          </div>
          {children && (
            <div
              className={cn(
                "w-6.5 h-6.5 flex items-center justify-center rounded-lg transition-all duration-200",
                "text-textMuted group-hover/btn:text-textSecondary group-hover/btn:bg-surface-hover",
                isOpen && "bg-surface-hover text-textSecondary",
              )}
            >
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-90")} />
            </div>
          )}
        </button>
        {isOpen && children && (
          <div className="border-t border-border/30 p-3 bg-background/40 backdrop-blur-sm overflow-x-auto animate-fade-in">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
