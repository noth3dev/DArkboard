"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import {
    ClipboardCheck,
    Check,
    Clock,
    CheckCircle2,
    X,
    BookOpen,
    Code2,
    Plus,
    ChevronRight,
    ChevronLeft,
    MonitorPlay,
    AlertCircle,
    FileText,
    HelpCircle,
    Pencil
} from "lucide-react"
import { useState, useEffect, useCallback, use } from "react"
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
    created_at: string
}

type Problem = {
    id: string
    title: string
    description: string | null
    submission_format: string
    sort_order: number
}

type ProblemSubmission = {
    id: string
    problem_id: string
    mentee_id: string
    status: string
    content: string
    feedback: string | null
}

type Lecture = {
    id: string
    title: string
    video_url: string | null
}

export default function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { user, loading, role } = useAuth()
    const router = useRouter()
    const [homework, setHomework] = useState<Homework | null>(null)
    const [problems, setProblems] = useState<Problem[]>([])
    const [problemSubmissions, setProblemSubmissions] = useState<ProblemSubmission[]>([])
    const [lecture, setLecture] = useState<Lecture | null>(null)
    const [loadingData, setLoadingData] = useState(true)

    const fetchData = useCallback(async () => {
        if (!user) return
        try {
            setLoadingData(true)
            const supabase = getSupabase()

            const { data: hwData, error: hwError } = await supabase
                .from("homeworks")
                .select("*")
                .eq("id", id)
                .single()

            if (hwError) throw hwError
            setHomework(hwData)

            if (hwData.id) {
                const { data: probData } = await supabase
                    .from("problems")
                    .select("*")
                    .eq("homework_id", id)
                    .order("sort_order", { ascending: true })
                setProblems(probData || [])

                let subQuery = supabase.from("problem_submissions").select("*")
                if (role !== 'mentor') {
                    subQuery = subQuery.eq("mentee_id", user.id)
                }
                const { data: subData } = await subQuery
                setProblemSubmissions(subData || [])
            }

            if (hwData.lecture_id) {
                const { data: lectData } = await supabase.from("lectures").select("id, title, video_url").eq("id", hwData.lecture_id).single()
                setLecture(lectData)
            }

        } catch (err) {
            console.error("Error fetching homework detail:", err)
            router.push("/homework")
        } finally {
            setLoadingData(false)
        }
    }, [user, id, role, router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading || (user && loadingData)) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 font-light tracking-widest uppercase text-xs">로딩 중...</div>
    if (!user) return <AuthForm />
    if (!homework) return null

    const isMentor = role === 'mentor'
    const totalProblems = problems.length
    const submittedProblemsCount = problems.filter(prob => problemSubmissions.some(sub => sub.problem_id === prob.id)).length
    const completionRate = totalProblems > 0 ? Math.round((submittedProblemsCount / totalProblems) * 100) : 0

    return (
        <div className="min-h-[calc(100vh-65px)] bg-background text-foreground p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-16">
                    <button
                        onClick={() => router.push("/homework")}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-xs font-bold font-suit">
                            대시보드로 돌아가기
                        </span>
                    </button>
                    {isMentor && (
                        <Link href={`/homework/${id}/edit`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group px-4 py-2 bg-secondary border border-border rounded-xl">
                            <span className="text-xs font-bold font-suit">과제 설정 관리</span>
                            <Pencil className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div className="lg:col-span-2 space-y-16">
                        {/* Mission Summary */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                                    과제 목표
                                </span>
                                <span className={`px-3 py-1 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider ${homework.priority === 'High' ? 'text-red-400 bg-red-400/5' : 'text-muted-foreground bg-white/5'
                                    }`}>
                                    우선순위: {homework.priority}
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold font-suit tracking-tighter mb-8 leading-tight">
                                {homework.title}
                            </h1>
                            <p className="text-muted-foreground text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium max-w-2xl">
                                {homework.description || "과제 상세 설명이 없습니다."}
                            </p>
                        </div>

                        {/* Detailed Tasks */}
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-bold font-suit uppercase tracking-[0.2em] text-muted-foreground">세부 문제 목록 ({problems.length})</h2>
                                {isMentor && (
                                    <Link
                                        href={`/homework/${id}/problem/new`}
                                        className="p-2 rounded-xl bg-foreground text-background hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-white/5"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>

                            <div className="grid gap-3">
                                {problems.map((prob, idx) => {
                                    const submissions = problemSubmissions.filter(s => s.problem_id === prob.id)
                                    const isSubmitted = submissions.length > 0
                                    const isCompleted = submissions.some(s => s.status === 'completed')

                                    return (
                                        <div key={prob.id} className="group relative">
                                            <Link
                                                href={`/homework/${id}/problem/${prob.id}`}
                                                className={`group p-8 rounded-[32px] transition-all flex items-center justify-between border glass ${isCompleted
                                                    ? 'bg-white/[0.04] border-white/10'
                                                    : 'hover:bg-white/[0.04] border-border/50 hover:border-border'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-8">
                                                    <div className={`text-2xl font-bold font-suit transition-colors ${isCompleted ? 'text-foreground' : 'text-muted-foreground/20 group-hover:text-foreground/20'}`}>
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-lg font-bold font-suit transition-colors leading-tight ${isCompleted ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'}`}>
                                                            {prob.title}
                                                        </h3>
                                                        <div className="flex items-center gap-4 mt-3">
                                                            <span className="text-[10px] font-bold text-muted-foreground/60 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                                                                {prob.submission_format}
                                                            </span>
                                                            {isSubmitted && (
                                                                <span className={`text-[10px] font-bold flex items-center gap-2 ${isCompleted ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/20'}`} />
                                                                    {isCompleted ? '제출 완료' : '검토 중'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                                    <ChevronRight className={`w-5 h-5 transition-all group-hover:translate-x-1 ${isCompleted ? 'text-muted-foreground/30' : 'text-muted-foreground/20 group-hover:text-foreground'}`} />
                                                </div>
                                            </Link>
                                            {isMentor && (
                                                <Link
                                                    href={`/homework/${id}/problem/${prob.id}/edit`}
                                                    className="absolute right-14 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all z-10"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Link>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Stats */}
                    <div className="space-y-6">
                        {!isMentor && totalProblems > 0 && (
                            <div className="p-8 rounded-[32px] glass border border-border/50">
                                <div className="space-y-6">
                                    <div className="flex items-end justify-between">
                                        <span className="text-[10px] text-muted-foreground font-bold font-suit uppercase tracking-wider">진행 현황</span>
                                        <span className="text-3xl font-bold font-suit text-foreground tracking-tighter">{completionRate}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-foreground transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                            style={{ width: `${completionRate}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                                        <span>{submittedProblemsCount}개 완료</span>
                                        <span>{totalProblems}개 전체 문제</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-8 rounded-[32px] glass border border-border/50 space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-bold font-suit uppercase tracking-wider mb-0.5">제출 기한</p>
                                        <p className="text-sm font-bold text-foreground">{homework.due_date ? new Date(homework.due_date).toLocaleDateString() : "기한 없음"}</p>
                                    </div>
                                </div>
                                {lecture && (
                                    <div className="flex items-center gap-4 border-t border-border pt-6">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                            <MonitorPlay className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-muted-foreground font-bold font-suit uppercase tracking-wider mb-0.5">Linked Intake</p>
                                            <Link href="/lecture" className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate block">{lecture.title}</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 border-t border-border/50 flex gap-4">
                                <AlertCircle className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground/60 leading-relaxed font-medium">
                                    모든 제출물은 과제 요구사항에 명시된 구성을 준수해야 합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .glass { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); }
            `}</style>
        </div>
    )
}
