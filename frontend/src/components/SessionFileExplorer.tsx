import { useState, useMemo, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileJson,
  FileText,
  File,
  Folder,
  FolderOpen,
  Plus,
  Minus,
  FilePlus,
  Trash2,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { clsx } from "clsx"
import type { FileDiff } from "../types"

type DiffType = "created" | "modified" | "deleted"

interface FileNode {
  name: string
  path: string
  type: "file" | "folder"
  diff?: FileDiff
  diffType?: DiffType
  children?: FileNode[]
}

const FILE_ICONS: Record<string, LucideIcon> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  json: FileJson,
  md: FileText,
  txt: FileText,
  css: FileCode,
  scss: FileCode,
  html: FileCode,
  py: FileCode,
  rs: FileCode,
  go: FileCode,
}

const FILE_COLORS: Record<string, string> = {
  ts: "text-blue-400",
  tsx: "text-blue-400",
  js: "text-yellow-400",
  jsx: "text-yellow-400",
  json: "text-yellow-300",
  md: "text-gray-400",
  css: "text-pink-400",
  scss: "text-pink-400",
  html: "text-orange-400",
  py: "text-green-400",
  rs: "text-orange-500",
  go: "text-cyan-400",
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
}

function getDiffType(diff: FileDiff): DiffType {
  if (!diff.before || diff.before.trim() === "") return "created"
  if (!diff.after || diff.after.trim() === "") return "deleted"
  return "modified"
}

function buildFileTree(diffs: FileDiff[]): FileNode[] {
  const root: FileNode = { name: "", path: "", type: "folder", children: [] }

  for (const diff of diffs) {
    const parts = diff.file.split("/")
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join("/")

      let child = current.children?.find((c) => c.name === part)

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        }
        current.children = current.children || []
        current.children.push(child)
      }

      if (isFile) {
        child.diff = diff
        child.diffType = getDiffType(diff)
      }

      current = child
    }
  }

  function sortNodes(nodes: FileNode[]): FileNode[] {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined,
      }))
  }

  return sortNodes(root.children || [])
}

interface SessionFileExplorerProps {
  diffs: FileDiff[]
  selectedFile: string | null
  onFileSelect: (path: string, diff: FileDiff) => void
  className?: string
}

export function SessionFileExplorer({ diffs, selectedFile, onFileSelect, className }: SessionFileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const allFolderPaths = new Set<string>()
    diffs.forEach((diff) => {
      const parts = diff.file.split("/")
      for (let i = 1; i < parts.length; i++) {
        allFolderPaths.add(parts.slice(0, i).join("/"))
      }
    })
    return allFolderPaths
  })

  const fileTree = useMemo(() => buildFileTree(diffs), [diffs])

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const allFolderPaths = new Set<string>()
    diffs.forEach((diff) => {
      const parts = diff.file.split("/")
      for (let i = 1; i < parts.length; i++) {
        allFolderPaths.add(parts.slice(0, i).join("/"))
      }
    })
    setExpandedFolders(allFolderPaths)
  }, [diffs])

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set())
  }, [])

  function getFileIcon(node: FileNode) {
    if (node.type === "folder") {
      const isExpanded = expandedFolders.has(node.path)
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-warning shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-warning shrink-0" />
      )
    }

    const ext = getFileExtension(node.name)
    const Icon = FILE_ICONS[ext] || File
    const color = FILE_COLORS[ext] || "text-textMuted"
    return <Icon className={`w-4 h-4 ${color} shrink-0`} />
  }

  function getDiffBadge(node: FileNode) {
    if (!node.diffType) return null

    const badges: Record<DiffType, { label: string; className: string; icon?: LucideIcon }> = {
      created: { label: "A", className: "bg-emerald-500/20 text-emerald-400", icon: FilePlus },
      modified: { label: "M", className: "bg-amber-500/20 text-amber-400" },
      deleted: { label: "D", className: "bg-red-500/20 text-red-400", icon: Trash2 },
    }

    const badge = badges[node.diffType]
    const Icon = badge.icon

    return (
      <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", badge.className)}>
        {Icon ? <Icon className="w-3 h-3" /> : badge.label}
      </span>
    )
  }

  function getChangeStats(node: FileNode) {
    if (!node.diff) return null

    const { additions, deletions } = node.diff

    return (
      <div className="flex items-center gap-1 text-[11px] font-mono">
        {additions > 0 && (
          <span className="text-emerald-400">+{additions}</span>
        )}
        {deletions > 0 && (
          <span className="text-red-400">-{deletions}</span>
        )}
      </div>
    )
  }

  function renderNode(node: FileNode, depth: number = 0): React.ReactNode {
    const isFolder = node.type === "folder"
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedFile === node.path

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path)
            } else if (node.diff) {
              onFileSelect(node.path, node.diff)
            }
          }}
          className={clsx(
            "w-full flex items-center gap-1.5 px-2 py-1 text-xs text-left transition-all duration-150 group",
            isSelected
              ? "bg-primary/15 text-primary"
              : "hover:bg-surface-hover text-textSecondary",
            node.diffType === "created" && !isSelected && "bg-emerald-500/5",
            node.diffType === "deleted" && !isSelected && "bg-red-500/5",
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isFolder && (
            <span className="text-textMuted/60 shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          )}
          {!isFolder && <span className="w-3.5" />}
          {getFileIcon(node)}
          <span className="truncate flex-1">{node.name}</span>
          {getDiffBadge(node)}
          {!isFolder && getChangeStats(node)}
        </button>

        {isFolder && isExpanded && node.children && (
          <div className="overflow-hidden">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const stats = useMemo(() => {
    let created = 0
    let modified = 0
    let deleted = 0
    let totalAdditions = 0
    let totalDeletions = 0

    diffs.forEach((diff) => {
      const type = getDiffType(diff)
      if (type === "created") created++
      else if (type === "modified") modified++
      else deleted++

      totalAdditions += diff.additions
      totalDeletions += diff.deletions
    })

    return { created, modified, deleted, totalAdditions, totalDeletions }
  }, [diffs])

  return (
    <div className={clsx("flex flex-col h-full bg-surface/50", className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-warning" />
          <span className="text-xs font-semibold text-textSecondary">Changed Files</span>
          <span className="text-[11px] text-textMuted bg-surface-hover px-1.5 py-0.5 rounded-full">
            {diffs.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={expandAll}
            className="p-1 hover:bg-surface-hover rounded transition-colors"
            title="Expand all"
          >
            <ChevronDown className="w-3.5 h-3.5 text-textMuted" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-surface-hover rounded transition-colors"
            title="Collapse all"
          >
            <ChevronRight className="w-3.5 h-3.5 text-textMuted" />
          </button>
        </div>
      </div>

      {stats.created > 0 || stats.modified > 0 || stats.deleted > 0 ? (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 text-[11px] bg-background/30">
          {stats.created > 0 && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">{stats.created} new</span>
            </span>
          )}
          {stats.modified > 0 && (
            <span className="text-amber-400">{stats.modified} changed</span>
          )}
          {stats.deleted > 0 && (
            <span className="text-red-400">{stats.deleted} deleted</span>
          )}
          <span className="flex-1" />
          <span className="text-emerald-400">+{stats.totalAdditions}</span>
          <span className="text-red-400">-{stats.totalDeletions}</span>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-textMuted">
            No changes
          </div>
        ) : (
          fileTree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  )
}
