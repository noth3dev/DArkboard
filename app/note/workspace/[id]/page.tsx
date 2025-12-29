"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
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
    Pencil,
    Check,
    Trash2,
    Plus,
    X,
    Users,
    UserPlus,
    Crown,
    Eye,
    Edit3,
    ChevronDown,
    Mail,
    Settings,
    FileText,
    AlertTriangle
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

type WorkspaceMember = {
    id: string
    workspace_id: string
    user_id: string
    role: 'owner' | 'editor' | 'viewer'
    user?: {
        name: string | null
        email: string
    }
}

type UserInfo = {
    user_uuid: string
    name: string | null
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

const WORKSPACE_COLORS = [
    "#6B7280", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444",
    "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#06B6D4",
]

const ROLE_CONFIG = {
    owner: { label: '소유자', icon: Crown, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    editor: { label: '편집자', icon: Edit3, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    viewer: { label: '뷰어', icon: Eye, color: 'text-neutral-400', bgColor: 'bg-neutral-500/20' },
}

function getIconComponent(iconName: string) {
    const iconData = WORKSPACE_ICONS.find(i => i.name === iconName)
    return iconData?.Icon || Folder
}

export default function WorkspaceDetailPage() {
    const { user, loading: authLoading, accessLevel } = useAuth()
    const router = useRouter()
    const params = useParams()
    const workspaceId = params.id as string

    const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isOwner, setIsOwner] = useState(false)
    const [noteCount, setNoteCount] = useState(0)

    // Edit states
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState("")
    const [editIcon, setEditIcon] = useState("")
    const [editColor, setEditColor] = useState("")
    const [showIconPicker, setShowIconPicker] = useState(false)

    // Members states
    const [members, setMembers] = useState<WorkspaceMember[]>([])
    const [isLoadingMembers, setIsLoadingMembers] = useState(false)
    const [showAddMember, setShowAddMember] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<UserInfo[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('viewer')
    const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null)

    useEffect(() => {
        if (!authLoading && (!user || (accessLevel ?? 0) < 2)) {
            router.push("/")
        }
    }, [user, authLoading, accessLevel, router])

    const fetchWorkspace = useCallback(async () => {
        if (!user || !workspaceId) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("note_workspaces")
                .select("*")
                .eq("id", workspaceId)
                .single()

            if (error) throw error
            setWorkspace(data)
            setIsOwner(data.user_id === user.id)
            setEditName(data.name)
            setEditIcon(data.icon)
            setEditColor(data.color)

            // Fetch note count
            const { count } = await supabase
                .from("notes")
                .select("*", { count: "exact", head: true })
                .eq("workspace_id", workspaceId)
                .eq("is_archived", false)

            setNoteCount(count || 0)
        } catch (err) {
            console.error("Error fetching workspace:", err)
            toast.error("워크스페이스를 불러오는 중 오류가 발생했습니다.")
            router.push("/note/workspace")
        } finally {
            setIsLoading(false)
        }
    }, [user, workspaceId, router])

    const fetchMembers = useCallback(async () => {
        if (!workspaceId) return
        setIsLoadingMembers(true)
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("note_workspace_members")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: true })

            if (error) throw error

            if (data && data.length > 0) {
                const userIds = data.map((m: WorkspaceMember) => m.user_id)
                const { data: usersData } = await supabase
                    .from("users")
                    .select("user_uuid, name")
                    .in("user_uuid", userIds)

                const membersWithUsers = data.map((member: WorkspaceMember) => ({
                    ...member,
                    user: {
                        name: usersData?.find((u: UserInfo) => u.user_uuid === member.user_id)?.name || null,
                        email: member.user_id
                    }
                }))
                setMembers(membersWithUsers)
            } else {
                setMembers([])
            }
        } catch (err) {
            console.error("Error fetching members:", err)
        } finally {
            setIsLoadingMembers(false)
        }
    }, [workspaceId])

    useEffect(() => {
        if (user && workspaceId) {
            fetchWorkspace()
            fetchMembers()
        }
    }, [user, workspaceId, fetchWorkspace, fetchMembers])

    const searchUsers = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([])
            return
        }

        setIsSearching(true)
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("users")
                .select("user_uuid, name")
                .or(`name.ilike.%${query}%`)
                .limit(10)

            if (error) throw error

            const existingMemberIds = members.map(m => m.user_id)
            const filteredResults = (data || [])
                .filter((u: UserInfo) => u.user_uuid !== user?.id && !existingMemberIds.includes(u.user_uuid) && u.user_uuid !== workspace?.user_id)

            setSearchResults(filteredResults)
        } catch (err) {
            console.error("Error searching users:", err)
        } finally {
            setIsSearching(false)
        }
    }

    const addMember = async (userId: string) => {
        if (!workspaceId) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("note_workspace_members")
                .insert({
                    workspace_id: workspaceId,
                    user_id: userId,
                    role: selectedRole,
                    invited_by: user?.id
                })
                .select()
                .single()

            if (error) throw error

            const { data: userData } = await supabase
                .from("users")
                .select("user_uuid, name")
                .eq("user_uuid", userId)
                .single()

            setMembers(prev => [...prev, {
                ...data,
                user: { name: userData?.name || null, email: userId }
            }])

            setSearchQuery("")
            setSearchResults([])
            setShowAddMember(false)
            toast.success("멤버가 추가되었습니다.")
        } catch (err) {
            console.error("Error adding member:", err)
            toast.error("멤버 추가 중 오류가 발생했습니다.")
        }
    }

    const updateMemberRole = async (memberId: string, newRole: 'editor' | 'viewer') => {
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("note_workspace_members")
                .update({ role: newRole })
                .eq("id", memberId)

            if (error) throw error

            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, role: newRole } : m
            ))
            setShowRoleDropdown(null)
            toast.success("역할이 변경되었습니다.")
        } catch (err) {
            console.error("Error updating member role:", err)
            toast.error("역할 변경 중 오류가 발생했습니다.")
        }
    }

    const removeMember = async (memberId: string) => {
        if (!confirm("이 멤버를 제거하시겠습니까?")) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("note_workspace_members")
                .delete()
                .eq("id", memberId)

            if (error) throw error

            setMembers(prev => prev.filter(m => m.id !== memberId))
            toast.success("멤버가 제거되었습니다.")
        } catch (err) {
            console.error("Error removing member:", err)
            toast.error("멤버 제거 중 오류가 발생했습니다.")
        }
    }

    const updateWorkspace = async () => {
        if (!workspace || !editName.trim()) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("note_workspaces")
                .update({
                    name: editName.trim(),
                    icon: editIcon,
                    color: editColor
                })
                .eq("id", workspace.id)

            if (error) throw error

            setWorkspace(prev => prev ? { ...prev, name: editName.trim(), icon: editIcon, color: editColor } : null)
            setIsEditing(false)
            setShowIconPicker(false)
            toast.success("워크스페이스가 수정되었습니다.")
        } catch (err) {
            console.error("Error updating workspace:", err)
            toast.error("워크스페이스 수정 중 오류가 발생했습니다.")
        }
    }

    const deleteWorkspace = async () => {
        if (!workspace) return
        if (!confirm("이 워크스페이스와 모든 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("note_workspaces")
                .delete()
                .eq("id", workspace.id)

            if (error) throw error

            toast.success("워크스페이스가 삭제되었습니다.")
            router.push("/note/workspace")
        } catch (err) {
            console.error("Error deleting workspace:", err)
            toast.error("워크스페이스 삭제 중 오류가 발생했습니다.")
        }
    }

    const setAsDefault = async () => {
        if (!workspace) return
        try {
            const supabase = getSupabase()

            await supabase
                .from("note_workspaces")
                .update({ is_default: false })
                .eq("user_id", user?.id)

            const { error } = await supabase
                .from("note_workspaces")
                .update({ is_default: true })
                .eq("id", workspace.id)

            if (error) throw error

            setWorkspace(prev => prev ? { ...prev, is_default: true } : null)
            toast.success("기본 워크스페이스로 설정되었습니다.")
        } catch (err) {
            console.error("Error setting default:", err)
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

    if (!workspace) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <p>워크스페이스를 찾을 수 없습니다.</p>
            </div>
        )
    }

    const WorkspaceIcon = getIconComponent(workspace.icon)
    const EditIcon = getIconComponent(editIcon)

    return (
        <div className="min-h-screen bg-black text-white font-suit">
            {/* Header */}
            <div className="border-b border-neutral-900 bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/note/workspace")}
                            className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: workspace.color + "20" }}
                            >
                                <WorkspaceIcon className="w-5 h-5" style={{ color: workspace.color }} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black">{workspace.name}</h1>
                                <p className="text-[10px] text-neutral-600 uppercase tracking-widest">
                                    워크스페이스 설정
                                </p>
                            </div>
                        </div>
                        {workspace.is_default && (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                                기본
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {/* Overview Section */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-1 flex items-center gap-2">
                        <Settings className="w-3 h-3" />
                        일반 설정
                    </h2>

                    <div className="p-6 rounded-2xl border border-neutral-900 bg-neutral-900/30 space-y-6">
                        {isEditing ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setShowIconPicker(!showIconPicker)}
                                        className="w-16 h-16 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                                        style={{ backgroundColor: editColor + "20" }}
                                    >
                                        <EditIcon className="w-8 h-8" style={{ color: editColor }} />
                                    </button>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white text-lg font-semibold outline-none focus:border-neutral-600 transition-all"
                                        placeholder="워크스페이스 이름"
                                    />
                                </div>

                                {showIconPicker && (
                                    <div className="p-4 bg-neutral-800/50 rounded-xl space-y-4">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2 block">아이콘</span>
                                            <div className="grid grid-cols-10 gap-2">
                                                {WORKSPACE_ICONS.map(({ name, Icon }) => (
                                                    <button
                                                        key={name}
                                                        onClick={() => setEditIcon(name)}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-all",
                                                            editIcon === name
                                                                ? "bg-white/10 ring-2 ring-white/20"
                                                                : "hover:bg-white/5"
                                                        )}
                                                    >
                                                        <Icon className="w-5 h-5" style={{ color: editColor }} />
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
                                                        onClick={() => setEditColor(color)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full transition-all",
                                                            editColor === color && "ring-2 ring-white ring-offset-2 ring-offset-neutral-900"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 justify-end">
                                    <button
                                        onClick={() => {
                                            setIsEditing(false)
                                            setShowIconPicker(false)
                                            setEditName(workspace.name)
                                            setEditIcon(workspace.icon)
                                            setEditColor(workspace.color)
                                        }}
                                        className="px-4 py-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all text-sm"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={updateWorkspace}
                                        className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-all text-sm font-semibold flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        저장
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-16 h-16 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: workspace.color + "20" }}
                                    >
                                        <WorkspaceIcon className="w-8 h-8" style={{ color: workspace.color }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold">{workspace.name}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {noteCount}개의 노트
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {members.length + 1}명의 멤버
                                            </span>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {isOwner && !workspace.is_default && (
                                    <button
                                        onClick={setAsDefault}
                                        className="w-full py-3 rounded-xl border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 text-sm font-medium text-neutral-400 hover:text-white transition-all"
                                    >
                                        기본 워크스페이스로 설정
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* Members Section */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-1 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        멤버 관리
                    </h2>

                    <div className="p-6 rounded-2xl border border-neutral-900 bg-neutral-900/30 space-y-4">
                        {/* Owner */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Crown className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{isOwner ? "나 (소유자)" : "소유자"}</p>
                                <p className="text-xs text-neutral-500">모든 권한</p>
                            </div>
                            <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                                Owner
                            </span>
                        </div>

                        {/* Members List */}
                        {isLoadingMembers ? (
                            <div className="py-8 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map(member => {
                                    const roleConfig = ROLE_CONFIG[member.role]
                                    const RoleIcon = roleConfig.icon

                                    return (
                                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/30 group">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", roleConfig.bgColor)}>
                                                <RoleIcon className={cn("w-5 h-5", roleConfig.color)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {member.user?.name || '사용자'}
                                                </p>
                                                <p className="text-xs text-neutral-500 truncate">
                                                    {member.user_id === user?.id ? "나" : ""}
                                                </p>
                                            </div>
                                            {isOwner && (
                                                <>
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowRoleDropdown(showRoleDropdown === member.id ? null : member.id)}
                                                            className={cn(
                                                                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1",
                                                                roleConfig.bgColor, roleConfig.color
                                                            )}
                                                        >
                                                            {roleConfig.label}
                                                            <ChevronDown className="w-3 h-3" />
                                                        </button>
                                                        {showRoleDropdown === member.id && (
                                                            <div className="absolute right-0 top-full mt-1 w-32 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-10">
                                                                <button
                                                                    onClick={() => updateMemberRole(member.id, 'editor')}
                                                                    className={cn(
                                                                        "w-full px-3 py-2 text-left text-xs hover:bg-neutral-700 flex items-center gap-2",
                                                                        member.role === 'editor' && "bg-neutral-700"
                                                                    )}
                                                                >
                                                                    <Edit3 className="w-3 h-3 text-blue-400" />
                                                                    편집자
                                                                </button>
                                                                <button
                                                                    onClick={() => updateMemberRole(member.id, 'viewer')}
                                                                    className={cn(
                                                                        "w-full px-3 py-2 text-left text-xs hover:bg-neutral-700 flex items-center gap-2",
                                                                        member.role === 'viewer' && "bg-neutral-700"
                                                                    )}
                                                                >
                                                                    <Eye className="w-3 h-3 text-neutral-400" />
                                                                    뷰어
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => removeMember(member.id)}
                                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-neutral-500 hover:text-red-400 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Add Member */}
                        {isOwner && (
                            showAddMember ? (
                                <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/50 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value)
                                                    searchUsers(e.target.value)
                                                }}
                                                placeholder="이름으로 검색..."
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-neutral-600"
                                                autoFocus
                                            />
                                        </div>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value as 'editor' | 'viewer')}
                                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                                        >
                                            <option value="viewer">뷰어</option>
                                            <option value="editor">편집자</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                setShowAddMember(false)
                                                setSearchQuery("")
                                                setSearchResults([])
                                            }}
                                            className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {isSearching ? (
                                        <div className="py-4 flex items-center justify-center">
                                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="space-y-1">
                                            {searchResults.map(result => (
                                                <button
                                                    key={result.user_uuid}
                                                    onClick={() => addMember(result.user_uuid)}
                                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-700 transition-all text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                                                        <span className="text-xs font-bold">
                                                            {(result.name)?.[0]?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{result.name || '사용자'}</p>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-neutral-500" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : searchQuery.length >= 2 ? (
                                        <div className="py-4 text-center text-neutral-600 text-sm">
                                            검색 결과가 없습니다
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/30 transition-all text-neutral-500 hover:text-white"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span className="text-sm font-medium">멤버 추가</span>
                                </button>
                            )
                        )}
                    </div>
                </section>

                {/* Danger Zone */}
                {isOwner && (
                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-red-500/70 px-1 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            위험 구역
                        </h2>

                        <div className="p-6 rounded-2xl border border-red-900/50 bg-red-950/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-red-400">워크스페이스 삭제</h3>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        이 워크스페이스와 모든 노트가 영구적으로 삭제됩니다.
                                    </p>
                                </div>
                                <button
                                    onClick={deleteWorkspace}
                                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center gap-2 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    삭제
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
