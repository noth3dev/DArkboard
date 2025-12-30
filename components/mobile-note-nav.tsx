"use client"
import { useState, useCallback, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
    Menu,
    ChevronRight,
    FileText,
    Search,
    Plus,
    Settings,
    ChevronDown,
    Check
} from "lucide-react"
import { Drawer } from "vaul"
import { cn } from "@/lib/utils"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { getIconComponent, NoteItem } from "./note-sidebar"

interface MobileNoteNavProps {
    workspaceId?: string
    onWorkspaceChange: (id: string) => void
    onToggleSidebar?: () => void
}

export function MobileNoteNav({ workspaceId, onWorkspaceChange, onToggleSidebar }: MobileNoteNavProps) {
    const { user, profileName } = useAuth()
    const router = useRouter()
    const params = useParams()
    const currentNoteId = params.noteId as string

    const [isOpen, setIsOpen] = useState(false)
    const [notes, setNotes] = useState<any[]>([])
    const [workspaces, setWorkspaces] = useState<any[]>([])
    const [currentWorkspace, setCurrentWorkspace] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false)

    const fetchWorkspaces = useCallback(async () => {
        if (!user) return
        const supabase = getSupabase()
        const { data } = await supabase.from("note_workspaces").select("*")
        if (data) {
            setWorkspaces(data)
            const active = data.find((w: any) => w.id === workspaceId) || data[0]
            setCurrentWorkspace(active)
            if (active && active.id !== workspaceId) onWorkspaceChange(active.id)
        }
    }, [user, workspaceId, onWorkspaceChange])

    const fetchNotes = useCallback(async () => {
        if (!user || !workspaceId) return
        setIsLoading(true)
        const supabase = getSupabase()
        const { data } = await supabase
            .from("notes")
            .select("id, title, parent_id, is_archived, workspace_id, user_id")
            .eq("workspace_id", workspaceId)
            .eq("is_archived", false)
            .order("created_at", { ascending: true })
        setNotes(data || [])
        setIsLoading(false)
    }, [user, workspaceId])

    useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])
    useEffect(() => { fetchNotes() }, [fetchNotes])

    const createNote = async (parentId: string | null = null) => {
        if (!user || !workspaceId) return
        const supabase = getSupabase()
        const { data, error } = await supabase.from("notes").insert({
            user_id: user.id,
            title: "",
            content: [],
            parent_id: parentId,
            workspace_id: workspaceId
        }).select().single()
        if (!error && data) {
            setIsOpen(false)
            router.push(`/note/${data.id}`)
            toast.success("새 노트가 생성되었습니다.")
        }
    }

    const rootNotes = notes.filter(n => !n.parent_id && n.title.toLowerCase().includes(searchQuery.toLowerCase()))
    const WorkspaceIcon = currentWorkspace ? getIconComponent(currentWorkspace.icon) : Menu
    const currentNote = notes.find(n => n.id === currentNoteId)

    return (
        <div className="lg:hidden">
            <header className="fixed top-[65px] left-0 right-0 h-14 bg-black/80 backdrop-blur-md border-b border-neutral-900 z-[45] flex items-center px-4 gap-3">
                <button
                    onClick={() => onToggleSidebar?.()}
                    className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${currentWorkspace?.color}20` || "#1a1a1a" }}
                    >
                        <WorkspaceIcon className="w-3 h-3" style={{ color: currentWorkspace?.color }} />
                    </div>
                    <ChevronRight className="w-3 h-3 text-neutral-700" />
                    <span className="text-sm font-bold text-neutral-200 truncate font-suit">
                        {currentNote?.title || "Select Note"}
                    </span>
                </div>

                <button
                    onClick={() => createNote()}
                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </header>
        </div>
    )
}
