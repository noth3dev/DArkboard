"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import {
    DndContext,
    closestCorners,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { getSupabase } from "@/lib/supabase"
import { Plus, GripVertical, MoreVertical, Loader2, Users, GraduationCap, Trophy, Trash2, Check, X, Pencil } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

type User = {
    id: string
    display_name: string
    name: string
    role?: string
    position?: number
}

type Group = {
    id: string
    name: string
    description?: string
    type: 'Edu' | 'Taskforce'
}

type UserGroup = {
    user_id: string
    group_id: string
    position?: number
}

export default function GroupPage() {
    const { user, accessLevel } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [columns, setColumns] = useState<Record<string, User[]>>({ pool: [] })
    const [loading, setLoading] = useState(true)
    const [activeId, setActiveId] = useState<string | null>(null) // Format: "columnId:userId"
    const [activeUser, setActiveUser] = useState<User | null>(null)
    const [isAddingGroup, setIsAddingGroup] = useState(false)
    const [newGroupName, setNewGroupName] = useState("")

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false)
    const [originalColumns, setOriginalColumns] = useState<Record<string, User[]>>({})
    const [isSaving, setIsSaving] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const supabase = getSupabase()

            // Fetch Data
            const [usersRes, groupsRes, userGroupsRes] = await Promise.all([
                supabase.from('users').select('user_uuid, display_name, name, role'),
                supabase.from('groups').select('*').order('created_at', { ascending: true }),
                supabase.from('user_groups').select('*').order('position', { ascending: true })
            ])

            if (usersRes.error) throw usersRes.error
            if (groupsRes.error) throw groupsRes.error
            if (userGroupsRes.error) throw userGroupsRes.error

            const rawUsers = usersRes.data || []
            const assignments = userGroupsRes.data || []

            const allUsers: User[] = rawUsers.map((u: any) => ({
                id: u.user_uuid,
                display_name: u.display_name,
                name: u.name,
                role: u.role,
                position: 0
            }))

            const allGroups = groupsRes.data || []

            const cols: Record<string, User[]> = {
                pool: []
            }

            allGroups.forEach((g: Group) => {
                cols[g.id] = []
            })

            // Pool always contains all users
            cols.pool = [...allUsers]

            // Fill group columns
            assignments.forEach((assign: any) => {
                const u = allUsers.find(u => u.id === assign.user_id)
                if (u && cols[assign.group_id]) {
                    // Clone user object to avoid shared reference issues if desired, 
                    // though keeping same object is fine if we use unique keys in render
                    cols[assign.group_id].push({
                        ...u,
                        position: assign.position || 0
                    })
                }
            })

            setUsers(allUsers)
            setGroups(allGroups)
            setColumns(cols)
        } catch (e) {
            console.error(e)
            toast.error("데이터를 불러오는 중 오류가 발생했습니다.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const enterEditMode = () => {
        setOriginalColumns(JSON.parse(JSON.stringify(columns)))
        setIsEditMode(true)
    }

    const cancelEditMode = () => {
        setColumns(originalColumns)
        setIsEditMode(false)
    }

    const saveChanges = async () => {
        if ((accessLevel ?? 0) < 1) return

        // Use toast with action for confirmation
        toast("변경사항을 저장하시겠습니까?", {
            action: {
                label: "저장",
                onClick: () => performSave()
            }
        })
    }

    const performSave = async () => {
        setIsSaving(true)
        try {
            const supabase = getSupabase()

            // 1. Calculate Desired State from UI ('columns')
            // List of { userId, groupId, position }
            const desiredAssignments: { user_id: string, group_id: string, position: number }[] = []

            Object.entries(columns).forEach(([groupId, groupUsers]) => {
                if (groupId === 'pool') return
                groupUsers.forEach((u, index) => {
                    desiredAssignments.push({
                        user_id: u.id,
                        group_id: groupId,
                        position: (index + 1) * 10000
                    })
                })
            })

            // 2. Fetch All Current Assignments for the groups we manage
            const currentGroupIds = groups.map(g => g.id)
            if (currentGroupIds.length === 0) {
                setIsEditMode(false)
                setIsSaving(false)
                return
            }

            const { data: currentAssignments, error: fetchError } = await supabase
                .from('user_groups')
                .select('*')
                .in('group_id', currentGroupIds)

            if (fetchError) throw fetchError

            // 3. Determine Diffs
            const currentMap = new Map<string, any>()
            currentAssignments.forEach((a: any) => {
                currentMap.set(`${a.user_id}:${a.group_id}`, a)
            })

            const desiredMap = new Map<string, any>()
            desiredAssignments.forEach(a => {
                desiredMap.set(`${a.user_id}:${a.group_id}`, a)
            })

            const toDelete: { user_id: string, group_id: string }[] = []
            const toUpsert: any[] = []

            // Found in current but not in desired -> Delete
            currentAssignments.forEach((a: any) => {
                const key = `${a.user_id}:${a.group_id}`
                if (!desiredMap.has(key)) {
                    toDelete.push({ user_id: a.user_id, group_id: a.group_id })
                }
            })

            // Found in desired -> Upsert if new or position changed
            desiredAssignments.forEach(a => {
                const key = `${a.user_id}:${a.group_id}`
                const current = currentMap.get(key)
                if (!current || Math.abs(current.position - a.position) > 0.01) {
                    toUpsert.push(a)
                }
            })

            // 4. Perform DB Operations
            if (toDelete.length > 0) {
                // Supabase delete with multiple conditions is tricky in bulk
                // We'll do it one by one or using a trick if possible, but for safety:
                for (const row of toDelete) {
                    await supabase.from('user_groups').delete().eq('user_id', row.user_id).eq('group_id', row.group_id)
                }
            }

            if (toUpsert.length > 0) {
                const { error: upsertError } = await supabase.from('user_groups').upsert(toUpsert)
                if (upsertError) throw upsertError
            }

            await fetchData()
            setIsEditMode(false)
            toast.success("저장되었습니다.")
        } catch (e) {
            console.error(e)
            toast.error("저장 중 오류가 발생했습니다.")
        } finally {
            setIsSaving(false)
        }
    }

    const triggerCreateGroup = () => {
        toast.custom((t) => (
            <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-[40px] shadow-2xl flex flex-col gap-8 min-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-2xl">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-2xl shadow-white/10">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-white uppercase tracking-[0.3em]">Initialize Fragment</p>
                        <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest mt-0.5">Core Structure Definition</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-neutral-700 uppercase tracking-[0.4em] ml-1">Identification</label>
                        <input
                            autoFocus
                            placeholder="ASSIGN NAME..."
                            className="w-full bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 text-[11px] font-black uppercase tracking-[0.1em] text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-900"
                            id="new-group-name-input"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-neutral-700 uppercase tracking-[0.4em] ml-1">Classification</label>
                        <div className="flex bg-neutral-950 p-1.5 rounded-2xl border border-white/5">
                            <button
                                id="btn-type-edu"
                                onClick={(e) => {
                                    const edu = document.getElementById('btn-type-edu');
                                    const tf = document.getElementById('btn-type-tf');
                                    edu?.classList.add('bg-white', 'text-black');
                                    edu?.classList.remove('text-neutral-600');
                                    tf?.classList.remove('bg-white', 'text-black');
                                    tf?.classList.add('text-neutral-600');
                                    (edu as any).dataset.selected = "true";
                                    (tf as any).dataset.selected = "false";
                                }}
                                data-selected="true"
                                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-white text-black"
                            >Educational</button>
                            <button
                                id="btn-type-tf"
                                onClick={(e) => {
                                    const edu = document.getElementById('btn-type-edu');
                                    const tf = document.getElementById('btn-type-tf');
                                    tf?.classList.add('bg-white', 'text-black');
                                    tf?.classList.remove('text-neutral-600');
                                    edu?.classList.remove('bg-white', 'text-black');
                                    edu?.classList.add('text-neutral-600');
                                    (tf as any).dataset.selected = "true";
                                    (edu as any).dataset.selected = "false";
                                }}
                                data-selected="false"
                                className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-neutral-600"
                            >Taskforce</button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => toast.dismiss(t)}
                        className="flex-1 py-5 text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] hover:text-white transition-colors"
                    >Abort</button>
                    <button
                        onClick={() => {
                            const input = document.getElementById('new-group-name-input') as HTMLInputElement;
                            const isEdu = (document.getElementById('btn-type-edu') as any).dataset.selected === "true";
                            if (input.value.trim()) {
                                toast.dismiss(t);
                                createGroup(input.value.trim(), isEdu);
                            } else {
                                toast.error("IDENTIFICATION REQUIRED");
                            }
                        }}
                        className="flex-1 py-5 bg-white text-black rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-white/5"
                    >Execute</button>
                </div>
            </div>
        ), { duration: Infinity });
    }

    const createGroup = async (name: string, isEdu: boolean) => {
        if ((accessLevel ?? 0) < 1) return
        try {
            const type = isEdu ? 'Edu' : 'Taskforce'
            const supabase = getSupabase()
            const { data, error } = await supabase.from('groups').insert({ name, type }).select().single()
            if (error) throw error

            setGroups([...groups, data])
            setColumns(prev => ({
                ...prev,
                [data.id]: []
            }))
            setIsAddingGroup(false)
            setNewGroupName("")
            toast.success("그룹이 생성되었습니다.")
        } catch (e) {
            console.error(e)
            toast.error("그룹 생성 실패")
        }
    }

    const updateGroupType = async (groupId: string, newType: 'Edu' | 'Taskforce') => {
        if ((accessLevel ?? 0) < 1) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from('groups').update({ type: newType }).eq('id', groupId)
            if (error) throw error

            setGroups(groups.map(g => g.id === groupId ? { ...g, type: newType } : g))
        } catch (e) {
            console.error(e)
            toast.error("그룹 유형 수정 실패")
        }
    }

    const deleteGroup = async (groupId: string) => {
        if ((accessLevel ?? 0) < 3) return

        toast("그룹을 삭제하시겠습니까?", {
            description: "그룹 내 인원은 미배정 상태로 전환됩니다.",
            action: {
                label: "삭제",
                onClick: async () => {
                    try {
                        const supabase = getSupabase()
                        const { error } = await supabase.from('groups').delete().eq('id', groupId)
                        if (error) throw error
                        await fetchData()
                        toast.success("그룹이 삭제되었습니다.")
                    } catch (e) {
                        console.error(e)
                        toast.error("그룹 삭제 중 오류가 발생했습니다.")
                    }
                }
            }
        })
    }

    const updateGroupName = async (groupId: string, newName: string) => {
        if ((accessLevel ?? 0) < 1) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from('groups').update({ name: newName }).eq('id', groupId)
            if (error) throw error

            setGroups(groups.map(g => g.id === groupId ? { ...g, name: newName } : g))
        } catch (e) {
            console.error(e)
            toast.error("그룹 이름 수정 실패")
        }
    }

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const activeId = active.id as string
        setActiveId(activeId)

        const [containerId, userId] = activeId.split(':::')
        const user = columns[containerId]?.find(u => u.id === userId)
        setActiveUser(user || null)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        const [activeContainer, activeUserId] = activeId.split(':::')

        // Find over container
        let overContainer: string | undefined
        if (overId in columns) {
            overContainer = overId
        } else {
            overContainer = Object.keys(columns).find(key => columns[key].some(u => `${key}:::${u.id}` === overId))
        }

        if (!activeContainer || !overContainer || (activeContainer === overContainer && activeContainer !== 'pool')) {
            return
        }

        setColumns(prev => {
            const activeItems = prev[activeContainer]
            const activeIndex = activeItems.findIndex(u => u.id === activeUserId)
            if (activeIndex === -1) return prev

            const targetUser = activeItems[activeIndex]

            // If dragging from pool to a group, and user already exists in group, don't add again
            if (activeContainer === 'pool' && overContainer !== 'pool') {
                if (prev[overContainer].some(u => u.id === activeUserId)) return prev
            }

            const newActiveContainer = activeContainer === 'pool'
                ? [...prev['pool']] // Keep in pool
                : prev[activeContainer].filter(item => item.id !== activeUserId)

            const overItems = prev[overContainer]
            // Calculate index where to drop
            const overIndex = overItems.findIndex(u => `${overContainer}:::${u.id}` === overId)

            let newIndex
            if (overId in prev) {
                newIndex = overItems.length
            } else {
                newIndex = overIndex >= 0 ? overIndex : overItems.length
            }

            // If dragging to pool, and already exists, we just effect a move (reorder) or nothing
            if (overContainer === 'pool' && activeContainer !== 'pool') {
                return {
                    ...prev,
                    [activeContainer]: newActiveContainer
                }
            }

            const newOverContainer = [
                ...prev[overContainer].filter(u => u.id !== activeUserId).slice(0, newIndex),
                targetUser,
                ...prev[overContainer].filter(u => u.id !== activeUserId).slice(newIndex),
            ]

            return {
                ...prev,
                [activeContainer]: newActiveContainer,
                [overContainer]: newOverContainer
            }
        })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        const activeId = active.id as string
        const overId = over?.id as string

        if (!over) {
            // Restore pool if we were dragging from it
            const [activeContainer] = activeId.split(':::')
            if (activeContainer === 'pool') {
                // The item might have been "moved" out of pool in state during DragOver if not careful
                // But our DragOver logic keeps it in pool.
            }
            setActiveId(null)
            setActiveUser(null)
            return
        }

        const [activeContainer, activeUserId] = activeId.split(':::')

        let overContainer: string | undefined
        if (overId in columns) {
            overContainer = overId
        } else {
            overContainer = Object.keys(columns).find(key => columns[key].some(u => `${key}:::${u.id}` === overId))
        }

        if (activeContainer && overContainer) {
            if (activeContainer === overContainer) {
                const oldIndex = columns[activeContainer].findIndex(u => u.id === activeUserId)
                const targetIndex = columns[overContainer].findIndex(u => `${overContainer}:::${u.id}` === overId)

                if (oldIndex !== targetIndex) {
                    setColumns((prev) => ({
                        ...prev,
                        [activeContainer]: arrayMove(prev[activeContainer], oldIndex, targetIndex),
                    }))
                }
            }
        }

        setActiveId(null)
        setActiveUser(null)
    }

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>

    return (
        <div className="min-h-[calc(100vh-65px)] bg-background text-foreground p-6 md:p-12">
            <div className="max-w-[1800px] mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
                            그룹 및 인원 관리
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                            Pool의 인원을 자유롭게 그룹으로 끌어다 배치하세요.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {isEditMode ? (
                            <>
                                <button
                                    onClick={cancelEditMode}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto px-6 py-3 bg-secondary border border-border text-foreground hover:bg-accent rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    변경사항 취소
                                </button>
                                <button
                                    onClick={saveChanges}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto px-8 py-3 bg-foreground text-background rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    변경사항 저장
                                </button>
                            </>
                        ) : (
                            <>
                                {(accessLevel ?? 0) >= 1 && (
                                    <button
                                        onClick={enterEditMode}
                                        className="w-full sm:w-auto px-6 py-3 bg-secondary border border-border text-foreground hover:bg-accent rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        그룹 수정
                                    </button>
                                )}
                                {(accessLevel ?? 0) >= 1 && (
                                    <button
                                        onClick={triggerCreateGroup}
                                        className="w-full sm:w-auto px-8 py-3 bg-foreground text-background rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        새 그룹 생성
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-6 overflow-x-auto pb-10 items-start min-h-[calc(100vh-350px)] no-scrollbar">
                        {/* Unassigned Column */}
                        <SortableColumn
                            id="pool"
                            title="Pool"
                            users={columns.pool || []}
                            count={columns.pool?.length || 0}
                            isEditMode={isEditMode}
                        />

                        {/* Group Columns */}
                        {groups.map(group => (
                            <SortableColumn
                                key={group.id}
                                id={group.id}
                                title={group.name}
                                type={group.type}
                                users={columns[group.id] || []}
                                count={columns[group.id]?.length || 0}
                                onDelete={() => deleteGroup(group.id)}
                                onUpdateName={updateGroupName}
                                onUpdateType={(type) => updateGroupType(group.id, type)}
                                isEditMode={isEditMode}
                            />
                        ))}
                    </div>

                    {createPortal(
                        <DragOverlay>
                            {activeUser ? <UserCard user={activeUser} isOverlay isEditMode={true} /> : null}
                        </DragOverlay>,
                        document.body
                    )}
                </DndContext>
            </div>

            <style jsx global>{`
                .glass { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    )
}

function SortableColumn({ id, title, type, users, count, onDelete, onUpdateName, onUpdateType, isEditMode }: {
    id: string,
    title: string,
    type?: 'Edu' | 'Taskforce',
    users: User[],
    count: number,
    onDelete?: () => void,
    onUpdateName?: (id: string, name: string) => Promise<void>,
    onUpdateType?: (type: 'Edu' | 'Taskforce') => Promise<void>,
    isEditMode?: boolean
}) {
    const { setNodeRef } = useSortable({ id })
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(title)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!editName.trim() || !onUpdateName) return
        setIsSaving(true)
        await onUpdateName(id, editName)
        setIsSaving(false)
        setIsEditing(false)
    }

    const toggleType = () => {
        if (!onUpdateType || !type) return
        const newType = type === 'Edu' ? 'Taskforce' : 'Edu'
        onUpdateType(newType)
    }

    return (
        <div className="w-80 shrink-0 flex flex-col h-full rounded-[32px] glass border border-border/50 overflow-hidden shadow-2xl">
            <div className={`p-6 border-b border-border/50 flex flex-col gap-4 ${id === 'pool' ? 'bg-white/[0.04]' : 'bg-transparent'}`}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                />
                                <button onClick={handleSave} disabled={isSaving} className="text-emerald-400 p-1">
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => { setIsEditing(false); setEditName(title); }} className="text-red-400 p-1">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 w-full group/title">
                                <h3 className="font-bold font-suit text-foreground truncate text-sm leading-tight">{title}</h3>
                                <span className="px-2 py-0.5 rounded-lg bg-secondary border border-border text-muted-foreground text-[10px] font-bold shrink-0">{count}</span>
                                {onUpdateName && (
                                    <button onClick={() => setIsEditing(true)} className="ml-auto text-muted-foreground/30 hover:text-foreground transition-all opacity-0 group-hover/title:opacity-100 p-1">
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    {!isEditing && onDelete && (
                        <button onClick={onDelete} className="ml-2 text-muted-foreground/30 hover:text-red-400 transition-all p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {type && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleType}
                            disabled={!onUpdateType}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${type === 'Edu'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                } hover:scale-105 active:scale-95`}
                        >
                            {type}
                        </button>
                    </div>
                )}
            </div>

            <ScrollableContext id={id} items={users.map(u => `${id}:::${u.id}`)}>
                <div ref={setNodeRef} className="flex-1 p-4 space-y-2.5 overflow-y-auto custom-scrollbar min-h-[200px] group">
                    {users.map((user) => (
                        <SortableUserCard key={`${id}:::${user.id}`} user={user} columnId={id} isEditMode={isEditMode} />
                    ))}
                    {users.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 text-[10px] font-bold uppercase tracking-widest py-16 gap-3">
                            <div className="w-8 h-[1px] bg-muted-foreground/10" />
                            {id === 'pool' ? '데이터 없음' : '편성된 인원 없음'}
                            <div className="w-8 h-[1px] bg-muted-foreground/10" />
                        </div>
                    )}
                </div>
            </ScrollableContext>
        </div>
    )
}

