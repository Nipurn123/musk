import { useState, useRef, useEffect } from "react"
import { MoreVertical, Trash2, GitBranch, Share2, Edit2, Users, FileText } from "lucide-react"
import { clsx } from "clsx"
import type { Session } from "../types"

interface SessionActionsProps {
  session: Session
  onDelete: (session: Session) => void
  onFork: (session: Session) => void
  onShare: (session: Session) => void
  onRename: (session: Session) => void
  onViewChildren: (session: Session) => void
  onViewDiff: (session: Session) => void
  isCurrentSession: boolean
}

export function SessionActions({
  session,
  onDelete,
  onFork,
  onShare,
  onRename,
  onViewChildren,
  onViewDiff,
  isCurrentSession,
}: SessionActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const actions: Array<{ icon: typeof Edit2; label: string; onClick: () => void; className: string }> = [
    { icon: Edit2, label: "Rename", onClick: () => onRename(session), className: "" },
    { icon: GitBranch, label: "Fork", onClick: () => onFork(session), className: "" },
    { icon: Share2, label: "Share", onClick: () => onShare(session), className: "" },
    { icon: Users, label: "View Children", onClick: () => onViewChildren(session), className: "" },
    { icon: FileText, label: "View Diff", onClick: () => onViewDiff(session), className: "" },
    { icon: Trash2, label: "Delete", onClick: () => onDelete(session), className: "text-error hover:bg-error/10" },
  ]

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={clsx(
          "p-1.5 rounded-lg transition-all",
          "opacity-0 group-hover:opacity-100",
          isOpen && "opacity-100",
          "hover:bg-surface-hover text-textMuted hover:text-textPrimary",
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={clsx(
            "absolute right-0 top-full mt-1 z-50",
            "w-48 py-1.5 rounded-xl",
            "bg-surface border border-border shadow-xl",
            "animate-in fade-in zoom-in-95 duration-150",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={(e) => {
                e.stopPropagation()
                action.onClick()
                setIsOpen(false)
              }}
              className={clsx(
                "w-full px-3 py-2 flex items-center gap-2.5 text-sm",
                "hover:bg-surface-hover transition-colors",
                "text-textSecondary hover:text-textPrimary",
                action.className,
              )}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
