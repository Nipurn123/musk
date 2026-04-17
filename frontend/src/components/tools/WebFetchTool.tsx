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
      }, 400)
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
    <div className="p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <ChevronDown className={clsx(
          "w-4 h-4 text-textMuted/50 transition-transform duration-200",
          !isExpanded && "-rotate-90"
        )} />
        <span className="text-[14px] text-textSecondary font-mono truncate">
          {domain || "fetch"}
        </span>
        {status === "completed" && output && (
          <span className="text-[13px] text-textMuted tabular-nums">
            {output.length.toLocaleString()} chars
          </span>
        )}
      </button>
      
      {isExpanded && url && (
        <div className="mt-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface/50 border border-border/40 rounded-lg hover:border-primary/30 hover:bg-surface-hover/30 transition-all group/url"
          >
            <Globe className="w-4 h-4 text-textMuted group-hover/url:text-primary/70 transition-colors" />
            <span className="text-[13px] font-mono text-textSecondary group-hover/url:text-primary/80 transition-colors truncate max-w-[250px]">
              {displayUrl}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-textMuted/50 group-hover/url:text-primary/50 transition-colors" />
          </a>
        </div>
      )}
      
      {isExpanded && status === "completed" && output && (
        <div className="mt-3 rounded-lg bg-surface/50 border border-border/40 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-surface/30 border-b border-border/30">
            <span className="text-[12px] font-medium text-textMuted uppercase">
              {format || "markdown"}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-textMuted hover:text-textSecondary hover:bg-surface-hover/30 transition-colors"
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
          <div className="p-3 max-h-48 overflow-y-auto">
            <pre className="text-[13px] font-mono text-textMuted whitespace-pre-wrap break-words leading-relaxed">
              {truncatedOutput}
            </pre>
          </div>
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
