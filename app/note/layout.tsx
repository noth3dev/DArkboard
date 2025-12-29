"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { NoteSidebar } from "@/components/note-sidebar"

export default function NoteLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, accessLevel } = useAuth()
    const router = useRouter()
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    useEffect(() => {
        if (!loading && (!user || (accessLevel ?? 0) < 2)) {
            router.push("/")
        }
    }, [user, loading, accessLevel, router])

    if (loading || !user || (accessLevel ?? 0) < 2) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-65px)] bg-black overflow-hidden font-suit">
            <NoteSidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                {children}
            </main>
            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
      `}</style>
        </div>
    )
}
