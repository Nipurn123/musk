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
  general: { icon: Cpu, color: "text-blue-400" },
  explore: { icon: Target, color: "text-amber-400" },
  default: { icon: Brain, color: "text-primary" }
}

export function TaskTool({ description, prompt, subagent_type, output, status, error }: TaskToolProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const wasRunningRef = useRef(false)
  
  const agentConfig = AGENT_CONFIG[subagent_type || ""] || AGENT_CONFIG.default
  const AgentIcon = agentConfig.icon
  
  const taskName = description || prompt?.split("\n")[0]?.slice(0, 50) || "task"
  const hasOutput = output && output.length > 0

  useEffect(() => {
    if (status === "running") {
      wasRunningRef.current = true
      setIsExpanded(true)
    } else if (wasRunningRef.current && (status === "completed" || status === "error")) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
        wasRunningRef.current = false
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [status])

  return (
    <div className="p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <ChevronDown className={clsx(
          "w-4 h-4 text-textMuted/50 transition-transform duration-200",
          !isExpanded && "-rotate-90"
        )} />
        <AgentIcon className={clsx("w-4 h-4", agentConfig.color)} />
        <span className="text-[14px] text-textSecondary truncate">
          {taskName}
        </span>
        {subagent_type && (
          <span className="text-[12px] text-textMuted font-mono uppercase">
            {subagent_type}
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {prompt && (
            <div className="rounded-lg bg-surface/50 border border-border/40 overflow-hidden">
              <div className="px-3 py-2 bg-surface/30 border-b border-border/30">
                <span className="text-[12px] font-medium text-textMuted uppercase">Task</span>
              </div>
              <div className="p-3">
                <p className="text-[13px] text-textSecondary whitespace-pre-wrap break-words leading-relaxed">
                  {prompt}
                </p>
              </div>
            </div>
          )}
          
          {hasOutput && status === "completed" && (
            <div className="rounded-lg bg-surface/50 border border-border/40 overflow-hidden">
              <button
                onClick={() => setShowOutput(!showOutput)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-surface/30 border-b border-border/30 hover:bg-surface-hover/30 transition-colors"
              >
                {showOutput ? (
                  <ChevronDown className="w-4 h-4 text-textMuted/50" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-textMuted/50" />
                )}
                <span className="text-[12px] font-medium text-textMuted uppercase">Result</span>
                <span className="text-[12px] text-textMuted ml-auto tabular-nums">
                  {output.length.toLocaleString()} chars
                </span>
              </button>
              
              {showOutput && (
                <div className="p-3 max-h-48 overflow-y-auto">
                  <pre className="text-[13px] font-mono text-textMuted whitespace-pre-wrap break-words leading-relaxed">
                    {output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-2 p-3 bg-error/10 rounded-lg text-[13px] text-error">
          {error}
        </div>
      )}
    </div>
  )
}
