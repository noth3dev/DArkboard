"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { NoteSidebar } from "@/components/note-sidebar"
import { MobileNoteNav } from "@/components/mobile-note-nav"
import { cn } from "@/lib/utils"

export default function NoteLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, accessLevel } = useAuth()
    const router = useRouter()
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | undefined>(undefined)

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024
            setIsMobile(mobile)
            if (mobile) setIsSidebarCollapsed(true)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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
        <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] bg-black overflow-hidden font-suit relative">
            <MobileNoteNav
                workspaceId={currentWorkspaceId}
                onWorkspaceChange={setCurrentWorkspaceId}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Backdrop for mobile */}
            <div className={cn(
                "fixed inset-0 top-[65px] bg-black/60 backdrop-blur-sm z-[60] transition-all duration-500 lg:hidden",
                isSidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            )} onClick={() => setIsSidebarCollapsed(true)} />

            {/* Sidebar container */}
            <div className={cn(
                "fixed lg:relative top-[65px] lg:top-0 z-[70] lg:z-50 w-fit left-0 h-[calc(100vh-65px)] lg:h-full transition-all duration-300 ease-in-out",
                isSidebarCollapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
            )}>
                <NoteSidebar
                    isCollapsed={isSidebarCollapsed && !isMobile}
                    onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    workspaceId={currentWorkspaceId}
                    onWorkspaceChange={setCurrentWorkspaceId}
                />
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar mt-14 lg:mt-0 relative">
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
