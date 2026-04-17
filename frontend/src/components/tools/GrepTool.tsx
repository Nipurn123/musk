import { useState, useEffect, useRef } from "react"
import { Search, ChevronDown, ChevronRight, FileText, CheckCircle2, Loader2 } from "lucide-react"
import { clsx } from "clsx"

interface GrepToolProps {
  pattern: string
  path?: string
  include?: string
  output?: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

interface MatchResult {
  file: string
  line: number
  column?: number
  content: string
  matchStart: number
  matchEnd: number
}

function parseGrepOutput(output: string): MatchResult[] {
  if (!output) return []
  
  const results: MatchResult[] = []
  const lines = output.split("\n")
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    const match1 = line.match(/^([^:]+):(\d+):(\d+):(.*)$/)
    if (match1) {
      const [, file, lineNum, col, content] = match1
      const colNum = parseInt(col)
      results.push({
        file,
        line: parseInt(lineNum),
        column: colNum,
        content: content.trim(),
        matchStart: colNum - 1,
        matchEnd: colNum - 1 + 10
      })
      continue
    }
    
    const match2 = line.match(/^([^:]+):(\d+):(.*)$/)
    if (match2) {
      const [, file, lineNum, content] = match2
      results.push({
        file,
        line: parseInt(lineNum),
        content: content.trim(),
        matchStart: 0,
        matchEnd: 0
      })
      continue
    }
    
    if (line.includes("Binary file") || line.startsWith("grep:")) {
      continue
    }
  }
  
  return results
}

function groupByFile(results: MatchResult[]): Map<string, MatchResult[]> {
  const grouped = new Map<string, MatchResult[]>()
  for (const result of results) {
    const existing = grouped.get(result.file) || []
    existing.push(result)
    grouped.set(result.file, existing)
  }
  return grouped
}

function highlightMatch(content: string, pattern: string): React.ReactNode {
  if (!pattern) return content
  
  try {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = content.split(regex)
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="bg-primary/15 text-primary/90 rounded px-0.5">{part}</span>
      ) : (
        part
      )
    )
  } catch {
    return content
  }
}

export function GrepTool({ pattern, path, include, output, status, error }: GrepToolProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
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
  
  const results = parseGrepOutput(output || "")
  const groupedResults = groupByFile(results)
  const fileCount = groupedResults.size
  const matchCount = results.length
  
  const toggleFile = (file: string) => {
    const next = new Set(expandedFiles)
    if (next.has(file)) {
      next.delete(file)
    } else {
      next.add(file)
    }
    setExpandedFiles(next)
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
            <Search className="w-3 h-3 text-textMuted/40 group-hover:text-textMuted/70 transition-colors" />
          )}
        </div>
        
        <code className="text-xs text-textSecondary/90 group-hover:text-textSecondary transition-colors truncate font-mono">
          {pattern || "search"}
        </code>
        
        {status === "completed" && matchCount > 0 && (
          <span className="text-[10px] text-textMuted/40 tabular-nums">
            {matchCount} in {fileCount}
          </span>
        )}
        
        {status === "completed" && matchCount === 0 && (
          <span className="text-[10px] text-textMuted/30">no matches</span>
        )}
        
        <ChevronDown className={clsx(
          "w-3 h-3 text-textMuted/25 transition-transform ml-auto",
          !isExpanded && "-rotate-90"
        )} />
      </button>
      
      {isExpanded && status === "completed" && matchCount > 0 && (
        <div className="mt-1.5 ml-4.5 border-l border-border/20 pl-2.5 space-y-0.5">
          {Array.from(groupedResults.entries()).map(([file, matches]) => (
            <div key={file} className="rounded border border-border/10 overflow-hidden bg-surface/20">
              <button
                onClick={() => toggleFile(file)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-surface/30 hover:bg-surface-hover/20 transition-colors"
              >
                {expandedFiles.has(file) ? (
                  <ChevronDown className="w-2.5 h-2.5 text-textMuted/50" />
                ) : (
                  <ChevronRight className="w-2.5 h-2.5 text-textMuted/50" />
                )}
                <FileText className="w-3 h-3 text-textMuted/50" />
                <span className="text-[11px] font-mono text-textSecondary/80 truncate flex-1 text-left">
                  {file}
                </span>
                <span className="text-[10px] text-textMuted/30 tabular-nums">
                  {matches.length}
                </span>
              </button>
              
              {expandedFiles.has(file) && (
                <div className="border-t border-border/10 bg-surface/10">
                  {matches.map((match, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 px-2 py-1 hover:bg-surface-hover/10 transition-colors border-b border-border/5 last:border-0"
                    >
                      <span className="text-[10px] text-textMuted/30 font-mono tabular-nums w-5 text-right shrink-0 pt-0.5">
                        {match.line}
                      </span>
                      <pre className="text-[11px] font-mono text-textSecondary/70 leading-relaxed whitespace-pre-wrap break-all flex-1">
                        {highlightMatch(match.content, pattern)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
