import { useState, useRef, useEffect } from "react"
import {
  X,
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
  FileCode,
  FileJson,
  FileText,
  Image,
  MoreVertical,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  type LucideIcon,
} from "lucide-react"
import { useFileTree, type UseFileTreeOptions, type TreeNode } from "../hooks/useFileTree"

interface FileTreeProps extends UseFileTreeOptions {
  onClose?: () => void
  className?: string
  selectedPath?: string
}

const FILE_ICONS: Record<string, LucideIcon> = {
  ".ts": FileCode,
  ".tsx": FileCode,
  ".js": FileCode,
  ".jsx": FileCode,
  ".json": FileJson,
  ".md": FileText,
  ".txt": FileText,
  ".css": FileCode,
  ".scss": FileCode,
  ".html": FileCode,
  ".svg": Image,
  ".png": Image,
  ".jpg": Image,
  ".jpeg": Image,
  ".gif": Image,
  ".webp": Image,
}

const FILE_COLORS: Record<string, string> = {
  ".ts": "text-blue-400",
  ".tsx": "text-blue-400",
  ".js": "text-yellow-400",
  ".jsx": "text-yellow-400",
  ".json": "text-yellow-300",
  ".md": "text-gray-400",
  ".css": "text-pink-400",
  ".scss": "text-pink-400",
  ".html": "text-orange-400",
  ".svg": "text-purple-400",
  ".png": "text-green-400",
  ".jpg": "text-green-400",
  ".jpeg": "text-green-400",
}

export function FileTree({ onClose, className = "", selectedPath: externalSelectedPath, ...options }: FileTreeProps) {
  const { tree, loading, error, expanded, selectedPath: internalSelectedPath, refresh, toggleExpand, expandAll, collapseAll, selectFile } =
    useFileTree(options)

  const selectedPath = externalSelectedPath || internalSelectedPath

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    node: TreeNode
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [contextMenu])

  function handleContextMenu(e: React.MouseEvent, node: TreeNode) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  function getFileIcon(node: TreeNode) {
    if (node.type === "directory") {
      return expanded.has(node.path) ? (
        <FolderOpen className="w-4 h-4 text-warning shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-warning shrink-0" />
      )
    }

    const ext = "." + node.name.split(".").pop()?.toLowerCase()
    const Icon = FILE_ICONS[ext] || File
    const color = FILE_COLORS[ext] || "text-textMuted"
    return <Icon className={`w-4 h-4 ${color} shrink-0`} />
  }

  function renderNode(node: TreeNode, depth = 0) {
    const isExpanded = expanded.has(node.path)
    const isFolder = node.type === "directory"
    const isSelected = selectedPath === node.path

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (isFolder) {
              toggleExpand(node.path)
            } else {
              selectFile(node.path)
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all duration-150 group ${
            isSelected ? "bg-primary/20 text-primary" : "hover:bg-surfaceHover text-textSecondary"
          } ${node.ignored ? "opacity-50" : ""}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isFolder && (
            <span className="text-textMuted transition-transform duration-150">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
          {!isFolder && <span className="w-3" />}
          {getFileIcon(node)}
          <span className="truncate flex-1">{node.name}</span>
          <MoreVertical className="w-3 h-3 text-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        {isFolder && isExpanded && (
          <div className="overflow-hidden transition-all duration-200 ease-in-out">
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col bg-surface border-l border-border ${className}`}>
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-warning" />
          <span className="font-bold text-sm">Files</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 hover:bg-surfaceHover rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-textMuted ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={expandAll}
            className="p-1.5 hover:bg-surfaceHover rounded transition-colors"
            title="Expand all"
          >
            <ChevronDown className="w-3.5 h-3.5 text-textMuted" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1.5 hover:bg-surfaceHover rounded transition-colors"
            title="Collapse all"
          >
            <ChevronRight className="w-3.5 h-3.5 text-textMuted" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-surfaceHover rounded transition-colors">
              <X className="w-3.5 h-3.5 text-textMuted" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-error text-xs py-8 px-4">
            <p className="font-medium">Failed to load files</p>
            <p className="text-textMuted mt-1">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 px-3 py-1 bg-surfaceHover rounded hover:bg-border transition-colors"
            >
              Retry
            </button>
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center text-textMuted text-xs py-8">No files found</div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full px-3 py-2 text-xs text-left hover:bg-surfaceHover transition-colors flex items-center gap-2">
            <FilePlus className="w-3.5 h-3.5 text-textMuted" />
            New File
          </button>
          <button className="w-full px-3 py-2 text-xs text-left hover:bg-surfaceHover transition-colors flex items-center gap-2">
            <FolderPlus className="w-3.5 h-3.5 text-textMuted" />
            New Folder
          </button>
          <div className="my-1 border-t border-border" />
          <button className="w-full px-3 py-2 text-xs text-left hover:bg-surfaceHover transition-colors flex items-center gap-2">
            <Edit2 className="w-3.5 h-3.5 text-textMuted" />
            Rename
          </button>
          <button className="w-full px-3 py-2 text-xs text-left hover:bg-surfaceHover transition-colors flex items-center gap-2 text-error">
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
