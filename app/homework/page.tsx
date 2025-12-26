"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import {
    ClipboardCheck,
    Plus,
    Search,
    Clock,
    BookOpen,
    Code2,
    ChevronRight,
    AlertCircle,
    FileText,
    HelpCircle,
    Link2,
    X
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Homework = {
    id: string
    mentor_id: string
    lecture_id: string | null
    title: string
    description: string | null
    due_date: string | null
    priority: string
    subject: string | null
    submission_format: string
    created_at: string
}

type Submission = {
    id: string
    homework_id: string
    mentee_id: string
    content: string | null
    status: string
    feedback: string | null
    submitted_at: string
}

export default function HomeworkPage() {
    const { user, loading, role, accessLevel } = useAuth()
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [homeworks, setHomeworks] = useState<Homework[]>([])
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [showSubmitModal, setShowSubmitModal] = useState<Homework | null>(null)
    const [submissionContent, setSubmissionContent] = useState("")

    // Assignment States for filtering my homeworks
    const [myAssignments, setMyAssignments] = useState<Set<string>>(new Set())

    const fetchData = useCallback(async () => {
        if (!user) return
        try {
            setLoadingData(true)
            const supabase = getSupabase()

            const { data: hwData, error: hwError } = await supabase
                .from("homeworks")
                .select("*")
                .order("created_at", { ascending: false })
            if (hwError) throw hwError

            // Fetch Assignments for filtering (if mentee)
            if (role !== 'mentor') {
                try {
                    const { data: assignData, error: assignError } = await supabase
                        .from("homework_assignees")
                        .select("homework_id")
                        .eq("user_id", user.id)

                    if (assignError) {
                        console.warn("Table 'homework_assignees' not found. Ensure mig_002 migration is applied. Falling back to all homeworks.")
                        // Fallback: if table is missing, don't filter (or handle as needed)
                        setMyAssignments(new Set(hwData.map((h: Homework) => h.id)))
                    } else {
                        const assignSet = new Set(assignData?.map(a => a.homework_id) || [])
                        setMyAssignments(assignSet)
                    }
                } catch (e) {
                    console.error("Assignment fetch error:", e)
                }
            }

            setHomeworks(hwData || [])

            const { data: subData, error: subError } = await supabase
                .from("homework_submissions")
                .select("*")
            if (subError) throw subError
            setSubmissions(subData || [])

        } catch (err) {
            console.error("Error fetching data:", err)
        } finally {
            setLoadingData(false)
        }
    }, [user, role])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleCreateMission = async () => {
        try {
            const supabase = getSupabase()
            // Create a default homework entry
            const { data, error } = await supabase.from('homeworks').insert({
                title: '새 과제',
                mentor_id: user?.id,
                priority: 'medium',
                submission_format: 'code',
                description: '과제 세부사항을 입력하세요...'
            }).select().single()

            if (error) throw error
            router.push(`/homework/${data.id}/edit`)
        } catch (e) {
            console.error(e)
            alert("과제 생성에 실패했습니다.")
        }
    }

    const handleSubmitHomework = async (homeworkId: string) => {
        if (!submissionContent) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("homework_submissions").upsert({
                homework_id: homeworkId,
                mentee_id: user?.id,
                content: submissionContent,
                status: 'pending'
            })
            if (error) throw error
            setShowSubmitModal(null)
            setSubmissionContent("")
            fetchData()
        } catch (err) {
            console.error("Error submitting homework:", err)
            alert("과제 제출 중 오류가 발생했습니다.")
        }
    }

    if (loading || (user && loadingData)) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 font-light tracking-widest uppercase text-xs">로딩 중...</div>
    if (!user) return <AuthForm />

    if ((accessLevel ?? 0) < 2) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-background text-foreground p-6">
                <div className="text-center text-muted-foreground">
                    <p className="mb-4 text-lg font-light font-suit">접근 권한이 없습니다. (Level II 이상 필요)</p>
                    <Link href="/" className="text-foreground underline hover:text-primary transition-colors">홈으로 돌아가기</Link>
                </div>
            </div>
        )
    }


    const isMentor = role === 'mentor'

    const getFormatIcon = (format: string) => {
        switch (format) {
            case 'code': return <Code2 className="w-5 h-5" />
            case 'file': return <FileText className="w-5 h-5" />
            case 'quiz': return <HelpCircle className="w-5 h-5" />
            default: return <BookOpen className="w-5 h-5" />
        }
    }

    return (
        <div className="min-h-[calc(100vh-65px)] bg-background text-foreground p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
                            {isMentor ? "과제 허브" : "내 과제 목록"}
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                            {isMentor
                                ? "부여된 모든 과제를 한 곳에서 관리하고 검토하세요."
                                : "현재 진행 중인 과제를 확인하고 결과물을 제출하세요."}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative group w-full sm:w-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="과제 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 pl-11 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                            />
                        </div>
                        {isMentor && (
                            <button
                                onClick={handleCreateMission}
                                className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-white/5"
                            >
                                <Plus className="w-4 h-4" />
                                <span>새 과제 생성</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Homework List */}
                <div className="grid gap-4">
                    {homeworks.filter(hw => {
                        const matchesSearch = hw.title.toLowerCase().includes(searchTerm.toLowerCase())
                        if (!matchesSearch) return false
                        if (isMentor) return true
                        const isAssigned = myAssignments.has(hw.id)
                        const hasSubmission = submissions.some(s => s.homework_id === hw.id && s.mentee_id === user.id)
                        return isAssigned || hasSubmission
                    }).map((hw) => {
                        const mySubmission = submissions.find(s => s.homework_id === hw.id && (isMentor || s.mentee_id === user.id))
                        const isCompleted = mySubmission?.status === 'completed'
                        const isPending = mySubmission?.status === 'pending'

                        return (
                            <div key={hw.id} className="group relative glass rounded-3xl border border-border/50 hover:border-border transition-all p-6 md:p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <Link href={`/homework/${hw.id}`} className="flex items-start gap-6 flex-1 min-w-0">
                                        <div className={`mt-1 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${isCompleted
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : isPending
                                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                : 'bg-white/5 border-white/10 text-muted-foreground group-hover:text-foreground group-hover:border-white/20'
                                            }`}>
                                            {getFormatIcon(hw.submission_format)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                                <h3 className={`text-xl font-bold font-suit leading-none transition-colors ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                    {hw.title}
                                                </h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground tracking-tight border border-border">
                                                    {hw.submission_format}
                                                </span>
                                                {hw.priority === 'high' && (
                                                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                                        <div className="w-1 h-1 rounded-full bg-red-400" />
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1 mb-6 font-medium leading-relaxed">
                                                {hw.description || "과제 설명이 없습니다."}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground/60 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{hw.due_date ? new Date(hw.due_date).toLocaleDateString() : "기한 없음"}</span>
                                                </div>
                                                {hw.lecture_id && (
                                                    <div className="flex items-center gap-2">
                                                        <Link2 className="w-3.5 h-3.5" />
                                                        <span>강의 연결됨</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Submit Mission Modal */}
                {showSubmitModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md transition-all">
                        <div className="relative w-full max-w-2xl bg-card border border-border rounded-[32px] p-8 shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                        {getFormatIcon(showSubmitModal.submission_format)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold font-suit leading-none mb-2">{showSubmitModal.title}</h2>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Submit via {showSubmitModal.submission_format} format</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowSubmitModal(null)} className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-white/5 rounded-full">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex gap-4">
                                        <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                                        <p className="text-sm text-foreground/80 leading-relaxed italic">{showSubmitModal.description}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground tracking-tight ml-1">
                                        {showSubmitModal.submission_format === 'code' ? 'Code Content' : showSubmitModal.submission_format === 'file' ? 'File URL / Link' : 'Your Answer'}
                                    </label>
                                    <textarea
                                        value={submissionContent}
                                        onChange={(e) => setSubmissionContent(e.target.value)}
                                        placeholder={`Enter your ${showSubmitModal.submission_format} here...`}
                                        rows={10}
                                        className="w-full px-6 py-4 bg-secondary border border-border rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none leading-relaxed"
                                    />
                                </div>

                                <button
                                    onClick={() => handleSubmitHomework(showSubmitModal.id)}
                                    className="w-full py-4 bg-foreground text-background text-sm font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95"
                                >
                                    Complete Submission
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .glass { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); }
            `}</style>
        </div>
    )
}
