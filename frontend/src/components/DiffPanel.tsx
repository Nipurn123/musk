import { useState, useMemo } from "react"
import { X, GitBranch, Plus, Minus, ChevronDown, ChevronRight, Columns, FileText, Check, XCircle } from "lucide-react"
import { useGlobalStore } from "../store"
import { api, endpoints } from "../lib/api"

interface DiffPanelProps {
  onClose?: () => void
}

type ViewMode = "unified" | "split"

function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

function highlightCode(code: string, _extension: string): string {
  return code
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
  showLineNumbers,
}: {
  type: "context" | "add" | "delete" | "header"
  content: string
  oldLine?: number
  newLine?: number
  showLineNumbers: boolean
}) {
  const bgColor =
    type === "add" ? "bg-success/10" : type === "delete" ? "bg-error/10" : type === "header" ? "bg-primary/5" : ""
  const textColor =
    type === "add"
      ? "text-success"
      : type === "delete"
        ? "text-error"
        : type === "header"
          ? "text-primary"
          : "text-textSecondary"
  const prefix = type === "add" ? "+" : type === "delete" ? "-" : " "

  return (
    <div className={`flex font-mono text-xs ${bgColor}`}>
      {showLineNumbers && (
        <>
          <div className="w-12 px-2 text-right text-textMuted/50 border-r border-border/50 select-none shrink-0">
            {oldLine || ""}
          </div>
          <div className="w-12 px-2 text-right text-textMuted/50 border-r border-border/50 select-none shrink-0">
            {newLine || ""}
          </div>
        </>
      )}
      <div className={`px-2 ${textColor} flex-1`}>
        <span className="select-none opacity-50">{prefix}</span>
        <span dangerouslySetInnerHTML={{ __html: highlightCode(content, "") }} />
      </div>
    </div>
  )
}

function SplitDiffView({ before, after, file }: { before: string; after: string; file: string }) {
  const ext = getFileExtension(file)
  const beforeLines = before.split("\n")
  const afterLines = after.split("\n")
  const maxLines = Math.max(beforeLines.length, afterLines.length)

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-auto border-r border-border">
        <div className="sticky top-0 bg-error/10 border-b border-border px-3 py-1.5 text-xs font-bold text-error">
          Original
        </div>
        <div className="font-mono text-xs">
          {beforeLines.map((line, i) => (
            <div key={i} className="flex hover:bg-surfaceHover/50">
              <div className="w-12 px-2 text-right text-textMuted/50 border-r border-border/50 select-none shrink-0">
                {i + 1}
              </div>
              <div className="px-2 py-0.5 text-textSecondary flex-1 bg-error/5">
                <span dangerouslySetInnerHTML={{ __html: highlightCode(line, ext) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-success/10 border-b border-border px-3 py-1.5 text-xs font-bold text-success">
          Modified
        </div>
        <div className="font-mono text-xs">
          {afterLines.map((line, i) => (
            <div key={i} className="flex hover:bg-surfaceHover/50">
              <div className="w-12 px-2 text-right text-textMuted/50 border-r border-border/50 select-none shrink-0">
                {i + 1}
              </div>
              <div className="px-2 py-0.5 text-textSecondary flex-1 bg-success/5">
                <span dangerouslySetInnerHTML={{ __html: highlightCode(line, ext) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DiffPanel({ onClose }: DiffPanelProps) {
  const currentSessionId = useGlobalStore((s) => s.currentSessionId)
  const diffs = useGlobalStore((s) => s.diffs)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>("unified")

  const sessionDiffs = currentSessionId ? diffs.get(currentSessionId) || [] : []

  function toggleExpand(file: string) {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(file)) {
      newExpanded.delete(file)
    } else {
      newExpanded.add(file)
    }
    setExpanded(newExpanded)
  }

  async function handleAccept(file: string) {
    try {
      await api.post(endpoints.file(file), { action: "accept" })
    } catch (err) {
      console.error("Failed to accept diff:", err)
    }
  }

  async function handleReject(file: string) {
    try {
      await api.post(endpoints.file(file), { action: "reject" })
    } catch (err) {
      console.error("Failed to reject diff:", err)
    }
  }

  const totalAdditions = sessionDiffs.reduce((sum, d) => sum + d.additions, 0)
  const totalDeletions = sessionDiffs.reduce((sum, d) => sum + d.deletions, 0)

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Changes</span>
          {sessionDiffs.length > 0 && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">
              {sessionDiffs.length}
            </span>
          )}
          {totalAdditions > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-success">
              <Plus className="w-3 h-3" />
              {totalAdditions}
            </span>
          )}
          {totalDeletions > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-error">
              <Minus className="w-3 h-3" />
              {totalDeletions}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background rounded-lg p-1">
            <button
              onClick={() => setViewMode("unified")}
              className={`p-1.5 rounded transition-colors ${viewMode === "unified" ? "bg-primary text-white" : "hover:bg-surfaceHover text-textMuted"}`}
              title="Unified view"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded transition-colors ${viewMode === "split" ? "bg-primary text-white" : "hover:bg-surfaceHover text-textMuted"}`}
              title="Split view"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-surfaceHover rounded transition-colors">
              <X className="w-3.5 h-3.5 text-textMuted" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessionDiffs.length === 0 ? (
          <div className="text-center text-textMuted text-xs py-8">No changes in this session</div>
        ) : (
          sessionDiffs.map((diff) => {
            const isExpanded = expanded.has(diff.file)
            return (
              <div key={diff.file} className="border-b border-border">
                <button
                  onClick={() => toggleExpand(diff.file)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surfaceHover transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-textMuted" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-textMuted" />
                  )}
                  <span className="text-xs font-medium truncate flex-1 text-left">{diff.file}</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    {diff.additions > 0 && (
                      <span className="flex items-center gap-0.5 text-success">
                        <Plus className="w-3 h-3" />
                        {diff.additions}
                      </span>
                    )}
                    {diff.deletions > 0 && (
                      <span className="flex items-center gap-0.5 text-error">
                        <Minus className="w-3 h-3" />
                        {diff.deletions}
                      </span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="bg-background border-t border-border">
                    <div className="flex gap-2 px-3 py-2 border-b border-border bg-surface">
                      <button
                        onClick={() => handleAccept(diff.file)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-success hover:bg-success/80 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(diff.file)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-error hover:bg-error/80 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                    {viewMode === "unified" ? (
                      <div className="overflow-x-auto">
                        {parseUnifiedDiff(diff.after).map((line, i) => (
                          <DiffLine key={i} {...line} showLineNumbers />
                        ))}
                      </div>
                    ) : (
                      <SplitDiffView before={diff.before} after={diff.after} file={diff.file} />
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
