import React, { useState } from "react"
import { ChevronDown, LucideIcon, CheckCircle2, Loader2 } from "lucide-react"
import { clsx } from "clsx"

interface BasicToolProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  children?: React.ReactNode
  defaultOpen?: boolean
  status?: "running" | "completed" | "error" | "pending"
}

export function BasicTool({ icon: Icon, title, subtitle, children, defaultOpen = false, status }: BasicToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 py-1 px-1 text-left group hover:bg-surface-hover/30 rounded-lg transition-all duration-200 -mx-1"
      >
        <div className="w-[15px] h-[15px] flex items-center justify-center shrink-0">
          {status === "running" ? (
            <Loader2 className="w-[13px] h-[13px] text-primary animate-spin" />
          ) : (
            <Icon className="w-[14px] h-[14px] text-textMuted group-hover:text-textSecondary transition-colors" />
          )}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[13.5px] text-textSecondary font-medium group-hover:text-textPrimary transition-colors truncate">{title}</span>
          {subtitle && (
            <span className="text-[12px] text-textMuted/60 font-mono truncate hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">{subtitle}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {status === "completed" && (
            <CheckCircle2 className="w-[14px] h-[14px] text-success/70" strokeWidth={2.5} />
          )}
          {status === "running" && (
            <span className="text-[10px] text-primary/80 font-bold tracking-widest uppercase">Running</span>
          )}
          {children && (
            <ChevronDown className={clsx(
              "w-3 h-3 text-textMuted/40 group-hover:text-textMuted/80 transition-all duration-200",
              isOpen && "rotate-180"
            )} />
          )}
        </div>
      </button>

      {/* Subtitle mobile only or when open? Actually subtitle in group-hover is nice */}

      {isOpen && children && (
        <div className="pl-[27px] mt-1.5 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
