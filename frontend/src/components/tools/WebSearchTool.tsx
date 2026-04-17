import { useState, useEffect, useRef } from "react"
import { Search, ChevronDown, ExternalLink, CheckCircle2, Loader2 } from "lucide-react"
import { clsx } from "clsx"

interface WebSearchToolProps {
  query?: string
  output?: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

interface SearchResult {
  title: string
  url: string
  snippet?: string
}

function parseSearchResults(output: string): SearchResult[] {
  if (!output) return []
  
  const results: SearchResult[] = []
  const lines = output.split("\n")
  
  let currentResult: Partial<SearchResult> = {}
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (currentResult.title && currentResult.url) {
        results.push(currentResult as SearchResult)
      }
      currentResult = {}
      continue
    }
    
    const urlMatch = trimmed.match(/^(https?:\/\/[^\s]+)/)
    if (urlMatch) {
      currentResult.url = urlMatch[1]
      continue
    }
    
    if (trimmed.match(/^\d+\.\s/) || trimmed.match(/^[•\-\*]\s/)) {
      if (currentResult.title && currentResult.url) {
        results.push(currentResult as SearchResult)
      }
      currentResult = { title: trimmed.replace(/^\d+\.\s*/, "").replace(/^[•\-\*]\s*/, "") }
      continue
    }
    
    if (currentResult.title && !currentResult.snippet && trimmed.length > 20) {
      currentResult.snippet = trimmed
    }
  }
  
  if (currentResult.title && currentResult.url) {
    results.push(currentResult as SearchResult)
  }
  
  if (results.length === 0) {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
    let match
    while ((match = linkPattern.exec(output)) !== null) {
      results.push({
        title: match[1],
        url: match[2]
      })
    }
  }
  
  return results.slice(0, 10)
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

export function WebSearchTool({ query, output, status, error }: WebSearchToolProps) {
  const [isExpanded, setIsExpanded] = useState(false)
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
  
  const results = parseSearchResults(output || "")

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
            <Search className="w-3 h-3 text-textMuted/40 group-hover:text-textMuted/70 transition-colors" />
          )}
        </div>
        
        <span className="text-xs text-textSecondary/90 group-hover:text-textSecondary transition-colors truncate">
          {query || "search"}
        </span>
        
        {status === "completed" && results.length > 0 && (
          <span className="text-[10px] text-textMuted/40 tabular-nums">
            {results.length} results
          </span>
        )}
        
        <ChevronDown className={clsx(
          "w-3 h-3 text-textMuted/25 transition-transform ml-auto",
          !isExpanded && "-rotate-90"
        )} />
      </button>
      
      {isExpanded && status === "completed" && results.length > 0 && (
        <div className="mt-1.5 ml-4.5 border-l border-border/20 pl-2.5 space-y-0.5">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="rounded border border-border/10 overflow-hidden bg-surface/20"
            >
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1.5 p-1.5 hover:bg-surface-hover/20 transition-colors group"
              >
                <div className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-primary/80">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[11px] font-medium text-textSecondary/90 group-hover:text-primary/80 transition-colors truncate">
                      {result.title}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5 text-textMuted/20 group-hover:text-primary/50 transition-colors shrink-0" />
                  </div>
                  <span className="text-[10px] text-textMuted/40 font-mono">
                    {getDomain(result.url)}
                  </span>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
      
      {isExpanded && status === "completed" && results.length === 0 && output && (
        <div className="ml-4.5 mt-1.5 rounded border border-border/10 overflow-hidden bg-surface/20 p-2 max-h-32 overflow-y-auto">
          <pre className="text-[11px] font-mono text-textSecondary/70 whitespace-pre-wrap break-words">
            {output.slice(0, 1000)}
            {output.length > 1000 && "..."}
          </pre>
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
