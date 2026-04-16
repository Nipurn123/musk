import { useState, useEffect, useMemo } from "react"
import {
  X,
  GitBranch,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Columns,
  FileText,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  FileCode,
  Loader2,
  AlertCircle,
  FilePlus,
  Folder,
  Sparkles,
} from "lucide-react"
import { useGlobalStore } from "../store"
import { fetchDirect, endpoints } from "../lib/api"
import { clsx } from "clsx"
import type { FileDiff } from "../types"

type ViewMode = "unified" | "split"
type DiffType = "created" | "modified" | "deleted"

interface SessionDiffViewerProps {
  sessionId: string
  onClose?: () => void
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

function getLanguageFromExtension(ext: string): string {
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    vue: "vue",
    svelte: "svelte",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
  }
  return langMap[ext.toLowerCase()] || "plaintext"
}

function parseUnifiedDiff(diffText: string) {
  const lines = diffText.split("\n")
  const result: Array<{
    type: "context" | "add" | "delete" | "header"
    content: string
    oldLine?: number
    newLine?: number
  }> = []
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLineNum = parseInt(match[1])
        newLineNum = parseInt(match[2])
      }
      result.push({ type: "header", content: line })
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      result.push({ type: "add", content: line.substring(1), newLine: newLineNum++ })
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      result.push({ type: "delete", content: line.substring(1), oldLine: oldLineNum++ })
    } else if (line.startsWith(" ")) {
      result.push({ type: "context", content: line.substring(1), oldLine: oldLineNum++, newLine: newLineNum++ })
    } else if (
      !line.startsWith("diff ") &&
      !line.startsWith("index ") &&
      !line.startsWith("---") &&
      !line.startsWith("+++")
    ) {
      result.push({ type: "context", content: line, oldLine: oldLineNum++, newLine: newLineNum++ })
    }
  }

  return result
}

function DiffLine({
  type,
  content,
  oldLine,
  newLine,
}: {
  type: "context" | "add" | "delete" | "header"
  content: string
  oldLine?: number
  newLine?: number
}) {
  if (type === "header") {
    return (
      <div className="flex font-mono text-xs bg-primary/5 text-primary" style={{ minHeight: '1.375rem', lineHeight: '1.375rem' }}>
        <span className="flex items-start justify-end select-none pr-2 pl-1 text-textMuted/40 border-r border-border/30" style={{ width: '2.3rem' }}></span>
        <span className="flex items-start justify-center w-3 select-none text-textMuted/40"> </span>
        <div className="flex-1 pl-0 pr-2"><code className="text-xs" style={{ lineHeight: '1.375rem', whiteSpace: 'pre-wrap' }}>{content}</code></div>
      </div>
    )
  }

  const borderColor = type === "add" ? "border-l-emerald-500" : type === "delete" ? "border-l-red-500" : "border-l-transparent"
  const bgColor = type === "add" ? "bg-emerald-500/8" : type === "delete" ? "bg-red-500/8" : ""
  const prefix = type === "add" ? "+" : type === "delete" ? "-" : " "
  const prefixColor = type === "add" ? "text-emerald-400" : type === "delete" ? "text-red-400" : "text-textMuted/40"

  return (
    <div className={clsx("group/line flex border-l-[3px]", borderColor, bgColor)} style={{ minHeight: '1.375rem' }}>
      <span className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/40 border-r border-border/30" style={{ minHeight: '1.375rem', lineHeight: '1.375rem', width: '2.3rem' }}>
        {newLine ?? oldLine ?? ""}
      </span>
      <span className={clsx("flex items-start justify-center font-mono text-xs select-none relative w-3", prefixColor)} style={{ minHeight: '1.375rem', lineHeight: '1.375rem' }}>
        <span>{prefix}</span>
      </span>
      <div className="flex-1 flex items-start pl-0 pr-2 min-w-0 font-mono" style={{ minHeight: '1.375rem' }}>
        <code className="font-mono text-xs break-all text-textSecondary" style={{ lineHeight: '1.375rem', whiteSpace: 'pre-wrap' }}>{content}</code>
      </div>
    </div>
  )
}

