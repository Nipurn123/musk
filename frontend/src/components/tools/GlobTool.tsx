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
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [status])
  
  const files = parseGlobOutput(output || "")
  const groupedFiles = groupByDirectory(files)
  const fileCount = files.length
  
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
          {pattern || "glob"}
        </code>
        {status === "completed" && (
          <span className="text-[13px] text-textMuted tabular-nums">
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </span>
        )}
      </button>
      
      {isExpanded && status === "completed" && fileCount > 0 && (
        <div className="mt-3 rounded-lg bg-surface/50 border border-border/40 overflow-hidden divide-y divide-border/20">
          {Array.from(groupedFiles.entries()).map(([dir, filenames]) => (
            <div key={dir}>
              {dir !== "." && (
                <div className="px-3 py-2 bg-surface/30 border-b border-border/20">
                  <span className="text-[12px] font-mono text-textMuted">{dir}/</span>
                </div>
              )}
              <div className="p-2 space-y-1">
                {filenames.map((filename, idx) => {
                  const FileIcon = getFileIcon(filename)
                  const ext = getFileExt(filename)
                  
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-hover/30 transition-colors"
                    >
                      <FileIcon className="w-4 h-4 text-textMuted" />
                      <span className="text-[13px] font-mono text-textSecondary truncate">
                        {filename}
                      </span>
                      {ext && (
                        <span className="text-[11px] text-textMuted uppercase ml-auto">
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
        <div className="mt-3 py-4 text-center text-[14px] text-textMuted">
          No files found
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
