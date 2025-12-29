import { ArrowLeft, ExternalLink, Globe, Lock, Trash2, List, Columns3, CalendarDays } from "lucide-react"
import { useRouter } from "next/navigation"
import { Project, statusConfig } from "../types"

interface ProjectHeaderProps {
    project: Project
    accessLevel: number
    activeTab: "tasks" | "assets" | "settings" | "api"
    setActiveTab: (tab: "tasks" | "assets" | "settings" | "api") => void
    taskViewMode: "list" | "kanban" | "calendar"
    setTaskViewMode: (mode: "list" | "kanban" | "calendar") => void
    tasksCount: number
    assetsCount: number
    onDelete: () => void
}

export function ProjectHeader({
    project,
    accessLevel,
    activeTab,
    setActiveTab,
    taskViewMode,
    setTaskViewMode,
    tasksCount,
    assetsCount,
    onDelete
}: ProjectHeaderProps) {
    const router = useRouter()
    const status = statusConfig[project.status]
    const dday = getDDay(project.deadline)
    const ddayText = formatDDay(dday)

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
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

    return (
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
                        {accessLevel >= 4 && (
                            <button onClick={onDelete} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 -mb-4">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setActiveTab("tasks")} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "tasks" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-white"}`}>
                            태스크 ({tasksCount})
                        </button>
                        <button onClick={() => setActiveTab("assets")} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "assets" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-white"}`}>
                            에셋 ({assetsCount})
                        </button>
                        <button onClick={() => setActiveTab("api")} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "api" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-white"}`}>
                            API
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
    )
}
