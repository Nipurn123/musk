import { useState, useEffect, useRef } from "react"
import { Brain, ChevronDown, ChevronRight, CheckCircle2, Loader2, Cpu, Target } from "lucide-react"
import { clsx } from "clsx"

interface TaskToolProps {
  description?: string
  prompt?: string
  subagent_type?: string
  output?: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

const AGENT_CONFIG: Record<string, { icon: typeof Brain; color: string }> = {
  general: { icon: Cpu, color: "text-blue-400/70" },
  explore: { icon: Target, color: "text-amber-400/70" },
  default: { icon: Brain, color: "text-primary/70" }
}

export function TaskTool({ description, prompt, subagent_type, output, status, error }: TaskToolProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const wasRunningRef = useRef(false)
  
  const agentConfig = AGENT_CONFIG[subagent_type || ""] || AGENT_CONFIG.default
  const AgentIcon = agentConfig.icon
  
  const taskName = description || prompt?.split("\n")[0]?.slice(0, 40) || "task"
  const hasOutput = output && output.length > 0

  useEffect(() => {
    if (status === "running") {
      wasRunningRef.current = true
      setIsExpanded(true)
    } else if (wasRunningRef.current && (status === "completed" || status === "error")) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
        wasRunningRef.current = false
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [status])

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 py-0.5 px-1 w-full text-left group hover:bg-surface-hover/20 rounded transition-colors -mx-1"
      >
        <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          {status === "running" ? (
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
          ) : status === "completed" ? (
            <CheckCircle2 className="w-3 h-3 text-success/60" strokeWidth={2.5} />
          ) : (
            <AgentIcon className={clsx("w-3 h-3", agentConfig.color, "opacity-50 group-hover:opacity-80 transition-opacity")} />
          )}
        </div>
        
        <span className="text-xs text-textSecondary/90 group-hover:text-textSecondary transition-colors truncate">
          {taskName}
        </span>
        
        <ChevronDown className={clsx(
          "w-3 h-3 text-textMuted/25 transition-transform ml-auto",
          !isExpanded && "-rotate-90"
        )} />
      </button>
      
      {isExpanded && (
        <div className="mt-1.5 ml-4.5 border-l border-border/20 pl-2.5 space-y-1.5">
          {subagent_type && (
            <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-surface/30 border border-border/10 rounded">
              <AgentIcon className={clsx("w-2.5 h-2.5", agentConfig.color)} />
              <span className="text-[10px] font-mono text-textMuted/50 uppercase tracking-wider">
                {subagent_type}
              </span>
            </div>
          )}
          
          {prompt && (
            <div className="rounded border border-border/10 overflow-hidden bg-surface/20">
              <div className="px-2 py-1 bg-surface/30 border-b border-border/5">
                <span className="text-[9px] font-bold text-textMuted/40 uppercase tracking-wider">Task</span>
              </div>
              <div className="p-2">
                <p className="text-[11px] text-textSecondary/70 whitespace-pre-wrap break-words leading-relaxed">
                  {prompt}
                </p>
              </div>
            </div>
          )}
          
          {hasOutput && status === "completed" && (
            <div className="rounded border border-border/10 overflow-hidden bg-surface/20">
              <button
                onClick={() => setShowOutput(!showOutput)}
                className="w-full flex items-center gap-1.5 px-2 py-1 bg-surface/30 border-b border-border/5 hover:bg-surface-hover/20 transition-colors"
              >
                {showOutput ? (
                  <ChevronDown className="w-2.5 h-2.5 text-textMuted/50" />
                ) : (
                  <ChevronRight className="w-2.5 h-2.5 text-textMuted/50" />
                )}
                <span className="text-[9px] font-bold text-textMuted/40 uppercase tracking-wider">
                  Result
                </span>
                <span className="text-[9px] text-textMuted/30 ml-auto tabular-nums">
                  {output.length.toLocaleString()}
                </span>
              </button>
              
              {showOutput && (
                <div className="p-2 max-h-40 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-textSecondary/70 whitespace-pre-wrap break-words leading-relaxed">
                    {output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="ml-4.5 mt-1 p-2 bg-error/10 rounded text-[11px] text-error/90">
          {error}
        </div>
      )}
    </div>
  )
}
