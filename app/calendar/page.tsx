"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect, useState, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase"
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Clock,
    Type,
    AlignLeft,
    Trash2,
    Check,
    Search,
    Tag as TagIcon,
    Filter,
    CalendarDays
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type Schedule = {
    id: string
    user_uuid: string
    title: string
    description: string | null
    start_time: string
    end_time: string
    color: string
    is_all_day: boolean
    category: string | null
}

const COLORS = [
    { name: "파랑", value: "#3b82f6" },
    { name: "에메랄드", value: "#10b981" },
    { name: "보라", value: "#8b5cf6" },
    { name: "장미", value: "#f43f5e" },
    { name: "호박", value: "#f59e0b" },
    { name: "슬레이트", value: "#64748b" },
]

const DEFAULT_CATEGORIES = ["대회", "기타"]

export default function CalendarPage() {
    const { user, loading, accessLevel } = useAuth()
    const [calendarDate, setCalendarDate] = useState(new Date())
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loadingSchedules, setLoadingSchedules] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")

    // Get all unique categories from schedules + defaults
    const allCategories = useMemo(() => {
        const cats = schedules.map(s => s.category).filter(Boolean) as string[]
        return Array.from(new Set([...DEFAULT_CATEGORIES, ...cats])).sort()
    }, [schedules])

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        color: COLORS[0].value,
        is_all_day: false,
        category: DEFAULT_CATEGORIES[0]
    })

    const fetchSchedules = useCallback(async () => {
        if (!user) return
        try {
            setLoadingSchedules(true)
            const supabase = getSupabase()

            const year = calendarDate.getFullYear()
            const month = calendarDate.getMonth()
            const start = new Date(year, month, 1).toISOString()
            const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

            const { data, error } = await supabase
                .from("schedules")
                .select("*")
                .gte("start_time", start)
                .lte("start_time", end)
                .order("start_time", { ascending: true })

            if (error) throw error
            setSchedules(data || [])
        } catch (err) {
            console.error("Error fetching schedules:", err)
        } finally {
            setLoadingSchedules(false)
        }
    }, [user, calendarDate])

    useEffect(() => {
        fetchSchedules()
    }, [fetchSchedules])

    // Filter schedules based on search term and category
    const filteredSchedules = useMemo(() => {
        return schedules.filter(s => {
            const matchesSearch =
                s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                (s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

            const matchesCategory = selectedCategory === "all" || s.category === selectedCategory

            return matchesSearch && matchesCategory
        })
    }, [schedules, searchTerm, selectedCategory])

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 font-light tracking-widest uppercase text-xs">로딩 중...</div>
    if (!user) return <AuthForm />
    if ((accessLevel ?? 0) < 2) {
        return (
            <div className="min-h-[calc(100vh-65px)] bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <X className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-light mb-2">접근 권한이 없습니다</h1>
                <p className="text-neutral-500 text-sm max-w-xs">일정 관리 페이지는 LV.II 이상의 멤버만 접근 가능합니다.</p>
            </div>
        )
    }

    const nextMonth = () => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    const prevMonth = () => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))

    const toLocalISO = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000
        return new Date(date.getTime() - offset).toISOString().slice(0, 16)
    }

    const onDateClick = (day: Date) => {
        const start = new Date(day)
        start.setHours(9, 0, 0, 0)
        const end = new Date(day)
        end.setHours(10, 0, 0, 0)

        setFormData({
            title: "",
            description: "",
            start_time: toLocalISO(start),
            end_time: toLocalISO(end),
            color: COLORS[0].value,
            is_all_day: false,
            category: DEFAULT_CATEGORIES[0]
        })
        setEditingSchedule(null)
        setShowAddModal(true)
    }

    const onScheduleClick = (e: React.MouseEvent, schedule: Schedule) => {
        e.stopPropagation()
        const convertToLocalISO = (dateStr: string) => {
            const date = new Date(dateStr)
            const offset = date.getTimezoneOffset() * 60000
            return new Date(date.getTime() - offset).toISOString().slice(0, 16)
        }

        setEditingSchedule(schedule)
        setFormData({
            title: schedule.title,
            description: schedule.description || "",
            start_time: convertToLocalISO(schedule.start_time),
            end_time: convertToLocalISO(schedule.end_time),
            color: schedule.color,
            is_all_day: schedule.is_all_day,
            category: schedule.category || DEFAULT_CATEGORIES[0]
        })
        setShowAddModal(true)
    }

    const handleSubmit = async () => {
        if (!formData.title.trim()) return
        try {
            const supabase = getSupabase()

            const payload = {
                user_uuid: user.id,
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: new Date(formData.end_time).toISOString(),
                color: formData.color,
                is_all_day: formData.is_all_day,
                category: formData.category
            }

            if (editingSchedule) {
                const { error } = await supabase
                    .from("schedules")
                    .update(payload)
                    .eq("id", editingSchedule.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from("schedules")
                    .insert(payload)
                if (error) throw error
            }

            setShowAddModal(false)
            fetchSchedules()
        } catch (err) {
            console.error("Error saving schedule:", err)
            toast.error("일정 저장 중 오류가 발생했습니다.")
        }
    }

    const handleDelete = async () => {
        if (!editingSchedule) return

        toast("일정을 삭제하시겠습니까?", {
            action: {
                label: "삭제",
                onClick: async () => {
                    try {
                        const supabase = getSupabase()
                        const { error } = await supabase
                            .from("schedules")
                            .delete()
                            .eq("id", editingSchedule.id)

                        if (error) throw error
                        setShowAddModal(false)
                        fetchSchedules()
                        toast.success("일정이 삭제되었습니다.")
                    } catch (err) {
                        console.error("Error deleting schedule:", err)
                        toast.error("삭제 중 오류가 발생했습니다.")
                    }
                }
            }
        })
    }

    function getCalendarDays() {
        const year = calendarDate.getFullYear()
        const month = calendarDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const firstDayOfWeek = firstDay.getDay()
        const days: (Date | null)[] = []
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null)
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i))
        }
        return days
    }

    const formatYearMonth = (date: Date) => {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    }

    const isToday = (date: Date) => {
        const today = new Date()
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
    }

    const isSameDay = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear()
    }

    const renderHeader = () => {
        return (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
                <div className="flex items-center gap-4">
                    <div className="p-3 md:p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl">
                        <CalendarIcon className="w-6 h-6 md:w-7 md:h-7 text-neutral-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-light tracking-tight">{formatYearMonth(calendarDate)}</h1>
                        <p className="text-[9px] md:text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] mt-0.5 md:mt-1">SCHEDULE MANAGEMENT</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
                    {/* Search Box */}
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-white transition-colors" />
                        <input
                            type="text"
                            placeholder="일정 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all w-full sm:w-48 md:w-64"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex h-10 bg-neutral-900/50 border border-neutral-800 rounded-xl p-1 overflow-hidden">
                            <button
                                onClick={prevMonth}
                                className="px-2 hover:bg-neutral-800 rounded-lg transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCalendarDate(new Date())}
                                className="px-3 text-[10px] font-bold uppercase text-neutral-400 hover:text-white transition-colors"
                                title="오늘로 이동"
                            >
                                오늘
                            </button>
                            <button
                                onClick={nextMonth}
                                className="px-2 hover:bg-neutral-800 rounded-lg transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                const now = new Date();
                                onDateClick(now);
                            }}
                            className="h-10 px-5 bg-white text-black text-xs font-black rounded-xl hover:bg-neutral-200 transition-all shadow-lg flex items-center gap-2 active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">일정 추가</span>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderCategoryFilter = () => {
        return (
            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900/50 border border-neutral-800 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">카테고리</span>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px] h-[40px] bg-neutral-900/50 border-neutral-800 text-xs font-bold">
                        <SelectValue placeholder="모든 카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">모든 카테고리</SelectItem>
                        {allCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )
    }

    const renderDays = () => {
        const days = ["일", "월", "화", "수", "목", "금", "토"]
        return (
            <div className="grid grid-cols-7 mb-2 md:mb-4">
                {days.map((day, i) => (
                    <div key={i} className={`text-center font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] py-3 ${i === 0 ? "text-red-500/50" : i === 6 ? "text-blue-500/50" : "text-neutral-700"}`}>
                        {day}
                    </div>
                ))}
            </div>
        )
    }

    const renderCells = () => {
        const calendarDays = getCalendarDays()
        const rows = []
        let cells = []

        for (let i = 0; i < calendarDays.length; i++) {
            const day = calendarDays[i]
            const daySchedules = day ? filteredSchedules.filter(s => isSameDay(new Date(s.start_time), day)) : []

            cells.push(
                <div
                    key={i}
                    className={`relative min-h-[100px] md:min-h-[140px] border border-neutral-900/50 transition-all p-2 md:p-3 flex flex-col gap-1 md:gap-1.5 group
            ${!day ? "bg-black/40" : "bg-neutral-950/20 text-white hover:bg-neutral-900/40 cursor-pointer"}
            ${day && isToday(day) ? "before:absolute before:inset-0 before:border before:border-blue-500/30 before:rounded-xl after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:w-6 md:after:w-8 after:h-0.5 after:bg-blue-500 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]" : ""}
            ${day ? "rounded-xl" : ""}
          `}
                    onClick={() => day && onDateClick(day)}
                >
                    {day && (
                        <>
                            <div className={`text-[10px] md:text-[11px] font-black tracking-tighter mb-0.5 md:mb-1 flex items-center justify-between ${isToday(day) ? "text-blue-400" : i % 7 === 0 ? "text-red-900/80" : i % 7 === 6 ? "text-blue-900/80" : "text-neutral-700"}`}>
                                <span>{day.getDate()}</span>
                                {daySchedules.length > 0 && <span className="w-1 h-1 rounded-full bg-neutral-800" />}
                            </div>

                            <div className="flex flex-col gap-1 md:gap-1.5 overflow-y-auto no-scrollbar max-h-[70px] md:max-h-[100px]">
                                {daySchedules.map(s => {
                                    const startTime = new Date(s.start_time)
                                    const timeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`

                                    return (
                                        <div
                                            key={s.id}
                                            onClick={(e) => onScheduleClick(e, s)}
                                            className="px-1.5 md:px-2 py-1 md:py-1.5 rounded-md md:rounded-lg text-[8px] md:text-[9px] font-bold truncate transition-all active:scale-95 border border-transparent hover:border-white/10 shadow-sm relative overflow-hidden shrink-0"
                                            style={{
                                                backgroundColor: `${s.color}15`,
                                                color: s.color,
                                            }}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 md:w-1" style={{ backgroundColor: s.color }} />
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1 opacity-70 scale-90 md:scale-100 origin-left">
                                                    {!s.is_all_day && <span className="font-black whitespace-nowrap">{timeStr}</span>}
                                                    {s.category && <span className="opacity-50 whitespace-nowrap">· {s.category}</span>}
                                                </div>
                                                <div className="text-white/90 truncate font-semibold">{s.title}</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                                <Plus className="w-3.5 h-3.5 text-neutral-800" />
                            </div>
                        </>
                    )}
                </div>
            )

            if ((i + 1) % 7 === 0 || i === calendarDays.length - 1) {
                rows.push(
                    <div className="grid grid-cols-7 gap-1 mb-1" key={i}>
                        {cells}
                    </div>
                )
                cells = []
            }
        }

        return <div className="p-1 bg-neutral-900/20 rounded-2xl border border-neutral-900/50 shadow-2xl">{rows}</div>
    }

    // Previews the schedule card (similar to project card but for calendar event)
    function SchedulePreviewCard({ schedule }: { schedule: any }) {
        const startTime = new Date(schedule.start_time)
        const endTime = new Date(schedule.end_time)

        const timeRange = schedule.is_all_day
            ? "종일"
            : `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`

        const dateStr = startTime.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        })

        return (
            <div className="group relative rounded-2xl border bg-neutral-950 border-neutral-800 p-6 w-full max-w-sm overflow-hidden shadow-2xl transition-all duration-500">
                <div className="absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20" style={{ backgroundColor: schedule.color }} />

                <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-white shadow-lg" style={{ borderColor: `${schedule.color}30` }}>
                            <CalendarDays className="w-5 h-5" style={{ color: schedule.color }} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800" style={{ color: schedule.color }}>
                                    {schedule.category || "일반"}
                                </span>
                                {schedule.is_all_day && (
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">종일</span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1">{schedule.title || "제목 없는 일정"}</h3>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-6 relative z-10">
                    <div className="flex items-center gap-3 text-neutral-400">
                        <Clock className="w-4 h-4 opacity-50" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-neutral-200">{timeRange}</span>
                            <span className="text-[10px] opacity-60">{dateStr}</span>
                        </div>
                    </div>

                    {schedule.description && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
                            <AlignLeft className="w-3.5 h-3.5 text-neutral-600 mt-1 shrink-0" />
                            <p className="text-[11px] leading-relaxed text-neutral-400 line-clamp-3">{schedule.description}</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest pt-5 border-t border-neutral-800/50 relative z-10">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: schedule.color }} />
                        <span className="text-neutral-500">색상 태그</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-65px)] bg-black text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
                            타임라인
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                            주요 일정과 마감 기한을 시각적으로 파악하세요.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative group w-full sm:w-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="일정 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex h-11 bg-secondary border border-border rounded-xl p-1 shrink-0">
                                <button
                                    onClick={prevMonth}
                                    className="px-3 hover:bg-white/5 rounded-lg transition-all"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setCalendarDate(new Date())}
                                    className="px-4 text-[10px] font-bold uppercase tracking-tight text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="px-3 hover:bg-white/5 rounded-lg transition-all"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    const now = new Date();
                                    onDateClick(now);
                                }}
                                className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-white/5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>일정 추가</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-12">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-900 shrink-0">
                        <Filter className="w-3 h-3 text-neutral-700" />
                        <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest">Category</span>
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[180px] h-[36px] bg-neutral-950 border-neutral-900 text-[10px] font-black uppercase tracking-widest">
                            <SelectValue placeholder="ALL DATA" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-950 border-neutral-900">
                            <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">ALL DATA</SelectItem>
                            {allCategories.map(cat => (
                                <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase tracking-widest">{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Legend/Days */}
                <div className="grid grid-cols-7 mb-4">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, i) => (
                        <div key={i} className={`text-center font-black text-[9px] uppercase tracking-[0.3em] py-4 ${i === 0 ? "text-neutral-800" : i === 6 ? "text-neutral-800" : "text-neutral-600"}`}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="p-1 bg-neutral-950 rounded-[40px] border border-neutral-900 shadow-2xl">
                    {(() => {
                        const calendarDays = getCalendarDays()
                        const rows = []
                        let cells = []

                        for (let i = 0; i < calendarDays.length; i++) {
                            const day = calendarDays[i]
                            const daySchedules = day ? filteredSchedules.filter(s => isSameDay(new Date(s.start_time), day)) : []

                            cells.push(
                                <div
                                    key={i}
                                    className={`relative min-h-[140px] md:min-h-[160px] border border-neutral-900/40 transition-all p-4 flex flex-col gap-2 group
                                        ${!day ? "bg-black/20" : "bg-neutral-950/40 text-white hover:bg-neutral-900/40 cursor-pointer"}
                                        ${day && isToday(day) ? "bg-white/[0.02] border-white/10" : ""}
                                        ${day ? "rounded-3xl" : ""}
                                    `}
                                    onClick={() => day && onDateClick(day)}
                                >
                                    {day && (
                                        <>
                                            <div className={`text-[10px] font-black tracking-tighter mb-2 flex items-center justify-between ${isToday(day) ? "text-white" : "text-neutral-800"}`}>
                                                <span>{day.getDate().toString().padStart(2, '0')}</span>
                                                {isToday(day) && <div className="w-1 h-1 rounded-full bg-white" />}
                                            </div>

                                            <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar max-h-[100px]">
                                                {daySchedules.map(s => {
                                                    const startTime = new Date(s.start_time)
                                                    const timeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`

                                                    return (
                                                        <div
                                                            key={s.id}
                                                            onClick={(e) => onScheduleClick(e, s)}
                                                            className="px-3 py-2 rounded-xl text-[9px] font-black truncate transition-all active:scale-95 border border-transparent hover:border-white/10 relative overflow-hidden shrink-0 group/item"
                                                            style={{
                                                                backgroundColor: `${s.color}10`,
                                                                color: s.color,
                                                            }}
                                                        >
                                                            <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: s.color }} />
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-1.5 opacity-60">
                                                                    {!s.is_all_day && <span>{timeStr}</span>}
                                                                    {s.category && <span>· {s.category}</span>}
                                                                </div>
                                                                <div className="text-neutral-300 group-hover/item:text-white truncate uppercase tracking-tight">{s.title}</div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="w-3.5 h-3.5 text-neutral-800" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )

                            if ((i + 1) % 7 === 0 || i === calendarDays.length - 1) {
                                rows.push(
                                    <div className="grid grid-cols-7 gap-1 mb-1" key={i}>
                                        {cells}
                                    </div>
                                )
                                cells = []
                            }
                        }
                        return rows
                    })()}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-10 bg-black/98 backdrop-blur-3xl transition-all duration-500">
                    <div
                        className="relative w-full h-full md:h-auto md:max-w-5xl bg-neutral-950 border-0 md:border md:border-neutral-900 rounded-0 md:rounded-[48px] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col md:flex-row h-full max-h-[100vh] md:max-h-[85vh]">
                            {/* Left: Preview Section */}
                            <div className="hidden md:flex flex-1 bg-neutral-900/20 p-16 border-r border-neutral-900 flex-col items-center justify-center gap-10 relative overflow-hidden">
                                <div className="absolute inset-0 bg-neutral-950/40" />
                                <div className="relative z-10 w-full flex flex-col items-center">
                                    <p className="text-[10px] text-neutral-700 font-black uppercase tracking-[0.4em] mb-12">Impression Matrix</p>
                                    <div className="w-full transform transition-all duration-1000">
                                        <SchedulePreviewCard schedule={formData} />
                                    </div>
                                    <div className="mt-16 text-center space-y-3 max-w-xs">
                                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em]">Visual Verification</p>
                                        <p className="text-[11px] text-neutral-700 leading-relaxed font-medium uppercase tracking-tight">Real-time data visualization for temporal event synchronization.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Input Section */}
                            <div className="flex-1 p-8 md:p-12 flex flex-col bg-black overflow-y-auto no-scrollbar">
                                <div className="flex items-center justify-between mb-12">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3.5 rounded-2xl bg-white text-black">
                                            {editingSchedule ? <AlignLeft className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                                {editingSchedule ? "Modify Trace" : "Insert Trace"}
                                            </h2>
                                            <p className="text-[10px] text-neutral-700 font-black uppercase tracking-widest mt-1">
                                                {editingSchedule ? "DATA RECALIBRATION" : "NEW SEQUENCE ENTRY"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="p-3 rounded-2xl border border-neutral-900 text-neutral-700 hover:text-white hover:border-neutral-700 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-10 flex-1">
                                    <div className="space-y-3">
                                        <label className="text-[9px] text-neutral-700 uppercase tracking-[0.3em] font-black ml-1">Event Identification</label>
                                        <div className="relative group">
                                            <Type className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-800 transition-colors group-focus-within:text-white" />
                                            <input
                                                type="text"
                                                placeholder="TITLE..."
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full pl-14 pr-6 py-5 bg-neutral-950 border border-neutral-900 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-neutral-700 transition-all placeholder:text-neutral-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[9px] text-neutral-700 uppercase tracking-[0.3em] font-black ml-1">Classification</label>
                                            <div className="relative group">
                                                <TagIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-800 z-10" />
                                                <Select
                                                    value={formData.category || "기타"}
                                                    onValueChange={(val) => {
                                                        if (val === "new") {
                                                            toast.custom((t) => (
                                                                <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] shadow-2xl flex flex-col gap-5 min-w-[300px] animate-in fade-in slide-in-from-bottom-2 duration-500 backdrop-blur-2xl">
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">New Classification</p>
                                                                        <p className="text-[8px] text-neutral-600 font-bold uppercase tracking-widest">Metadata Expansion</p>
                                                                    </div>
                                                                    <input
                                                                        autoFocus
                                                                        placeholder="CATEGORY NAME..."
                                                                        className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-900"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                const newCat = (e.target as HTMLInputElement).value.trim();
                                                                                if (newCat) {
                                                                                    setFormData({ ...formData, category: newCat });
                                                                                    toast.dismiss(t);
                                                                                    toast.success(`${newCat.toUpperCase()} DEFINED`);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button onClick={() => toast.dismiss(t)} className="text-[9px] font-black text-neutral-700 uppercase tracking-widest hover:text-white transition-colors">Abort</button>
                                                                    </div>
                                                                </div>
                                                            ), { duration: Infinity })
                                                        } else {
                                                            setFormData({ ...formData, category: val });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full h-[58px] bg-neutral-950 border-neutral-900 rounded-2xl pl-14 text-[10px] font-black uppercase tracking-widest text-white">
                                                        <SelectValue placeholder="CLASS..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-neutral-950 border-neutral-900">
                                                        <SelectItem value="new" className="text-white font-black text-[9px] uppercase tracking-widest">
                                                            + NEW_CAT
                                                        </SelectItem>
                                                        <SelectSeparator className="bg-neutral-900" />
                                                        {allCategories.map(cat => (
                                                            <SelectItem key={cat} value={cat} className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] text-neutral-700 uppercase tracking-[0.3em] font-black ml-1">Parameters</label>
                                            <button
                                                onClick={() => setFormData({ ...formData, is_all_day: !formData.is_all_day })}
                                                className={`flex items-center justify-between w-full h-[58px] px-6 py-4 bg-neutral-950 border border-neutral-900 rounded-2xl transition-all ${formData.is_all_day ? "border-white/20 bg-neutral-900/40" : ""}`}
                                            >
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${formData.is_all_day ? "text-white" : "text-neutral-700"}`}>All Day Phase</span>
                                                <div className={`w-8 h-4 rounded-full relative transition-all ${formData.is_all_day ? "bg-white" : "bg-neutral-900"}`}>
                                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${formData.is_all_day ? "left-4.5 bg-black" : "left-0.5 bg-neutral-700"}`} />
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[9px] text-neutral-700 uppercase tracking-[0.3em] font-black ml-1">Temporal Start</label>
                                            <div className="relative group">
                                                <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-800" />
                                                <input
                                                    type="datetime-local"
                                                    value={formData.start_time}
                                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                                    className="w-full pl-14 pr-6 py-5 bg-neutral-950 border border-neutral-900 rounded-2xl text-[10px] font-black text-white focus:outline-none focus:border-neutral-700 transition-all [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] text-neutral-700 uppercase tracking-[0.3em] font-black ml-1">Temporal End</label>
                                            <div className="relative group">
                                                <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-800" />
                                                <input
                                                    type="datetime-local"
                                                    value={formData.end_time}
                                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                                    className="w-full pl-14 pr-6 py-5 bg-neutral-950 border border-neutral-900 rounded-2xl text-[10px] font-black text-white focus:outline-none focus:border-neutral-700 transition-all [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-neutral-900">
                                        <label className="text-[9px] text-neutral-700 uppercase tracking-[0.3em] font-black ml-1">Spectral ID</label>
                                        <div className="flex items-center flex-wrap gap-5 px-1">
                                            {COLORS.map(color => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                                    className={`w-8 h-8 rounded-full border border-transparent transition-all relative ${formData.color === color.value ? "ring-2 ring-white ring-offset-4 ring-offset-black scale-110" : "opacity-40 hover:opacity-100 hover:scale-105"}`}
                                                    style={{ backgroundColor: color.value }}
                                                >
                                                    {formData.color === color.value && <Check className="w-4 h-4 text-black mx-auto" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-neutral-900">
                                        <label className="text-[9px] text-neutral-700 uppercase tracking-[0.3em] font-black ml-1">Log Annotation</label>
                                        <textarea
                                            placeholder="EXTENDED DATA LOG..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={2}
                                            className="w-full px-6 py-5 bg-neutral-950 border border-neutral-900 rounded-3xl text-[11px] text-neutral-400 font-bold uppercase tracking-tight focus:outline-none focus:border-neutral-700 transition-all placeholder:text-neutral-900 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="py-10 mt-12 border-t border-neutral-900 flex items-center gap-4 bg-black sticky bottom-0 z-20">
                                    {editingSchedule && (
                                        <button
                                            onClick={handleDelete}
                                            className="p-5 bg-neutral-950 text-neutral-700 rounded-3xl hover:bg-red-500/10 hover:text-red-500 border border-neutral-900 transition-all active:scale-95 group"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!formData.title.trim()}
                                        className="flex-1 py-5 bg-white text-black text-[11px] font-black rounded-3xl hover:bg-neutral-200 transition-all disabled:opacity-10 active:scale-[0.98] uppercase tracking-[0.3em]"
                                    >
                                        {editingSchedule ? "Re-sync Sequence" : "Confirm Entry"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .no-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
