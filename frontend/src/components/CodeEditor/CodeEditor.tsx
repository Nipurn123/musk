import { useState, useEffect, useCallback, useMemo } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { python } from "@codemirror/lang-python"
import { markdown } from "@codemirror/lang-markdown"
import {
  FileCode,
  Save,
  X,
  Circle,
  Edit3,
  Loader2,
} from "lucide-react"
import { clsx } from "clsx"
import { useSDK } from "../../context"
import { Button } from "../ui"
import { FileTree } from "../FileTree"

interface OpenFile {
  path: string
  name: string
  content: string
  modified: boolean
  language: string
}

const LANGUAGE_MAP: Record<string, any> = {
  js: javascript,
  jsx: javascript,
  ts: javascript,
  tsx: javascript,
  json: json,
  html: html,
  css: css,
  py: python,
  md: markdown,
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

function getLanguage(filename: string): string {
  return getFileExtension(filename) || "text"
}

export function CodeEditor() {
  const { client } = useSDK()
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingFiles, setSavingFiles] = useState<Set<string>>(new Set())

  const handleSelect = useCallback(
    async (path: string) => {
      const existing = openFiles.find((f) => f.path === path)
      if (existing) {
        setActiveFile(path)
        return
      }
      setIsLoading(true)
      try {
        const response = await client.file.read({ path })
        const content = response.data
        const name = path.split("/").pop() || path
        const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2)
        setOpenFiles((prev) => [
          ...prev,
          {
            path,
            name,
            content: contentStr,
            modified: false,
            language: getLanguage(name),
          },
        ])
        setActiveFile(path)
      } catch (err) {
        console.error("Failed to read file:", err)
        setError("Failed to read file")
      } finally {
        setIsLoading(false)
      }
    },
    [openFiles, client.file],
  )

  const handleCloseFile = useCallback((path: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.path !== path))
    setActiveFile((prev) => {
      if (prev !== path) return prev
      const remaining = openFiles.filter((f) => f.path !== path)
      return remaining.length > 0 ? remaining[remaining.length - 1].path : null
    })
  }, [openFiles])

  const handleContentChange = useCallback((path: string, content: string) => {
    setOpenFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content, modified: true } : f)))
  }, [])

  const handleSave = useCallback(
    async (path: string) => {
      const file = openFiles.find((f) => f.path === path)
      if (!file) return
      setSavingFiles((prev) => new Set(prev).add(path))
      try {
        console.warn("File write not implemented in SDK - content saved locally only")
        setOpenFiles((prev) => prev.map((f) => (f.path === path ? { ...f, modified: false } : f)))
      } catch (err) {
        console.error("Failed to save file:", err)
        setError("Failed to save file")
      } finally {
        setSavingFiles((prev) => {
          const next = new Set(prev)
          next.delete(path)
          return next
        })
      }
    },
    [openFiles],
  )

  const currentFile = openFiles.find((f) => f.path === activeFile)
  const extensions = useMemo(() => {
    if (!currentFile) return []
    const langFunc = LANGUAGE_MAP[currentFile.language]
    return langFunc ? [langFunc()] : []
  }, [currentFile?.language])

  return (
    <div className="flex-1 flex bg-background min-h-0 border-t border-border/50">
      <div className="w-64 bg-surface/50 backdrop-blur-xl border-r border-border/50 flex flex-col min-h-0">
        <FileTree
          onFileClick={(node) => handleSelect(node.path)}
          selectedPath={activeFile || undefined}
          className="border-0 bg-transparent"
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center gap-px bg-surface/30 border-b border-border/50 overflow-x-auto h-11 no-scrollbar">
          {openFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(file.path)}
              className={clsx(
                "group relative flex items-center gap-2 px-4 h-full min-w-[120px] max-w-[200px] text-sm transition-all duration-200 border-r border-border/30",
                activeFile === file.path
                  ? "bg-background text-primary"
                  : "bg-surface/20 text-textSecondary hover:bg-surface/40 hover:text-textPrimary",
              )}
            >
              {activeFile === file.path && (
                <div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
              )}
              <span className="truncate flex-1">{file.name}</span>
              <div className="flex items-center justify-center w-5">
                {file.modified ? (
                  <Circle className="w-2 h-2 fill-warning text-warning group-hover:hidden" />
                ) : null}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCloseFile(file.path)
                  }}
                  className={clsx(
                    "hover:bg-white/10 rounded-md p-0.5 transition-all",
                    file.modified ? "hidden group-hover:block" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {currentFile ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-surface/10 border-b border-border/30">
                <div className="flex items-center gap-2 text-xs text-textMuted overflow-hidden">
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{currentFile.path}</span>
                </div>
                <div className="flex items-center gap-3">
                  {currentFile.modified && (
                    <span className="text-[10px] text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">Unsaved Changes</span>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleSave(currentFile.path)}
                    disabled={!currentFile.modified || savingFiles.has(currentFile.path)}
                    className="h-7 text-[11px] px-3"
                  >
                    {savingFiles.has(currentFile.path) ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Save className="w-3 h-3 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <CodeMirror
                  value={currentFile.content}
                  height="100%"
                  theme="dark"
                  extensions={extensions}
                  onChange={(value) => handleContentChange(currentFile.path, value)}
                  className="h-full text-[13px]"
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLine: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    foldGutter: true,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-xs animate-fade-in">
                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <FileCode className="w-10 h-10 text-primary/40" />
                </div>
                <p className="text-textPrimary font-semibold mb-2">Editor</p>
                <p className="text-textMuted text-sm">
                  Select a file from the explorer on the left to start editing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
