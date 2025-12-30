"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
    ArrowLeft,
    Folder,
    FolderOpen,
    FolderHeart,
    FolderKanban,
    FolderGit2,
    FolderCode,
    FolderArchive,
    FolderCog,
    FolderSearch,
    FolderSync,
    Briefcase,
    BookOpen,
    GraduationCap,
    Lightbulb,
    Rocket,
    Home,
    Building2,
    Package,
    Archive,
    Star,
    Heart,
    Sparkles,
    Zap,
    Globe,
    Code2,
    Terminal,
    Database,
    Layers,
    LayoutGrid,
    Palette,
    Music,
    Camera,
    Film,
    Gamepad2,
    Coffee,
    Plus,
    X,
    Settings,
    ChevronRight,
    Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Workspace = {
    id: string
    name: string
    icon: string
    color: string
    is_default: boolean
    user_id: string
}

// Available icons for workspaces
const WORKSPACE_ICONS = [
    { name: "folder", Icon: Folder },
    { name: "folder-open", Icon: FolderOpen },
    { name: "folder-heart", Icon: FolderHeart },
    { name: "folder-kanban", Icon: FolderKanban },
    { name: "folder-git", Icon: FolderGit2 },
    { name: "folder-code", Icon: FolderCode },
    { name: "folder-archive", Icon: FolderArchive },
    { name: "folder-cog", Icon: FolderCog },
    { name: "folder-search", Icon: FolderSearch },
    { name: "folder-sync", Icon: FolderSync },
    { name: "briefcase", Icon: Briefcase },
    { name: "book-open", Icon: BookOpen },
    { name: "graduation-cap", Icon: GraduationCap },
    { name: "lightbulb", Icon: Lightbulb },
    { name: "rocket", Icon: Rocket },
    { name: "home", Icon: Home },
    { name: "building", Icon: Building2 },
    { name: "package", Icon: Package },
    { name: "archive", Icon: Archive },
    { name: "star", Icon: Star },
    { name: "heart", Icon: Heart },
    { name: "sparkles", Icon: Sparkles },
    { name: "zap", Icon: Zap },
    { name: "globe", Icon: Globe },
    { name: "code", Icon: Code2 },
    { name: "terminal", Icon: Terminal },
    { name: "database", Icon: Database },
    { name: "layers", Icon: Layers },
    { name: "layout-grid", Icon: LayoutGrid },
    { name: "palette", Icon: Palette },
    { name: "music", Icon: Music },
    { name: "camera", Icon: Camera },
    { name: "film", Icon: Film },
    { name: "gamepad", Icon: Gamepad2 },
    { name: "coffee", Icon: Coffee },
]

// Available colors
const WORKSPACE_COLORS = [
    "#6B7280", // Gray
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#EF4444", // Red
    "#F97316", // Orange
    "#EAB308", // Yellow
    "#22C55E", // Green
    "#14B8A6", // Teal
    "#06B6D4", // Cyan
]

export function getIconComponent(iconName: string) {
    const iconData = WORKSPACE_ICONS.find(i => i.name === iconName)
    return iconData?.Icon || Folder
}

