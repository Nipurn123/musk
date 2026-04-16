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
  const bgColor =
    type === "add"
      ? "bg-emerald-500/10 dark:bg-emerald-500/15"
      : type === "delete"
        ? "bg-red-500/10 dark:bg-red-500/15"
        : type === "header"
          ? "bg-primary/5"
          : ""
  const textColor =
    type === "add"
      ? "text-emerald-600 dark:text-emerald-400"
      : type === "delete"
        ? "text-red-600 dark:text-red-400"
        : type === "header"
          ? "text-primary"
          : "text-textSecondary"
  const prefix = type === "add" ? "+" : type === "delete" ? "-" : " "

  return (
    <div className={clsx("flex font-mono text-xs leading-5", bgColor)}>
      <div className="w-12 px-2 text-right text-textMuted/40 border-r border-border/30 select-none shrink-0">
        {oldLine ?? ""}
      </div>
      <div className="w-12 px-2 text-right text-textMuted/40 border-r border-border/30 select-none shrink-0">
        {newLine ?? ""}
      </div>
      <div className={clsx("px-3 flex-1 whitespace-pre", textColor)}>
        <span className="select-none opacity-50 mr-1">{prefix}</span>
        <span>{content}</span>
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
    <div className={clsx(
      "border-b border-border/30 last:border-b-0 transition-all",
      diffType === "created" && "bg-emerald-500/5",
      diffType === "deleted" && "bg-red-500/5"
    )}>
      <button
        onClick={onToggle}
        className={clsx(
          "w-full flex items-center gap-3 px-4 py-3 hover:bg-surfaceHover/50 transition-all group",
          diffType === "created" && "hover:bg-emerald-500/10"
        )}
      >
        <div className={clsx(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          diffType === "created" ? "bg-emerald-500/20" : "bg-primary/10"
        )}>
          {diffType === "created" ? (
            <FilePlus className="w-4 h-4 text-emerald-400" />
          ) : diffType === "deleted" ? (
            <FileCode className="w-4 h-4 text-red-400" />
          ) : (
            <FileCode className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{filename}</span>
            {diffType === "created" && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                <Sparkles className="w-2.5 h-2.5" />
                new
              </span>
            )}
            {diffType === "deleted" && (
              <span className="text-[10px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                deleted
              </span>
            )}
          </div>
          {folder && (
            <div className="flex items-center gap-1 text-[10px] text-textMuted mt-0.5 truncate">
              <Folder className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{folder}</span>
            </div>
          )}
          <div className="text-[10px] text-textMuted mt-0.5">{language}</div>
        </div>
        <div className="flex items-center gap-3 mr-3">
          {diff.additions > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <Plus className="w-3.5 h-3.5" />
              {diff.additions}
            </span>
          )}
          {diff.deletions > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <Minus className="w-3.5 h-3.5" />
              {diff.deletions}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors" />
        )}
      </button>

      {isExpanded && (
        <div className="bg-background border-t border-border/30">
          {diffType === "created" ? (
            <div className="overflow-x-auto">
              <div className="px-4 py-2 text-xs text-emerald-400 bg-emerald-500/10 border-b border-border/30 font-medium">
                New file created with {diff.additions} lines
              </div>
              {diff.after.split("\n").map((line, i) => (
                <div key={i} className="flex font-mono text-xs leading-5 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                  <div className="w-12 px-2 text-right text-textMuted/40 border-r border-border/30 select-none shrink-0 bg-surface/50">
                    {i + 1}
                  </div>
                  <div className="w-6 text-center text-emerald-400 select-none shrink-0">+</div>
                  <div className="px-3 flex-1 whitespace-pre text-textSecondary">{line}</div>
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
    <div className="h-full flex flex-col bg-surface">
      <div className="h-14 flex items-center justify-between px-4 border-b border-border/50 shrink-0 bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-sm">Session Changes</span>
            <div className="text-[10px] text-textMuted">
              {sessionDiffs.length} file{sessionDiffs.length !== 1 ? "s" : ""} changed
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalAdditions > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
              <Plus className="w-3 h-3" />
              {totalAdditions}
            </span>
          )}
          {totalDeletions > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
              <Minus className="w-3 h-3" />
              {totalDeletions}
            </span>
          )}

          <div className="w-px h-6 bg-border/50 mx-1" />

          <div className="flex items-center gap-1 bg-background rounded-lg p-1">
            <button
              onClick={() => setViewMode("unified")}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === "unified" ? "bg-primary text-white shadow-sm" : "hover:bg-surfaceHover text-textMuted",
              )}
              title="Unified view"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={clsx(
                "p-1.5 rounded-md transition-all",
                viewMode === "split" ? "bg-primary text-white shadow-sm" : "hover:bg-surfaceHover text-textMuted",
              )}
              title="Split view"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          {sessionDiffs.length > 0 && (
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="px-2 py-1 text-xs text-textMuted hover:text-primary hover:bg-primary/10 rounded transition-colors"
              >
                Expand
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1 text-xs text-textMuted hover:text-primary hover:bg-primary/10 rounded transition-colors"
              >
                Collapse
              </button>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 hover:bg-surfaceHover rounded-lg transition-all flex items-center justify-center text-textMuted hover:text-textPrimary"
            >
              <X className="w-4 h-4" />
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
