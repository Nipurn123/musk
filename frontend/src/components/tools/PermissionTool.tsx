import { useState } from "react"
import { Shield, AlertTriangle, ChevronDown, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { clsx } from "clsx"

interface PermissionToolProps {
  permission: string
  patterns?: string[]
  risk?: "low" | "medium" | "high"
  message?: string
  status: "pending" | "approved" | "denied" | "running"
  onApprove?: () => void
  onDeny?: () => void
}

const RISK_CONFIG = {
  low: {
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    icon: Shield,
    label: "Low risk"
  },
  medium: {
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    icon: AlertTriangle,
    label: "Medium risk"
  },
  high: {
    color: "text-error",
    bg: "bg-error/10",
    border: "border-error/20",
    icon: AlertTriangle,
    label: "High risk"
  }
}

export function PermissionTool({
  permission,
  patterns,
  risk = "low",
  message,
  status,
  onApprove,
  onDeny
}: PermissionToolProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const riskConfig = RISK_CONFIG[risk]
  const RiskIcon = riskConfig.icon

  const getPermissionLabel = (perm: string): string => {
    const labels: Record<string, string> = {
      external_directory: "External Directory Access",
      file_write: "File Write Access",
      file_delete: "File Delete Access",
      command_execute: "Command Execution",
      network_access: "Network Access",
      environment_access: "Environment Access"
    }
    return labels[perm] || perm.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2.5 py-1 px-1 w-full text-left group hover:bg-surface-hover/30 rounded-lg transition-all -mx-1"
      >
        <div className="w-[15px] h-[15px] flex items-center justify-center">
          {status === "running" ? (
            <Loader2 className="w-[13px] h-[13px] text-primary animate-spin" />
          ) : status === "approved" ? (
            <CheckCircle2 className="w-[13px] h-[13px] text-success" />
          ) : status === "denied" ? (
            <XCircle className="w-[13px] h-[13px] text-error" />
          ) : (
            <Shield className={clsx("w-[14px] h-[14px]", riskConfig.color, "opacity-70 group-hover:opacity-100 transition-opacity")} />
          )}
        </div>
        
        <span className="text-[13.5px] text-textSecondary font-medium group-hover:text-textPrimary transition-colors">
          Permission Request
        </span>
        
        <span className={clsx("text-[10px] font-bold uppercase tracking-widest", riskConfig.color)}>
          {riskConfig.label}
        </span>
        
        {status === "approved" && (
          <CheckCircle2 className="w-[14px] h-[14px] text-success/70 ml-auto" strokeWidth={2.5} />
        )}
        
        {status === "denied" && (
          <XCircle className="w-[14px] h-[14px] text-error/70 ml-auto" strokeWidth={2.5} />
        )}
        
        {status === "pending" && (
          <span className="text-[10px] text-primary/80 font-bold tracking-widest uppercase ml-auto">
            Awaiting
          </span>
        )}
        
        <ChevronDown className={clsx(
          "w-3 h-3 text-textMuted/40 transition-transform ml-1",
          !isExpanded && "-rotate-90"
        )} />
      </button>
      
      {/* Permission card */}
      {isExpanded && (
        <div className="ml-[27px]">
          <div className={clsx(
            "rounded-xl border overflow-hidden",
            riskConfig.border,
            riskConfig.bg
          )}>
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-surface/50 border-b border-border/20">
              <RiskIcon className={clsx("w-4 h-4", riskConfig.color)} />
              <span className="text-[13px] font-medium text-textPrimary">
                {getPermissionLabel(permission)}
              </span>
            </div>
            
            {/* Patterns */}
            {patterns && patterns.length > 0 && (
              <div className="px-3 py-2 border-b border-border/10">
                <div className="text-[10px] font-bold text-textMuted/60 uppercase tracking-widest mb-1.5">
                  Patterns
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {patterns.map((pattern, idx) => (
                    <code
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded bg-surface/50 border border-border/30 font-mono text-textSecondary"
                    >
                      {pattern}
                    </code>
                  ))}
                </div>
              </div>
            )}
            
            {/* Message */}
            {message && (
              <div className="px-3 py-2 border-b border-border/10">
                <p className="text-[12px] text-textSecondary leading-relaxed">
                  {message}
                </p>
              </div>
            )}
            
            {/* Warning */}
            <div className="px-3 py-2 bg-surface/30">
              <p className="text-[11px] text-textMuted/70 italic">
                Only approve permissions from trusted sources. This action may modify files or execute commands.
              </p>
            </div>
            
            {/* Actions */}
            {status === "pending" && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-surface/50 border-t border-border/20">
                <button
                  onClick={onDeny}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border/50 text-[12px] font-medium text-textMuted hover:text-textPrimary hover:border-border transition-all"
                >
                  Deny
                </button>
                <button
                  onClick={onApprove}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-[12px] font-medium text-white hover:bg-primary-hover transition-all"
                >
                  Allow Once
                </button>
                <button
                  onClick={() => {/* Always allow logic */}}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface-hover border border-border/50 text-[12px] font-medium text-textSecondary hover:text-textPrimary hover:border-primary/30 transition-all"
                >
                  Always Allow
                </button>
              </div>
            )}
            
            {/* Status indicator */}
            {status !== "pending" && (
              <div className={clsx(
                "px-3 py-2 border-t border-border/20 flex items-center gap-2",
                status === "approved" && "bg-success/5",
                status === "denied" && "bg-error/5"
              )}>
                {status === "approved" && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-[12px] text-success font-medium">Permission granted</span>
                  </>
                )}
                {status === "denied" && (
                  <>
                    <XCircle className="w-4 h-4 text-error" />
                    <span className="text-[12px] text-error font-medium">Permission denied</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
