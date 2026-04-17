import { useState, useEffect, useRef } from "react"
import { Terminal, ChevronDown, CheckCircle2, Loader2, Copy, Check } from "lucide-react"
import { clsx } from "clsx"

interface BashToolProps {
  command: string
  description?: string
  workdir?: string
  output?: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

export function BashTool({ command, description, workdir, output, status, error }: BashToolProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const wasRunningRef = useRef(false)

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
  
  const handleCopy = async () => {
    if (output) {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  const truncatedOutput = output && output.length > 3000 
    ? output.slice(0, 3000) + "\n\n... (truncated)"
    : output

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
            <Terminal className="w-3 h-3 text-textMuted/40 group-hover:text-textMuted/70 transition-colors" />
          )}
        </div>
        
        <code className="text-xs text-textSecondary/90 group-hover:text-textSecondary transition-colors truncate font-mono">
          {command ? command.split(" ")[0] : "bash"}
        </code>
        
        {description && (
          <span className="text-[11px] text-textMuted/50 truncate">
            {description}
          </span>
        )}
        
        <ChevronDown className={clsx(
          "w-3 h-3 text-textMuted/25 transition-transform ml-auto",
          !isExpanded && "-rotate-90"
        )} />
      </button>
      
      {isExpanded && (
        <div className="mt-1.5 ml-4.5 border-l border-border/20 pl-2.5">
          <div className="bg-[#0c0e12]/80 rounded border border-white/5 overflow-hidden">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border-b border-white/5">
              <Terminal className="w-2.5 h-2.5 text-emerald-400/50" />
              <span className="text-[10px] font-mono text-textMuted/40 uppercase tracking-wider">
                {workdir || "sh"}
              </span>
            </div>
            
            {command && (
              <div className="p-2 border-b border-white/5">
                <pre className="text-xs font-mono text-emerald-400/80 whitespace-pre-wrap break-all leading-relaxed">
                  <span className="text-emerald-500/30 mr-1 select-none">$</span>
                  {command}
                </pre>
              </div>
            )}
            
            {output && status === "completed" && (
              <div className="relative">
                <div className="absolute top-1 right-1 z-10">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-textMuted/60 hover:text-textMuted hover:bg-white/10 transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-2.5 h-2.5 text-success/80" />
                        <span className="text-success/80">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2 pt-7 max-h-52 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-zinc-500 whitespace-pre-wrap break-all leading-relaxed">
                    {truncatedOutput}
                  </pre>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-2 border-t border-red-500/10 bg-red-500/5">
                <pre className="text-[11px] font-mono text-red-400/90 whitespace-pre-wrap break-all">
                  {error}
                </pre>
              </div>
            )}
            
            {status === "running" && (
              <div className="p-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[11px] text-textMuted/50">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Running...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