function SplitDiffView({ before, after, file }: { before: string; after: string; file: string }) {
  const beforeLines = before.split("\n")
  const afterLines = after.split("\n")

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-auto border-r border-border/30">
        <div className="sticky top-0 bg-red-500/10 border-b border-border/30 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 z-10">
          Original
        </div>
        <div className="font-mono text-xs">
          {beforeLines.map((line, i) => (
            <div key={i} className="flex hover:bg-surfaceHover/30 transition-colors">
              <div className="w-10 px-2 text-right text-textMuted/40 border-r border-border/30 select-none shrink-0 bg-surface/50">
                {i + 1}
              </div>
              <div className="px-3 py-0.5 text-textSecondary flex-1 bg-red-500/5 whitespace-pre">{line}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-emerald-500/10 border-b border-border/30 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 z-10">
          Modified
        </div>
        <div className="font-mono text-xs">
          {afterLines.map((line, i) => (
            <div key={i} className="flex hover:bg-surfaceHover/30 transition-colors">
              <div className="w-10 px-2 text-right text-textMuted/40 border-r border-border/30 select-none shrink-0 bg-surface/50">
                {i + 1}
              </div>
              <div className="px-3 py-0.5 text-textSecondary flex-1 bg-emerald-500/5 whitespace-pre">{line}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getDiffType(diff: FileDiff): DiffType {
  if (!diff.before || diff.before.trim() === "") return "created"
  if (!diff.after || diff.after.trim() === "") return "deleted"
  return "modified"
}

function formatFolderPath(filePath: string): { folder: string; filename: string } {
  const parts = filePath.split("/")
  const filename = parts.pop() || filePath
  const folder = parts.length > 0 ? parts.join("/") : ""
  return { folder, filename }
}

function FileDiffCard({
  diff,
  isExpanded,
  onToggle,
  viewMode,
}: {
  diff: FileDiff
  isExpanded: boolean
  onToggle: () => void
  viewMode: ViewMode
}) {
  const ext = getFileExtension(diff.file)
  const language = getLanguageFromExtension(ext)
  const diffType = getDiffType(diff)
  const { folder, filename } = formatFolderPath(diff.file)

  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-hover/50 transition-colors group"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-textMuted/60 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-textMuted/60 shrink-0" />
        )}
        <span className="text-[13px] text-textSecondary truncate flex-1 text-left">
          {filename}
          <span className="text-textMuted/50"> · </span>
          <span className="text-textMuted uppercase text-[11px]">{ext || language}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {diffType === "created" && (
            <span className="text-[10px] text-emerald-400 font-medium">NEW</span>
          )}
          {diffType === "deleted" && (
            <span className="text-[10px] text-red-400 font-medium">DEL</span>
          )}
          {diff.additions > 0 && (
            <span className="text-[11px] text-emerald-400">+{diff.additions}</span>
          )}
          {diff.deletions > 0 && (
            <span className="text-[11px] text-red-400">-{diff.deletions}</span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="bg-background border-t border-border/20">
          {diffType === "created" ? (
            <div className="overflow-x-auto">
              {diff.after.split("\n").map((line, i) => (
                <div key={i} className="group/line flex border-l-[3px] border-l-emerald-500 bg-emerald-500/5" style={{ minHeight: '1.375rem' }}>
                  <span className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/40 border-r border-border/30" style={{ minHeight: '1.375rem', lineHeight: '1.375rem', width: '2.3rem' }}>
                    {i + 1}
                  </span>
                  <span className="flex items-start justify-center font-mono text-xs select-none relative w-3 text-emerald-400" style={{ minHeight: '1.375rem', lineHeight: '1.375rem' }}>
                    <span>+</span>
                  </span>
                  <div className="flex-1 flex items-start pl-0 pr-2 min-w-0 font-mono" style={{ minHeight: '1.375rem' }}>
                    <code className="font-mono text-xs break-all text-textSecondary" style={{ lineHeight: '1.375rem', whiteSpace: 'pre-wrap' }}>{line || "\u00a0"}</code>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === "unified" ? (
            <div className="overflow-x-auto">
              {parseUnifiedDiff(diff.after).map((line, i) => (
                <DiffLine key={i} {...line} />
              ))}
            </div>
          ) : (
            <SplitDiffView before={diff.before} after={diff.after} file={diff.file} />
          )}
        </div>
      )}
    </div>
  )
}

export function SessionDiffViewer({ sessionId, onClose }: SessionDiffViewerProps) {
  const diffs = useGlobalStore((s) => s.diffs)
  const setDiffs = useGlobalStore((s) => s.setDiffs)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>("unified")
  const [currentFileIndex, setCurrentFileIndex] = useState(0)

  const sessionDiffs = useMemo(() => {
    return diffs.get(sessionId) || []
  }, [diffs, sessionId])

  useEffect(() => {
    fetchDiffs()
  }, [sessionId])

  async function fetchDiffs() {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchDirect<FileDiff[]>(endpoints.sessionDiff(sessionId))
      setDiffs(sessionId, response)
    } catch (err) {
      console.error("Failed to fetch diffs:", err)
      setError(err instanceof Error ? err.message : "Failed to load diffs")
    } finally {
      setIsLoading(false)
    }
  }

  function toggleFile(file: string) {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(file)) {
      newExpanded.delete(file)
    } else {
      newExpanded.add(file)
    }
    setExpandedFiles(newExpanded)
  }

  function expandAll() {
    setExpandedFiles(new Set(sessionDiffs.map((d) => d.file)))
  }

  function collapseAll() {
    setExpandedFiles(new Set())
  }

  const totalAdditions = useMemo(() => sessionDiffs.reduce((sum, d) => sum + d.additions, 0), [sessionDiffs])
  const totalDeletions = useMemo(() => sessionDiffs.reduce((sum, d) => sum + d.deletions, 0), [sessionDiffs])

  const { createdFiles, modifiedFiles, deletedFiles } = useMemo(() => {
    const created: FileDiff[] = []
    const modified: FileDiff[] = []
    const deleted: FileDiff[] = []
    
    for (const diff of sessionDiffs) {
      const type = getDiffType(diff)
      if (type === "created") created.push(diff)
      else if (type === "deleted") deleted.push(diff)
      else modified.push(diff)
    }
    
    return { createdFiles: created, modifiedFiles: modified, deletedFiles: deleted }
  }, [sessionDiffs])

  const filesByFolder = useMemo(() => {
    const grouped = new Map<string, FileDiff[]>()
    for (const file of createdFiles) {
      const { folder } = formatFolderPath(file.file)
      const key = folder || "(root)"
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(file)
    }
    return grouped
  }, [createdFiles])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-textMuted">Loading changes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-error" />
          </div>
          <p className="text-sm text-error mb-3">{error}</p>
          <button
            onClick={fetchDiffs}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header — Claude-style */}
      <div className="flex items-center justify-between px-2 py-2 bg-surface gap-2">
        <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
          <h2 className="text-sm font-normal text-textSecondary truncate flex-1 min-w-0">
            Session Changes
            <span className="text-textMuted/50"> · </span>
            <span className="text-textMuted">{sessionDiffs.length} file{sessionDiffs.length !== 1 ? "s" : ""}</span>
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {totalAdditions > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 px-1.5">
              <Plus className="w-3 h-3" />+{totalAdditions}
            </span>
          )}
          {totalDeletions > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400 px-1.5">
              <Minus className="w-3 h-3" />-{totalDeletions}
            </span>
          )}

          <div className="flex h-8 whitespace-nowrap">
            <button
              onClick={() => setViewMode("unified")}
              className={clsx(
                "text-xs rounded-l-lg h-full flex items-center justify-center px-2 border-y border-l border-border hover:bg-surface-hover transition-colors",
                viewMode === "unified" ? "bg-surface-hover text-textPrimary" : "bg-surface text-textMuted",
              )}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={clsx(
                "text-xs rounded-r-lg h-full flex items-center justify-center px-2 border border-border hover:bg-surface-hover transition-colors",
                viewMode === "split" ? "bg-surface-hover text-textPrimary" : "bg-surface text-textMuted",
              )}
            >
              Split
            </button>
          </div>

          <button
            onClick={fetchDiffs}
            className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
            title="Refresh"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10.386 2.51A7.5 7.5 0 1 1 5.499 4H3a.5.5 0 0 1 0-1h3.5a.5.5 0 0 1 .49.402L7 3.5V7a.5.5 0 0 1-1 0V4.879a6.5 6.5 0 1 0 4.335-1.37L10 3.5l-.1-.01a.5.5 0 0 1 .1-.99z" /></svg>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {createdFiles.length > 0 && (
        <div className="px-4 py-3 bg-emerald-500/5 border-b border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">
              {createdFiles.length} New File{createdFiles.length !== 1 ? "s" : ""} Created
            </span>
          </div>
          <div className="space-y-1">
            {Array.from(filesByFolder.entries()).map(([folder, files]) => (
              <div key={folder} className="flex items-start gap-2">
                <Folder className="w-3 h-3 text-emerald-400/60 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-textMuted">{folder}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {files.map((f) => {
                      const { filename } = formatFolderPath(f.file)
                      return (
                        <button
                          key={f.file}
                          onClick={() => {
                            toggleFile(f.file)
                            const idx = sessionDiffs.findIndex(d => d.file === f.file)
                            if (idx >= 0) setCurrentFileIndex(idx)
                          }}
                          className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded transition-colors"
                        >
                          <FilePlus className="w-3 h-3" />
                          {filename}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessionDiffs.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-background/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentFileIndex(Math.max(0, currentFileIndex - 1))}
              disabled={currentFileIndex === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surfaceHover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-textMuted">
              {currentFileIndex + 1} / {sessionDiffs.length}
            </span>
            <button
              onClick={() => setCurrentFileIndex(Math.min(sessionDiffs.length - 1, currentFileIndex + 1))}
              disabled={currentFileIndex === sessionDiffs.length - 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surfaceHover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <select
            value={currentFileIndex}
            onChange={(e) => setCurrentFileIndex(parseInt(e.target.value))}
            className="text-xs bg-surface border border-border/50 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary/50"
          >
            {sessionDiffs.map((diff, index) => (
              <option key={diff.file} value={index}>
                {diff.file.split("/").pop()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sessionDiffs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-textMuted" />
              </div>
              <p className="text-sm text-textMuted mb-1">No changes yet</p>
              <p className="text-xs text-textMuted/60">Changes will appear here when files are modified</p>
            </div>
          </div>
        ) : sessionDiffs.length === 1 ? (
          <FileDiffCard
            diff={sessionDiffs[0]}
            isExpanded={expandedFiles.has(sessionDiffs[0].file)}
            onToggle={() => toggleFile(sessionDiffs[0].file)}
            viewMode={viewMode}
          />
        ) : (
          <div>
            {sessionDiffs.map((diff, index) => (
              <div key={diff.file} className={clsx(currentFileIndex === index && "bg-primary/5")}>
                <FileDiffCard
                  diff={diff}
                  isExpanded={expandedFiles.has(diff.file)}
                  onToggle={() => toggleFile(diff.file)}
                  viewMode={viewMode}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
