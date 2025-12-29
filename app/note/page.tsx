"use client"

import { Plus, Sparkles } from "lucide-react"
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
                <div className="relative w-24 h-24 rounded-[32px] bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl">
                    <Sparkles className="w-10 h-10 text-neutral-400 opacity-20" />
                </div>
            </div>

            <div className="text-center space-y-3">
                <h1 className="text-2xl font-black uppercase tracking-widest text-white">Select or Create a Note</h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 max-w-[300px] leading-relaxed">
                    생산적인 아이디어를 기록하고 정리하세요. <br />
                    사이드바에서 노트를 선택하거나 아래 버튼을 눌러 시작하세요.
                </p>
            </div>

            <button
                onClick={createNote}
                className="flex items-center gap-3 px-8 py-4 bg-white text-black text-[11px] font-black rounded-2xl hover:bg-neutral-200 transition-all active:scale-95 uppercase tracking-[0.2em]"
            >
                <Plus className="w-3.5 h-3.5" />
                Create New Note
            </button>
        </div>
    )
}
