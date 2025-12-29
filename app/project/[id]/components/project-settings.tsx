import { Calendar, Clock, FileText, Globe, Link as LinkIcon, Lock, Pencil, Save, Tag, UserPlus, Users, X } from "lucide-react"
import { Project, ProjectMember, TeamMember, statusConfig } from "../types"
import { useState } from "react"
import { formatDate } from "./utils"

interface ProjectSettingsProps {
    project: Project
    members: ProjectMember[]
    allMembers: TeamMember[]
    accessLevel: number
    onUpdate: (form: any) => Promise<void>
    onAddMember: (userUuid: string, role: string) => Promise<void>
    onRemoveMember: (userUuid: string) => Promise<void>
}

export function ProjectSettings({
    project,
    members,
    allMembers,
    accessLevel,
    onUpdate,
    onAddMember,
    onRemoveMember
}: ProjectSettingsProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [addingMember, setAddingMember] = useState(false)
    const [selectedMember, setSelectedMember] = useState("")
    const [memberRole, setMemberRole] = useState("")

    // Derived from project
    const status = statusConfig[project.status]
    const availableMembers = allMembers.filter(m => !members.some(pm => pm.user_uuid === m.user_uuid))
    const dday = getDDay(project.deadline)
    const ddayText = formatDDay(dday)

    const [editForm, setEditForm] = useState({
        name: project.name,
        description: project.description || "",
        status: project.status,
        url: project.url || "",
        tags: (project.tags || []).join(", "),
        deadline: project.deadline || "",
        is_public: project.is_public !== false,
    })

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

    async function handleSave() {
        await onUpdate(editForm)
        setIsEditing(false)
    }

    async function handleAddMemberClick() {
        if (!selectedMember) return
        await onAddMember(selectedMember, memberRole)
        setAddingMember(false)
        setSelectedMember("")
        setMemberRole("")
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex justify-end mb-4">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">취소</button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200"><Save className="w-4 h-4" />저장</button>
                    </div>
                ) : accessLevel >= 1 && (
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
                            {accessLevel >= 1 && availableMembers.length > 0 && <button onClick={() => setAddingMember(!addingMember)} className="p-1 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded"><UserPlus className="w-4 h-4" /></button>}
                        </div>
                        {addingMember && (
                            <div className="flex gap-2 mb-3">
                                <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="flex-1 px-2 py-1.5 bg-black border border-neutral-700 rounded text-sm"><option value="">선택...</option>{availableMembers.map((m) => <option key={m.user_uuid} value={m.user_uuid}>{m.name || m.name_eng}</option>)}</select>
                                <input type="text" placeholder="역할" value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className="w-20 px-2 py-1.5 bg-black border border-neutral-700 rounded text-sm" />
                                <button onClick={handleAddMemberClick} className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded">추가</button>
                            </div>
                        )}
                        {members.length === 0 ? <p className="text-neutral-500 text-sm">멤버 없음</p> : (
                            <div className="space-y-2">{members.map((m) => (
                                <div key={m.user_uuid} className="flex items-center justify-between p-2 rounded bg-neutral-900/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold">{(m.user?.name || "?")[0]}</div>
                                        <div><p className="text-sm text-white">{m.user?.name || "Unknown"}</p>{m.role && <p className="text-xs text-neutral-500">{m.role}</p>}</div>
                                    </div>
                                    {accessLevel >= 1 && <button onClick={() => onRemoveMember(m.user_uuid)} className="p-1 text-neutral-600 hover:text-white"><X className="w-3 h-3" /></button>}
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
    )
}
