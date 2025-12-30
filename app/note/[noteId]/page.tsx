"use client"

import { useState, useEffect, useCallback, use } from "react"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { NoteSkeleton } from "@/components/note-skeleton"
const NotionEditor = dynamic(() => import("@/components/notion-editor"), { ssr: false })

export default function NoteDetailPage({ params }: { params: Promise<{ noteId: string }> }) {
    const { noteId } = use(params)
    const { user, loading } = useAuth()
    const router = useRouter()

    const [noteData, setNoteData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchNote = useCallback(async (isInitialLoad = false) => {
        if (!user || !noteId) return
        try {
            if (isInitialLoad) setIsLoading(true)
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("notes")
                .select("*")
                .eq("id", noteId)
                .maybeSingle()

            if (error) {
                console.error("Error fetching note:", error)
                router.push("/note")
                return
            }

            if (!data) {
                router.push("/note")
                return
            }
            setNoteData(data)
        } catch (err) {
            console.error("Unexpected error:", err)
            router.push("/note")
        } finally {
            if (isInitialLoad) setIsLoading(false)
        }
    }, [user, noteId, router])

    useEffect(() => {
        if (!loading) {
            // Check if this is truly the first time loading THIS specific noteId
            const isDifferentNote = noteData?.id !== noteId
            if (isDifferentNote) {
                setNoteData(null) // Clear previous note data
                fetchNote(true)   // Show skeleton for new note
            } else {
                fetchNote(false)  // Background refresh for same note
            }
        }
    }, [loading, fetchNote, noteId, noteData?.id])

    // STALE-WHILE-REVALIDATE: Only show skeleton if we have NO data yet.
    // If we're just refreshing in the background, keep the current editor visible.
    if (isLoading && !noteData) {
        return <NoteSkeleton />
    }

    if (!noteData) return null

    return (
        <div className="h-full">
            <NotionEditor
                key={noteId}
                noteId={noteId}
                initialTitle={noteData.title}
                initialContent={noteData.content}
                initialUpdatedAt={noteData.updated_at}
                workspaceId={noteData.workspace_id}
            />
        </div>
    )
}
