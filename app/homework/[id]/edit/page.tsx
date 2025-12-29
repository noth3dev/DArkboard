"use client"

import { useAuth } from "@/lib/auth-context"
import { getSupabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, use } from "react"
import {
    ArrowLeft,
    Save,
    Trash2,
    Plus,
    GripVertical,
    Calendar,
    AlertCircle,
    Users,
    Code2,
    FileText,
    HelpCircle,
    BookOpen,
    Eraser,
    CheckCircle2,
    Loader2
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Types
type Homework = {
    id: string
    title: string
    description: string
    due_date: string | null
    priority: string
    submission_format: string
    lecture_id: string | null
}

type Problem = {
    id: string
    title: string
    submission_format: string
    sort_order: number
}

type Group = {
    id: string
    name: string
}

type User = {
    id: string
    name: string
    display_name: string
    role?: string
}

// Sortable Item Component
function SortableProblem({ id, hwId, problem, onDelete }: { id: string, hwId: string, problem: Problem, onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const getTypeIcon = (format: string) => {
        switch (format) {
            case 'quiz': return <HelpCircle className="w-4 h-4 text-orange-400" />
            case 'code': return <Code2 className="w-4 h-4 text-blue-400" />
            default: return <BookOpen className="w-4 h-4 text-muted-foreground" />
        }
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-5 bg-white/[0.03] border border-border/50 rounded-2xl group hover:border-border transition-all">
            <button {...attributes} {...listeners} className="text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 shrink-0">
                {getTypeIcon(problem.submission_format)}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate font-suit">{problem.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-medium text-muted-foreground/50 font-mono">ID: {problem.id.slice(0, 4)}</span>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground/40 tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/5">{problem.submission_format}</span>
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                    href={`/homework/${hwId}/problem/${problem.id}/edit`}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
                >
                    <BookOpen className="w-4 h-4" />
                </Link>
                <button
                    onClick={() => onDelete(problem.id)}
                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}


export default function HomeworkEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Data States
    const [homework, setHomework] = useState<Homework | null>(null)
    const [problems, setProblems] = useState<Problem[]>([])

    // Assignment Data
    const [groups, setGroups] = useState<Group[]>([])
    const [users, setUsers] = useState<User[]>([]) // All users
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set()) // Currently assigned IDs

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const fetchAllData = useCallback(async () => {
        try {
            const supabase = getSupabase()

            // 1. Fetch Homework
            const { data: hw, error: hwError } = await supabase.from('homeworks').select('*').eq('id', id).single()
            if (hwError) throw hwError
            // DB returns description as null potentially, ensure string
            setHomework({ ...hw, description: hw.description || '', due_date: hw.due_date || '' })

            // 2. Fetch Problems
            const { data: probs, error: probError } = await supabase.from('problems').select('*').eq('homework_id', id).order('sort_order', { ascending: true })
            // If problems table not exist or error, might just be empty.
            if (!probError && probs) setProblems(probs)

            // 3. Fetch Assignables (Groups/Users)
            const [gRes, uRes] = await Promise.all([
                supabase.from('groups').select('id, name'),
                supabase.from('users').select('user_uuid, name, display_name, role')
            ])
            if (gRes.data) setGroups(gRes.data)
            if (uRes.data) setUsers(uRes.data.map((u: any) => ({
                id: u.user_uuid,
                name: u.name,
                display_name: u.display_name,
                role: u.role
            })))

            // 4. Fetch Current Assignees
            try {
                const { data: assignees, error: assignError } = await supabase
                    .from('homework_assignees')
                    .select('user_id')
                    .eq('homework_id', id)

                if (assignError) {
                    console.warn("Table 'homework_assignees' missing. Assignments will not be loaded.")
                } else if (assignees) {
                    setSelectedUserIds(new Set(assignees.map((a: { user_id: string }) => a.user_id)))
                }
            } catch (e) {
                console.error("Assignee fetch failed:", e)
            }

        } catch (e) {
            console.error(e)
            toast.error("과제 정보를 불러오는데 실패했습니다.")
            router.push('/homework')
        } finally {
            setLoading(false)
        }
    }, [id, router])

    useEffect(() => {
        if (user) fetchAllData()
    }, [user, fetchAllData])

    // --- Actions ---

    const handleSave = async (silent = false) => {
        if (!homework) return
        setSaving(true)
        try {
            const supabase = getSupabase()

            // 1. Update Homework Details
            const { error: hwError } = await supabase.from('homeworks').update({
                title: homework.title,
                description: homework.description,
                due_date: homework.due_date || null,
                priority: homework.priority
            }).eq('id', homework.id)
            if (hwError) throw hwError

            // 2. Update Assignees (Delete all + Insert new) - simple transaction replacement
            try {
                const { error: delError } = await supabase.from('homework_assignees').delete().eq('homework_id', homework.id)
                if (delError) {
                    // PGRST204/PGRST205 typically indicate a missing table or view in PostgREST.
                    // This can happen if the 'homework_assignees' table has not been created yet (e.g., before mig_002 is applied).
                    if (delError.code === 'PGRST204' || delError.code === 'PGRST205') {
                        console.warn("Table 'homework_assignees' not found. Ensure mig_002 migration is applied. Skipping assignment sync.")
                    } else {
                        throw delError
                    }
                } else {
                    if (selectedUserIds.size > 0) {
                        const newAssignees = Array.from(selectedUserIds).map(uid => ({
                            homework_id: homework.id,
                            user_id: uid
                        }))
                        const { error: insError } = await supabase.from('homework_assignees').insert(newAssignees)
                        if (insError) throw insError
                    }
                }
            } catch (e) {
                console.error("Assignee sync failed:", e)
                // We don't necessarily want to block the entire save if assignments fail
                // alert("참여 인원 동기화에 실패했습니다.") 
            }

            // 3. Update Problem Orders (if changed)
            // Need to update DB with new order_index
            // We can do this in batch or loop
            // Promise.all
            if (problems.length > 0) {
                const updates = problems.map((p, index) =>
                    supabase.from('problems').update({ sort_order: index }).eq('id', p.id)
                )
                await Promise.all(updates)
            }

            if (!silent) {
                toast.success("과제가 성공적으로 업데이트되었습니다.")
                router.push(`/homework/${id}`)
            }
            return true
        } catch (e) {
            console.error(e)
            toast.error("변경사항 저장에 실패했습니다.")
            return false
        } finally {
            setSaving(false)
        }
    }

    const handleAddProblem = async () => {
        const success = await handleSave(true)
        if (success) {
            router.push(`/homework/${id}/problem/new`)
        }
    }

    const handleDeleteHomework = async () => {
        toast("정말로 이 과제 전체를 삭제하시겠습니까?", {
            description: "이 작업은 되돌릴 수 없습니다.",
            action: {
                label: "삭제",
                onClick: async () => {
                    try {
                        const supabase = getSupabase()
                        const { error } = await supabase.from('homeworks').delete().eq('id', id)
                        if (error) throw error
                        router.push('/homework')
                        toast.success("과제가 삭제되었습니다.")
                    } catch (e) {
                        console.error(e)
                        toast.error("과제 삭제에 실패했습니다.")
                    }
                }
            }
        })
    }

    // Assignments
    const toggleUser = (uid: string) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev)
            if (next.has(uid)) next.delete(uid)
            else next.add(uid)
            return next
        })
    }

    const toggleGroup = async (gid: string) => {
        // Fetch group members and add all
        const supabase = getSupabase()
        const { data } = await supabase.from('user_groups').select('user_id').eq('group_id', gid)
        if (data) {
            setSelectedUserIds(prev => {
                const next = new Set(prev)
                data.forEach((d: any) => next.add(d.user_id))
                return next
            })
        }
    }

    // Problems
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setProblems((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id)
                const newIndex = items.findIndex(i => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleDeleteProblem = async (problemId: string) => {
        toast("이 문제를 삭제하시겠습니까?", {
            action: {
                label: "삭제",
                onClick: async () => {
                    try {
                        const supabase = getSupabase()
                        const { error } = await supabase.from('problems').delete().eq('id', problemId)
                        if (error) throw error
                        setProblems(prev => prev.filter(p => p.id !== problemId))
                        toast.success("문제가 삭제되었습니다.")
                    } catch (e) { console.error(e); toast.error("문제 삭제에 실패했습니다.") }
                }
            }
        })
    }


    if (authLoading || loading) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500">로딩 중...</div>
    if (!homework) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">과제를 찾을 수 없습니다</div>

    return (
        <div className="min-h-[calc(100vh-65px)] bg-background text-foreground p-6 md:p-12">
            <div className="max-w-[1400px] mx-auto space-y-16">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <Link href="/homework" className="p-3 bg-secondary border border-border rounded-2xl hover:bg-accent transition-all group">
                            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold font-suit tracking-tighter leading-tight">과제 상세 설정</h1>
                            <p className="text-[10px] text-muted-foreground font-bold font-suit uppercase tracking-[0.2em] mt-2">대과제 ID: {id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDeleteHomework}
                            className="w-12 h-12 flex items-center justify-center bg-red-400/5 text-red-400 border border-red-400/20 rounded-2xl hover:bg-red-400 hover:text-white transition-all active:scale-95"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleSave()}
                            disabled={saving}
                            className="h-12 px-8 bg-foreground text-background rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-xl shadow-white/5"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>변경사항 저장</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Configuration Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Left Panel: Core Settings */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Parameters Card */}
                        <div className="glass border border-border/50 rounded-[32px] p-8 space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5"><FileText className="w-4 h-4 text-muted-foreground" /></div>
                                <h3 className="text-sm font-bold font-suit uppercase tracking-widest text-foreground/80">기본 설정</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest ml-1">제목</label>
                                    <input
                                        type="text"
                                        value={homework.title}
                                        onChange={e => setHomework({ ...homework, title: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest ml-1">우선순위</label>
                                        <select
                                            value={homework.priority}
                                            onChange={e => setHomework({ ...homework, priority: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="low">낮음</option>
                                            <option value="medium">보통</option>
                                            <option value="high">높음</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest ml-1">마감 기한</label>
                                        <input
                                            type="date"
                                            value={homework.due_date ? homework.due_date.split('T')[0] : ''}
                                            onChange={e => setHomework({ ...homework, due_date: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest ml-1">과제 설명</label>
                                    <textarea
                                        rows={6}
                                        value={homework.description}
                                        onChange={e => setHomework({ ...homework, description: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-xl px-5 py-4 text-sm leading-relaxed focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                        placeholder="과제에 대한 상세 설명을 입력하세요..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assignment Matrix Card */}
                        <div className="glass border border-border/50 rounded-[32px] p-8 space-y-8 flex flex-col h-[600px] shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5"><Users className="w-4 h-4 text-muted-foreground" /></div>
                                    <h3 className="text-sm font-bold font-suit uppercase tracking-widest text-foreground/80">대상자 설정</h3>
                                </div>
                                <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 font-bold">
                                    {selectedUserIds.size}명 선택됨
                                </span>
                            </div>

                            <div className="space-y-6 flex-1 flex flex-col min-h-0">
                                {/* Rapid Clusters */}
                                <div className="flex flex-wrap gap-2">
                                    {groups.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => toggleGroup(g.id)}
                                            className="px-4 py-2 rounded-xl border border-border bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground transition-all active:scale-95"
                                        >
                                            {g.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-px bg-border/50" />

                                {/* Personnel Database */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                                    {/* Mentors Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 ml-1">멘토</h4>
                                        <div className="space-y-1.5">
                                            {users.filter(u => u.role === 'mentor').map(u => {
                                                const isSelected = selectedUserIds.has(u.id)
                                                return (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => toggleUser(u.id)}
                                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'bg-white/10'}`} />
                                                            <span className={`text-xs font-bold font-suit transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{u.name || u.display_name}</span>
                                                        </div>
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Mentees Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 ml-1">멘티</h4>
                                        <div className="space-y-1.5">
                                            {users.filter(u => u.role !== 'mentor').map(u => {
                                                const isSelected = selectedUserIds.has(u.id)
                                                return (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => toggleUser(u.id)}
                                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-white/10'}`} />
                                                            <span className={`text-xs font-bold font-suit transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{u.name || u.display_name}</span>
                                                        </div>
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Architecture Construction */}
                    <div className="lg:col-span-8">
                        <div className="glass border border-border/50 rounded-[40px] p-8 lg:p-12 min-h-[800px] flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white/5 rounded-[20px] flex items-center justify-center border border-white/10 shadow-lg">
                                        <AlertCircle className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold font-suit tracking-tight text-foreground">문제 구성</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold font-suit uppercase tracking-widest mt-1">{problems.length}개의 문제가 포함됨</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddProblem}
                                    disabled={saving}
                                    className="h-12 pl-5 pr-6 bg-foreground text-background rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-3 shadow-lg shadow-white/5 disabled:opacity-50"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>{saving ? "저장 중..." : "문제 추가"}</span>
                                </button>
                            </div>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={problems.map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-4">
                                        {problems.map(problem => (
                                            <SortableProblem
                                                key={problem.id}
                                                id={problem.id}
                                                hwId={id}
                                                problem={problem}
                                                onDelete={handleDeleteProblem}
                                            />
                                        ))}

                                        {problems.length === 0 && (
                                            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[32px] text-muted-foreground/30 gap-6">
                                                <div className="p-6 bg-white/[0.02] rounded-full">
                                                    <Eraser className="w-10 h-10 opacity-20" />
                                                </div>
                                                <span className="text-xs font-bold font-suit uppercase tracking-[0.3em]">추가된 문제가 없습니다</span>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .glass { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    )
}
