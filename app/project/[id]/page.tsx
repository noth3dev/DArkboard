"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import {
    ArrowLeft,
    Calendar,
    FileText,
    ExternalLink,
    Pencil,
    Trash2,
    X,
    Save,
    Folder,
    Tag,
    Users,
    UserPlus,
    Link as LinkIcon,
    Clock,
    Plus,
    CheckCircle2,
    Circle,
    AlertCircle,
    MoreHorizontal,
    List,
    Columns3,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Settings,
    Eye,
    EyeOff,
    Lock,
    Globe,
    Upload,
    File,
    Paperclip,
    Loader2,
    Image as ImageIcon,
    Download,
} from "lucide-react"

type TeamMember = {
    user_uuid: string
    name: string | null
    name_eng: string | null
}

type ProjectMember = {
    user_uuid: string
    role: string | null
    user: TeamMember
}

type Asset = {
    id: string
    project_id: string
    task_id: string | null
    name: string
    url: string
    type: string
    added_by: string
    created_at: string
}

type Task = {
    id: string
    title: string
    description: string | null
    status: "todo" | "in_progress" | "review" | "done"
    priority: "low" | "medium" | "high" | "urgent"
    assignee_uuid: string | null
    due_date: string | null
    sort_order: number
    assignee?: TeamMember
}

type Project = {
    id: string
    name: string
    description: string | null
    status: "active" | "development" | "planning" | "archived"
    url: string | null
    tags: string[]
    deadline: string | null
    created_at: string
    updated_at: string
    is_public: boolean
    created_by: string | null
}

const statusConfig = {
    active: { label: "운영 중", dot: "bg-white" },
    development: { label: "개발 중", dot: "bg-neutral-400" },
    planning: { label: "기획 중", dot: "bg-neutral-600" },
    archived: { label: "보관됨", dot: "bg-neutral-700" },
} as const

