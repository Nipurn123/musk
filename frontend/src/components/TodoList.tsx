import { useState, useCallback, useRef } from "react"
import {
  CheckCircle,
  Circle,
  Clock,
  XCircle,
  ListTodo,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Trash2,
  Edit3,
  Filter,
  X,
  ChevronDown,
  GripVertical,
} from "lucide-react"
import { useGlobalStore } from "../store"
import { api, endpoints } from "../lib/api"
import type { Todo } from "../types"

const STATUS_OPTIONS: Array<{ value: Todo["status"]; label: string; icon: React.ReactNode }> = [
  { value: "pending", label: "Pending", icon: <Circle className="w-3 h-3" /> },
  { value: "in_progress", label: "In Progress", icon: <Clock className="w-3 h-3" /> },
  { value: "completed", label: "Completed", icon: <CheckCircle className="w-3 h-3" /> },
  { value: "cancelled", label: "Cancelled", icon: <XCircle className="w-3 h-3" /> },
]

const PRIORITY_OPTIONS: Array<{ value: Todo["priority"]; label: string; color: string }> = [
  { value: "high", label: "High", color: "text-error" },
  { value: "medium", label: "Medium", color: "text-warning" },
  { value: "low", label: "Low", color: "text-textMuted" },
]

function PriorityIcon({ priority }: { priority: Todo["priority"] }) {
  const colors: Record<Todo["priority"], string> = {
    high: "text-error",
    medium: "text-warning",
    low: "text-textMuted",
  }

  const icons: Record<Todo["priority"], typeof ArrowUp> = {
    high: ArrowUp,
    medium: Minus,
    low: ArrowDown,
  }

  const Icon = icons[priority]
  return <Icon className={`w-3 h-3 ${colors[priority]}`} />
}

