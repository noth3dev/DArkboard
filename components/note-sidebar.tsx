"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
    Plus,
    Search,
    FileText,
    ChevronRight,
    Trash2,
    ChevronDown,
    Layout,
    FilePlus2,
    PanelLeftClose,
    PanelLeft,
    FolderPlus,
    Check,
    Pencil,
    X,
    Settings,
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
    type LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

type Note = {
    id: string
    title: string
    parent_id: string | null
    is_archived: boolean
    workspace_id: string | null
}

type Workspace = {
    id: string
    name: string
    icon: string
    color: string
    is_default: boolean
}

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
    "folder": Folder,
    "folder-open": FolderOpen,
    "folder-heart": FolderHeart,
    "folder-kanban": FolderKanban,
    "folder-git": FolderGit2,
    "folder-code": FolderCode,
    "folder-archive": FolderArchive,
    "folder-cog": FolderCog,
    "folder-search": FolderSearch,
    "folder-sync": FolderSync,
    "briefcase": Briefcase,
    "book-open": BookOpen,
    "graduation-cap": GraduationCap,
    "lightbulb": Lightbulb,
    "rocket": Rocket,
    "home": Home,
    "building": Building2,
    "package": Package,
    "archive": Archive,
    "star": Star,
    "heart": Heart,
    "sparkles": Sparkles,
    "zap": Zap,
    "globe": Globe,
    "code": Code2,
    "terminal": Terminal,
    "database": Database,
    "layers": Layers,
    "layout-grid": LayoutGrid,
    "palette": Palette,
    "music": Music,
    "camera": Camera,
    "film": Film,
    "gamepad": Gamepad2,
    "coffee": Coffee,
}

// User color palette
const USER_COLORS = [
    "#E91E63", "#2196F3", "#4CAF50", "#FF9800", "#9C27B0",
    "#00BCD4", "#FF5722", "#607D8B", "#3F51B5", "#009688",
]

function getUserColor(userId: string): string {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}


function getIconComponent(iconName: string): LucideIcon {
    return ICON_MAP[iconName] || Folder
}

type NoteTreeItemProps = {
    note: Note
    level: number
    allNotes: Note[]
    currentNoteId: string
    presenceStates: Record<string, { userId: string, name: string, color: string }[]>
    onSelect: (id: string) => void
    onDelete: (id: string, e: React.MouseEvent) => void
    onCreateSubPage: (parentId: string, e: React.MouseEvent) => void
}

