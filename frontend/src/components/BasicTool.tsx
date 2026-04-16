import React, { useState } from "react"
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react"
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
    <div className="relative group mb-3">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative border border-border/50 rounded-xl overflow-hidden bg-surface/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 p-3.5 hover:bg-surfaceHover/50 transition-all text-left group/btn"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-lg blur-sm" />
            <div className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border/50 group-hover/btn:border-primary/30 transition-colors">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-textPrimary tracking-tight">{title}</div>
            {subtitle && <div className="text-xs text-textMuted truncate mt-0.5 font-mono">{subtitle}</div>}
          </div>
          {children && (
            <div
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                "text-textMuted group-hover/btn:bg-surfaceHover",
                isOpen && "bg-surfaceHover",
              )}
            >
              <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-90")} />
            </div>
          )}
        </button>
        {isOpen && children && (
          <div className="border-t border-border/30 p-3.5 bg-background/30 backdrop-blur-sm overflow-x-auto animate-fade-in">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
