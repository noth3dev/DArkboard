"use client"

import { useState, useEffect, useCallback, use } from "react"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
const NotionEditor = dynamic(() => import("@/components/notion-editor"), { ssr: false })

export default function NoteDetailPage({ params }: { params: Promise<{ noteId: string }> }) {
    const { noteId } = use(params)
    const { user, loading } = useAuth()
    const router = useRouter()

    const [noteData, setNoteData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchNote = useCallback(async () => {
        if (!user || !noteId) return
        try {
            setIsLoading(true)
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
            setIsLoading(false)
        }
    }, [user, noteId, router])

    useEffect(() => {
        if (!loading) {
            fetchNote()
        }
    }, [loading, fetchNote])

    if (isLoading || loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 opacity-20">
                    <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Accessing Remark...</span>
                </div>
            </div>
        )
    }

    if (!noteData) return null

    return (
        <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <NotionEditor
                key={noteId}
                noteId={noteId}
                initialTitle={noteData.title}
                initialContent={noteData.content}
                workspaceId={noteData.workspace_id}
            />
        </div>
    )
}
