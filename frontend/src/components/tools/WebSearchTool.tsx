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
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [status])
  
  const results = parseSearchResults(output || "")

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
        <span className="text-[14px] text-textSecondary truncate">
          {query || "search"}
        </span>
        {status === "completed" && results.length > 0 && (
          <span className="text-[13px] text-textMuted tabular-nums">
            {results.length} results
          </span>
        )}
      </button>
      
      {isExpanded && status === "completed" && results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="rounded-lg bg-surface/50 border border-border/40 overflow-hidden"
            >
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 hover:bg-surface-hover/30 transition-colors group"
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-medium text-textSecondary group-hover:text-primary transition-colors truncate">
                      {result.title}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-textMuted/30 group-hover:text-primary/50 transition-colors shrink-0" />
                  </div>
                  <span className="text-[12px] text-textMuted font-mono">
                    {getDomain(result.url)}
                  </span>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
      
      {isExpanded && status === "completed" && results.length === 0 && output && (
        <div className="mt-3 rounded-lg bg-surface/50 border border-border/40 p-3 max-h-40 overflow-y-auto">
          <pre className="text-[13px] font-mono text-textMuted whitespace-pre-wrap break-words">
            {output.slice(0, 1000)}
            {output.length > 1000 && "..."}
          </pre>
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
