import { useState, useEffect, useRef } from "react"
import { Globe, ExternalLink, ChevronDown, CheckCircle2, Loader2, Copy, Check } from "lucide-react"
import { clsx } from "clsx"

interface WebFetchToolProps {
  url: string
  format?: string
  output?: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

export function WebFetchTool({ url, format, output, status, error }: WebFetchToolProps) {
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
  
  const displayUrl = url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || ""
  const domain = displayUrl.split("/")[0]
  
  const truncatedOutput = output && output.length > 1500 
    ? output.slice(0, 1500) + "\n\n... (truncated)"
    : output

  const handleCopy = async () => {
    if (output) {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
            <Globe className="w-3 h-3 text-textMuted/40 group-hover:text-textMuted/70 transition-colors" />
          )}
        </div>
        
        <span className="text-xs text-textSecondary/90 group-hover:text-textSecondary transition-colors truncate font-mono">
          {domain || "fetch"}
        </span>
        
        {status === "completed" && output && (
          <span className="text-[10px] text-textMuted/40 tabular-nums">
            {output.length.toLocaleString()}
          </span>
        )}
        
        <ChevronDown className={clsx(
          "w-3 h-3 text-textMuted/25 transition-transform ml-auto",
          !isExpanded && "-rotate-90"
        )} />
      </button>
      
      {isExpanded && url && (
        <div className="ml-4.5 mt-1.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface/30 border border-border/10 rounded hover:border-primary/20 hover:bg-surface-hover/20 transition-all group/url"
          >
            <Globe className="w-2.5 h-2.5 text-textMuted/50 group-hover/url:text-primary/70 transition-colors" />
            <span className="text-[11px] font-mono text-textSecondary/70 group-hover/url:text-primary/80 transition-colors truncate max-w-[200px]">
              {displayUrl}
            </span>
            <ExternalLink className="w-2.5 h-2.5 text-textMuted/25 group-hover/url:text-primary/50 transition-colors" />
          </a>
        </div>
      )}
      
      {isExpanded && status === "completed" && output && (
        <div className="ml-4.5 mt-1.5 rounded border border-border/10 overflow-hidden bg-surface/20">
          <div className="flex items-center justify-between px-2 py-1 bg-surface/30 border-b border-border/5">
            <span className="text-[9px] font-bold text-textMuted/40 uppercase tracking-wider">
              {format || "markdown"}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-textMuted/50 hover:text-textMuted hover:bg-surface-hover/30 transition-all"
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
          <div className="p-2 max-h-40 overflow-y-auto">
            <pre className="text-[11px] font-mono text-textSecondary/70 whitespace-pre-wrap break-words leading-relaxed">
              {truncatedOutput}
            </pre>
          </div>
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
