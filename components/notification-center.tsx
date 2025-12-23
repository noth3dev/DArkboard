"use client"

import { useState, useEffect, useRef } from "react"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Bell, Check, Trash2, X } from "lucide-react"

type Notification = {
    id: string
    recipient_uuid: string
    actor_uuid: string | null
    type: string
    project_id: string | null
    task_id: string | null
    content: string
    is_read: boolean
    created_at: string
    actor?: {
        name: string | null
        name_eng: string | null
    }
}

export function NotificationCenter() {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (user) {
            fetchNotifications()
            subscribeToNotifications()
        }

        // 클릭 시 드롭다운 닫기
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [user])

    async function fetchNotifications() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("notifications")
                .select(`
          *,
          actor:users!notifications_actor_uuid_fkey(name, name_eng)
        `)
                .eq("recipient_uuid", user?.id)
                .order("created_at", { ascending: false })
                .limit(20)

            if (error) throw error
            setNotifications(data || [])
            setUnreadCount((data || []).filter((n: Notification) => !n.is_read).length)
        } catch (err) {
            console.error("Error fetching notifications:", err)
        }
    }

    function subscribeToNotifications() {
        const supabase = getSupabase()
        const channel = supabase
            .channel(`notifications:${user?.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `recipient_uuid=eq.${user?.id}`,
                },
                (payload: any) => {
                    // 새 알림 추가 시 목록 갱신 (actor 정보 포함을 위해 다시 조회하거나 직접 추가)
                    fetchNotifications()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    async function markAsRead(id: string) {
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", id)

            if (error) throw error
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (err) {
            console.error("Error marking notification as read:", err)
        }
    }

    async function markAllAsRead() {
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("recipient_uuid", user?.id)
                .eq("is_read", false)

            if (error) throw error
            setNotifications(notifications.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
        } catch (err) {
            console.error("Error marking all as read:", err)
        }
    }

    async function deleteNotification(id: string, e: React.MouseEvent) {
        e.stopPropagation()
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", id)

            if (error) throw error
            setNotifications(notifications.filter(n => n.id !== id))
            fetchNotifications() // 카운트 갱신
        } catch (err) {
            console.error("Error deleting notification:", err)
        }
    }

    function timeAgo(dateStr: string) {
        const date = new Date(dateStr)
        const now = new Date()
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
        if (seconds < 60) return "방금 전"
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}분 전`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}시간 전`
        const days = Math.floor(hours / 24)
        return `${days}일 전`
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-neutral-400 hover:text-white transition-colors rounded-lg hover:bg-neutral-800"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed md:absolute top-[65px] md:top-full left-0 md:left-auto md:right-0 md:mt-4 w-full md:w-[400px] bg-black/95 md:bg-neutral-950/90 backdrop-blur-3xl md:border border-b border-neutral-800 md:rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="px-6 py-4 border-b border-neutral-800/50 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white uppercase tracking-wider">알림</span>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[11px] text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 font-bold"
                            >
                                <Check className="w-3.5 h-3.5" /> 모두 읽음
                            </button>
                        )}
                    </div>

                    <div className="max-h-[calc(100vh-120px)] md:max-h-[500px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-20 px-8 text-center bg-black/20">
                                <div className="w-16 h-16 bg-neutral-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-neutral-800/50 rotate-3">
                                    <Bell className="w-6 h-6 text-neutral-700" />
                                </div>
                                <p className="text-sm text-neutral-400 font-bold">새로운 알림 없음</p>
                                <p className="text-[11px] text-neutral-600 mt-1 max-w-[200px] mx-auto">좀 쉬는 날일지도?</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-800/20">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                        className={`px-6 py-5 hover:bg-white/[0.03] transition-all cursor-pointer group relative flex gap-4 ${!notification.is_read ? "bg-blue-500/[0.04]" : ""}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <p className={`text-xs leading-relaxed ${notification.is_read ? "text-neutral-400" : "text-white font-medium"}`}>
                                                    {notification.content}
                                                </p>
                                                {!notification.is_read && (
                                                    <div className="mt-1.5 shrink-0 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-3">
                                                <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-tight">
                                                    {timeAgo(notification.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => deleteNotification(notification.id, e)}
                                            className="p-2 text-neutral-700 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all active:bg-red-500/10 rounded-xl shrink-0 self-center"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-neutral-800/50 bg-white/[0.01] text-center">
                        <button className="text-[11px] text-neutral-500 hover:text-white font-black uppercase tracking-widest transition-colors">
                            이전 알림
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
