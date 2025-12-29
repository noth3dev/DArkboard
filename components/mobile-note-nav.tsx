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
}

export function MobileNoteNav({ workspaceId, onWorkspaceChange }: MobileNoteNavProps) {
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
            <header className="fixed top-0 left-0 right-0 h-14 bg-black/80 backdrop-blur-md border-b border-neutral-900 z-40 flex items-center px-4 gap-3">
                <button
                    onClick={() => setIsOpen(true)}
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

            <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[60]" />
                    <Drawer.Content className="bg-[#050505] flex flex-col rounded-t-[32px] h-[85vh] fixed bottom-0 left-0 right-0 z-[70] outline-none border-t border-neutral-800">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-neutral-800 my-4" />

                        <div className="p-6 pt-0 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Workspace Switcher in Drawer */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Workspace</label>
                                <button
                                    onClick={() => setShowWorkspaceSelector(!showWorkspaceSelector)}
                                    className="w-full flex items-center gap-3 p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-2xl hover:bg-neutral-900 transition-all text-left"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center">
                                        <WorkspaceIcon className="w-4 h-4" style={{ color: currentWorkspace?.color }} />
                                    </div>
                                    <span className="flex-1 text-[13px] font-bold text-neutral-200">{currentWorkspace?.name}</span>
                                    <ChevronDown className={cn("w-4 h-4 text-neutral-600 transition-transform", showWorkspaceSelector && "rotate-180")} />
                                </button>

                                {showWorkspaceSelector && (
                                    <div className="grid gap-2 p-1">
                                        {workspaces.map(ws => (
                                            <button
                                                key={ws.id}
                                                onClick={() => {
                                                    onWorkspaceChange(ws.id)
                                                    setShowWorkspaceSelector(false)
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl transition-all",
                                                    workspaceId === ws.id ? "bg-neutral-800" : "hover:bg-neutral-900/50"
                                                )}
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center">
                                                    {getIconComponent(ws.icon)({ className: "w-4 h-4", style: { color: ws.color } })}
                                                </div>
                                                <span className="flex-1 text-xs font-medium text-neutral-400">{ws.name}</span>
                                                {workspaceId === ws.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700" />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-neutral-900/40 border border-neutral-800/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-neutral-700 outline-none focus:border-neutral-700"
                                />
                            </div>

                            {/* Document Tree */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Documents</label>
                                {isLoading ? (
                                    <div className="py-12 flex justify-center opacity-20">
                                        <div className="w-6 h-6 rounded-full border border-white border-t-transparent animate-spin" />
                                    </div>
                                ) : rootNotes.length === 0 ? (
                                    <div className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-800">No documents found</div>
                                ) : (
                                    <div className="space-y-1">
                                        {rootNotes.map(note => (
                                            <NoteItem
                                                key={note.id}
                                                note={note}
                                                level={0}
                                                allNotes={notes}
                                                currentNoteId={currentNoteId}
                                                presenceStates={{}} // Simplified for mobile drawer
                                                onSelect={(id) => {
                                                    router.push(`/note/${id}`)
                                                    setIsOpen(false)
                                                }}
                                                onDelete={() => { }} // Disabled in quick view
                                                onCreateSubPage={(parentId) => createNote(parentId)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-neutral-900 flex gap-3">
                            <button
                                onClick={() => router.push("/note/workspace")}
                                className="flex-1 flex items-center justify-center gap-2 p-4 bg-neutral-900 text-neutral-400 hover:text-white rounded-2xl transition-all font-bold text-xs uppercase tracking-widest"
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </button>
                            <button
                                onClick={() => createNote()}
                                className="flex-1 flex items-center justify-center gap-2 p-4 bg-white text-black hover:bg-neutral-200 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4" />
                                New Note
                            </button>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
