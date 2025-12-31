"use client"

import {
    BlockNoteSchema,
    defaultBlockSpecs
} from "@blocknote/core"
import "@blocknote/core/fonts/inter.css"
import {
    useCreateBlockNote,
    getDefaultReactSlashMenuItems,
    SuggestionMenuController,
    createReactBlockSpec
} from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { NotebookTabs, FileText, Users, Loader2, Table, Image as ImageIcon, Film, Upload, CheckCircle2, CloudUpload, AlertCircle, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import * as Y from "yjs"
import { SupabaseProvider } from "@/lib/yjs-supabase-provider"
import { NoteSkeleton } from "@/components/note-skeleton"
import {
    uploadNoteAttachment,
    syncAttachments,
    isAllowedFileType,
    isFileSizeValid,
    isImageFile,
    isVideoFile,
    MAX_FILE_SIZE
} from "@/lib/note-attachments"
import { ImageBlock, VideoBlock, extractAttachmentIds } from "@/components/media-blocks"

interface NotionEditorProps {
    noteId: string
    initialContent?: any
    initialTitle?: string
    initialUpdatedAt?: string
    workspaceId?: string
    onTitleChange?: (title: string) => void
}

type CollaborationUser = {
    id: string
    name: string
    color: string
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

const NoteBlockRender = ({ block, editor }: any) => {
    const router = useRouter()
    const { noteId } = block.props
    const [currentTitle, setCurrentTitle] = useState(block.props.title)

    useEffect(() => {
        if (!noteId) return
        const fetchTitle = async () => {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("notes")
                .select("title, is_archived")
                .eq("id", noteId)
                .single()
            if (!error && data && !data.is_archived && data.title) {
                setCurrentTitle(data.title)
                try {
                    editor.updateBlock(block.id, { props: { ...block.props, title: data.title } })
                } catch (e) { /* Ignore */ }
            }
        }
        fetchTitle()
    }, [noteId, editor, block.id, block.props])

    useEffect(() => {
        if (!noteId) return
        const supabase = getSupabase()
        const channel = supabase
            .channel(`note-block-${noteId}`)
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'notes', filter: `id=eq.${noteId}`
            }, (payload: any) => {
                const newTitle = payload.new.title
                if (newTitle) {
                    setCurrentTitle(newTitle)
                    setTimeout(() => {
                        try {
                            editor.updateBlock(block.id, { props: { ...block.props, title: newTitle } })
                        } catch (e) { /* Ignore */ }
                    }, 0)
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [noteId, editor, block.id])

    useEffect(() => {
        if (!noteId) return
        const handleLocalTitleChange = (e: CustomEvent) => {
            const { id, title: newTitle } = e.detail
            if (id === noteId && newTitle !== currentTitle) {
                setCurrentTitle(newTitle)
                try {
                    editor.updateBlock(block.id, { props: { ...block.props, title: newTitle } })
                } catch (e) { /* Ignore */ }
            }
        }
        window.addEventListener('note:title-change', handleLocalTitleChange as EventListener)
        return () => window.removeEventListener('note:title-change', handleLocalTitleChange as EventListener)
    }, [noteId, currentTitle, editor, block.id])

    return (
        <div className="w-fit inline-flex my-1 select-none" contentEditable={false}>
            <div
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/note/${noteId}`) }}
                className="group flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
            >
                <div className="flex items-center justify-center p-0.5 rounded bg-neutral-800 group-hover:bg-neutral-700 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <span className="text-[14px] text-neutral-300 group-hover:text-blue-200 border-b border-transparent group-hover:border-blue-500/30 transition-all font-medium">
                    {currentTitle || "제목 없는 하위 페이지"}
                </span>
            </div>
        </div>
    )
}

function CollaboratorAvatar({ user, isYou }: { user: CollaborationUser; isYou: boolean }) {
    return (
        <div className="relative group" title={isYou ? `${user.name} (나)` : user.name}>
            <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-black transition-transform hover:scale-110"
                style={{ backgroundColor: user.color }}
            >
                {user.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            {isYou && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
            )}
        </div>
    )
}

function CollaboratorsBar({ collaborators, currentUserId }: { collaborators: CollaborationUser[]; currentUserId: string }) {
    if (collaborators.length <= 1) return null
    const maxVisible = 5
    const visible = collaborators.slice(0, maxVisible)
    const overflow = collaborators.length - maxVisible

    return (
        <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-neutral-600 mr-1" />
            <div className="flex items-center -space-x-2">
                {visible.map((collab, idx) => (
                    <CollaboratorAvatar key={`${collab.id}-${idx}`} user={collab} isYou={collab.id === currentUserId} />
                ))}
                {overflow > 0 && (
                    <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-black flex items-center justify-center text-[10px] font-bold text-neutral-400">
                        +{overflow}
                    </div>
                )}
            </div>
        </div>
    )
}

// Inner editor component - manages its own collaborators state
function CollaborativeEditor({
    noteId,
    initialContent,
    title,
    setTitle,
    onTitleChange,
    yDoc,
    provider,
    collaborationUser,
    currentUserId,
    workspaceId,
    initialUpdatedAt,
}: {
    noteId: string
    initialContent?: any
    title: string
    setTitle: (title: string) => void
    onTitleChange?: (title: string) => void
    yDoc: Y.Doc
    provider: SupabaseProvider
    collaborationUser: CollaborationUser
    currentUserId: string
    workspaceId?: string
    initialUpdatedAt?: string
}) {
    const { user } = useAuth()
    const router = useRouter()
    const [documentContent, setDocumentContent] = useState<any>(null)
    // Collaborators state is now inside this component
    const [collaborators, setCollaborators] = useState<CollaborationUser[]>([])
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved")
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [hasLocalBackup, setHasLocalBackup] = useState(false)
    const [backupData, setBackupData] = useState<{ content: any, title: string, timestamp: number } | null>(null)

    // Character counter state
    const [includeWhitespace, setIncludeWhitespace] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedCount, setSelectedCount] = useState(0)
    const [showCounterOptions, setShowCounterOptions] = useState(false)

    const schema = useMemo(() => {
        const NoteBlockSpec = createReactBlockSpec(
            { type: "note", propSchema: { noteId: { default: "" }, title: { default: "Untitled" } }, content: "none" },
            { render: NoteBlockRender }
        )
        return BlockNoteSchema.create({
            blockSpecs: {
                ...defaultBlockSpecs,
                note: NoteBlockSpec(),
                customImage: ImageBlock(),
                customVideo: VideoBlock()
            }
        }) as any
    }, [])

    // Create editor with collaboration - don't pass initialContent as Yjs manages document state
    const editor = useCreateBlockNote({
        schema,
        // When using collaboration, Yjs manages document state - don't pass initialContent to avoid conflicts
        collaboration: {
            provider: provider,
            fragment: yDoc.getXmlFragment("blocknote"),
            user: { name: collaborationUser.name, color: collaborationUser.color },
        },
    })

    // Load initial content if Yjs document is empty (first client to open)
    const hasLoadedInitialContent = useRef(false)
    useEffect(() => {
        if (hasLoadedInitialContent.current) return
        if (!editor) return

        // Check local backup first
        const localBackup = localStorage.getItem(`notable-backup-${noteId}`)
        if (localBackup) {
            try {
                const parsed = JSON.parse(localBackup)
                setBackupData(parsed)

                // Only show backup if it's newer than the DB state by at least 5 seconds
                const dbTime = initialUpdatedAt ? new Date(initialUpdatedAt).getTime() : 0
                if (parsed.timestamp > dbTime + 5000) {
                    setHasLocalBackup(true)
                }
            } catch (e) {
                console.error("Failed to parse local backup:", e)
            }
        }

        if (!initialContent) return

        // Check if Yjs document is empty (no blocks or just one empty block)
        const currentBlocks = editor.document
        const firstBlock = currentBlocks[0] as any
        const isEmpty = currentBlocks.length === 0 ||
            (currentBlocks.length === 1 &&
                firstBlock?.type === "paragraph" &&
                (!firstBlock?.content || firstBlock?.content?.length === 0))

        if (isEmpty && Array.isArray(initialContent) && initialContent.length > 0) {
            // Small delay to ensure editor is fully initialized
            setTimeout(() => {
                try {
                    editor.replaceBlocks(editor.document, initialContent)
                    hasLoadedInitialContent.current = true
                } catch (err) {
                    console.error("Failed to load initial content:", err)
                }
            }, 100)
        } else {
            hasLoadedInitialContent.current = true
        }
    }, [editor, initialContent, noteId])

    const restoreBackup = useCallback(() => {
        if (!backupData || !editor) return
        try {
            editor.replaceBlocks(editor.document, backupData.content)
            setTitle(backupData.title)
            onTitleChange?.(backupData.title)
            setHasLocalBackup(false)
            toast.success("백업 데이터가 복구되었습니다.")
        } catch (err) {
            console.error("Failed to restore backup:", err)
            toast.error("백업 복구에 실패했습니다.")
        }
    }, [backupData, editor, setTitle, onTitleChange])

    // Setup awareness listener AFTER editor is created (in useEffect, not during render)
    useEffect(() => {
        const updateCollaborators = () => {
            const states = provider.awareness.getStates()
            const userMap = new Map<string, CollaborationUser>()
            states.forEach((state: any) => {
                if (state?.user?.id) userMap.set(state.user.id, state.user)
            })
            setCollaborators(Array.from(userMap.values()))
        }

        provider.awareness.on('change', updateCollaborators)
        // Initial update after a small delay to avoid render-time updates
        const timeout = setTimeout(updateCollaborators, 100)

        return () => {
            clearTimeout(timeout)
            provider.awareness.off('change', updateCollaborators)
        }
    }, [provider])

    const saveContent = useCallback(async (content: any, updatedTitle: string) => {
        if (!user || !noteId) return
        setSaveStatus("saving")
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("notes")
                .update({ title: updatedTitle, content, updated_at: new Date().toISOString() })
                .eq("id", noteId)

            if (error) throw error

            setSaveStatus("saved")
            setLastSaved(new Date())

            const noteBlockIds = new Set<string>()
            const extractNoteBlocks = (blocks: any[]) => {
                for (const block of blocks) {
                    if (block.type === "note" && block.props?.noteId) noteBlockIds.add(block.props.noteId)
                    if (block.children?.length) extractNoteBlocks(block.children)
                }
            }
            if (Array.isArray(content)) extractNoteBlocks(content)

            const { data: childNotes, error: childError } = await supabase
                .from("notes").select("id, is_archived").eq("parent_id", noteId)
            if (childError) throw childError

            if (childNotes?.length) {
                const toArchive = childNotes.filter((n: any) => !n.is_archived && !noteBlockIds.has(n.id))
                const toUnarchive = childNotes.filter((n: any) => n.is_archived && noteBlockIds.has(n.id))
                if (toArchive.length) await supabase.from("notes").update({ is_archived: true, updated_at: new Date().toISOString() }).in("id", toArchive.map((n: any) => n.id))
                if (toUnarchive.length) await supabase.from("notes").update({ is_archived: false, updated_at: new Date().toISOString() }).in("id", toUnarchive.map((n: any) => n.id))
            }

            // Sync attachments - supports Ctrl+Z by using soft delete
            if (Array.isArray(content)) {
                const activeAttachmentIds = extractAttachmentIds(content)
                await syncAttachments(noteId, activeAttachmentIds)
            }
        } catch (err) {
            console.error("Error saving note:", err)
            setSaveStatus("error")
        }
    }, [user, noteId])

    // File upload handler - for paste and drag/drop
    const handleFileUpload = useCallback(async (files: FileList | File[]) => {
        if (!user || !noteId) return

        const fileArray = Array.from(files)
        for (const file of fileArray) {
            // Validate file
            if (!isAllowedFileType(file)) {
                toast.error(`지원하지 않는 파일 형식입니다: ${file.name}`)
                continue
            }
            if (!isFileSizeValid(file)) {
                toast.error(`파일이 너무 큽니다 (최대 50MB): ${file.name}`)
                continue
            }

            // Show uploading toast
            const toastId = toast.loading(`업로드 중: ${file.name}`)

            try {
                const result = await uploadNoteAttachment({
                    noteId,
                    workspaceId,
                    userId: user.id,
                    file
                })

                if (result.success && result.attachment && result.url) {
                    // Insert appropriate block
                    const currentBlock = editor.getTextCursorPosition().block

                    if (isImageFile(file)) {
                        editor.insertBlocks([{
                            type: "customImage",
                            props: {
                                attachmentId: result.attachment.id,
                                url: result.url,
                                caption: "",
                                type: "image",
                                fileName: file.name
                            }
                        } as any], currentBlock, "after")
                    } else if (isVideoFile(file)) {
                        editor.insertBlocks([{
                            type: "customVideo",
                            props: {
                                attachmentId: result.attachment.id,
                                url: result.url,
                                caption: "",
                                type: "video",
                                fileName: file.name
                            }
                        } as any], currentBlock, "after")
                    }

                    toast.success(`업로드 완료: ${file.name}`, { id: toastId })
                } else {
                    toast.error(`업로드 실패: ${result.error}`, { id: toastId })
                }
            } catch (err) {
                console.error("File upload error:", err)
                toast.error(`업로드 실패: ${file.name}`, { id: toastId })
            }
        }
    }, [user, noteId, workspaceId, editor])

    // File input ref for slash menu
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingFileType, setPendingFileType] = useState<"image" | "video" | null>(null)

    const triggerFileUpload = useCallback((type: "image" | "video") => {
        setPendingFileType(type)
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === "image"
                ? "image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                : "video/mp4,video/webm,video/quicktime"
            fileInputRef.current.click()
        }
    }, [])

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files)
        }
        e.target.value = '' // Reset for next upload
    }, [handleFileUpload])

    const insertPageBlock = useCallback((id: string, pageTitle: string) => {
        if (!editor) return
        const currentBlock = editor.getTextCursorPosition().block
        editor.insertBlocks([{ type: "note", props: { noteId: id, title: pageTitle || "제목 없는 하위 페이지" } } as any], currentBlock, "after")
    }, [editor])

    const createSubPage = useCallback(async () => {
        if (!user || !noteId) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.from("notes").insert({
                user_id: user.id,
                title: "",
                content: [],
                parent_id: noteId,
                workspace_id: workspaceId
            }).select().single()
            if (error) throw error

            // Broadcast to all workspace members
            if (workspaceId) {
                const broadcastChannel = supabase.channel(`notes_changes_${workspaceId}`)
                broadcastChannel.subscribe((status: string) => {
                    if (status === 'SUBSCRIBED') {
                        broadcastChannel.send({
                            type: 'broadcast',
                            event: 'note-created',
                            payload: data
                        }).then(() => {
                            // Don't remove channel if it might be used by sidebar in same tab
                            // But for safety across tabs, sending is enough
                        })
                    }
                })
            }

            insertPageBlock(data.id, data.title)
            await saveContent(editor.document, title)
            router.push(`/note/${data.id}`)
            toast.success("하위 페이지가 생성되었습니다.")
        } catch (err) { console.error("Error creating sub-page:", err); toast.error("하위 페이지 생성 중 오류가 발생했습니다.") }
    }, [user, noteId, workspaceId, router, editor, title, saveContent, insertPageBlock])

    useEffect(() => {
        const handleExternalInsert = (e: any) => {
            const { id, title: newTitle, parentId } = e.detail
            if (parentId === noteId) { insertPageBlock(id, newTitle); saveContent(editor.document, title) }
        }
        window.addEventListener('notion:insert-subpage', handleExternalInsert)
        return () => window.removeEventListener('notion:insert-subpage', handleExternalInsert)
    }, [noteId, insertPageBlock, editor, saveContent, title])

    useEffect(() => {
        if (!user || !noteId) return
        const supabase = getSupabase()
        const channel = supabase.channel(`note-realtime-${noteId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notes', filter: `id=eq.${noteId}` }, (payload: any) => {
                if (payload.new.title !== title) setTitle(payload.new.title)
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user, noteId, title, setTitle])

    useEffect(() => {
        const contentToSave = documentContent || editor.document
        if (contentToSave) {
            // Immediate local backup
            localStorage.setItem(`notable-backup-${noteId}`, JSON.stringify({
                content: contentToSave,
                title: title,
                timestamp: Date.now()
            }))
        }

        const timeout = setTimeout(() => { if (contentToSave) saveContent(contentToSave, title) }, 1000)
        return () => clearTimeout(timeout)
    }, [documentContent, title, saveContent, editor.document, noteId])

    // Prevent accidental exit while saving
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveStatus === "saving") {
                e.preventDefault()
                e.returnValue = ""
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [saveStatus])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value
        setTitle(newTitle)
        onTitleChange?.(newTitle)
        window.dispatchEvent(new CustomEvent('note:title-change', { detail: { id: noteId, title: newTitle } }))
    }

    // Character counting logic
    const getTextFromBlocks = useCallback((blocks: any[]): string => {
        let text = ""
        for (const block of blocks) {
            if (block.content && Array.isArray(block.content)) {
                for (const content of block.content) {
                    if (content.type === "text") {
                        text += content.text
                    }
                }
            }
            if (block.type === "table") {
                const tableContent = block.props?.content
                if (tableContent && typeof tableContent === "object") {
                    const rows = Object.values(tableContent)
                    for (const row of rows) {
                        if (Array.isArray(row)) {
                            for (const cell of row) {
                                text += getTextFromBlocks(cell)
                            }
                        }
                    }
                }
            }
            if (block.children && block.children.length > 0) {
                text += getTextFromBlocks(block.children)
            }
            // Add a newline after each block except the last one (approximate)
            text += "\n"
        }
        return text
    }, [])

    useEffect(() => {
        if (!editor) return

        const updateCounts = () => {
            const fullText = getTextFromBlocks(editor.document)
            const selection = window.getSelection()?.toString() || ""

            if (includeWhitespace) {
                setTotalCount(fullText.trim().length)
                setSelectedCount(selection.length)
            } else {
                setTotalCount(fullText.replace(/\s/g, "").length)
                setSelectedCount(selection.replace(/\s/g, "").length)
            }
        }

        // Initial update
        updateCounts()

        // Handle document changes
        const unbind = editor.onChange(() => {
            updateCounts()
        })

        // Handle selection changes
        const onSelectionChange = () => {
            updateCounts()
        }

        document.addEventListener("selectionchange", onSelectionChange)

        return () => {
            unbind()
            document.removeEventListener("selectionchange", onSelectionChange)
        }
    }, [editor, getTextFromBlocks, includeWhitespace])

    return (
        <>
            {/* Hidden file input for slash menu uploads */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                multiple
            />

            {hasLocalBackup && backupData && (
                <div className="flex items-center justify-between px-4 py-2 mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 text-sm text-blue-200">
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        <span>저장되지 않은 이전 작업 내용이 있습니다. ({new Date(backupData.timestamp).toLocaleString()})</span>
                    </div>
                    <button
                        onClick={restoreBackup}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-md transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        복구하기
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    {collaborators.length > 1 && (
                        <CollaboratorsBar collaborators={collaborators} currentUserId={currentUserId} />
                    )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-medium transition-all duration-300">
                    {saveStatus === "saving" && (
                        null
                    )}
                    {saveStatus === "saved" && lastSaved && (
                        null
                    )}
                    {saveStatus === "error" && (
                        <div className="flex items-center gap-1.5 text-rose-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>저장 실패 (재시도 중)</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="제목 없는 노트"
                    className="w-full bg-transparent text-3xl lg:text-5xl font-black outline-none placeholder:text-neutral-900 tracking-tighter"
                />
            </div>

            <div
                className="-mx-4 lg:-mx-12"
                onDrop={(e) => {
                    // Handle file drops
                    if (e.dataTransfer?.files?.length > 0) {
                        const hasMedia = Array.from(e.dataTransfer.files).some(
                            f => isImageFile(f) || isVideoFile(f)
                        )
                        if (hasMedia) {
                            e.preventDefault()
                            handleFileUpload(e.dataTransfer.files)
                        }
                    }
                }}
                onDragOver={(e) => {
                    // Allow drops for files
                    if (e.dataTransfer?.types?.includes('Files')) {
                        e.preventDefault()
                    }
                }}
                onPaste={(e) => {
                    // Handle paste from clipboard
                    const items = e.clipboardData?.items
                    if (items) {
                        const files: File[] = []
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i]
                            if (item.kind === 'file') {
                                const file = item.getAsFile()
                                if (file && (isImageFile(file) || isVideoFile(file))) {
                                    files.push(file)
                                }
                            }
                        }
                        if (files.length > 0) {
                            e.preventDefault()
                            handleFileUpload(files)
                        }
                    }
                }}
            >
                <BlockNoteView
                    editor={editor}
                    theme="dark"
                    className="bg-transparent"
                    slashMenu={false}
                    onChange={() => setDocumentContent(editor.document)}
                >
                    <SuggestionMenuController
                        triggerCharacter={"/"}
                        getItems={async (query) => {
                            const defaultItems = getDefaultReactSlashMenuItems(editor);

                            // Filter out default Media group items entirely to use our custom ones
                            // Also add "표" alias to the Table item
                            const filteredItems = defaultItems
                                .filter(item => item.group !== "Media")
                                .map(item => {
                                    if (item.title === "Table") {
                                        return {
                                            ...item,
                                            aliases: [...(item.aliases || []), "table", "표", "td", "tr"]
                                        };
                                    }
                                    return item;
                                });

                            // Custom media items with our upload handlers
                            const customItems = [
                                {
                                    title: "Page",
                                    onItemClick: () => createSubPage(),
                                    aliases: ["page", "subpage", "nested", "페이지", "문서"],
                                    group: "Basic Blocks",
                                    icon: <NotebookTabs className="w-4 h-4" />,
                                    subtext: "Create a sub-page nested inside this one.",
                                },
                                {
                                    title: "Image",
                                    onItemClick: () => triggerFileUpload("image"),
                                    aliases: ["image", "img", "photo", "picture", "이미지", "사진", "그림"],
                                    group: "Media",
                                    icon: <ImageIcon className="w-4 h-4" />,
                                    subtext: "Upload an image from your device.",
                                },
                                {
                                    title: "Video",
                                    onItemClick: () => triggerFileUpload("video"),
                                    aliases: ["video", "movie", "영상", "동영상", "비디오"],
                                    group: "Media",
                                    icon: <Film className="w-4 h-4" />,
                                    subtext: "Upload a video from your device.",
                                },
                            ];

                            return [...filteredItems, ...customItems].filter((item) =>
                                item.title.toLowerCase().startsWith(query.toLowerCase()) ||
                                item.aliases?.some((alias) => alias.toLowerCase().startsWith(query.toLowerCase()))
                            )
                        }
                        }
                    />
                </BlockNoteView>
            </div>

            {/* Character Counter UI */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                {showCounterOptions && (
                    <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-full px-1 py-1 flex items-center gap-1 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <button
                            onClick={() => { setIncludeWhitespace(true); setShowCounterOptions(false); }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${includeWhitespace ? "bg-neutral-100 text-black" : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"}`}
                        >
                            공백 포함
                        </button>
                        <button
                            onClick={() => { setIncludeWhitespace(false); setShowCounterOptions(false); }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${!includeWhitespace ? "bg-neutral-100 text-black" : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"}`}
                        >
                            공백 제외
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setShowCounterOptions(!showCounterOptions)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-neutral-900/60 backdrop-blur-md border border-neutral-800/50 rounded-full shadow-lg hover:bg-neutral-900/80 transition-all group"
                >
                    <div className="flex items-center gap-1 text-[13px] font-medium font-mono">
                        {selectedCount > 0 && (
                            <>
                                <span className="text-white drop-shadow-sm">{selectedCount.toLocaleString()}</span>
                                <span className="text-neutral-600">/</span>
                            </>
                        )}
                        <span className="text-neutral-500 group-hover:text-neutral-400 transition-colors">{totalCount.toLocaleString()}</span>
                    </div>
                </button>
            </div>
        </>
    )
}

export default function NotionEditor({
    noteId,
    initialContent,
    initialTitle,
    initialUpdatedAt,
    workspaceId,
    onTitleChange
}: NotionEditorProps) {
    const { user, profileName, presenceColor } = useAuth()
    const [title, setTitle] = useState(initialTitle || "")
    const [isReady, setIsReady] = useState(false)

    const yDocRef = useRef<Y.Doc | null>(null)
    const providerRef = useRef<SupabaseProvider | null>(null)

    const collaborationUser = useMemo<CollaborationUser | null>(() => {
        if (!user) return null
        return {
            id: user.id,
            name: profileName || user.email?.split("@")[0] || "Anonymous",
            color: presenceColor || getUserColor(user.id)
        }
    }, [user, profileName, presenceColor])

    const [isConnected, setIsConnected] = useState(false)

    // Effect 1: Manage Provider Lifecycle (Depends only on noteId)
    useEffect(() => {
        if (!noteId) return

        const yDoc = new Y.Doc()
        yDocRef.current = yDoc

        const supabase = getSupabase()
        const provider = new SupabaseProvider(yDoc, supabase, {
            channel: `homewark-note-${noteId}`,
        })
        providerRef.current = provider

        // Small delay to let initial sync happen
        const timeout = setTimeout(() => {
            setIsReady(true)
            setIsConnected(true)
        }, 500)

        return () => {
            clearTimeout(timeout)
            setIsReady(false)
            setIsConnected(false)
            provider.destroy()
            yDoc.destroy()
            yDocRef.current = null
            providerRef.current = null
        }
    }, [noteId])

    // Effect 2: Update Awareness (Depends on collaborationUser)
    useEffect(() => {
        if (providerRef.current && collaborationUser && isConnected) {
            providerRef.current.awareness.setLocalStateField('user', collaborationUser)
        }
    }, [collaborationUser, isConnected])



    // Loading state: Only show skeleton if we haven't established the initial connection for THIS noteId
    if (!isReady || !isConnected || !yDocRef.current || !providerRef.current || !collaborationUser) {
        return <NoteSkeleton />
    }

    return (
        <div className="min-h-full bg-black text-white p-6 lg:p-16 max-w-4xl mx-auto space-y-8">
            <CollaborativeEditor
                noteId={noteId}
                initialContent={initialContent}
                title={title}
                setTitle={setTitle}
                onTitleChange={onTitleChange}
                yDoc={yDocRef.current}
                provider={providerRef.current}
                collaborationUser={collaborationUser}
                currentUserId={user?.id || ""}
                workspaceId={workspaceId}
                initialUpdatedAt={initialUpdatedAt}
            />

            <style jsx global>{`
                .bn-container[data-theme="dark"] { background-color: transparent !important; }
                .bn-editor { padding-inline: 24px !important; background-color: transparent !important; min-height: 400px; }
                @media (min-width: 1024px) { .bn-editor { padding-inline: 48px !important; } }
                .bn-block-content { color: #d4d4d4 !important; background-color: transparent !important; }
                .bn-block-content[data-active] { color: #ffffff !important; }
                ::selection { background: rgba(255, 255, 255, 0.1) !important; }
                .bn-slash-menu { background-color: #0d0d0d !important; border: 1px solid #1a1a1a !important; box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important; border-radius: 12px !important; overflow: hidden !important; }
                .bn-slash-menu-item { color: #888 !important; padding: 8px 12px !important; }
                .bn-slash-menu-item[data-selected] { background-color: #1a1a1a !important; color: #fff !important; }
                .bn-side-menu { background-color: transparent !important; }
                .bn-button { background-color: transparent !important; border: none !important; color: #444 !important; }
                .bn-button:hover { background-color: #121212 !important; color: #888 !important; }
                .collaboration-cursor__caret { position: relative; margin-left: -1px; margin-right: -1px; border-left: 2px solid; border-right: none; word-break: normal; pointer-events: none; }
                .collaboration-cursor__label { position: absolute; top: -1.4em; left: -2px; font-size: 10px; font-weight: 600; line-height: 1; user-select: none; color: white; padding: 2px 6px; border-radius: 4px 4px 4px 0; white-space: nowrap; }
                
                /* Table Styles */
                .bn-table-content-wrapper { border: 1px solid #1a1a1a !important; border-radius: 8px !important; overflow: hidden !important; }
                .bn-table { border-collapse: collapse !important; width: 100% !important; background-color: #050505 !important; }
                .bn-table-cell { border: 1px solid #1a1a1a !important; padding: 8px 12px !important; color: #d4d4d4 !important; }
                .bn-table-cell[data-header] { background-color: #0d0d0d !important; font-weight: 600 !important; color: #fff !important; }
                
                @media (max-width: 640px) { .bn-editor { padding-inline: 24px !important; } }
            `}</style>
        </div>
    )
}