export default function WorkspaceSettingsPage() {
    const { user, loading: authLoading, accessLevel, profileName } = useAuth()
    const router = useRouter()

    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState("")
    const [newIcon, setNewIcon] = useState("folder")
    const [newColor, setNewColor] = useState("#6B7280")
    const { presenceColor: initialPresenceColor } = useAuth()
    const [globalPresenceColor, setGlobalPresenceColor] = useState(initialPresenceColor || "#2196F3")
    const [isSavingGlobalColor, setIsSavingGlobalColor] = useState(false)

    useEffect(() => {
        if (initialPresenceColor) {
            setGlobalPresenceColor(initialPresenceColor)
        }
    }, [initialPresenceColor])

    useEffect(() => {
        if (!authLoading && (!user || (accessLevel ?? 0) < 2)) {
            router.push("/")
        }
    }, [user, authLoading, accessLevel, router])

    const fetchWorkspaces = useCallback(async () => {
        if (!user) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("note_workspaces")
                .select("*")
                .order("created_at", { ascending: true })

            if (error) throw error
            setWorkspaces(data || [])
        } catch (err) {
            console.error("Error fetching workspaces:", err)
            toast.error("워크스페이스를 불러오는 중 오류가 발생했습니다.")
        } finally {
            setIsLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (user) {
            fetchWorkspaces()
        }
    }, [user, fetchWorkspaces])

    const createWorkspace = async () => {
        if (!user || !newName.trim()) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("note_workspaces")
                .insert({
                    user_id: user.id,
                    name: newName.trim(),
                    icon: newIcon,
                    color: newColor
                })
                .select()
                .single()

            if (error) throw error

            // Add owner to members table
            await supabase
                .from("note_workspace_members")
                .insert({
                    workspace_id: data.id,
                    user_id: user.id,
                    role: "owner"
                })

            setWorkspaces(prev => [...prev, data])
            setNewName("")
            setNewIcon("folder")
            setNewColor("#6B7280")
            setIsCreating(false)
            toast.success("워크스페이스가 생성되었습니다.")
        } catch (err) {
            console.error("Error creating workspace:", err)
            toast.error("워크스페이스 생성 중 오류가 발생했습니다.")
        }
    }

    const updateGlobalColor = async () => {
        if (!user || !globalPresenceColor) return
        // Basic hex validation
        if (!/^#[0-9A-Fa-f]{6}$/.test(globalPresenceColor)) {
            toast.error("올바른 헥사코드 형식이 아닙니다. (예: #3B82F6)")
            return
        }

        setIsSavingGlobalColor(true)
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("users")
                .update({ presence_color: globalPresenceColor })
                .eq("user_uuid", user.id)

            if (error) throw error
            toast.success("글로벌 활동 색상이 저장되었습니다.")
            // Note: AuthContext will pick up the change on next reload or we could trigger a refresh
        } catch (err) {
            console.error("Error updating global color:", err)
            toast.error("색상 저장 중 오류가 발생했습니다.")
        } finally {
            setIsSavingGlobalColor(false)
        }
    }

    const setDefaultWorkspace = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            const supabase = getSupabase()

            // Remove default from all workspaces
            await supabase
                .from("note_workspaces")
                .update({ is_default: false })
                .eq("user_id", user?.id)

            // Set new default
            const { error } = await supabase
                .from("note_workspaces")
                .update({ is_default: true })
                .eq("id", id)

            if (error) throw error

            setWorkspaces(prev => prev.map(w => ({
                ...w,
                is_default: w.id === id
            })))
            toast.success("기본 워크스페이스가 변경되었습니다.")
        } catch (err) {
            console.error("Error setting default workspace:", err)
            toast.error("기본 워크스페이스 설정 중 오류가 발생했습니다.")
        }
    }

    if (authLoading || isLoading || !user || (accessLevel ?? 0) < 2) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
            </div>
        )
    }

    const myWorkspaces = workspaces.filter(w => w.user_id === user.id)
    const sharedWorkspaces = workspaces.filter(w => w.user_id !== user.id)

    return (
        <div className="min-h-screen bg-black text-white font-suit">
            {/* Header */}
            <div className="border-b border-neutral-900 bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/note")}
                            className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-wider">Workspace Settings</h1>
                            <p className="text-[10px] text-neutral-600 uppercase tracking-widest mt-0.5">
                                문서를 정리할 워크스페이스를 관리합니다
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="space-y-12">
                    {/* Global Presence Setting */}
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-1 flex items-center gap-2">
                            <Palette className="w-3 h-3" />
                            공통 활동 설정
                        </h2>
                        <div className="p-6 rounded-2xl border border-neutral-900 bg-neutral-900/30 flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div
                                className="w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center text-white text-xl font-black shrink-0 transition-transform duration-500 hover:rotate-3"
                                style={{ backgroundColor: globalPresenceColor }}
                            >
                                {profileName?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className="text-sm font-semibold">활동 색상 (프로필)</h3>
                                <p className="text-xs text-neutral-600">
                                    모든 워크스페이스에서 자신의 커서와 아바타로 사용될 고유 색상을 헥사코드로 설정합니다.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="relative flex-1 md:w-32">
                                    <input
                                        type="text"
                                        value={globalPresenceColor}
                                        onChange={(e) => setGlobalPresenceColor(e.target.value.toUpperCase())}
                                        placeholder="#000000"
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm font-mono outline-none focus:border-neutral-600 transition-all font-bold tracking-wider"
                                    />
                                </div>
                                <button
                                    onClick={updateGlobalColor}
                                    disabled={isSavingGlobalColor || globalPresenceColor === initialPresenceColor}
                                    className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 transition-all text-sm font-bold disabled:opacity-30 flex items-center gap-2"
                                >
                                    {isSavingGlobalColor ? (
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    저장
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* My Workspaces */}
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-1">
                            내 워크스페이스
                        </h2>
                        <div className="grid gap-4">
                            {myWorkspaces.map(workspace => {
                                const IconComponent = getIconComponent(workspace.icon)
                                return (
                                    <div
                                        key={workspace.id}
                                        onClick={() => router.push(`/note/workspace/${workspace.id}`)}
                                        className="p-5 rounded-2xl border bg-neutral-900/30 border-neutral-900 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Icon */}
                                            <div
                                                className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500"
                                                style={{ backgroundColor: workspace.color + "20" }}
                                            >
                                                <IconComponent className="w-7 h-7" style={{ color: workspace.color }} />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-semibold group-hover:text-white transition-colors">
                                                        {workspace.name}
                                                    </h3>
                                                    {workspace.is_default && (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                                                            기본
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-600 mt-0.5 group-hover:text-neutral-500 transition-colors">
                                                    클릭하여 설정 및 멤버 관리
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {!workspace.is_default && (
                                                    <button
                                                        onClick={(e) => setDefaultWorkspace(workspace.id, e)}
                                                        className="px-3 py-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all text-xs opacity-0 group-hover:opacity-100"
                                                    >
                                                        기본으로 설정
                                                    </button>
                                                )}
                                                <div className="p-2 rounded-lg text-neutral-600 group-hover:text-white transition-colors">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Create New Workspace */}
                            {isCreating ? (
                                <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: newColor + "20" }}
                                        >
                                            {(() => {
                                                const NewIcon = getIconComponent(newIcon)
                                                return <NewIcon className="w-7 h-7" style={{ color: newColor }} />
                                            })()}
                                        </div>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white text-lg font-semibold outline-none focus:border-neutral-600 transition-all"
                                            placeholder="새 워크스페이스 이름"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') createWorkspace()
                                                if (e.key === 'Escape') setIsCreating(false)
                                            }}
                                        />
                                    </div>

                                    {/* Icon & Color Picker for New */}
                                    <div className="p-4 bg-neutral-800/50 rounded-xl space-y-4">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2 block">아이콘</span>
                                            <div className="grid grid-cols-10 gap-2">
                                                {WORKSPACE_ICONS.map(({ name, Icon }) => (
                                                    <button
                                                        key={name}
                                                        onClick={() => setNewIcon(name)}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-all",
                                                            newIcon === name
                                                                ? "bg-white/10 ring-2 ring-white/20"
                                                                : "hover:bg-white/5"
                                                        )}
                                                    >
                                                        <Icon className="w-5 h-5" style={{ color: newColor }} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2 block">색상</span>
                                            <div className="flex gap-2">
                                                {WORKSPACE_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setNewColor(color)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full transition-all",
                                                            newColor === color && "ring-2 ring-white ring-offset-2 ring-offset-neutral-900"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            onClick={() => setIsCreating(false)}
                                            className="px-4 py-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all text-sm"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={createWorkspace}
                                            disabled={!newName.trim()}
                                            className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-all text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-4 h-4" />
                                            생성
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full p-5 rounded-2xl border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-900/20 hover:bg-neutral-900/40 transition-all flex items-center justify-center gap-3 group"
                                >
                                    <Plus className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                                    <span className="text-sm font-semibold text-neutral-600 group-hover:text-neutral-400 transition-colors">
                                        새 워크스페이스 만들기
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Shared Workspaces */}
                    {sharedWorkspaces.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-1">
                                공유된 워크스페이스
                            </h2>
                            <div className="grid gap-4">
                                {sharedWorkspaces.map(workspace => {
                                    const IconComponent = getIconComponent(workspace.icon)
                                    return (
                                        <div
                                            key={workspace.id}
                                            onClick={() => router.push(`/note/workspace/${workspace.id}`)}
                                            className="p-5 rounded-2xl border bg-neutral-900/30 border-neutral-900 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                                                    style={{ backgroundColor: workspace.color + "20" }}
                                                >
                                                    <IconComponent className="w-7 h-7" style={{ color: workspace.color }} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold group-hover:text-white transition-colors">
                                                        {workspace.name}
                                                    </h3>
                                                    <p className="text-xs text-neutral-600 mt-0.5 group-hover:text-neutral-500 transition-colors">
                                                        공유됨
                                                    </p>
                                                </div>
                                                <div className="p-2 rounded-lg text-neutral-600 group-hover:text-white transition-colors">
                                                    <Settings className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
