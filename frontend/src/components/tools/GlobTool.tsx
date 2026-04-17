import { useState, useEffect, useRef } from "react"
import { FolderSearch, File, FileCode, FileText, Image, FileJson, ChevronDown, CheckCircle2, Loader2 } from "lucide-react"
import { clsx } from "clsx"

interface GlobToolProps {
  pattern: string
  path?: string
  output?: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

const FILE_ICONS: Record<string, typeof File> = {
  ts: FileCode, tsx: FileCode, js: FileCode, jsx: FileCode,
  py: FileCode, rs: FileCode, go: FileCode, java: FileCode,
  json: FileJson, md: FileText, txt: FileText,
  png: Image, jpg: Image, jpeg: Image, gif: Image, svg: Image, webp: Image,
  css: FileCode, scss: FileCode, html: FileCode,
}

function getFileExt(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
}

function getFileIcon(filename: string): typeof File {
  const ext = getFileExt(filename)
  return FILE_ICONS[ext] || File
}

function parseGlobOutput(output: string): string[] {
  if (!output) return []
  
  const files: string[] = []
  const lines = output.split("\n")
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("Found") && !trimmed.startsWith("No files")) {
      const file = trimmed.split(/\s+/).pop() || trimmed
      if (file && !file.includes(":")) {
        files.push(file)
      }
    }
  }
  
  return files
}

function groupByDirectory(files: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  
  for (const file of files) {
    const parts = file.split("/")
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "."
    const filename = parts[parts.length - 1]
    
    const existing = grouped.get(dir) || []
    existing.push(filename)
    grouped.set(dir, existing)
  }
  
  return grouped
}

export function GlobTool({ pattern, path, output, status, error }: GlobToolProps) {
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
  
  const files = parseGlobOutput(output || "")
  const groupedFiles = groupByDirectory(files)
  const fileCount = files.length
  
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
            <FolderSearch className="w-3 h-3 text-textMuted/40 group-hover:text-textMuted/70 transition-colors" />
          )}
        </div>
        
        <code className="text-xs text-textSecondary/90 group-hover:text-textSecondary transition-colors truncate font-mono">
          {pattern || "glob"}
        </code>
        
        {status === "completed" && (
          <span className="text-[10px] text-textMuted/40 tabular-nums">
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </span>
        )}
        
        <ChevronDown className={clsx(
          "w-3 h-3 text-textMuted/25 transition-transform ml-auto",
          !isExpanded && "-rotate-90"
        )} />
      </button>
      
      {isExpanded && status === "completed" && fileCount > 0 && (
        <div className="mt-1.5 ml-4.5 border-l border-border/20 pl-2.5 rounded-r border border-border/10 overflow-hidden bg-surface/20">
          {Array.from(groupedFiles.entries()).map(([dir, filenames]) => (
            <div key={dir} className="border-b border-border/5 last:border-0">
              {dir !== "." && (
                <div className="px-2 py-1 bg-surface/30 border-b border-border/5">
                  <span className="text-[10px] font-mono text-textMuted/50">{dir}/</span>
                </div>
              )}
              <div className="p-1">
                {filenames.map((filename, idx) => {
                  const FileIcon = getFileIcon(filename)
                  const ext = getFileExt(filename)
                  
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-surface-hover/20 transition-colors"
                    >
                      <FileIcon className="w-3 h-3 text-textMuted/40" />
                      <span className="text-[11px] font-mono text-textSecondary/70 truncate">
                        {filename}
                      </span>
                      {ext && (
                        <span className="text-[9px] text-textMuted/25 uppercase ml-auto">
                          {ext}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isExpanded && status === "completed" && fileCount === 0 && (
        <div className="ml-4.5 mt-1 py-2 text-center text-[11px] text-textMuted/40">
          No files found
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
