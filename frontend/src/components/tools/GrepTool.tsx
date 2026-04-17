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
        <span key={i} className="bg-primary/20 text-primary rounded px-0.5">{part}</span>
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
      }, 400)
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
          {pattern || "search"}
        </code>
        {status === "completed" && matchCount > 0 && (
          <span className="text-[13px] text-textMuted tabular-nums">
            {matchCount} matches in {fileCount} files
          </span>
        )}
        {status === "completed" && matchCount === 0 && (
          <span className="text-[13px] text-textMuted">no matches</span>
        )}
      </button>
      
      {isExpanded && status === "completed" && matchCount > 0 && (
        <div className="mt-3 space-y-2">
          {Array.from(groupedResults.entries()).map(([file, matches]) => (
            <div key={file} className="rounded-lg bg-surface/50 border border-border/40 overflow-hidden">
              <button
                onClick={() => toggleFile(file)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover/30 transition-colors"
              >
                {expandedFiles.has(file) ? (
                  <ChevronDown className="w-4 h-4 text-textMuted/50" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-textMuted/50" />
                )}
                <FileText className="w-4 h-4 text-textMuted" />
                <span className="text-[13px] font-mono text-textSecondary truncate flex-1 text-left">
                  {file}
                </span>
                <span className="text-[12px] text-textMuted tabular-nums">
                  {matches.length}
                </span>
              </button>
              
              {expandedFiles.has(file) && (
                <div className="border-t border-border/30 divide-y divide-border/20">
                  {matches.map((match, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 px-3 py-2 hover:bg-surface-hover/20 transition-colors"
                    >
                      <span className="text-[12px] text-textMuted font-mono tabular-nums w-6 text-right shrink-0 pt-0.5">
                        {match.line}
                      </span>
                      <pre className="text-[13px] font-mono text-textMuted leading-relaxed whitespace-pre-wrap break-all flex-1">
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
        <div className="mt-2 p-3 bg-error/10 rounded-lg text-[13px] text-error">
          {error}
        </div>
      )}
    </div>
  )
}
