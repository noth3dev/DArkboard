"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { MonitorPlay, Search, Filter, PlayCircle, Clock, ChevronRight, Plus, X, Link2, ClipboardCheck, LayoutGrid, Calendar } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import Link from "next/link"

type Lecture = {
    id: string
    mentor_id: string
    title: string
    description: string | null
    video_url: string | null
    thumbnail_url: string | null
    category: string
    created_at: string
}

type Homework = {
    id: string
    lecture_id: string | null
    title: string
    status?: string
}

export default function LecturePage() {
    const { user, loading, role } = useAuth()
    const [searchTerm, setSearchTerm] = useState("")
    const [lectures, setLectures] = useState<Lecture[]>([])
    const [homeworks, setHomeworks] = useState<Homework[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [activeCategory, setActiveCategory] = useState("전체")

    const [newLecture, setNewLecture] = useState({
        title: "",
        description: "",
        video_url: "",
        category: "프론트엔드"
    })

    const fetchData = useCallback(async () => {
        if (!user) return
        try {
            setLoadingData(true)
            const supabase = getSupabase()

            const { data: lectData, error: lectError } = await supabase
                .from("lectures")
                .select("*")
                .order("created_at", { ascending: false })
            if (lectError) throw lectError
            setLectures(lectData || [])

            const { data: hwData } = await supabase.from("homeworks").select("id, lecture_id, title")
            setHomeworks(hwData || [])

        } catch (err) {
            console.error("Error fetching lectures:", err)
        } finally {
            setLoadingData(false)
        }
    }, [user])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleAddLecture = async () => {
        if (!newLecture.title) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("lectures").insert({
                mentor_id: user?.id,
                title: newLecture.title,
                description: newLecture.description,
                video_url: newLecture.video_url,
                category: newLecture.category
            })
            if (error) throw error
            setShowAddModal(false)
            setNewLecture({ title: "", description: "", video_url: "", category: "프론트엔드" })
            fetchData()
        } catch (err) {
            console.error("Error adding lecture:", err)
            alert("강의 등록 중 오류가 발생했습니다.")
        }
    }

    if (loading || (user && loadingData)) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 font-light tracking-widest uppercase text-xs">로딩 중...</div>
    if (!user) return <AuthForm />

    const isMentor = role === 'mentor'
    const categories = ["전체", "프론트엔드", "백엔드", "CS/기초", "프로젝트"]

    const filteredLectures = lectures.filter(l => {
        const matchSearch = l.title.toLowerCase().includes(searchTerm.toLowerCase())
        const matchCategory = activeCategory === "전체" || l.category === activeCategory
        return matchSearch && matchCategory
    })

    return (
        <div className="min-h-[calc(100vh-65px)] bg-background text-foreground p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
                            강의 자료실
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                            성장을 위한 체계적인 커리큘럼과 핵심 기술 자료들을 확인하세요.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative group w-full sm:w-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="강의 및 자료 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                            />
                        </div>
                        {isMentor && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-white/5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>새 강의 등록</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 mb-12 overflow-x-auto no-scrollbar pb-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${activeCategory === cat
                                ? "bg-foreground text-background border-foreground shadow-lg shadow-white/5"
                                : "bg-secondary text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Lecture Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLectures.map((lecture) => {
                        const linkedTasks = homeworks.filter(h => h.lecture_id === lecture.id)

                        return (
                            <div key={lecture.id} className="group flex flex-col glass rounded-[32px] border border-border/50 hover:border-border transition-all overflow-hidden">
                                <div className="relative aspect-video bg-white/5 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                                    <PlayCircle className="w-12 h-12 text-white/20 group-hover:text-white transition-all z-10" />
                                    <div className="absolute top-5 left-5">
                                        <span className="px-3 py-1 rounded-lg bg-background/60 backdrop-blur-xl border border-white/10 text-[10px] font-bold text-muted-foreground uppercase">
                                            {lecture.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold font-suit text-foreground mb-3 line-clamp-1 leading-tight">{lecture.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-8 font-medium leading-relaxed">
                                            {lecture.description || "등록된 강의 설명이 없습니다."}
                                        </p>
                                    </div>

                                    {/* Linked Missions */}
                                    {linkedTasks.length > 0 && (
                                        <div className="space-y-2 mb-8 border-t border-border pt-6 mt-2">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-2">
                                                <ClipboardCheck className="w-3.5 h-3.5" />
                                                <span>연결된 과제</span>
                                            </div>
                                            {linkedTasks.map(task => (
                                                <Link key={task.id} href={`/homework/${task.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-xs group/item">
                                                    <span className="text-muted-foreground group-hover/item:text-foreground font-medium truncate">{task.title}</span>
                                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover/item:text-foreground" />
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-border">
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 font-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{new Date(lecture.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {lecture.video_url && (
                                            <a
                                                href={lecture.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-bold text-foreground hover:opacity-70 transition-all flex items-center gap-2"
                                            >
                                                수강하기
                                                <Link2 className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Add Lecture Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
                    <div className="relative w-full max-w-lg bg-card border border-border rounded-[32px] p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold font-suit">새 강의 등록</h2>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-white/5 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground tracking-tight ml-1">강의 제목</label>
                                <input
                                    type="text"
                                    value={newLecture.title}
                                    onChange={(e) => setNewLecture({ ...newLecture, title: e.target.value })}
                                    placeholder="강의 제목을 입력하세요"
                                    className="w-full px-5 py-3.5 bg-secondary border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground tracking-tight ml-1">커리큘럼 상세 설명</label>
                                <textarea
                                    value={newLecture.description}
                                    onChange={(e) => setNewLecture({ ...newLecture, description: e.target.value })}
                                    placeholder="강의에 대한 간략한 설명을 입력하세요"
                                    rows={3}
                                    className="w-full px-5 py-3.5 bg-secondary border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground tracking-tight ml-1">강의 핵심 링크 (URL)</label>
                                <div className="relative">
                                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="url"
                                        value={newLecture.video_url}
                                        onChange={(e) => setNewLecture({ ...newLecture, video_url: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full pl-11 pr-5 py-3.5 bg-secondary border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground tracking-tight ml-1">카테고리</label>
                                <select
                                    value={newLecture.category}
                                    onChange={(e) => setNewLecture({ ...newLecture, category: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-secondary border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                                >
                                    {categories.filter(c => c !== "전체").map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleAddLecture}
                                className="w-full py-4 bg-foreground text-background text-sm font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95 mt-4"
                            >
                                강의 등록하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .glass { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
