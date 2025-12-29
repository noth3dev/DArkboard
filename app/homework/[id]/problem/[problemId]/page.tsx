"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import {
    Pencil,
    Maximize2,
    ArrowLeft,
    Plus,
    PanelLeft,
    FolderOpen,
    SquareTerminal,
    FileJson,
    Terminal,
    Loader2
} from "lucide-react"
import { toast } from "sonner"
import { useState, useEffect, useCallback, use, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    SandpackFileExplorer,
    SandpackConsole
} from "@codesandbox/sandpack-react"

import { DeadlineTimer } from "./components/deadline-timer"
import { SandpackSubmissionControl, SandpackDownloadControl } from "./components/sandpack-controls"
import { ProblemDescription } from "./components/problem-description"
import { MentorReviewTerminal } from "./components/mentor-review-terminal"
import { SubmissionDetailModal } from "./components/submission-detail-modal"
import { QuizSolver } from "./components/quiz-solver"
import { Problem, Submission } from "./components/types"

export default function ProblemSolvePage({ params }: { params: Promise<{ id: string, problemId: string }> }) {
    const { id, problemId } = use(params)
    const { user, loading, role } = useAuth()
    const router = useRouter()

    const [problem, setProblem] = useState<Problem | null>(null)
    const [homework, setHomework] = useState<any>(null)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [currentFiles, setCurrentFiles] = useState<any>(null)
    const [submitting, setSubmitting] = useState(false)
    const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({})
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
    const [showExplorer, setShowExplorer] = useState(true)
    const [viewingSub, setViewingSub] = useState<Submission | null>(null)
    const [isReviewMode, setIsReviewMode] = useState(false)
    const [reviewingUser, setReviewingUser] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        if (!user) return
        try {
            setLoadingData(true)
            const supabase = getSupabase()

            const { data: probData, error: probError } = await supabase
                .from("problems")
                .select("*")
                .eq("id", problemId)
                .single()

            if (probError) throw probError
            setProblem(probData)

            let query = supabase
                .from("problem_submissions")
                .select("*, users!mentee_id(name, display_name)")
                .eq("problem_id", problemId)
                .order("submitted_at", { ascending: false })

            if (role !== 'mentor') {
                query = query.eq("mentee_id", user.id)
            }

            const { data: subData } = await query
            setSubmissions(subData || [])

            if (subData && subData.length > 0 && role !== 'mentor') {
                setCurrentFiles(subData[0].files || probData.files)
            } else {
                setCurrentFiles(probData.files)
            }

            const { data: hwData } = await supabase
                .from("homeworks")
                .select("*")
                .eq("id", id)
                .single()
            setHomework(hwData)

        } catch (err) {
            console.error("Error fetching problem:", err)
            router.push(`/homework/${id}`)
        } finally {
            setLoadingData(false)
        }
    }, [user, problemId, role, router, id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const questions = useMemo(() => {
        try {
            if (problem?.files?.['quiz.json']) {
                return JSON.parse(problem.files['quiz.json'].code || problem.files['quiz.json'] as any)
            }
        } catch (e) { }
        return []
    }, [problem])

    const handleQuizSubmit = async (answers: Record<string, string>) => {
        setSubmitting(true)
        try {
            const supabase = getSupabase()
            const formattedFiles = {
                "answers.json": { code: JSON.stringify(answers) }
            }

            const { error } = await supabase.from("problem_submissions").insert({
                problem_id: problemId,
                mentee_id: user?.id,
                files: formattedFiles,
                status: 'completed' // Quiz is auto-graded
            })
            if (error) throw error
            fetchData()
        } catch (err) {
            console.error("Error submitting quiz:", err)
            toast.error("제출 중 오류가 발생했습니다.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = async (files: any) => {
        setSubmitting(true)
        try {
            const supabase = getSupabase()

            const formattedFiles: Record<string, { code: string }> = {}
            Object.keys(files).forEach(path => {
                formattedFiles[path] = { code: files[path].code || files[path] }
            })

            const { error } = await supabase.from("problem_submissions").insert({
                problem_id: problemId,
                mentee_id: user?.id,
                files: formattedFiles,
                status: 'pending'
            })
            if (error) throw error
            fetchData()
        } catch (err) {
            console.error("Error submitting answer:", err)
            alert("제출 중 오류가 발생했습니다.")
        } finally {
            setSubmitting(false)
        }
    }

    const plainHandleSubmit = async () => {
        if (!currentFiles) return
        setSubmitting(true)
        try {
            const supabase = getSupabase()
            const formattedFiles: Record<string, { code: string }> = {}
            if (typeof currentFiles === 'object') {
                Object.keys(currentFiles).forEach(path => {
                    formattedFiles[path] = { code: currentFiles[path].code || currentFiles[path] }
                })
            } else {
                formattedFiles["answer.txt"] = { code: currentFiles }
            }

            const { error } = await supabase.from("problem_submissions").insert({
                problem_id: problemId,
                mentee_id: user?.id,
                files: formattedFiles,
                status: 'pending'
            })
            if (error) throw error
            fetchData()
        } catch (err) {
            console.error("Error submitting answer:", err)
            alert("제출 중 오류가 발생했습니다.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleFeedback = async (subId: string) => {
        try {
            const supabase = getSupabase()
            const { error } = await supabase
                .from("problem_submissions")
                .update({
                    feedback: feedbackTexts[subId],
                    status: 'completed'
                })
                .eq("id", subId)
            if (error) throw error
            fetchData()
        } catch (err) {
            console.error("Error saving feedback:", err)
        }
    }

    if (loading || (user && loadingData)) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 font-light uppercase text-xs tracking-widest">로딩 중...</div>
    if (!user) return <AuthForm />
    if (!problem) return null

    const isMentor = role === 'mentor'
    const mySub = submissions.find(s => s.mentee_id === user.id)

    const sandpackFiles = currentFiles ? Object.keys(currentFiles).reduce((acc: any, key) => {
        acc[key] = currentFiles[key].code
        return acc
    }, {}) : {}

    // Moved to top-level hooks

    if (problem.submission_format === 'quiz') {
        return (
            <div className="flex flex-col h-[calc(100vh-65px)] bg-background text-foreground overflow-hidden">
                <div className="flex items-center justify-between px-8 py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0 relative z-20">
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.push(`/homework/${id}`)} className="p-2.5 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all active:scale-95 group">
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 font-suit mb-0.5">과제 목표</span>
                            <h1 className="text-sm font-bold tracking-tight text-foreground font-suit">{problem?.title}</h1>
                        </div>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
                        <DeadlineTimer dueDate={homework?.due_date} />
                    </div>

                    {isMentor && (
                        <div className="flex items-center gap-2">
                            <Link href={`/homework/${id}/problem/${problemId}/edit`} className="p-3 bg-secondary border border-border text-muted-foreground rounded-2xl hover:text-foreground hover:border-foreground/20 hover:bg-accent transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-black/5" title="Edit Problem">
                                <Pencil className="w-5 h-5" />
                            </Link>
                        </div>
                    )}
                </div>

                <div className="flex flex-1 overflow-hidden">
                    <ProblemDescription
                        problem={problem}
                        submissions={submissions}
                        isMentor={isMentor}
                        onViewSub={setViewingSub}
                        onLoadCode={() => { }}
                        mySub={mySub}
                    />
                    <div className="flex-1 bg-background overflow-y-auto custom-scrollbar p-12 lg:p-24">
                        <div className="max-w-3xl mx-auto">
                            <QuizSolver
                                questions={questions}
                                mySubmission={mySub}
                                onSubmit={handleQuizSubmit}
                                submitting={submitting}
                                isMentor={isMentor}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-65px)] bg-background text-foreground overflow-hidden">
            <SandpackProvider
                theme="dark"
                template={problem.sandpack_template === 'react' ? 'vite-react-ts' : (problem.sandpack_template as any || "static")}
                files={sandpackFiles}
                options={{
                    visibleFiles: problem.sandpack_template === 'node' ? ["/index.js"] : ["/index.html", "/App.tsx", "/App.js", "/src/App.tsx"],
                    activeFile: problem.sandpack_template === 'node'
                        ? "/index.js"
                        : (sandpackFiles["/App.tsx"] ? "/App.tsx" : (sandpackFiles["/App.js"] ? "/App.js" : "/index.html"))
                }}
            >
                <div className="flex items-center justify-between px-8 py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0 relative z-20">
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.push(`/homework/${id}`)} className="p-2.5 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all active:scale-95 group">
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 font-suit mb-0.5">과제 목표</span>
                            <h1 className="text-sm font-bold tracking-tight text-foreground font-suit">{problem?.title}</h1>
                        </div>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
                        <DeadlineTimer dueDate={homework?.due_date} />
                    </div>

                    <div className="flex items-center gap-3">
                        <SandpackDownloadControl />
                        {isMentor && (
                            <Link href={`/homework/${id}/problem/${problemId}/edit`} className="p-3 bg-secondary border border-border text-muted-foreground rounded-2xl hover:text-foreground hover:border-foreground/20 hover:bg-accent transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-black/5" title="Edit Problem">
                                <Pencil className="w-5 h-5" />
                            </Link>
                        )}
                        {!isMentor && (
                            problem.submission_format === 'code' ? (
                                <SandpackSubmissionControl
                                    onSubmit={handleSubmit}
                                    submitting={submitting}
                                />
                            ) : (
                                <button
                                    onClick={plainHandleSubmit}
                                    disabled={submitting}
                                    className="h-11 px-6 bg-foreground text-background rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-white/5 flex items-center justify-center gap-3"
                                    title="Submit Solution"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span>과제 제출하기</span>
                                            <ArrowLeft className="w-4 h-4 rotate-180" />
                                        </>
                                    )}
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    <ProblemDescription
                        problem={problem}
                        submissions={submissions}
                        isMentor={isMentor}
                        onViewSub={setViewingSub}
                        onLoadCode={(files) => {
                            setCurrentFiles(files)
                            toast.success("데이터가 워크스페이스에 로드되었습니다.")
                        }}
                        mySub={mySub}
                    />

                    <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
                        {(isMentor && !isReviewMode) ? (
                            <MentorReviewTerminal
                                submissions={submissions}
                                onReview={(sub) => {
                                    setCurrentFiles(sub.files)
                                    setReviewingUser(sub.users?.display_name || sub.users?.name || "Anonymous")
                                    setIsReviewMode(true)
                                }}
                                feedbackTexts={feedbackTexts}
                                onFeedbackChange={(subId, text) => setFeedbackTexts(prev => ({ ...prev, [subId]: text }))}
                                onFinalize={handleFeedback}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
                                {problem.submission_format === 'code' ? (
                                    <>
                                        <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-background/50 backdrop-blur-md shrink-0 z-10">
                                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                                                <button
                                                    onClick={() => setActiveTab('code')}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'code' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    IDE
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('preview')}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    LIVE
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isMentor ? (
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                                                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">검토 중</span>
                                                            <span className="text-[10px] font-bold text-foreground font-suit tracking-tight uppercase">{reviewingUser}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setIsReviewMode(false)}
                                                            className="h-9 px-4 rounded-xl bg-foreground text-background text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-white/5"
                                                        >
                                                            <ArrowLeft className="w-3.5 h-3.5" />
                                                            검토 종료
                                                        </button>
                                                    </div>
                                                ) : problem?.allow_file_addition && (
                                                    <button
                                                        onClick={() => {
                                                            toast.custom((t) => (
                                                                <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] shadow-2xl flex flex-col gap-5 min-w-[300px] animate-in fade-in slide-in-from-bottom-2 duration-500 backdrop-blur-2xl">
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">New Entry</p>
                                                                        <p className="text-[8px] text-neutral-600 font-bold uppercase tracking-widest">Workspace Expansion</p>
                                                                    </div>
                                                                    <input
                                                                        autoFocus
                                                                        placeholder="FILE NAME..."
                                                                        className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-neutral-900"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                                if (val) {
                                                                                    setCurrentFiles((prev: any) => ({ ...prev, [val]: { code: "" } }));
                                                                                    toast.dismiss(t);
                                                                                    toast.success(`${val.toUpperCase()} REGISTERED`);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button onClick={() => toast.dismiss(t)} className="text-[9px] font-black text-neutral-700 uppercase tracking-widest hover:text-white transition-colors">Abort</button>
                                                                    </div>
                                                                </div>
                                                            ), { duration: Infinity })
                                                        }}
                                                        className="p-2 text-muted-foreground hover:text-foreground transition-all hover:bg-white/5 rounded-lg"
                                                        title="Add Asset"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setShowExplorer(!showExplorer)}
                                                    className={`p-2 transition-all rounded-lg ${showExplorer ? 'bg-white/5 text-foreground border border-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                                                    title="Toggle Sidebar"
                                                >
                                                    <PanelLeft className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <SandpackLayout className="flex-1 !border-none !rounded-none !bg-transparent flex h-full overflow-hidden min-h-0 relative">
                                            <div className={`flex flex-1 overflow-hidden h-full min-h-0 ${activeTab !== 'code' ? 'hidden' : 'flex'}`}>
                                                {showExplorer && (
                                                    <div className="w-60 border-r border-border bg-background/50 flex flex-col shrink-0">
                                                        <div className="px-5 py-4 border-b border-border flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 font-suit">
                                                            <FolderOpen className="w-3.5 h-3.5" />
                                                            파일 탐색기
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto pt-2 custom-scrollbar">
                                                            <SandpackFileExplorer />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex-1 flex flex-col bg-background overflow-hidden">
                                                    <SandpackCodeEditor
                                                        showLineNumbers
                                                        showInlineErrors
                                                        showTabs={true}
                                                        closableTabs
                                                        className="!h-full"
                                                        readOnly={isMentor}
                                                    />
                                                </div>
                                            </div>

                                            <div className={`flex-1 flex flex-col relative h-full overflow-hidden bg-white ${activeTab !== 'preview' ? 'hidden' : 'flex'}`}>
                                                <div className="flex-1 flex flex-col min-h-0">
                                                    <SandpackPreview
                                                        className="flex-1 !max-h-none"
                                                        showNavigator={false}
                                                    />
                                                    <div className="h-1/3 border-t border-border bg-background overflow-hidden flex flex-col">
                                                        <div className="px-5 py-3 border-b border-border bg-background flex items-center gap-2">
                                                            <SquareTerminal className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-suit">실행 결과</span>
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                            <SandpackConsole />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </SandpackLayout>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 lg:p-24 text-center bg-background">
                                        <div className="glass border border-border/50 rounded-[48px] p-12 lg:p-20 space-y-10 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-700">
                                            <div className="w-20 h-20 mx-auto rounded-3xl bg-secondary border border-border flex items-center justify-center text-muted-foreground/30 shadow-inner">
                                                {problem.submission_format === 'file' ? <FileJson className="w-10 h-10" /> : <Terminal className="w-10 h-10" />}
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-3xl font-bold font-suit tracking-tighter text-foreground">직접 입력 필요</h3>
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-relaxed max-w-sm mx-auto opacity-60">이 과제는 터미널 또는 텍스트 입력기를 통한 직접 제출이 필요합니다.</p>
                                            </div>
                                            <div className="w-full">
                                                <textarea
                                                    readOnly={isMentor}
                                                    value={typeof currentFiles === 'string' ? currentFiles : JSON.stringify(currentFiles, null, 2)}
                                                    onChange={(e) => {
                                                        if (isMentor) return
                                                        try { setCurrentFiles(JSON.parse(e.target.value)) } catch (err) { setCurrentFiles(e.target.value) }
                                                    }}
                                                    className="w-full p-8 bg-secondary border border-border rounded-[32px] text-xs font-mono h-80 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground/80 leading-relaxed overflow-y-auto custom-scrollbar resize-none"
                                                    placeholder="// initialize packet transmission..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SandpackProvider>

            {viewingSub && (
                <SubmissionDetailModal
                    viewingSub={viewingSub}
                    onClose={() => setViewingSub(null)}
                    isMentor={isMentor}
                    onRestore={(files) => {
                        setCurrentFiles(files)
                        setViewingSub(null)
                        if (isMentor) setIsReviewMode(true)
                        toast.success(isMentor ? "코드가 리뷰 터미널에 마운트되었습니다." : "코드가 에디터에 로드되었습니다.")
                    }}
                />
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                
                .sp-layout { 
                  height: 100% !important; 
                  flex: 1; 
                  display: flex; 
                  flex-direction: column; 
                  border: none !important; 
                  border-radius: 0 !important; 
                  background: transparent !important; 
                }
                .sp-wrapper { height: 100% !important; flex: 1; display: flex; flex-direction: column; }
                .sp-stack { height: 100% !important; flex: 1; display: flex; flex-direction: column; }
                
                .sp-file-explorer { 
                    background: transparent !important; 
                    padding: 12px 0 !important;
                }
                .sp-explorer-file { 
                    padding: 12px 20px !important; 
                    border-radius: 12px !important; 
                    margin: 4px 16px !important; 
                    font-weight: 700 !important; 
                    font-family: 'SUIT', sans-serif !important;
                    font-size: 11px !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    color: rgba(255, 255, 255, 0.3) !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                    border: 1px solid transparent !important;
                }
                .sp-explorer-file:hover {
                    background: rgba(255, 255, 255, 0.03) !important;
                    color: rgba(255, 255, 255, 0.6) !important;
                    border-color: rgba(255, 255, 255, 0.05) !important;
                }
                .sp-explorer-file[data-active="true"] { 
                    background: rgba(255, 255, 255, 0.05) !important; 
                    color: #fff !important; 
                    border-color: rgba(255, 255, 255, 0.1) !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
                }

                .sp-explorer-file::before {
                    content: '';
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                    flex-shrink: 0;
                    opacity: 0.4;
                }
                .sp-explorer-file[data-active="true"]::before {
                    opacity: 1;
                    box-shadow: 0 0 12px currentColor;
                }
                
                .sp-explorer-file[title$=".tsx"]::before, .sp-explorer-file[title$=".ts"]::before { color: #3178c6 !important; }
                .sp-explorer-file[title$=".js"]::before { color: #f7df1e !important; }
                .sp-explorer-file[title$=".css"]::before { color: #2965f1 !important; }
                .sp-explorer-file[title$=".html"]::before { color: #e34f26 !important; }
                .sp-explorer-file[title$=".json"]::before { color: #fff !important; }

                .sp-cm-editor { 
                    font-family: 'JetBrains Mono', 'Fira Code', monospace !important; 
                    font-size: 13px !important; 
                    height: 100% !important; 
                }
                
                .sp-tabs { 
                    background: rgba(0, 0, 0, 0.4) !important; 
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important; 
                    padding: 0 16px !important; 
                    height: 52px !important;
                    display: flex !important;
                    align-items: center !important;
                    backdrop-blur: 20px !important;
                }
                .sp-tab-button { 
                    background: transparent !important; 
                    border: none !important; 
                    color: rgba(255, 255, 255, 0.2) !important; 
                    font-weight: 700 !important; 
                    font-family: 'SUIT', sans-serif !important;
                    font-size: 10px !important; 
                    text-transform: uppercase !important; 
                    letter-spacing: 0.15em !important; 
                    padding: 0 24px !important;
                    height: 100% !important;
                    transition: all 0.3s ease !important;
                    position: relative !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .sp-tab-button:hover {
                    color: rgba(255, 255, 255, 0.5) !important;
                }
                .sp-tab-button[data-active="true"] { 
                    color: #fff !important; 
                    background: transparent !important; 
                }
                .sp-tab-button[data-active="true"]::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 20px;
                    right: 20px;
                    height: 2px;
                    background: #fff;
                    border-radius: 2px 2px 0 0;
                    box-shadow: 0 0 15px rgba(255,255,255,0.5);
                }
                .sp-tab-close {
                    margin-left: 10px !important;
                    opacity: 0.2 !important;
                    transition: all 0.2s ease !important;
                }
                .sp-tab-button:hover .sp-tab-close {
                    opacity: 1 !important;
                }

                .sp-preview-container { background: white !important; }
                .prose-container .bn-editor-custom { background: transparent !important; }
              `}</style>
        </div>
    )
}
