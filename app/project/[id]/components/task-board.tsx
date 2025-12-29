import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Circle, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { Task, TeamMember, priorityConfig, taskStatusConfig } from "../types"
import { useState } from "react"

interface TaskBoardProps {
    tasks: Task[]
    members: TeamMember[] // Changed from ProjectMember to TeamMember to match parent usage
    accessLevel: number
    viewMode: "list" | "kanban" | "calendar"
    onTasksChange: () => void // Trigger fetchTasks
    onAddTask: (task: any) => Promise<void>
    onUpdateStatus: (taskId: string, status: Task["status"]) => Promise<void>
    onDeleteTask: (taskId: string) => Promise<void>
}

export function TaskBoard({
    tasks,
    members,
    accessLevel,
    viewMode,
    onTasksChange,
    onAddTask,
    onUpdateStatus,
    onDeleteTask
}: TaskBoardProps) {
    const [showAddTask, setShowAddTask] = useState(false)
    const [addingToStatus, setAddingToStatus] = useState<Task["status"] | null>(null)
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        status: "todo" as Task["status"],
        priority: "medium" as Task["priority"],
        assignee_uuid: "",
        due_date: "",
    })
    const [calendarDate, setCalendarDate] = useState(new Date())
    const [draggingTask, setDraggingTask] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<Task["status"] | null>(null)

    const taskStats = {
        total: tasks.length,
        done: tasks.filter((t) => t.status === "done").length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
    }

    function getDDay(deadline: string | null) {
        if (!deadline) return null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const deadlineDate = new Date(deadline)
        return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    function formatDDay(dday: number | null) {
        if (dday === null) return null
        if (dday === 0) return "D-Day"
        if (dday > 0) return `D-${dday}`
        return `D+${Math.abs(dday)}`
    }

    // Drag & Drop
    function handleDragStart(e: React.DragEvent, taskId: string) {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", taskId)
        const target = e.currentTarget as HTMLElement
        setTimeout(() => {
            setDraggingTask(taskId)
            if (target) target.style.opacity = "0.4"
        }, 0)
    }

    function handleDragEnd(e: React.DragEvent) {
        setDraggingTask(null)
        setDragOverStatus(null)
        const target = e.currentTarget as HTMLElement
        if (target) target.style.opacity = "1"
    }

    function handleDragOver(e: React.DragEvent, status: Task["status"]) {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (dragOverStatus !== status) setDragOverStatus(status)
    }

    function handleDrop(e: React.DragEvent, newStatus: Task["status"]) {
        e.preventDefault()
        const taskId = e.dataTransfer.getData("text/plain")
        if (taskId && accessLevel >= 1) {
            const task = tasks.find((t) => t.id === taskId)
            if (task && task.status !== newStatus) {
                onUpdateStatus(taskId, newStatus)
            }
        }
        setDraggingTask(null)
        setDragOverStatus(null)
    }

    async function handleAddTaskSubmit(status?: Task["status"]) {
        await onAddTask({ ...newTask, status: status || newTask.status })
        setNewTask({ title: "", description: "", status: "todo", priority: "medium", assignee_uuid: "", due_date: "" })
        setShowAddTask(false)
        setAddingToStatus(null)
    }

    // Calendar helpers
    function getCalendarDays() {
        const year = calendarDate.getFullYear()
        const month = calendarDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const days: (Date | null)[] = []
        for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
        return days
    }

    function getTasksForDate(date: Date) {
        const dateStr = date.toISOString().split("T")[0]
        return tasks.filter((t) => t.due_date === dateStr)
    }

    function TaskCard({ task, compact = false, draggable = false }: { task: Task; compact?: boolean; draggable?: boolean }) {
        const statusConf = taskStatusConfig[task.status]
        const priorityConf = priorityConfig[task.priority]
        const StatusIcon = {
            todo: Circle,
            in_progress: AlertCircle,
            review: MoreHorizontal,
            done: CheckCircle2
        }[task.status] // Using fixed mapping since the object might be reconstructed

        const taskDday = getDDay(task.due_date)
        const taskDdayText = formatDDay(taskDday)

        return (
            <div
                draggable={draggable && accessLevel >= 1}
                onDragStart={(e) => draggable && handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`group p-3 rounded-lg border transition-all select-none ${task.status === "done" ? "bg-neutral-900/30 border-neutral-800/50" : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                    } ${draggable && accessLevel >= 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
                <div className="flex items-start gap-2">
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            const next: Record<Task["status"], Task["status"]> = { todo: "in_progress", in_progress: "review", review: "done", done: "todo" }
                            onUpdateStatus(task.id, next[task.status])
                        }}
                        draggable={false}
                        className={`mt-0.5 p-0.5 rounded transition-colors ${statusConf.color} hover:bg-neutral-800`}
                    >
                        <StatusIcon className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-neutral-500" : "text-white"}`}>
                                {task.title}
                            </p>
                            <div className={`w-1.5 h-1.5 rounded-full ${priorityConf.color}`} title={priorityConf.label} />
                        </div>
                        {!compact && task.description && (
                            <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-neutral-600">
                            {task.assignee && (
                                <span className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] font-bold text-neutral-300">
                                        {(task.assignee.name || "?")[0]}
                                    </div>
                                </span>
                            )}
                            {taskDdayText && (
                                <span className={`px-1 py-0.5 rounded ${taskDday !== null && taskDday < 0 ? "bg-red-900/30 text-red-400" : taskDday === 0 ? "bg-yellow-900/30 text-yellow-400" : "bg-neutral-800 text-neutral-400"
                                    }`}>
                                    {taskDdayText}
                                </span>
                            )}
                        </div>
                    </div>
                    {accessLevel >= 3 && (
                        <button onClick={() => onDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-600 hover:text-red-400 transition-all">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-300">
            {/* Task Stats */}
            <div className="flex items-center gap-6 mb-6 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <div><p className="text-2xl font-bold">{taskStats.total}</p><p className="text-xs text-neutral-500">전체</p></div>
                <div className="w-px h-10 bg-neutral-800" />
                <div><p className="text-2xl font-bold text-green-400">{taskStats.done}</p><p className="text-xs text-neutral-500">완료</p></div>
                <div className="w-px h-10 bg-neutral-800" />
                <div><p className="text-2xl font-bold text-blue-400">{taskStats.inProgress}</p><p className="text-xs text-neutral-500">진행 중</p></div>
                {taskStats.total > 0 && (
                    <>
                        <div className="flex-1" />
                        <div className="text-right"><p className="text-2xl font-bold">{Math.round((taskStats.done / taskStats.total) * 100)}%</p><p className="text-xs text-neutral-500">진행률</p></div>
                    </>
                )}
            </div>

            {/* List View */}
            {viewMode === "list" && (
                <>
                    {accessLevel >= 1 && !showAddTask && (
                        <button onClick={() => setShowAddTask(true)} className="w-full mb-4 p-3 border border-dashed border-neutral-700 rounded-lg text-neutral-500 hover:text-white hover:border-neutral-500 transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" />새 태스크 추가
                        </button>
                    )}
                    {showAddTask && (
                        <div className="mb-4 p-4 rounded-lg border border-neutral-800 bg-neutral-950 animate-in fade-in duration-200">
                            <input type="text" placeholder="태스크 제목" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-3 py-2 mb-3 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none" autoFocus />
                            <textarea placeholder="설명 (선택)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={2} className="w-full px-3 py-2 mb-3 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 resize-none" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <select value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value as Task["status"] })} className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white text-sm">
                                    <option value="todo">할 일</option><option value="in_progress">진행 중</option><option value="review">검토</option><option value="done">완료</option>
                                </select>
                                <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task["priority"] })} className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white text-sm">
                                    <option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option><option value="urgent">긴급</option>
                                </select>
                                <select value={newTask.assignee_uuid} onChange={(e) => setNewTask({ ...newTask, assignee_uuid: e.target.value })} className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white text-sm">
                                    <option value="">담당자 없음</option>
                                    {members.map((m) => <option key={m.user_uuid} value={m.user_uuid}>{m.name || m.name_eng || 'Unknown'}</option>)}
                                </select>
                                <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white text-sm" />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowAddTask(false)} className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">취소</button>
                                <button onClick={() => handleAddTaskSubmit()} className="px-4 py-1.5 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200">추가</button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        {tasks.length === 0 ? <p className="text-center text-neutral-500 py-12">아직 태스크가 없습니다.</p> : tasks.map((task) => <TaskCard key={task.id} task={task} />)}
                    </div>
                </>
            )}

            {/* Kanban View */}
            {viewMode === "kanban" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(["todo", "in_progress", "review", "done"] as const).map((statusKey) => {
                        const conf = taskStatusConfig[statusKey]
                        const statusTasks = tasks.filter((t) => t.status === statusKey)
                        const StatusIcon = {
                            todo: Circle,
                            in_progress: AlertCircle,
                            review: MoreHorizontal,
                            done: CheckCircle2
                        }[statusKey]
                        const isDropTarget = dragOverStatus === statusKey

                        return (
                            <div
                                key={statusKey}
                                onDragOver={(e) => handleDragOver(e, statusKey)}
                                onDragLeave={() => setDragOverStatus(null)}
                                onDrop={(e) => handleDrop(e, statusKey)}
                                className={`rounded-xl border bg-neutral-950/50 overflow-hidden transition-all duration-200 ${isDropTarget
                                    ? "border-white/50 bg-neutral-900/50 scale-[1.02]"
                                    : "border-neutral-800"
                                    }`}
                            >
                                <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon className={`w-4 h-4 ${conf.color}`} />
                                        <span className="text-sm font-medium">{conf.label}</span>
                                    </div>
                                    <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">{statusTasks.length}</span>
                                </div>
                                <div className={`p-2 space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto transition-all ${isDropTarget ? "bg-neutral-800/20" : ""}`}>
                                    {accessLevel >= 1 && (
                                        addingToStatus === statusKey ? (
                                            <div className="p-2 rounded-lg border border-neutral-700 bg-neutral-900">
                                                <input type="text" placeholder="태스크 제목" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-2 py-1.5 mb-2 bg-black border border-neutral-800 rounded text-sm" autoFocus />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setAddingToStatus(null)} className="flex-1 px-2 py-1 text-xs text-neutral-400">취소</button>
                                                    <button onClick={() => handleAddTaskSubmit(statusKey)} className="flex-1 px-2 py-1 bg-white text-black text-xs font-medium rounded">추가</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setAddingToStatus(statusKey); setNewTask({ ...newTask, title: "" }) }} className="w-full p-2 border border-dashed border-neutral-700 rounded-lg text-neutral-600 hover:text-white hover:border-neutral-500 text-xs flex items-center justify-center gap-1">
                                                <Plus className="w-3 h-3" />추가
                                            </button>
                                        )
                                    )}
                                    {statusTasks.map((task) => <TaskCard key={task.id} task={task} compact draggable />)}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Calendar View */}
            {viewMode === "calendar" && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-medium">{calendarDate.getFullYear()}년 {calendarDate.getMonth() + 1}월</h2>
                        <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-7 bg-neutral-900">
                            {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                                <div key={day} className={`p-2 text-center text-xs font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-neutral-400"}`}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {getCalendarDays().map((date, i) => {
                                const tasksOnDate = date ? getTasksForDate(date) : []
                                const isToday = date && date.toDateString() === new Date().toDateString()
                                const dow = i % 7

                                return (
                                    <div key={i} className={`min-h-[80px] p-1.5 border-t border-l border-neutral-800 ${date ? "bg-neutral-950" : "bg-neutral-900/30"} ${i % 7 === 0 ? "border-l-0" : ""}`}>
                                        {date && (
                                            <>
                                                <div className={`text-xs mb-1 ${isToday ? "w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold" : dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-neutral-400"}`}>
                                                    {date.getDate()}
                                                </div>
                                                <div className="space-y-0.5">
                                                    {tasksOnDate.slice(0, 2).map((t) => {
                                                        const tc = taskStatusConfig[t.status]
                                                        return (
                                                            <div key={t.id} className={`text-[9px] px-1 py-0.5 rounded truncate ${tc.bg} ${tc.color}`}>{t.title}</div>
                                                        )
                                                    })}
                                                    {tasksOnDate.length > 2 && <div className="text-[9px] text-neutral-600">+{tasksOnDate.length - 2}</div>}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