function StatusIcon({ status }: { status: Todo["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-success" />
    case "in_progress":
      return <Clock className="w-4 h-4 text-primary animate-pulse" />
    case "cancelled":
      return <XCircle className="w-4 h-4 text-textMuted" />
    default:
      return <Circle className="w-4 h-4 text-textMuted" />
  }
}

function ProgressBar({ todos }: { todos: Todo[] }) {
  const completed = todos.filter((t) => t.status === "completed").length
  const cancelled = todos.filter((t) => t.status === "cancelled").length
  const inProgress = todos.filter((t) => t.status === "in_progress").length
  const total = todos.length

  if (total === 0) return null

  const completedPercent = (completed / total) * 100
  const inProgressPercent = (inProgress / total) * 100
  const cancelledPercent = (cancelled / total) * 100

  return (
    <div className="px-4 py-2 border-b border-border">
      <div className="flex items-center justify-between text-[10px] mb-1.5">
        <span className="text-textMuted">Progress</span>
        <span className="text-textPrimary font-medium">
          {completed}/{total} completed
        </span>
      </div>
      <div className="h-1.5 bg-background rounded-full overflow-hidden flex">
        {completedPercent > 0 && (
          <div className="bg-success h-full transition-all" style={{ width: `${completedPercent}%` }} />
        )}
        {inProgressPercent > 0 && (
          <div className="bg-primary h-full transition-all" style={{ width: `${inProgressPercent}%` }} />
        )}
        {cancelledPercent > 0 && (
          <div className="bg-textMuted h-full transition-all" style={{ width: `${cancelledPercent}%` }} />
        )}
      </div>
    </div>
  )
}

export function TodoList() {
  const currentSessionId = useGlobalStore((s) => s.currentSessionId)
  const todos = useGlobalStore((s) => s.todos)
  const setTodos = useGlobalStore((s) => s.setTodos)
  const addTodo = useGlobalStore((s) => s.addTodo)
  const updateTodo = useGlobalStore((s) => s.updateTodo)
  const deleteTodo = useGlobalStore((s) => s.deleteTodo)
  const reorderTodos = useGlobalStore((s) => s.reorderTodos)

  const [isCreating, setIsCreating] = useState(false)
  const [newTodoContent, setNewTodoContent] = useState("")
  const [newTodoPriority, setNewTodoPriority] = useState<Todo["priority"]>("medium")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editPriority, setEditPriority] = useState<Todo["priority"]>("medium")
  const [editStatus, setEditStatus] = useState<Todo["status"]>("pending")
  const [statusFilter, setStatusFilter] = useState<Todo["status"] | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<Todo["priority"] | "all">("all")
  const [showFilters, setShowFilters] = useState(false)

  const dragItem = useRef<string | null>(null)
  const dragOverItem = useRef<string | null>(null)

  const sessionTodos = currentSessionId ? todos.get(currentSessionId) || [] : []

  const filteredTodos = sessionTodos.filter((todo) => {
    if (statusFilter !== "all" && todo.status !== statusFilter) return false
    if (priorityFilter !== "all" && todo.priority !== priorityFilter) return false
    return true
  })

  const pendingTodos = filteredTodos.filter((t) => t.status === "pending" || t.status === "in_progress")
  const completedTodos = filteredTodos.filter((t) => t.status === "completed")
  const cancelledTodos = filteredTodos.filter((t) => t.status === "cancelled")

  const todoStats = {
    total: sessionTodos.length,
    pending: sessionTodos.filter((t) => t.status === "pending").length,
    inProgress: sessionTodos.filter((t) => t.status === "in_progress").length,
    completed: sessionTodos.filter((t) => t.status === "completed").length,
  }

  const handleCreateTodo = async () => {
    if (!currentSessionId || !newTodoContent.trim()) return

    const tempId = `temp-${Date.now()}`
    const newTodo: Todo = {
      id: tempId,
      content: newTodoContent.trim(),
      status: "pending",
      priority: newTodoPriority,
    }

    addTodo(currentSessionId, newTodo)
    setNewTodoContent("")
    setNewTodoPriority("medium")
    setIsCreating(false)

    try {
      const created = await api.post<Todo>(endpoints.todos(currentSessionId), {
        content: newTodo.content,
        status: newTodo.status,
        priority: newTodo.priority,
      })
      updateTodo(currentSessionId, tempId, { id: created.id })
    } catch (error) {
      deleteTodo(currentSessionId, tempId)
      console.error("Failed to create todo:", error)
    }
  }

  const handleUpdateTodo = async (todoId: string, updates: Partial<Todo>) => {
    if (!currentSessionId) return

    const oldTodo = sessionTodos.find((t) => t.id === todoId)
    if (!oldTodo) return

    updateTodo(currentSessionId, todoId, updates)

    try {
      await api.put(endpoints.todo(currentSessionId, todoId), updates)
    } catch (error) {
      updateTodo(currentSessionId, todoId, oldTodo)
      console.error("Failed to update todo:", error)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    if (!currentSessionId) return

    const todo = sessionTodos.find((t) => t.id === todoId)
    deleteTodo(currentSessionId, todoId)

    try {
      await api.delete(endpoints.todo(currentSessionId, todoId))
    } catch (error) {
      if (todo) addTodo(currentSessionId, todo)
      console.error("Failed to delete todo:", error)
    }
  }

  const handleDragStart = (todoId: string) => {
    dragItem.current = todoId
  }

  const handleDragEnter = (todoId: string) => {
    dragOverItem.current = todoId
  }

  const handleDragEnd = () => {
    if (!currentSessionId || !dragItem.current || !dragOverItem.current) return

    const todoIds = sessionTodos.map((t) => t.id)
    const dragIndex = todoIds.indexOf(dragItem.current)
    const dropIndex = todoIds.indexOf(dragOverItem.current)

    if (dragIndex !== -1 && dropIndex !== -1) {
      const newOrder = [...todoIds]
      newOrder.splice(dragIndex, 1)
      newOrder.splice(dropIndex, 0, dragItem.current)
      reorderTodos(currentSessionId, newOrder)
    }

    dragItem.current = null
    dragOverItem.current = null
  }

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id)
    setEditContent(todo.content)
    setEditPriority(todo.priority)
    setEditStatus(todo.status)
  }

  const saveEdit = () => {
    if (editingId && editContent.trim()) {
      handleUpdateTodo(editingId, {
        content: editContent.trim(),
        priority: editPriority,
        status: editStatus,
      })
    }
    setEditingId(null)
    setEditContent("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent("")
  }

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <ListTodo className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Tasks</span>
          {sessionTodos.length > 0 && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">{todoStats.total}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sessionTodos.length > 0 && (
            <div className="flex items-center gap-2 text-[10px]">
              {todoStats.inProgress > 0 && (
                <span className="flex items-center gap-1 text-primary">
                  <Clock className="w-3 h-3" />
                  {todoStats.inProgress}
                </span>
              )}
              {todoStats.completed > 0 && (
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle className="w-3 h-3" />
                  {todoStats.completed}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="p-1 hover:bg-surfaceHover rounded transition-colors"
            title="Add todo"
          >
            <Plus className="w-4 h-4 text-textMuted hover:text-textPrimary" />
          </button>
        </div>
      </div>

      {sessionTodos.length > 0 && <ProgressBar todos={sessionTodos} />}

      {(statusFilter !== "all" || priorityFilter !== "all") && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <span className="text-[10px] text-textMuted">Filters:</span>
          {statusFilter !== "all" && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full flex items-center gap-1">
              {statusFilter}
              <button onClick={() => setStatusFilter("all")}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {priorityFilter !== "all" && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full flex items-center gap-1">
              {priorityFilter}
              <button onClick={() => setPriorityFilter("all")}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setStatusFilter("all")
              setPriorityFilter("all")
            }}
            className="text-[10px] text-textMuted hover:text-textPrimary"
          >
            Clear all
          </button>
        </div>
      )}

      {showFilters && (
        <div className="px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-textMuted">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Todo["status"] | "all")}
                className="text-xs bg-surface border border-border rounded px-2 py-1 text-textPrimary"
              >
                <option value="all">All</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-textMuted">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as Todo["priority"] | "all")}
                className="text-xs bg-surface border border-border rounded px-2 py-1 text-textPrimary"
              >
                <option value="all">All</option>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {isCreating && currentSessionId && (
        <div className="px-4 py-3 border-b border-border bg-primary/5">
          <input
            type="text"
            value={newTodoContent}
            onChange={(e) => setNewTodoContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTodo()
              if (e.key === "Escape") {
                setIsCreating(false)
                setNewTodoContent("")
              }
            }}
            placeholder="Enter task description..."
            className="w-full text-xs bg-surface border border-border rounded px-3 py-2 mb-2 text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <select
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(e.target.value as Todo["priority"])}
              className="text-xs bg-surface border border-border rounded px-2 py-1 text-textPrimary"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} priority
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewTodoContent("")
                }}
                className="px-3 py-1 text-xs text-textMuted hover:text-textPrimary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTodo}
                disabled={!newTodoContent.trim()}
                className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sessionTodos.length === 0 ? (
          <div className="text-center text-textMuted text-xs py-8 px-4">
            <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No active tasks</p>
            <p className="text-[10px] mt-1">Click + to add a task manually</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center text-textMuted text-xs py-8 px-4">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No tasks match filters</p>
            <button
              onClick={() => {
                setStatusFilter("all")
                setPriorityFilter("all")
              }}
              className="text-[10px] mt-1 text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendingTodos.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-background text-[10px] font-bold uppercase text-textMuted flex items-center justify-between">
                  <span>Active ({pendingTodos.length})</span>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-1 rounded hover:bg-surfaceHover ${showFilters ? "text-primary" : "text-textMuted"}`}
                  >
                    <Filter className="w-3 h-3" />
                  </button>
                </div>
                {pendingTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    isEditing={editingId === todo.id}
                    editContent={editContent}
                    editPriority={editPriority}
                    editStatus={editStatus}
                    onDragStart={handleDragStart}
                    onDragEnter={handleDragEnter}
                    onDragEnd={handleDragEnd}
                    onStartEdit={startEditing}
                    onEditContent={setEditContent}
                    onEditPriority={setEditPriority}
                    onEditStatus={setEditStatus}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onUpdate={handleUpdateTodo}
                    onDelete={handleDeleteTodo}
                  />
                ))}
              </div>
            )}

            {completedTodos.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-background text-[10px] font-bold uppercase text-textMuted">
                  Completed ({completedTodos.length})
                </div>
                {completedTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    isEditing={editingId === todo.id}
                    editContent={editContent}
                    editPriority={editPriority}
                    editStatus={editStatus}
                    onDragStart={handleDragStart}
                    onDragEnter={handleDragEnter}
                    onDragEnd={handleDragEnd}
                    onStartEdit={startEditing}
                    onEditContent={setEditContent}
                    onEditPriority={setEditPriority}
                    onEditStatus={setEditStatus}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onUpdate={handleUpdateTodo}
                    onDelete={handleDeleteTodo}
                  />
                ))}
              </div>
            )}

            {cancelledTodos.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-background text-[10px] font-bold uppercase text-textMuted">
                  Cancelled ({cancelledTodos.length})
                </div>
                {cancelledTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    isEditing={editingId === todo.id}
                    editContent={editContent}
                    editPriority={editPriority}
                    editStatus={editStatus}
                    onDragStart={handleDragStart}
                    onDragEnter={handleDragEnter}
                    onDragEnd={handleDragEnd}
                    onStartEdit={startEditing}
                    onEditContent={setEditContent}
                    onEditPriority={setEditPriority}
                    onEditStatus={setEditStatus}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onUpdate={handleUpdateTodo}
                    onDelete={handleDeleteTodo}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface TodoItemProps {
  todo: Todo
  isEditing: boolean
  editContent: string
  editPriority: Todo["priority"]
  editStatus: Todo["status"]
  onDragStart: (id: string) => void
  onDragEnter: (id: string) => void
  onDragEnd: () => void
  onStartEdit: (todo: Todo) => void
  onEditContent: (content: string) => void
  onEditPriority: (priority: Todo["priority"]) => void
  onEditStatus: (status: Todo["status"]) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onUpdate: (id: string, updates: Partial<Todo>) => void
  onDelete: (id: string) => void
}

function TodoItem({
  todo,
  isEditing,
  editContent,
  editPriority,
  editStatus,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onStartEdit,
  onEditContent,
  onEditPriority,
  onEditStatus,
  onSaveEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: TodoItemProps) {
  const isCompleted = todo.status === "completed"
  const isCancelled = todo.status === "cancelled"
  const isInProgress = todo.status === "in_progress"

  const [showStatusMenu, setShowStatusMenu] = useState(false)

  if (isEditing) {
    return (
      <div className="px-3 py-2.5 bg-primary/5 border-l-2 border-primary">
        <input
          type="text"
          value={editContent}
          onChange={(e) => onEditContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit()
            if (e.key === "Escape") onCancelEdit()
          }}
          className="w-full text-xs bg-surface border border-border rounded px-2 py-1 mb-2 text-textPrimary"
          autoFocus
        />
        <div className="flex items-center gap-2 mb-2">
          <select
            value={editStatus}
            onChange={(e) => onEditStatus(e.target.value as Todo["status"])}
            className="text-xs bg-surface border border-border rounded px-2 py-1 text-textPrimary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={editPriority}
            onChange={(e) => onEditPriority(e.target.value as Todo["priority"])}
            className="text-xs bg-surface border border-border rounded px-2 py-1 text-textPrimary"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancelEdit} className="px-2 py-1 text-xs text-textMuted hover:text-textPrimary">
            Cancel
          </button>
          <button onClick={onSaveEdit} className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90">
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`px-3 py-2.5 transition-colors group ${
        isCompleted
          ? "bg-success/5"
          : isCancelled
            ? "bg-error/5"
            : isInProgress
              ? "bg-primary/5"
              : "hover:bg-surfaceHover"
      }`}
      draggable
      onDragStart={() => onDragStart(todo.id)}
      onDragEnter={() => onDragEnter(todo.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-textMuted" />
        </div>
        <div className="shrink-0 mt-0.5 relative">
          <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="hover:scale-110 transition-transform">
            <StatusIcon status={todo.status} />
          </button>
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 bg-surface border border-border rounded shadow-lg py-1 min-w-[120px]">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onUpdate(todo.id, { status: opt.value })
                      setShowStatusMenu(false)
                    }}
                    className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surfaceHover ${
                      todo.status === opt.value ? "text-primary" : "text-textPrimary"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${
                isCompleted
                  ? "text-textMuted line-through"
                  : isCancelled
                    ? "text-textMuted line-through"
                    : "text-textPrimary"
              }`}
            >
              {todo.content}
            </span>
            <PriorityIcon priority={todo.priority} />
          </div>
          {isInProgress && (
            <div className="mt-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <span className="text-[10px] text-primary">In Progress</span>
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onStartEdit(todo)} className="p-1 hover:bg-surfaceHover rounded" title="Edit">
            <Edit3 className="w-3 h-3 text-textMuted hover:text-textPrimary" />
          </button>
          <button onClick={() => onDelete(todo.id)} className="p-1 hover:bg-error/10 rounded" title="Delete">
            <Trash2 className="w-3 h-3 text-textMuted hover:text-error" />
          </button>
        </div>
      </div>
    </div>
  )
}