function ScrollableContext({ children, items, id }: { children: React.ReactNode, items: string[], id: string }) {
    return (
        <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
            {children}
        </SortableContext>
    )
}

function SortableUserCard({ user, columnId, isEditMode }: { user: User, columnId: string, isEditMode?: boolean }) {
    const sortableId = `${columnId}:::${user.id}`
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sortableId, data: { ...user, columnId } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    if (!isEditMode) {
        return (
            <div ref={setNodeRef} style={style}>
                <UserCard user={user} isEditMode={false} />
            </div>
        )
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <UserCard user={user} isEditMode={true} />
        </div>
    )
}

function UserCard({ user, isOverlay, isEditMode }: { user: User, isOverlay?: boolean, isEditMode?: boolean }) {
    const isMentor = user.role === 'mentor'

    return (
        <div className={`
            p-3.5 rounded-2xl bg-white/[0.03] border transition-all
            flex items-center gap-3
            ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:bg-white/[0.08] hover:border-white/20' : 'border-white/[0.05]'}
            ${isOverlay ? 'shadow-2xl scale-105 border-primary/50 cursor-grabbing bg-secondary backdrop-blur-xl' : 'border-white/[0.05]'}
        `}>
            <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${isMentor
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                {isMentor ? <Trophy className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate font-suit tracking-tight">
                    {user.name || user.display_name}
                </p>
                <span className={`text-[10px] font-medium tracking-tight ${isMentor ? 'text-indigo-400/70' : 'text-emerald-400/70'}`}>
                    {isMentor ? '멘토' : '멘티'}
                </span>
            </div>
            {isEditMode && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 ml-auto" />}
        </div>
    )
}
