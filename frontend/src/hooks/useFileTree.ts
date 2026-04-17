import { useState, useEffect, useCallback } from "react"
import { useSDK } from "../context/SDKContext"
import type { FileNode as SDKFileNode, Event } from "@/sdk/v2/client"

export interface TreeNode extends SDKFileNode {
  children?: TreeNode[]
}

export interface FileTreeState {
  tree: TreeNode[]
  loading: boolean
  error: string | null
  expanded: Set<string>
  selectedPath: string | null
}

export interface FileTreeActions {
  refresh: () => Promise<void>
  toggleExpand: (path: string) => void
  expandAll: () => void
  collapseAll: () => void
  selectFile: (path: string | null) => void
}

export interface UseFileTreeOptions {
  rootPath?: string
  autoRefresh?: boolean
  onFileClick?: (file: TreeNode) => void
  onFileUpdated?: (file: string, event: "add" | "change" | "unlink") => void
}

export function useFileTree(options: UseFileTreeOptions = {}): FileTreeState & FileTreeActions {
  const { rootPath = "/", autoRefresh = true, onFileClick, onFileUpdated } = options
  const sdk = useSDK()

  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("[FileTree] Loading files with rootPath:", rootPath, "sdk.directory:", sdk.directory)
      const response = await sdk.client.file.list({ path: rootPath })
      console.log("[FileTree] Response:", response)
      const data = response.data

      if (!Array.isArray(data)) {
        console.log("File data is not array:", data, typeof data)
        throw new Error("Invalid file list response structure")
      }

      const treeData = buildTree(data)
      setTree(treeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files")
      console.error("Failed to load files:", err)
    } finally {
      setLoading(false)
    }
  }, [sdk.client.file, rootPath])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  useEffect(() => {
    if (!autoRefresh) return

    const unsubscribe = sdk.event.on("file.watcher.updated" as Event["type"], (event) => {
      if (event.type === "file.watcher.updated") {
        const { file, event: eventType } = event.properties
        onFileUpdated?.(file, eventType)
        if (eventType === "add" || eventType === "unlink") {
          loadFiles()
        }
      }
    })

    return unsubscribe
  }, [sdk.event, autoRefresh, loadFiles, onFileUpdated])

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
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
    const allPaths = collectDirectoryPaths(tree)
    setExpanded(new Set(allPaths))
  }, [tree])

  const collapseAll = useCallback(() => {
    setExpanded(new Set())
  }, [])

  const selectFile = useCallback(
    (path: string | null) => {
      setSelectedPath(path)
      if (path) {
        const file = findFileNode(tree, path)
        if (file && file.type === "file") {
          onFileClick?.(file)
        }
      }
    },
    [tree, onFileClick],
  )

  return {
    tree,
    loading,
    error,
    expanded,
    selectedPath,
    refresh: loadFiles,
    toggleExpand,
    expandAll,
    collapseAll,
    selectFile,
  }
}

function buildTree(nodes: SDKFileNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  const sorted = [...nodes].sort((a, b) => a.path.localeCompare(b.path))

  for (const node of sorted) {
    map.set(node.path, { ...node, children: [] })
  }

  for (const node of sorted) {
    const parts = node.path.split("/")
    if (parts.length === 1) {
      const treeNode = map.get(node.path)
      if (treeNode) roots.push(treeNode)
    } else {
      const parentPath = parts.slice(0, -1).join("/")
      const parent = map.get(parentPath)
      const child = map.get(node.path)
      if (parent && child) {
        parent.children = parent.children || []
        parent.children.push(child)
      }
    }
  }

  return roots
}

function collectDirectoryPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.type === "directory") {
      paths.push(node.path)
      if (node.children) {
        paths.push(...collectDirectoryPaths(node.children))
      }
    }
  }
  return paths
}

function findFileNode(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.children) {
      const found = findFileNode(node.children, path)
      if (found) return found
    }
  }
  return null
}
