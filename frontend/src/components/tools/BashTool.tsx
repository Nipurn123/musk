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
      }, 400)
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
    <div className="p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <ChevronDown className={clsx(
          "w-4 h-4 text-textMuted/50 transition-transform duration-200",
          !isExpanded && "-rotate-90"
        )} />
        <code className="text-[14px] text-textSecondary font-mono truncate">
          {command ? command.split(" ")[0] : "bash"}
        </code>
        {description && (
          <span className="text-[13px] text-textMuted truncate">
            {description}
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-3 rounded-lg bg-[#0c0e12] border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface/50 border-b border-border/30">
            <Terminal className="w-4 h-4 text-emerald-500/70" />
            <span className="text-[12px] font-mono text-textMuted">
              {workdir || "terminal"}
            </span>
          </div>
          
          {command && (
            <div className="px-3 py-2 border-b border-border/20">
              <pre className="text-[13px] font-mono text-emerald-400 whitespace-pre-wrap break-all">
                <span className="text-emerald-500/50 mr-2 select-none">$</span>
                {command}
              </pre>
            </div>
          )}
          
          {output && status === "completed" && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface/80 text-[12px] text-textMuted hover:text-textSecondary transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span className="text-success">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 pt-10 max-h-60 overflow-y-auto">
                <pre className="text-[13px] font-mono text-textMuted whitespace-pre-wrap break-all leading-relaxed">
                  {truncatedOutput}
                </pre>
              </div>
            </div>
          )}
          
          {error && (
            <div className="px-3 py-2 border-t border-error/20 bg-error/5">
              <pre className="text-[13px] font-mono text-error whitespace-pre-wrap break-all">
                {error}
              </pre>
            </div>
          )}
          
          {status === "running" && (
            <div className="px-3 py-2 border-t border-border/20">
              <div className="flex items-center gap-2 text-[13px] text-textMuted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
