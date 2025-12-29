"use client"

import { Plus, Sparkles, BookOpen } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function NotePage() {
    const { user } = useAuth()
    const router = useRouter()

    const createNote = async () => {
        if (!user) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("notes")
                .insert({
                    user_id: user.id,
                    title: "제목 없는 노트",
                    content: []
                })
                .select()
                .single()

            if (error) throw error

            router.push(`/note/${data.id}`)
            toast.success("새 노트가 생성되었습니다.")
        } catch (err) {
            console.error("Error creating note:", err)
            toast.error("노트 생성 중 오류가 발생했습니다.")
        }
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in duration-700">
            <div className="relative">
                <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />

            </div>

            <div className="text-center space-y-3">
                <h1 className="text-2xl font-black uppercase tracking-widest text-white">Make Yourself RemarkABLE</h1>
                <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm font-medium tracking-wide opacity-50 hover:opacity-100 transition-opacity">
                    <span>powered by</span>
                    <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-bold tracking-wider">Notable</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
