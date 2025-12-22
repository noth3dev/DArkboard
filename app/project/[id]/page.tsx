"use client"

import { useState, useEffect, use } from "react"
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
}

const statusConfig = {
    active: { label: "운영 중", dot: "bg-white" },
    development: { label: "개발 중", dot: "bg-neutral-400" },
    planning: { label: "기획 중", dot: "bg-neutral-600" },
    archived: { label: "보관됨", dot: "bg-neutral-700" },
} as const

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { user, loading: authLoading, accessLevel } = useAuth()
    const [project, setProject] = useState<Project | null>(null)
    const [members, setMembers] = useState<ProjectMember[]>([])
    const [allMembers, setAllMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [addingMember, setAddingMember] = useState(false)
    const [selectedMember, setSelectedMember] = useState("")
    const [memberRole, setMemberRole] = useState("")
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        status: "planning" as Project["status"],
        url: "",
        tags: "",
        deadline: "",
    })

    useEffect(() => {
        if (user) {
            fetchProject()
            fetchAllMembers()
        }
    }, [id, user])

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
            })

            // 멤버 조회
            const { data: membersData } = await supabase
                .from("project_members")
                .select(`
          user_uuid,
          role,
          user:users(user_uuid, name, name_eng)
        `)
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

    async function handleUpdate() {
        if ((accessLevel ?? 0) < 1) return
        if (!editForm.name.trim()) return

        try {
            const supabase = getSupabase()
            const tagsArray = editForm.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)

            const { error } = await supabase
                .from("projects")
                .update({
                    name: editForm.name.trim(),
                    description: editForm.description.trim() || null,
                    status: editForm.status,
                    url: editForm.url.trim() || null,
                    tags: tagsArray,
                    deadline: editForm.deadline || null,
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
        if (!confirm("정말 삭제하시겠습니까? 모든 멤버 연결도 함께 삭제됩니다.")) return

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
        if ((accessLevel ?? 0) < 1) return
        if (!selectedMember) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_members").insert({
                project_id: id,
                user_uuid: selectedMember,
                role: memberRole.trim() || null,
            })

            if (error) throw error
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
            const { error } = await supabase
                .from("project_members")
                .delete()
                .eq("project_id", id)
                .eq("user_uuid", userUuid)

            if (error) throw error
            fetchProject()
        } catch (err) {
            console.error("Error removing member:", err)
        }
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    // D-Day 계산
    function getDDay(deadline: string | null) {
        if (!deadline) return null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const deadlineDate = new Date(deadline)
        const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diff
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

    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-neutral-400">로딩 중...</div>
            </div>
        )
    }

    if (!user) {
        return <AuthForm />
    }

    if ((accessLevel ?? 0) === 0) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center text-neutral-400">
                    <p className="mb-4">이 페이지에 접근할 권한이 없습니다.</p>
                    <button onClick={() => router.push("/")} className="text-white underline">
                        대시보드로 돌아가기
                    </button>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-neutral-400">로딩 중...</div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-neutral-400 mb-4">프로젝트를 찾을 수 없습니다</p>
                    <button onClick={() => router.push("/project")} className="text-white hover:underline">
                        목록으로 돌아가기
                    </button>
                </div>
            </div>
        )
    }

    const status = statusConfig[project.status]
    const availableMembers = getAvailableMembers()
    const dday = getDDay(project.deadline)
    const ddayText = formatDDay(dday)

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button
                        onClick={() => router.push("/project")}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>목록</span>
                    </button>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    저장
                                </button>
                            </>
                        ) : (
                            <>
                                {(accessLevel ?? 0) >= 1 && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-md border border-neutral-800 hover:bg-neutral-800 transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        수정
                                    </button>
                                )}
                                {(accessLevel ?? 0) >= 2 && (
                                    <button
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-neutral-400 text-sm font-medium rounded-md border border-neutral-800 hover:text-white hover:bg-neutral-800 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        삭제
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "50ms" }}>
                    {/* Header Section */}
                    <div className="p-6 border-b border-neutral-800">
                        {isEditing ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    placeholder="프로젝트명"
                                    className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-md text-white text-xl font-semibold focus:outline-none focus:border-neutral-600"
                                />
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Project["status"] })}
                                    className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
                                >
                                    <option value="planning">기획 중</option>
                                    <option value="development">개발 중</option>
                                    <option value="active">운영 중</option>
                                    <option value="archived">보관됨</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-neutral-800 border border-neutral-700">
                                    <Folder className="w-6 h-6 text-neutral-400" />
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-2xl font-semibold text-white mb-2">{project.name}</h1>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                                            <span className="text-sm text-neutral-400">{status.label}</span>
                                        </div>
                                        {ddayText && (
                                            <>
                                                <span className="text-neutral-700">·</span>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4 text-neutral-500" />
                                                    <span
                                                        className={`text-sm font-medium ${dday !== null && dday < 0
                                                                ? "text-neutral-400"
                                                                : dday === 0
                                                                    ? "text-white"
                                                                    : dday !== null && dday <= 7
                                                                        ? "text-neutral-300"
                                                                        : "text-neutral-500"
                                                            }`}
                                                    >
                                                        {ddayText}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {project.url && (
                                    <a
                                        href={project.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        방문
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="divide-y divide-neutral-800">
                        {/* Description */}
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <FileText className="w-4 h-4 text-neutral-500" />
                                <span className="text-xs text-neutral-500 uppercase tracking-wider">설명</span>
                            </div>
                            {isEditing ? (
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="프로젝트 설명..."
                                    rows={4}
                                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
                                />
                            ) : (
                                <p className="text-white whitespace-pre-wrap">{project.description || "-"}</p>
                            )}
                        </div>

                        {/* Deadline */}
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Clock className="w-4 h-4 text-neutral-500" />
                                <span className="text-xs text-neutral-500 uppercase tracking-wider">마감일</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={editForm.deadline}
                                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                    className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
                                />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <p className="text-white">{project.deadline ? formatDate(project.deadline) : "-"}</p>
                                    {ddayText && (
                                        <span
                                            className={`px-2 py-0.5 text-sm font-medium rounded ${dday !== null && dday < 0
                                                    ? "bg-neutral-800 text-neutral-400"
                                                    : dday === 0
                                                        ? "bg-white text-black"
                                                        : dday !== null && dday <= 7
                                                            ? "bg-neutral-800 text-neutral-200"
                                                            : "bg-neutral-900 text-neutral-400"
                                                }`}
                                        >
                                            {ddayText}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* URL */}
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <LinkIcon className="w-4 h-4 text-neutral-500" />
                                <span className="text-xs text-neutral-500 uppercase tracking-wider">URL</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.url}
                                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                                />
                            ) : (
                                <p className="text-white">
                                    {project.url ? (
                                        <a
                                            href={project.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-neutral-300 hover:text-white underline"
                                        >
                                            {project.url}
                                        </a>
                                    ) : (
                                        "-"
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Tag className="w-4 h-4 text-neutral-500" />
                                <span className="text-xs text-neutral-500 uppercase tracking-wider">태그</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.tags}
                                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                                    placeholder="쉼표로 구분 (예: React, TypeScript, Supabase)"
                                    className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                                />
                            ) : project.tags && project.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2.5 py-1 text-sm text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-md"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-neutral-500">-</p>
                            )}
                        </div>

                        {/* Team Members */}
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Users className="w-4 h-4 text-neutral-500" />
                                    <span className="text-xs text-neutral-500 uppercase tracking-wider">
                                        팀 멤버 ({members.length})
                                    </span>
                                </div>
                                {(accessLevel ?? 0) >= 1 && availableMembers.length > 0 && (
                                    <button
                                        onClick={() => setAddingMember(!addingMember)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        멤버 추가
                                    </button>
                                )}
                            </div>

                            {/* Add Member Form */}
                            {addingMember && (
                                <div className="flex gap-2 mb-4 p-3 bg-neutral-900/50 rounded-lg animate-in fade-in duration-200">
                                    <select
                                        value={selectedMember}
                                        onChange={(e) => setSelectedMember(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-black border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-neutral-500"
                                    >
                                        <option value="">멤버 선택...</option>
                                        {availableMembers.map((m) => (
                                            <option key={m.user_uuid} value={m.user_uuid}>
                                                {m.name || m.name_eng || m.user_uuid.slice(0, 8)}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="역할 (선택)"
                                        value={memberRole}
                                        onChange={(e) => setMemberRole(e.target.value)}
                                        className="w-32 px-3 py-2 bg-black border border-neutral-700 rounded text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                                    />
                                    <button
                                        onClick={handleAddMember}
                                        disabled={!selectedMember}
                                        className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        추가
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAddingMember(false)
                                            setSelectedMember("")
                                            setMemberRole("")
                                        }}
                                        className="p-2 text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Members List */}
                            {members.length > 0 ? (
                                <div className="space-y-2">
                                    {members.map((member) => (
                                        <div
                                            key={member.user_uuid}
                                            className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50 border border-neutral-800"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-300">
                                                    {(member.user?.name || "?")[0]}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{member.user?.name || "Unknown"}</p>
                                                    {member.role && (
                                                        <p className="text-xs text-neutral-500">{member.role}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {(accessLevel ?? 0) >= 1 && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.user_uuid)}
                                                    className="p-1.5 text-neutral-600 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-neutral-500 text-center py-4">아직 멤버가 없습니다.</p>
                            )}
                        </div>

                        {/* Dates */}
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Calendar className="w-4 h-4 text-neutral-500" />
                                <span className="text-xs text-neutral-500 uppercase tracking-wider">일정</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="text-neutral-400">
                                    생성일: <span className="text-white">{formatDate(project.created_at)}</span>
                                </p>
                                <p className="text-neutral-400">
                                    수정일: <span className="text-white">{formatDate(project.updated_at)}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