const NoteItem = ({
    note,
    level,
    allNotes,
    currentNoteId,
    presenceStates,
    onSelect,
    onDelete,
    onCreateSubPage
}: NoteTreeItemProps) => {
    const [isOpen, setIsOpen] = useState(true)
    const childNotes = allNotes.filter(n => n.parent_id === note.id)
    const hasChildren = childNotes.length > 0
    const isSelected = currentNoteId === note.id

    return (
        <div className="space-y-0.5">
            <div
                onClick={() => onSelect(note.id)}
                style={{ paddingLeft: `${(level * 12) + 12}px` }}
                className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer group/item",
                    isSelected
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300"
                )}
            >
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                    }}
                    className="w-4 h-4 flex items-center justify-center hover:bg-neutral-800 rounded transition-colors"
                >
                    {hasChildren ? (
                        isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    ) : (
                        <div className="w-3 h-3" />
                    )}
                </div>
                <FileText className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    isSelected ? "text-white" : "text-neutral-700 group-hover/item:text-neutral-500"
                )} />
                <span className="flex-1 text-[13px] font-medium truncate font-suit">
                    {note.title || "제목 없는 노트"}
                </span>

                {/* Presence Indicators */}
                {presenceStates[note.id] && (
                    <div className="flex items-center -space-x-1">
                        {presenceStates[note.id].map((presenceUser, idx) => (
                            <div
                                key={`${presenceUser.userId}-${idx}`}
                                className="w-2 h-2 rounded-full border border-black"
                                style={{ backgroundColor: presenceUser.color }}
                                title={presenceUser.name}
                            />
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onCreateSubPage(note.id, e)
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-white transition-all"
                        title="하위 페이지 추가"
                    >
                        <FilePlus2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(note.id, e)
                        }}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-red-400 transition-all"
                        title="삭제"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {isOpen && hasChildren && (
                <div className="space-y-0.5">
                    {childNotes.map(child => (
                        <NoteItem
                            key={child.id}
                            note={child}
                            level={level + 1}
                            allNotes={allNotes}
                            currentNoteId={currentNoteId}
                            presenceStates={presenceStates}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onCreateSubPage={onCreateSubPage}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

type NoteSidebarProps = {
    isCollapsed: boolean
    onToggle: () => void
}

export function NoteSidebar({ isCollapsed, onToggle }: NoteSidebarProps) {
    const { user, profileName } = useAuth()
    const router = useRouter()
    const params = useParams()
    const currentNoteId = params.noteId as string

    const [notes, setNotes] = useState<Note[]>([])
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [workspaceCounts, setWorkspaceCounts] = useState<Record<string, number>>({})
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState("")
    const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null)
    const [editWorkspaceName, setEditWorkspaceName] = useState("")
    const [presenceStates, setPresenceStates] = useState<Record<string, { userId: string, name: string, color: string }[]>>({})
    const channelRef = useRef<any>(null)
    const presenceChannelRef = useRef<any>(null)


    const fetchWorkspaces = useCallback(async () => {
        if (!user) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("note_workspaces")
                .select("*")
                .order("created_at", { ascending: true })

            if (error) throw error

            if (data && data.length > 0) {
                setWorkspaces(data)
                // Set default workspace or first one
                const defaultWs = data.find((w: Workspace) => w.is_default) || data[0]
                // Only set current workspace if not already set, or if the current one is not in the new list
                setCurrentWorkspace(prev => {
                    if (!prev) return defaultWs
                    const stillExists = data.find((w: Workspace) => w.id === prev.id)
                    return stillExists ? prev : defaultWs
                })
            } else {
                // Create default workspace with user's name
                const defaultName = profileName ? `${profileName}의 워크스페이스` : "My Workspace"
                const { data: newWs, error: createError } = await supabase
                    .from("note_workspaces")
                    .insert({
                        user_id: user.id,
                        name: defaultName,
                        icon: "folder",
                        is_default: true
                    })
                    .select()
                    .single()

                if (!createError && newWs) {
                    // Add owner to members table
                    await supabase
                        .from("note_workspace_members")
                        .insert({
                            workspace_id: newWs.id,
                            user_id: user.id,
                            role: "owner"
                        })

                    // Migrate existing notes without workspace_id to default workspace
                    await supabase
                        .from("notes")
                        .update({ workspace_id: newWs.id })
                        .eq("user_id", user.id)
                        .is("workspace_id", null)

                    setWorkspaces([newWs])
                    setCurrentWorkspace(newWs)
                }
            }
        } catch (err) {
            console.error("Error fetching workspaces:", err)
        }
    }, [user, profileName])

    const fetchNotes = useCallback(async () => {
        if (!user || !currentWorkspace) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("notes")
                .select("id, title, parent_id, is_archived, workspace_id, user_id")
                .eq("workspace_id", currentWorkspace.id)
                .eq("is_archived", false)
                .order("created_at", { ascending: true })

            if (error) throw error
            setNotes(data || [])
        } catch (err) {
            console.error("Error fetching notes:", err)
            toast.error("노트를 불러오는 중 오류가 발생했습니다.")
        } finally {
            setIsLoading(false)
        }
    }, [user, currentWorkspace])

    useEffect(() => {
        fetchWorkspaces()
    }, [fetchWorkspaces])

    // When navigating to a specific note URL, switch to its workspace
    useEffect(() => {
        if (!currentNoteId || !user || !workspaces.length) return

        const switchToNoteWorkspace = async () => {
            const supabase = getSupabase()
            const { data: note, error } = await supabase
                .from("notes")
                .select("workspace_id")
                .eq("id", currentNoteId)
                .single()

            if (!error && note?.workspace_id) {
                const targetWorkspace = workspaces.find(w => w.id === note.workspace_id)
                if (targetWorkspace && currentWorkspace?.id !== note.workspace_id) {
                    setCurrentWorkspace(targetWorkspace)
                }
            }
        }

        switchToNoteWorkspace()
    }, [currentNoteId, user, workspaces, currentWorkspace])

    useEffect(() => {
        if (currentWorkspace) {
            setIsLoading(true)
            fetchNotes()
        }
    }, [currentWorkspace, fetchNotes])

    // Fetch workspace counts when menu opens
    const fetchWorkspaceCounts = useCallback(async () => {
        if (!workspaces.length) return
        try {
            const supabase = getSupabase()
            const counts: Record<string, number> = {}
            for (const ws of workspaces) {
                const { count } = await supabase
                    .from("notes")
                    .select("*", { count: "exact", head: true })
                    .eq("workspace_id", ws.id)
                    .eq("is_archived", false)
                counts[ws.id] = count ?? 0
            }
            setWorkspaceCounts(counts)
        } catch (err) {
            console.error("Error fetching workspace counts:", err)
        }
    }, [workspaces])

    useEffect(() => {
        if (showWorkspaceMenu) {
            fetchWorkspaceCounts()
        }
    }, [showWorkspaceMenu, fetchWorkspaceCounts])

    // Realtime subscription for notes
    useEffect(() => {
        if (!user || !currentWorkspace) return

        const supabase = getSupabase()
        const channel = supabase
            .channel(`notes_changes_${currentWorkspace.id}`)

        channelRef.current = channel

        channel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes',
                    filter: `workspace_id=eq.${currentWorkspace.id}`
                },
                (payload: { eventType: string; new: Note; old: { id: string } }) => {
                    if (payload.eventType === 'INSERT') {
                        const newNote = payload.new as Note
                        if (!newNote.is_archived) {
                            setNotes((prev) => {
                                if (prev.find(n => n.id === newNote.id)) return prev
                                return [...prev, newNote]
                            })
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedNote = payload.new as Note
                        if (updatedNote.is_archived) {
                            setNotes((prev) => prev.filter((n) => n.id !== updatedNote.id))
                        } else {
                            setNotes((prev) => {
                                const exists = prev.find(n => n.id === updatedNote.id)
                                if (exists) {
                                    return prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
                                } else {
                                    return [...prev, updatedNote]
                                }
                            })
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id
                        setNotes((prev) => prev.filter((n) => n.id !== deletedId))
                    }
                }
            )
            // Also listen for broadcast events (bypasses RLS for real-time sync)
            .on('broadcast', { event: 'note-created' }, ({ payload }: { payload: Note }) => {
                const newNote = payload
                if (newNote.workspace_id === currentWorkspace.id && !newNote.is_archived) {
                    setNotes((prev) => {
                        if (prev.find(n => n.id === newNote.id)) return prev
                        return [...prev, newNote]
                    })
                }
            })
            .on('broadcast', { event: 'note-updated' }, ({ payload }: { payload: Note }) => {
                const updatedNote = payload
                if (updatedNote.workspace_id === currentWorkspace.id) {
                    if (updatedNote.is_archived) {
                        setNotes((prev) => prev.filter((n) => n.id !== updatedNote.id))
                    } else {
                        setNotes((prev) => {
                            const exists = prev.find(n => n.id === updatedNote.id)
                            if (exists) {
                                return prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
                            } else {
                                return [...prev, updatedNote]
                            }
                        })
                    }
                }
            })
            .on('broadcast', { event: 'note-deleted' }, ({ payload }: { payload: { id: string } }) => {
                const { id } = payload
                setNotes((prev) => prev.filter((n) => n.id !== id))
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [user, currentWorkspace])

    // Workspace Presence
    useEffect(() => {
        if (!user || !currentWorkspace) return

        const supabase = getSupabase()
        const channelName = `workspace_presence_${currentWorkspace.id}`
        const channel = supabase.channel(channelName)

        presenceChannelRef.current = channel

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                const noteMapping: Record<string, { userId: string, name: string, color: string }[]> = {}

                Object.values(newState).forEach((presences: any) => {
                    presences.forEach((presence: any) => {
                        if (presence.noteId) {
                            if (!noteMapping[presence.noteId]) {
                                noteMapping[presence.noteId] = []
                            }
                            // Deduplicate users per note
                            if (!noteMapping[presence.noteId].find(u => u.userId === presence.userId)) {
                                noteMapping[presence.noteId].push({
                                    userId: presence.userId,
                                    name: presence.name,
                                    color: presence.color
                                })
                            }
                        }
                    })
                })
                setPresenceStates(noteMapping)
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        userId: user.id,
                        name: profileName || user.email?.split("@")[0] || "Anonymous",
                        color: getUserColor(user.id),
                        noteId: currentNoteId
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
            presenceChannelRef.current = null
            setPresenceStates({})
        }
    }, [user, currentWorkspace, currentNoteId, profileName])


    // Realtime subscription for workspaces and members
    useEffect(() => {
        if (!user) return

        const supabase = getSupabase()

        // Subscription for my owned workspaces
        const workspaceChannel = supabase
            .channel('workspaces_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'note_workspaces',
                    filter: `user_id=eq.${user.id}`
                },
                (payload: { eventType: string; new: Workspace; old: { id: string } }) => {
                    if (payload.eventType === 'INSERT') {
                        const newWs = payload.new as Workspace
                        setWorkspaces((prev) => {
                            if (prev.find(w => w.id === newWs.id)) return prev
                            return [...prev, newWs]
                        })
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedWs = payload.new as Workspace
                        setWorkspaces((prev) => prev.map((w) => (w.id === updatedWs.id ? updatedWs : w)))
                        if (currentWorkspace?.id === updatedWs.id) {
                            setCurrentWorkspace(updatedWs)
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id
                        setWorkspaces((prev) => prev.filter((w) => w.id !== deletedId))
                        if (currentWorkspace?.id === deletedId) {
                            setWorkspaces((prev) => {
                                if (prev.length > 0) setCurrentWorkspace(prev[0])
                                return prev
                            })
                        }
                    }
                }
            )
            .subscribe()

        // Subscription for membership changes (invitations)
        const memberChannel = supabase
            .channel('workspace_members_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'note_workspace_members',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    // Refetch workspaces when membership changes
                    fetchWorkspaces()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(workspaceChannel)
            supabase.removeChannel(memberChannel)
        }
    }, [user, currentWorkspace, fetchWorkspaces])

    const createNote = async (parentId: string | null = null) => {
        if (!user || !currentWorkspace) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("notes")
                .insert({
                    user_id: user.id,
                    title: "",
                    content: [],
                    parent_id: parentId,
                    workspace_id: currentWorkspace.id
                })
                .select()
                .single()

            if (error) throw error

            // Broadcast to all workspace members using the active channel
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'note-created',
                    payload: data
                })
            }

            window.dispatchEvent(new CustomEvent('notion:insert-subpage', {
                detail: { id: data.id, title: data.title, parentId }
            }))

            setNotes(prev => [...prev, data])
            router.push(`/note/${data.id}`)
            toast.success(parentId ? "하위 페이지가 생성되었습니다." : "새 노트가 생성되었습니다.")
        } catch (err) {
            console.error("Error creating note:", err)
            toast.error("노트 생성 중 오류가 발생했습니다.")
        }
    }

    const createWorkspace = async () => {
        if (!user || !newWorkspaceName.trim()) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("note_workspaces")
                .insert({
                    user_id: user.id,
                    name: newWorkspaceName.trim(),
                    icon: "folder"
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
            setCurrentWorkspace(data)
            setNewWorkspaceName("")
            setIsCreatingWorkspace(false)
            setShowWorkspaceMenu(false)
            toast.success("워크스페이스가 생성되었습니다.")
        } catch (err) {
            console.error("Error creating workspace:", err)
            toast.error("워크스페이스 생성 중 오류가 발생했습니다.")
        }
    }

    const updateWorkspace = async (id: string, name: string) => {
        if (!name.trim()) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("note_workspaces")
                .update({ name: name.trim() })
                .eq("id", id)

            if (error) throw error

            setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name: name.trim() } : w))
            if (currentWorkspace?.id === id) {
                setCurrentWorkspace(prev => prev ? { ...prev, name: name.trim() } : null)
            }
            setEditingWorkspace(null)
            toast.success("워크스페이스 이름이 변경되었습니다.")
        } catch (err) {
            console.error("Error updating workspace:", err)
            toast.error("워크스페이스 수정 중 오류가 발생했습니다.")
        }
    }

    const deleteWorkspace = async (id: string) => {
        if (workspaces.length <= 1) {
            toast.error("최소 하나의 워크스페이스가 필요합니다.")
            return
        }
        if (!confirm("이 워크스페이스와 모든 문서를 삭제하시겠습니까?")) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("note_workspaces")
                .delete()
                .eq("id", id)

            if (error) throw error

            const remaining = workspaces.filter(w => w.id !== id)
            setWorkspaces(remaining)
            if (currentWorkspace?.id === id && remaining.length > 0) {
                setCurrentWorkspace(remaining[0])
            }
            toast.success("워크스페이스가 삭제되었습니다.")
        } catch (err) {
            console.error("Error deleting workspace:", err)
            toast.error("워크스페이스 삭제 중 오류가 발생했습니다.")
        }
    }

    const deleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("정말 이 노트를 삭제하시겠습니까? (하위 페이지도 모두 삭제됩니다)")) return

        const previousNotes = [...notes]
        setNotes(prev => prev.filter(n => n.id !== id && n.parent_id !== id))

        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("notes")
                .delete()
                .eq("id", id)

            if (error) throw error

            if (currentNoteId === id) {
                router.push("/note")
            }
            toast.success("노트가 삭제되었습니다.")
        } catch (err) {
            console.error("Error deleting note:", err)
            setNotes(previousNotes)
            toast.error("노트 삭제 중 오류가 발생했습니다.")
        }
    }

    const rootNotes = useMemo(() =>
        notes.filter(n => !n.parent_id && n.title.toLowerCase().includes(searchQuery.toLowerCase())),
        [notes, searchQuery]
    )

    // Get icon component for current workspace
    const WorkspaceIcon = currentWorkspace ? getIconComponent(currentWorkspace.icon) : Folder

    // Collapsed view
    if (isCollapsed) {
        return (
            <aside className="w-[52px] border-r border-neutral-900 bg-neutral-950 flex flex-col h-full transition-all duration-300 ease-in-out">
                <div className="p-2 space-y-2">
                    <button
                        onClick={onToggle}
                        className="w-full p-2 rounded-lg hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all flex items-center justify-center"
                        title="사이드바 열기"
                    >
                        <PanelLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => createNote(null)}
                        className="w-full p-2 rounded-lg hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all flex items-center justify-center"
                        title="새 노트 만들기"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-1.5 pb-4">
                    <div className="space-y-1">
                        {rootNotes.map(note => (
                            <button
                                key={note.id}
                                onClick={() => router.push(`/note/${note.id}`)}
                                className={cn(
                                    "w-full p-2 rounded-lg transition-all flex items-center justify-center relative",
                                    currentNoteId === note.id
                                        ? "bg-neutral-900 text-white"
                                        : "text-neutral-600 hover:bg-neutral-900/50 hover:text-neutral-400"
                                )}
                                title={note.title || "제목 없는 노트"}
                            >
                                <FileText className="w-4 h-4" />
                                {presenceStates[note.id] && (
                                    <div className="absolute right-1 top-1 flex flex-col gap-0.5">
                                        {presenceStates[note.id].slice(0, 3).map((presenceUser, idx) => (
                                            <div
                                                key={`${presenceUser.userId}-${idx}`}
                                                className="w-1 h-1 rounded-full border-[0.5px] border-black/50"
                                                style={{ backgroundColor: presenceUser.color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-2 border-t border-neutral-900">
                    <button
                        onClick={() => {
                            onToggle()
                            setTimeout(() => setShowWorkspaceMenu(true), 300)
                        }}
                        className="w-full p-2 rounded-lg bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-800/50 flex items-center justify-center transition-all"
                        title={currentWorkspace?.name || "워크스페이스"}
                    >
                        <WorkspaceIcon
                            className="w-4 h-4"
                            style={{ color: currentWorkspace?.color || "#6B7280" }}
                        />
                    </button>
                </div>
            </aside>
        )
    }

    // Expanded view
    return (
        <aside className="w-[280px] border-r border-neutral-900 bg-neutral-950 flex flex-col h-full transition-all duration-300 ease-in-out">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center px-0.5">
                        <img src="/remark.svg" alt="Remark" className="h-4 w-auto opacity-70" />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => createNote(null)}
                            className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all"
                            title="새 노트 만들기"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onToggle}
                            className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-500 hover:text-white transition-all"
                            title="사이드바 닫기"
                        >
                            <PanelLeftClose className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-700" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-900/40 border border-neutral-900 rounded-lg pl-9 pr-4 py-1.5 text-[12px] text-white placeholder:text-neutral-700 outline-none focus:border-neutral-800 transition-all font-suit"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
                {isLoading ? (
                    <div className="px-4 py-8 flex flex-col items-center gap-2 opacity-10">
                        <div className="w-6 h-6 rounded-full border border-white border-t-transparent animate-spin" />
                    </div>
                ) : rootNotes.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-800">
                        {searchQuery ? "No matches" : "Empty Space"}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {rootNotes.map(note => (
                            <NoteItem
                                key={note.id}
                                note={note}
                                level={0}
                                allNotes={notes}
                                currentNoteId={currentNoteId}
                                presenceStates={presenceStates}
                                onSelect={(id) => router.push(`/note/${id}`)}
                                onDelete={deleteNote}
                                onCreateSubPage={(parentId) => createNote(parentId)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Workspace Selector */}
            <div className="p-3 border-t border-neutral-900 relative">
                <button
                    onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                    className="w-full px-3 py-2.5 rounded-lg bg-neutral-900/30 hover:bg-neutral-900/50 border border-neutral-800/50 flex items-center gap-3 transition-all group"
                >
                    <WorkspaceIcon
                        className="w-4 h-4"
                        style={{ color: currentWorkspace?.color || "#6B7280" }}
                    />
                    <span className="flex-1 text-left text-[12px] font-semibold text-neutral-300 truncate">
                        {currentWorkspace?.name || "워크스페이스 선택"}
                    </span>
                    <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-neutral-600 transition-transform duration-200",
                        showWorkspaceMenu && "rotate-180"
                    )} />
                </button>

                <AnimatePresence>
                    {showWorkspaceMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-3 right-3 mb-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50"
                        >
                            <div className="p-2 border-b border-neutral-800 flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-2">Workspaces</span>
                                <button
                                    onClick={() => {
                                        setShowWorkspaceMenu(false)
                                        router.push("/note/workspace")
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all"
                                    title="워크스페이스 설정"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                {workspaces.map(ws => {
                                    const WsIcon = getIconComponent(ws.icon)
                                    return (
                                        <div
                                            key={ws.id}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group/ws transition-all",
                                                currentWorkspace?.id === ws.id
                                                    ? "bg-neutral-800"
                                                    : "hover:bg-neutral-800/50"
                                            )}
                                        >
                                            {editingWorkspace === ws.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <WsIcon className="w-4 h-4" style={{ color: ws.color }} />
                                                    <input
                                                        type="text"
                                                        value={editWorkspaceName}
                                                        onChange={(e) => setEditWorkspaceName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') updateWorkspace(ws.id, editWorkspaceName)
                                                            if (e.key === 'Escape') setEditingWorkspace(null)
                                                        }}
                                                        className="flex-1 bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-[12px] text-white outline-none"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => updateWorkspace(ws.id, editWorkspaceName)}
                                                        className="p-1 rounded hover:bg-neutral-700 text-emerald-400"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingWorkspace(null)}
                                                        className="p-1 rounded hover:bg-neutral-700 text-neutral-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div
                                                        className="flex-1 flex items-center gap-2"
                                                        onClick={async () => {
                                                            if (ws.id === currentWorkspace?.id) {
                                                                setShowWorkspaceMenu(false)
                                                                return
                                                            }
                                                            // Fetch first note of the new workspace
                                                            const supabase = getSupabase()
                                                            const { data: firstNote } = await supabase
                                                                .from("notes")
                                                                .select("id")
                                                                .eq("workspace_id", ws.id)
                                                                .eq("is_archived", false)
                                                                .is("parent_id", null)
                                                                .order("created_at", { ascending: true })
                                                                .limit(1)
                                                                .single()

                                                            setCurrentWorkspace(ws)
                                                            setShowWorkspaceMenu(false)

                                                            if (firstNote) {
                                                                router.push(`/note/${firstNote.id}`)
                                                            } else {
                                                                router.push("/note")
                                                            }
                                                        }}
                                                    >
                                                        <WsIcon className="w-4 h-4" style={{ color: ws.color }} />
                                                        <span className="text-[12px] font-medium text-neutral-300 truncate">{ws.name}</span>
                                                        <span className="text-[10px] text-neutral-600 ml-1">{workspaceCounts[ws.id] ?? 0}</span>
                                                        {currentWorkspace?.id === ws.id && (
                                                            <Check className="w-3 h-3 text-emerald-400 ml-auto" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/ws:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditingWorkspace(ws.id)
                                                                setEditWorkspaceName(ws.name)
                                                            }}
                                                            className="p-1 rounded hover:bg-neutral-700 text-neutral-500 hover:text-white"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteWorkspace(ws.id)
                                                            }}
                                                            className="p-1 rounded hover:bg-neutral-700 text-neutral-500 hover:text-red-400"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="p-2 border-t border-neutral-800">
                                {isCreatingWorkspace ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newWorkspaceName}
                                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') createWorkspace()
                                                if (e.key === 'Escape') {
                                                    setIsCreatingWorkspace(false)
                                                    setNewWorkspaceName("")
                                                }
                                            }}
                                            placeholder="워크스페이스 이름"
                                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-[12px] text-white placeholder:text-neutral-600 outline-none focus:border-neutral-600"
                                            autoFocus
                                        />
                                        <button
                                            onClick={createWorkspace}
                                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsCreatingWorkspace(false)
                                                setNewWorkspaceName("")
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsCreatingWorkspace(true)}
                                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-neutral-800/50 text-neutral-500 hover:text-white transition-all"
                                    >
                                        <FolderPlus className="w-4 h-4" />
                                        <span className="text-[12px] font-medium">새 워크스페이스</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </aside>
    )
}