const taskStatusConfig = {
    todo: { label: "할 일", icon: Circle, color: "text-neutral-500", bg: "bg-neutral-800" },
    in_progress: { label: "진행 중", icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-900/30" },
    review: { label: "검토", icon: MoreHorizontal, color: "text-yellow-400", bg: "bg-yellow-900/30" },
    done: { label: "완료", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-900/30" },
} as const

const priorityConfig = {
    low: { label: "낮음", color: "bg-neutral-600" },
    medium: { label: "보통", color: "bg-blue-600" },
    high: { label: "높음", color: "bg-yellow-600" },
    urgent: { label: "긴급", color: "bg-red-600" },
} as const

type TaskViewMode = "list" | "kanban" | "calendar"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { user, loading: authLoading, accessLevel } = useAuth()
    const [project, setProject] = useState<Project | null>(null)
    const [members, setMembers] = useState<ProjectMember[]>([])
    const [allMembers, setAllMembers] = useState<TeamMember[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [addingMember, setAddingMember] = useState(false)
    const [selectedMember, setSelectedMember] = useState("")
    const [memberRole, setMemberRole] = useState("")
    const [activeTab, setActiveTab] = useState<"tasks" | "assets" | "settings">("tasks")
    const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("list")
    const [calendarDate, setCalendarDate] = useState(new Date())
    const [showAddTask, setShowAddTask] = useState(false)
    const [addingToStatus, setAddingToStatus] = useState<Task["status"] | null>(null)
    const [draggingTask, setDraggingTask] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<Task["status"] | null>(null)
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        status: "todo" as Task["status"],
        priority: "medium" as Task["priority"],
        assignee_uuid: "",
        due_date: "",
    })
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        status: "planning" as Project["status"],
        url: "",
        tags: "",
        deadline: "",
        is_public: true,
    })

    const [newAsset, setNewAsset] = useState({
        name: "",
        url: "",
        type: "link" as Asset["type"],
    })
    const [showAddAsset, setShowAddAsset] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
    const [assetFilter, setAssetFilter] = useState<Asset["type"] | "all">("all")

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [id, user])

    async function fetchData() {
        await Promise.all([fetchProject(), fetchAllMembers(), fetchTasks(), fetchAssets()])
    }

    async function createNotification(recipientUuid: string, type: string, content: string, taskId?: string) {
        try {
            const supabase = getSupabase()
            await supabase.from("notifications").insert({
                recipient_uuid: recipientUuid,
                actor_uuid: user?.id,
                type,
                project_id: id,
                task_id: taskId || null,
                content,
            })
        } catch (err) {
            console.error("Error creating notification:", err)
        }
    }

    async function fetchAllMembers() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("users")
                .select("user_uuid, name, name_eng")
                .order("name", { ascending: true })

            if (error) throw error
            setAllMembers(data || [])
        } catch (err) {
            console.error("Error fetching members:", err)
        }
    }

    async function fetchProject() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.from("projects").select("*").eq("id", id).single()

            if (error) throw error
            setProject(data)
            setEditForm({
                name: data.name,
                description: data.description || "",
                status: data.status,
                url: data.url || "",
                tags: (data.tags || []).join(", "),
                deadline: data.deadline || "",
                is_public: data.is_public !== false,
            })

            const { data: membersData } = await supabase
                .from("project_members")
                .select(`user_uuid, role, user:users(user_uuid, name, name_eng)`)
                .eq("project_id", id)

            setMembers(
                (membersData || []).map((m: { user_uuid: string; role: string | null; user: TeamMember | TeamMember[] }) => ({
                    user_uuid: m.user_uuid,
                    role: m.role,
                    user: Array.isArray(m.user) ? m.user[0] : m.user,
                }))
            )
        } catch (err) {
            console.error("Error fetching project:", err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchTasks() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("project_tasks")
                .select(`*, assignee:users(user_uuid, name, name_eng)`)
                .eq("project_id", id)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false })

            if (error) throw error
            setTasks(
                (data || []).map((t: Task & { assignee: TeamMember | TeamMember[] }) => ({
                    ...t,
                    assignee: Array.isArray(t.assignee) ? t.assignee[0] : t.assignee,
                }))
            )
        } catch (err) {
            console.error("Error fetching tasks:", err)
        }
    }

    async function fetchAssets() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("project_assets")
                .select("*")
                .eq("project_id", id)
                .order("created_at", { ascending: false })

            if (error) throw error
            setAssets(data || [])
        } catch (err) {
            console.error("Error fetching assets:", err)
        }
    }

    async function handleUpdate() {
        if ((accessLevel ?? 0) < 1) return
        if (!editForm.name.trim()) return

        try {
            const supabase = getSupabase()
            const tagsArray = editForm.tags.split(",").map((t) => t.trim()).filter(Boolean)

            const { error } = await supabase
                .from("projects")
                .update({
                    name: editForm.name.trim(),
                    description: editForm.description.trim() || null,
                    status: editForm.status,
                    url: editForm.url.trim() || null,
                    tags: tagsArray,
                    deadline: editForm.deadline || null,
                    is_public: editForm.is_public,
                    created_by: project?.created_by || user?.id, // 생성자가 없으면 현재 수정자로 설정
                })
                .eq("id", id)

            if (error) throw error
            setIsEditing(false)
            fetchProject()
        } catch (err) {
            console.error("Error updating project:", err)
        }
    }

    async function handleDelete() {
        if ((accessLevel ?? 0) < 2) return
        if (!confirm("정말 삭제하시겠습니까?")) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("projects").delete().eq("id", id)
            if (error) throw error
            router.push("/project")
        } catch (err) {
            console.error("Error deleting project:", err)
        }
    }

    async function handleAddMember() {
        if ((accessLevel ?? 0) < 1 || !selectedMember) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_members").insert({
                project_id: id,
                user_uuid: selectedMember,
                role: memberRole.trim() || null,
            })
            if (error) throw error

            // 알림 생성
            createNotification(
                selectedMember,
                "new_member",
                `'${project?.name}' 프로젝트의 멤버로 초대되었습니다.`
            )

            setAddingMember(false)
            setSelectedMember("")
            setMemberRole("")
            fetchProject()
        } catch (err) {
            console.error("Error adding member:", err)
        }
    }

    async function handleRemoveMember(userUuid: string) {
        if ((accessLevel ?? 0) < 1) return
        try {
            const supabase = getSupabase()

            // 삭제하려는 멤버가 현재 프로젝트 소유자(created_by)인 경우
            if (project?.created_by === userUuid) {
                // 다른 멤버 중 한 명을 새로운 소유자로 지정 (삭제 대상을 제외한 첫 번째 멤버)
                const nextOwner = members.find(m => m.user_uuid !== userUuid)

                if (nextOwner) {
                    const { error: ownerError } = await supabase
                        .from("projects")
                        .update({ created_by: nextOwner.user_uuid })
                        .eq("id", id)

                    if (ownerError) throw ownerError
                } else {
                    // 남은 멤버가 없는 경우
                    if (!confirm("프로젝트의 마지막 멤버이자 소유자입니다. 삭제하면 소유자 없는 프로젝트가 됩니다. 계속하시겠습니까?")) {
                        return
                    }
                }
            }

            const { error } = await supabase.from("project_members").delete().eq("project_id", id).eq("user_uuid", userUuid)
            if (error) throw error
            fetchProject()
        } catch (err) {
            console.error("Error removing member:", err)
        }
    }

    async function handleAddTask(status?: Task["status"]) {
        if ((accessLevel ?? 0) < 1 || !newTask.title.trim()) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_tasks").insert({
                project_id: id,
                title: newTask.title.trim(),
                description: newTask.description.trim() || null,
                status: status || newTask.status,
                priority: newTask.priority,
                assignee_uuid: newTask.assignee_uuid || null,
                due_date: newTask.due_date || null,
            })
            if (error) throw error

            // 담당자가 있는 경우 알림 생성
            if (newTask.assignee_uuid && newTask.assignee_uuid !== user?.id) {
                createNotification(
                    newTask.assignee_uuid,
                    "task_assigned",
                    `'${project?.name}' 프로젝트에서 새로운 태스크 '${newTask.title}'이(가) 할당되었습니다.`
                )
            }

            setNewTask({ title: "", description: "", status: "todo", priority: "medium", assignee_uuid: "", due_date: "" })
            setShowAddTask(false)
            setAddingToStatus(null)
            fetchTasks()
        } catch (err) {
            console.error("Error adding task:", err)
        }
    }

    async function handleUpdateTaskStatus(taskId: string, newStatus: Task["status"]) {
        if ((accessLevel ?? 0) < 1) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_tasks").update({ status: newStatus }).eq("id", taskId)
            if (error) throw error

            // 상태 변경 알림 (관련자들에게)
            const task = tasks.find(t => t.id === taskId)
            if (task && task.assignee_uuid && task.assignee_uuid !== user?.id) {
                createNotification(
                    task.assignee_uuid,
                    "status_changed",
                    `과제 '${task.title}'의 상태가 '${taskStatusConfig[newStatus].label}'(으)로 변경되었습니다.`
                )
            }

            fetchTasks()
        } catch (err) {
            console.error("Error updating task:", err)
        }
    }

    async function handleDeleteTask(taskId: string) {
        if ((accessLevel ?? 0) < 2) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_tasks").delete().eq("id", taskId)
            if (error) throw error
            fetchTasks()
        } catch (err) {
            console.error("Error deleting task:", err)
        }
    }

    async function handleAddAsset() {
        if (!newAsset.name.trim() || !newAsset.url.trim()) return

        // URL 유효성 검사
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
        if (!urlPattern.test(newAsset.url.trim())) {
            alert("올바른 URL 형식이 아닙니다. (예: https://google.com)")
            return
        }

        try {
            const supabase = getSupabase()
            // http:// 가 없으면 붙여주기
            let finalUrl = newAsset.url.trim()
            if (!finalUrl.startsWith('http')) {
                finalUrl = 'https://' + finalUrl
            }

            const { error } = await supabase.from("project_assets").insert({
                project_id: id,
                name: newAsset.name.trim(),
                url: finalUrl,
                type: newAsset.type,
                added_by: user?.id,
            })
            if (error) throw error
            setNewAsset({ name: "", url: "", type: "link" })
            setShowAddAsset(false)
            fetchAssets()
        } catch (err) {
            console.error("Error adding asset:", err)
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !user) return

        try {
            setIsUploading(true)
            const supabase = getSupabase()

            // 파일명 중복 방지를 위한 유니크한 이름 생성
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
            const filePath = `${id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('project-assets')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 파일의 Public URL 가져오기
            const { data: { publicUrl } } = supabase.storage
                .from('project-assets')
                .getPublicUrl(filePath)

            // Asset으로 등록
            const assetType: Asset["type"] = file.type.startsWith('image/') ? 'image' : 'document'

            const { error: assetError } = await supabase.from("project_assets").insert({
                project_id: id,
                name: file.name,
                url: publicUrl,
                type: assetType,
                added_by: user.id,
            })

            if (assetError) throw assetError

            fetchAssets()
            setShowAddAsset(false)
        } catch (err: any) {
            console.error("Error uploading file:", err)
            alert(`파일 업로드 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    async function handleDeleteAsset(assetId: string) {
        if (!confirm("정말 이 에셋을 삭제하시겠습니까?")) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_assets").delete().eq("id", assetId)
            if (error) throw error
            fetchAssets()
        } catch (err) {
            console.error("Error deleting asset:", err)
        }
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    }

    function formatShortDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
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

    function getAvailableMembers() {
        const existingUuids = new Set(members.map((m) => m.user_uuid))
        return allMembers.filter((m) => !existingUuids.has(m.user_uuid))
    }

    // 캘린더 함수
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

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-neutral-400">로딩 중...</div>
            </div>
        )
    }

    if (!user) return <AuthForm />

    if ((accessLevel ?? 0) === 0) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center text-neutral-400">
                    <p className="mb-4">이 페이지에 접근할 권한이 없습니다.</p>
                    <button onClick={() => router.push("/")} className="text-white underline">대시보드로 돌아가기</button>
                </div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-neutral-400 mb-4">프로젝트를 찾을 수 없습니다</p>
                    <button onClick={() => router.push("/project")} className="text-white hover:underline">목록으로 돌아가기</button>
                </div>
            </div>
        )
    }

    const status = statusConfig[project.status]
    const availableMembers = getAvailableMembers()
    const dday = getDDay(project.deadline)
    const ddayText = formatDDay(dday)
    const taskStats = {
        total: tasks.length,
        done: tasks.filter((t) => t.status === "done").length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
    }
    const calendarDays = getCalendarDays()
    const weekDays = ["일", "월", "화", "수", "목", "금", "토"]
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 드래그 앤 드롭 핸들러
    function handleDragStart(e: React.DragEvent, taskId: string) {
        // 브라우저가 원본 요소를 캡처하여 드래그 이미지를 만들 수 있도록 데이터 먼저 설정
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", taskId)

        // 중요: 상태 업데이트를 아주 약간 지연시켜서 브라우저의 드래그 시작 세션이 
        // 리렌더링으로 인해 취소되지 않도록 함
        const target = e.currentTarget as HTMLElement
        setTimeout(() => {
            setDraggingTask(taskId)
            if (target) {
                target.style.opacity = "0.4"
            }
        }, 0)
    }

    function handleDragEnd(e: React.DragEvent) {
        setDraggingTask(null)
        setDragOverStatus(null)
        const target = e.currentTarget as HTMLElement
        if (target) {
            target.style.opacity = "1"
        }
    }

    function handleDragOver(e: React.DragEvent, status: Task["status"]) {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (dragOverStatus !== status) {
            setDragOverStatus(status)
        }
    }

    function handleDragLeave() {
        setDragOverStatus(null)
    }

    function handleDrop(e: React.DragEvent, newStatus: Task["status"]) {
        e.preventDefault()
        const taskId = e.dataTransfer.getData("text/plain")
        if (taskId && (accessLevel ?? 0) >= 1) {
            const task = tasks.find((t) => t.id === taskId)
            if (task && task.status !== newStatus) {
                handleUpdateTaskStatus(taskId, newStatus)
            }
        }
        setDraggingTask(null)
        setDragOverStatus(null)
    }

    // 태스크 카드 컴포넌트
    function TaskCard({ task, compact = false, draggable = false }: { task: Task; compact?: boolean; draggable?: boolean }) {
        const statusConf = taskStatusConfig[task.status]
        const priorityConf = priorityConfig[task.priority]
        const StatusIcon = statusConf.icon
        const taskDday = getDDay(task.due_date)
        const taskDdayText = formatDDay(taskDday)
        const isDragging = draggingTask === task.id

        return (
            <div
                draggable={draggable && (accessLevel ?? 0) >= 1}
                onDragStart={(e) => draggable && handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`group p-3 rounded-lg border transition-all select-none ${task.status === "done" ? "bg-neutral-900/30 border-neutral-800/50" : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                    } ${draggable && (accessLevel ?? 0) >= 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
                <div className="flex items-start gap-2">
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            const next: Record<Task["status"], Task["status"]> = { todo: "in_progress", in_progress: "review", review: "done", done: "todo" }
                            handleUpdateTaskStatus(task.id, next[task.status])
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
                    {(accessLevel ?? 0) >= 2 && (
                        <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-600 hover:text-red-400 transition-all">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-neutral-800">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push("/project")} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-semibold">{project.name}</h1>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                                        <span className="text-sm text-neutral-400">{status.label}</span>
                                    </div>
                                    {ddayText && (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${dday !== null && dday < 0 ? "bg-neutral-800 text-neutral-400" : dday === 0 ? "bg-white text-black" : "bg-neutral-800 text-neutral-300"}`}>
                                            {ddayText}
                                        </span>
                                    )}
                                </div>
                                {project.deadline && <p className="text-xs text-neutral-500 mt-0.5">마감: {formatDate(project.deadline)}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {project.is_public ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-900/20 border border-green-800/30 rounded text-[10px] text-green-400 font-medium">
                                    <Globe className="w-3 h-3" />
                                    전체 공개
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-900/20 border border-yellow-800/30 rounded text-[10px] text-yellow-400 font-medium">
                                    <Lock className="w-3 h-3" />
                                    멤버 전용
                                </div>
                            )}
                            {project.url && (
                                <a href={project.url} target="_blank" rel="noopener noreferrer" className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                            {(accessLevel ?? 0) >= 2 && (
                                <button onClick={handleDelete} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs & View Mode */}
                    <div className="flex items-center justify-between mt-4 -mb-4">
                        <div className="flex items-center gap-1">
                            <button onClick={() => setActiveTab("tasks")} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "tasks" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-white"}`}>
                                태스크 ({tasks.length})
                            </button>
                            <button onClick={() => setActiveTab("assets")} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "assets" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-white"}`}>
                                에셋 ({assets.length})
                            </button>
                            <button onClick={() => setActiveTab("settings")} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "settings" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-white"}`}>
                                설정
                            </button>
                        </div>
                        {activeTab === "tasks" && (
                            <div className="flex items-center bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                                <button onClick={() => setTaskViewMode("list")} className={`p-1.5 rounded transition-all ${taskViewMode === "list" ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"}`} title="리스트">
                                    <List className="w-4 h-4" />
                                </button>
                                <button onClick={() => setTaskViewMode("kanban")} className={`p-1.5 rounded transition-all ${taskViewMode === "kanban" ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"}`} title="칸반">
                                    <Columns3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setTaskViewMode("calendar")} className={`p-1.5 rounded transition-all ${taskViewMode === "calendar" ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"}`} title="캘린더">
                                    <CalendarDays className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-6">
                {/* Tasks Tab */}
                {activeTab === "tasks" && (
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
                        {taskViewMode === "list" && (
                            <>
                                {(accessLevel ?? 0) >= 1 && !showAddTask && (
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
                                                {members.map((m) => <option key={m.user_uuid} value={m.user_uuid}>{m.user?.name || "Unknown"}</option>)}
                                            </select>
                                            <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white text-sm" />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setShowAddTask(false)} className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">취소</button>
                                            <button onClick={() => handleAddTask()} className="px-4 py-1.5 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200">추가</button>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {tasks.length === 0 ? <p className="text-center text-neutral-500 py-12">아직 태스크가 없습니다.</p> : tasks.map((task) => <TaskCard key={task.id} task={task} />)}
                                </div>
                            </>
                        )}

                        {/* Kanban View */}
                        {taskViewMode === "kanban" && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {(["todo", "in_progress", "review", "done"] as const).map((statusKey) => {
                                    const conf = taskStatusConfig[statusKey]
                                    const statusTasks = tasks.filter((t) => t.status === statusKey)
                                    const StatusIcon = conf.icon
                                    const isDropTarget = dragOverStatus === statusKey

                                    return (
                                        <div
                                            key={statusKey}
                                            onDragOver={(e) => handleDragOver(e, statusKey)}
                                            onDragLeave={handleDragLeave}
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
                                                {(accessLevel ?? 0) >= 1 && (
                                                    addingToStatus === statusKey ? (
                                                        <div className="p-2 rounded-lg border border-neutral-700 bg-neutral-900">
                                                            <input type="text" placeholder="태스크 제목" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-2 py-1.5 mb-2 bg-black border border-neutral-800 rounded text-sm" autoFocus />
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setAddingToStatus(null)} className="flex-1 px-2 py-1 text-xs text-neutral-400">취소</button>
                                                                <button onClick={() => handleAddTask(statusKey)} className="flex-1 px-2 py-1 bg-white text-black text-xs font-medium rounded">추가</button>
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
                        {taskViewMode === "calendar" && (
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
                                        {weekDays.map((day, i) => (
                                            <div key={day} className={`p-2 text-center text-xs font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-neutral-400"}`}>{day}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7">
                                        {calendarDays.map((date, i) => {
                                            const tasksOnDate = date ? getTasksForDate(date) : []
                                            const isToday = date && date.getTime() === today.getTime()
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
                )}

                {/* Assets Tab */}
                {activeTab === "assets" && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-medium">프로젝트 에셋 & 파일</h2>
                            {(accessLevel ?? 0) >= 1 && (
                                <button
                                    onClick={() => setShowAddAsset(!showAddAsset)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    에셋 추가
                                </button>
                            )}
                        </div>

                        {showAddAsset && (
                            <div className="mb-8 p-6 rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Left Side: Type Selection */}
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3 block">1. 에셋 형태 선택</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setNewAsset({ ...newAsset, type: 'link' })}
                                                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all duration-300 ${newAsset.type === 'link' ? 'bg-white text-black border-white shadow-lg' : 'bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-neutral-300'}`}
                                                >
                                                    <LinkIcon className={`w-6 h-6 ${newAsset.type === 'link' ? 'animate-bounce' : ''}`} />
                                                    <span className="text-xs font-bold uppercase tracking-tighter">외부 링크 추가</span>
                                                </button>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-neutral-300 transition-all duration-300 disabled:opacity-50"
                                                >
                                                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                    <span className="text-xs font-bold uppercase tracking-tighter">파일 직접 업로드</span>
                                                </button>
                                            </div>
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3 block">2. 카테고리 설정</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['link', 'image', 'document', 'other'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setNewAsset({ ...newAsset, type: type as Asset["type"] })}
                                                        className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase transition-all ${newAsset.type === type ? 'bg-white text-black border-white' : 'bg-black text-neutral-500 border-neutral-800 hover:border-neutral-600'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Form (Only for links) */}
                                    <div className="flex-1 border-t md:border-t-0 md:border-l border-neutral-800 pt-8 md:pt-0 md:pl-8 flex flex-col justify-between">
                                        <div className="space-y-5">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">3. 상세 정보 입력</label>
                                            <div className="space-y-4">
                                                <input
                                                    type="text"
                                                    placeholder="에셋 이름 (예: 피그마 시안, API 문서)"
                                                    value={newAsset.name}
                                                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors"
                                                />
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="URL 주소를 입력하세요 (https://...)"
                                                        value={newAsset.url}
                                                        onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                                                        className={`w-full px-4 py-3 bg-neutral-900/50 border rounded-xl text-sm text-white focus:outline-none transition-all ${newAsset.url && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(newAsset.url) ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-neutral-500'}`}
                                                    />
                                                    {newAsset.url && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(newAsset.url) && (
                                                        <p className="text-[10px] text-red-500 mt-1.5 ml-1 animate-pulse flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> 유효한 URL 형식이 아닙니다.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-neutral-600 italic">* 파일을 업로드할 경우 이름과 타입은 자동으로 설정됩니다.</p>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-8">
                                            <button onClick={() => setShowAddAsset(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-500 hover:text-white transition-colors">취소</button>
                                            <button
                                                onClick={handleAddAsset}
                                                disabled={!newAsset.name.trim() || !newAsset.url.trim()}
                                                className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 disabled:opacity-30 transition-all shadow-lg"
                                            >
                                                에셋 등록 완료
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setAssetFilter("all")}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${assetFilter === "all" ? "bg-white text-black" : "bg-neutral-900 text-neutral-500 hover:text-white"}`}
                            >
                                전체 ({assets.length})
                            </button>
                            {[
                                { id: "image", label: "이미지", count: assets.filter(a => a.type === "image").length },
                                { id: "document", label: "문서", count: assets.filter(a => a.type === "document").length },
                                { id: "link", label: "링크", count: assets.filter(a => a.type === "link").length },
                                { id: "other", label: "기타", count: assets.filter(a => a.type === "other").length },
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setAssetFilter(cat.id as Asset["type"])}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${assetFilter === cat.id ? "bg-white text-black" : "bg-neutral-900 text-neutral-500 hover:text-white"}`}
                                >
                                    {cat.label} ({cat.count})
                                </button>
                            ))}
                        </div>

                        {assets.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/30">
                                <Paperclip className="w-10 h-10 text-neutral-700 mx-auto mb-4 opacity-20" />
                                <p className="text-neutral-500">등록된 에셋이나 파일이 없습니다.</p>
                                <p className="text-xs text-neutral-600 mt-2">새로운 파일이나 링크를 추가해 보세요.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {assets
                                    .filter(asset => assetFilter === "all" || asset.type === assetFilter)
                                    .map((asset) => {
                                        const isImage = asset.type === 'image' || asset.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)

                                        return (
                                            <button
                                                key={asset.id}
                                                onClick={() => setSelectedAsset(asset)}
                                                className="group relative flex flex-col bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-600 transition-all duration-300 text-left"
                                            >
                                                {/* Preview Area */}
                                                <div className="aspect-video w-full bg-neutral-900 flex items-center justify-center relative overflow-hidden border-b border-neutral-800">
                                                    {isImage ? (
                                                        <img
                                                            src={asset.url}
                                                            alt={asset.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="p-4 rounded-full bg-neutral-800 text-neutral-500">
                                                                {asset.type === 'link' ? <LinkIcon className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                                                            </div>
                                                            <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">{asset.type}</span>
                                                        </div>
                                                    )}

                                                    {/* Overlay Info */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                            상세 보기
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Info Area */}
                                                <div className="p-4 bg-neutral-950/50">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className="text-sm font-semibold text-white truncate flex-1" title={asset.name}>
                                                            {asset.name}
                                                        </h4>
                                                        {asset.type === 'link' && <LinkIcon className="w-3.5 h-3.5 text-neutral-600" />}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                                                        <span className="truncate max-w-[120px]">{new URL(asset.url).hostname}</span>
                                                        <span>{formatDate(asset.created_at)}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                            </div>
                        )}
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === "settings" && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-end mb-4">
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">취소</button>
                                    <button onClick={handleUpdate} className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200"><Save className="w-4 h-4" />저장</button>
                                </div>
                            ) : (accessLevel ?? 0) >= 1 && (
                                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white text-sm font-medium rounded-md hover:bg-neutral-700"><Pencil className="w-4 h-4" />수정</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950">
                                    <div className="flex items-center gap-2 mb-3 text-neutral-500"><FileText className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">설명</span></div>
                                    {isEditing ? <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white resize-none" /> : <p className="text-white whitespace-pre-wrap">{project.description || "-"}</p>}
                                </div>
                                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950">
                                    <div className="flex items-center gap-2 mb-3 text-neutral-500"><LinkIcon className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">URL</span></div>
                                    {isEditing ? <input type="text" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white" /> : project.url ? <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-white underline">{project.url}</a> : <p className="text-neutral-500">-</p>}
                                </div>
                                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950">
                                    <div className="flex items-center gap-2 mb-3 text-neutral-500"><Tag className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">태그</span></div>
                                    {isEditing ? <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="쉼표로 구분" className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white" /> : project.tags && project.tags.length > 0 ? <div className="flex flex-wrap gap-2">{project.tags.map((tag) => <span key={tag} className="px-2 py-1 text-sm bg-neutral-900 border border-neutral-800 rounded">{tag}</span>)}</div> : <p className="text-neutral-500">-</p>}
                                </div>
                            </div>

                            {/* Right */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950">
                                    <div className="flex items-center gap-2 mb-3 text-neutral-500"><Clock className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">상태 & 마감</span></div>
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Project["status"] })} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white">
                                                <option value="planning">기획 중</option><option value="development">개발 중</option><option value="active">운영 중</option><option value="archived">보관됨</option>
                                            </select>
                                            <input type="date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white" />
                                            <div className="flex items-center justify-between p-3 bg-black border border-neutral-800 rounded-md">
                                                <div className="flex items-center gap-2">
                                                    {editForm.is_public ? <Globe className="w-4 h-4 text-green-400" /> : <Lock className="w-4 h-4 text-yellow-400" />}
                                                    <span className="text-sm text-white">{editForm.is_public ? "전체 공개" : "멤버 전용(비공개)"}</span>
                                                </div>
                                                <button
                                                    onClick={() => setEditForm({ ...editForm, is_public: !editForm.is_public })}
                                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${editForm.is_public ? "bg-neutral-800 text-white hover:bg-neutral-700" : "bg-white text-black hover:bg-neutral-200"}`}
                                                >
                                                    {editForm.is_public ? "비공개로 전환" : "공개로 전환"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${status.dot}`} /><span className="text-white">{status.label}</span></div>
                                            {project.deadline && <div className="flex items-center gap-2 text-neutral-400"><Calendar className="w-4 h-4" /><span>{formatDate(project.deadline)}</span>{ddayText && <span className="px-2 py-0.5 text-xs rounded bg-neutral-800">{ddayText}</span>}</div>}
                                            <div className="flex items-center gap-2 text-neutral-400">
                                                {project.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                                <span className="text-xs">{project.is_public ? "누구나 조회 가능" : "등록된 멤버만 조회 가능"}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 text-neutral-500"><Users className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">멤버 ({members.length})</span></div>
                                        {(accessLevel ?? 0) >= 1 && availableMembers.length > 0 && <button onClick={() => setAddingMember(!addingMember)} className="p-1 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded"><UserPlus className="w-4 h-4" /></button>}
                                    </div>
                                    {addingMember && (
                                        <div className="flex gap-2 mb-3">
                                            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="flex-1 px-2 py-1.5 bg-black border border-neutral-700 rounded text-sm"><option value="">선택...</option>{availableMembers.map((m) => <option key={m.user_uuid} value={m.user_uuid}>{m.name || m.name_eng}</option>)}</select>
                                            <input type="text" placeholder="역할" value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className="w-20 px-2 py-1.5 bg-black border border-neutral-700 rounded text-sm" />
                                            <button onClick={handleAddMember} className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded">추가</button>
                                        </div>
                                    )}
                                    {members.length === 0 ? <p className="text-neutral-500 text-sm">멤버 없음</p> : (
                                        <div className="space-y-2">{members.map((m) => (
                                            <div key={m.user_uuid} className="flex items-center justify-between p-2 rounded bg-neutral-900/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold">{(m.user?.name || "?")[0]}</div>
                                                    <div><p className="text-sm text-white">{m.user?.name || "Unknown"}</p>{m.role && <p className="text-xs text-neutral-500">{m.role}</p>}</div>
                                                </div>
                                                {(accessLevel ?? 0) >= 1 && <button onClick={() => handleRemoveMember(m.user_uuid)} className="p-1 text-neutral-600 hover:text-white"><X className="w-3 h-3" /></button>}
                                            </div>
                                        ))}</div>
                                    )}
                                </div>
                                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950">
                                    <div className="flex items-center gap-2 mb-3 text-neutral-500"><Calendar className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">날짜</span></div>
                                    <div className="space-y-1 text-sm text-neutral-400"><p>생성: {formatDate(project.created_at)}</p><p>수정: {formatDate(project.updated_at)}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Asset Detail Modal */}
            {selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />

                    <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-full">
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedAsset(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Preview Section */}
                        <div className="md:flex-1 bg-black flex items-center justify-center p-6 min-h-[300px]">
                            {selectedAsset.type === 'image' || selectedAsset.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                                <img
                                    src={selectedAsset.url}
                                    className="max-w-full max-h-[70vh] object-contain shadow-2xl"
                                    alt={selectedAsset.name}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-6 text-neutral-500">
                                    <div className="p-8 rounded-full bg-neutral-800">
                                        {selectedAsset.type === 'link' ? <LinkIcon className="w-16 h-16" /> : <FileText className="w-16 h-16" />}
                                    </div>
                                    <p className="text-xl font-light">프리뷰를 제공하지 않는 파일 형식입니다.</p>
                                </div>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="w-full md:w-[350px] border-l border-neutral-800 bg-neutral-900 p-8 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{selectedAsset.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 uppercase tracking-tighter">
                                            {selectedAsset.type}
                                        </span>
                                        <span className="text-[10px] text-neutral-600">{formatDate(selectedAsset.created_at)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-black/40 border border-neutral-800">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold">원본 주소</p>
                                        <p className="text-xs text-neutral-300 break-all font-mono leading-relaxed">{selectedAsset.url}</p>
                                    </div>


                                </div>
                            </div>

                            <div className="pt-8 space-y-3">
                                <a
                                    href={selectedAsset.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-all text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    원본 열기 / 다운로드
                                </a>

                                {(accessLevel ?? 0) >= 1 && (
                                    <button
                                        onClick={() => {
                                            if (confirm("정말 이 에셋을 삭제하시겠습니까?")) {
                                                handleDeleteAsset(selectedAsset.id)
                                                setSelectedAsset(null)
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-4 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all text-sm border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        에셋 삭제하기
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
