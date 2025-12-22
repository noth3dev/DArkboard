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
                <div className="absolute right-0 mt-2 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-black/20">
                        <h3 className="text-sm font-semibold">알림</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" /> 모두 읽음
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-neutral-700 mx-auto mb-2 opacity-20" />
                                <p className="text-sm text-neutral-500">알림이 없습니다.</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                                    className={`p-4 border-b border-neutral-800/50 hover:bg-neutral-800/50 transition-colors cursor-pointer group relative ${!notification.is_read ? "bg-white/5" : ""
                                        }`}
                                >
                                    <div className="pr-6">
                                        <p className="text-xs text-white leading-relaxed">
                                            {notification.content}
                                        </p>
                                        <p className="text-[10px] text-neutral-500 mt-1">
                                            {timeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="absolute top-4 right-10 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                    )}
                                    <button
                                        onClick={(e) => deleteNotification(notification.id, e)}
                                        className="absolute top-3.5 right-3 p-1 text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t border-neutral-800 bg-black/20 text-center">
                        <button className="text-[10px] text-neutral-500 hover:text-neutral-300">
                            이전 알림 더보기
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
