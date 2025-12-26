import { useState, useEffect } from "react"
import { Check, X, AlertCircle, Loader2 } from "lucide-react"

type QuizQuestion = {
    id: string
    type: 'short' | 'multiple' | 'essay'
    question: string
    options: string[]
    answer?: string
}

interface QuizSolverProps {
    questions: QuizQuestion[]
    mySubmission?: any
    onSubmit: (answers: Record<string, string>) => void
    submitting: boolean
    isMentor: boolean
}

export function QuizSolver({ questions, mySubmission, onSubmit, submitting, isMentor }: QuizSolverProps) {
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [score, setScore] = useState<{ total: number, earned: number } | null>(null)
    const [currentPage, setCurrentPage] = useState(0)

    const ITEMS_PER_PAGE = 5
    const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE)
    const currentQuestions = questions.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

    useEffect(() => {
        if (mySubmission && mySubmission.files && mySubmission.files['answers.json']) {
            try {
                const savedAnswers = JSON.parse(mySubmission.files['answers.json'].code || mySubmission.files['answers.json'])
                setAnswers(savedAnswers)

                // Calculate score if submitted
                let earned = 0
                questions.forEach(q => {
                    if (q.type !== 'essay' && savedAnswers[q.id]?.trim() === q.answer?.trim()) {
                        earned++
                    }
                })
                setScore({ total: questions.length, earned })
            } catch (e) {
                console.error("Failed to parse saved answers", e)
            }
        }
    }, [mySubmission, questions])

    const handleSubmit = () => {
        // Calculate provisional score for immediate feedback
        let earned = 0
        questions.forEach(q => {
            if (q.type !== 'essay' && answers[q.id]?.trim() === q.answer?.trim()) {
                earned++
            }
        })
        setScore({ total: questions.length, earned })

        onSubmit(answers)
    }

    const getStatusColor = (q: QuizQuestion, userAnswer: string) => {
        if (!mySubmission && !score && !isMentor) return "border-border/50 bg-white/[0.02]"
        if (q.type === 'essay') return "border-primary/20 bg-primary/5"
        const isCorrect = userAnswer?.trim() === q.answer?.trim()

        if (!userAnswer && isMentor) return "border-border/50 bg-white/[0.02]"

        return isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
    }

    return (
        <div className="max-w-3xl mx-auto space-y-12 pb-32">
            {score && (
                <div className="glass border border-border/50 rounded-[40px] p-10 lg:p-14 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20"><Check className="w-4 h-4 text-primary" /></div>
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50 font-suit">Assessment Analysis Result</h3>
                        </div>
                        <p className="text-4xl lg:text-5xl font-bold text-foreground font-suit tracking-tighter">
                            {score.earned} <span className="text-xl text-muted-foreground font-medium uppercase tracking-widest ml-1">/ {score.total} Correct</span>
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {currentQuestions.map((q, idx) => {
                    const globalIdx = currentPage * ITEMS_PER_PAGE + idx
                    const savedAnswer = answers[q.id]
                    const isResultMode = isMentor || !!mySubmission || !!score
                    const isCorrect = savedAnswer?.trim() === q.answer?.trim()

                    return (
                        <div key={q.id} className={`p-10 lg:p-12 rounded-[40px] border transition-all duration-500 ${isResultMode ? getStatusColor(q, savedAnswer) : 'border-border/50 bg-white/[0.02]'} relative overflow-hidden group/q shadow-xl`}>
                            {isResultMode && q.type !== 'essay' && (
                                <div className="absolute top-10 right-10">
                                    {(isCorrect || (isMentor && !savedAnswer)) ? (
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400" title={isMentor && !savedAnswer ? "정답 경로" : "확인됨"}>
                                            <Check className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center text-red-400">
                                            <X className="w-5 h-5 stroke-[3]" />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest font-suit border ${isResultMode && q.type !== 'essay'
                                        ? ((isCorrect || (isMentor && !savedAnswer))
                                            ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/20'
                                            : 'bg-red-400/5 text-red-400 border-red-400/20')
                                        : 'bg-white/5 text-muted-foreground/60 border-white/10'
                                        }`}>
                                        {q.type === 'short' ? '간단' : q.type === 'multiple' ? '선택' : '서술'} Q.{globalIdx + 1}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-foreground leading-tight tracking-tight pr-12 font-suit">{q.question}</h3>

                                <div className="pt-2">
                                    {q.type === 'multiple' ? (
                                        <div className="grid gap-3">
                                            {q.options.map((opt, optIdx) => (
                                                <button
                                                    key={optIdx}
                                                    onClick={() => !isResultMode && setAnswers({ ...answers, [q.id]: opt })}
                                                    disabled={isResultMode}
                                                    className={`w-full p-6 lg:p-7 rounded-[24px] border text-left text-sm font-semibold transition-all flex items-center gap-5 group/opt ${answers[q.id] === opt
                                                        ? (isResultMode
                                                            ? (isCorrect
                                                                ? 'bg-emerald-400/5 border-emerald-400/50 text-emerald-100'
                                                                : 'bg-red-400/5 border-red-400/50 text-red-100')
                                                            : 'bg-foreground text-background border-foreground shadow-xl shadow-white/10')
                                                        : (isResultMode && q.answer === opt
                                                            ? 'bg-emerald-400/5 border-emerald-400/30 text-emerald-200'
                                                            : 'bg-white/[0.03] border-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/[0.05]')
                                                        } ${isResultMode && q.answer === opt && !isCorrect ? 'ring-1 ring-emerald-400/50' : ''}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${answers[q.id] === opt ? 'border-current' : 'border-white/10 group-hover/opt:border-white/20'}`}>
                                                        {answers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-current" />}
                                                    </div>
                                                    <span className="flex-1 font-suit tracking-tight">{opt}</span>
                                                    {isResultMode && q.answer === opt && (
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">정답 경로</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="relative group/input">
                                                <input
                                                    type="text"
                                                    value={answers[q.id] || ""}
                                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                    readOnly={isResultMode}
                                                    placeholder="Awaiting input..."
                                                    className={`w-full p-6 lg:p-7 rounded-[24px] bg-white/[0.03] border outline-none transition-all font-medium text-base font-suit ${isResultMode
                                                        ? (isCorrect ? 'border-emerald-400/30 text-emerald-100' : 'border-red-400/30 text-red-100')
                                                        : 'border-white/5 focus:border-white/20 text-foreground'
                                                        }`}
                                                />
                                            </div>
                                            {isResultMode && (isMentor || !isCorrect) && (
                                                <div className="flex items-center gap-3 px-6 py-4 bg-emerald-400/5 border border-emerald-400/10 rounded-2xl animate-in fade-in slide-in-from-left-2 duration-500">
                                                    <AlertCircle className="w-4 h-4 text-emerald-400/50" />
                                                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest font-suit">
                                                        Authorized: <span className="ml-2 font-mono text-emerald-300 font-normal normal-case">{q.answer}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-border/50">
                <div className="flex items-center gap-4">
                    <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] font-suit">
                        단계 {currentPage + 1} / {totalPages}
                    </div>
                </div>

                <div className="flex gap-4">
                    {currentPage > 0 && (
                        <button
                            onClick={() => {
                                setCurrentPage(p => p - 1)
                                const container = document.querySelector('.overflow-y-auto')
                                if (container) container.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="h-14 px-8 rounded-2xl bg-secondary border border-border text-muted-foreground font-bold text-xs uppercase tracking-widest hover:text-foreground hover:bg-accent transition-all active:scale-95 font-suit shadow-lg"
                        >
                            이전
                        </button>
                    )}

                    {currentPage < totalPages - 1 ? (
                        <button
                            onClick={() => {
                                setCurrentPage(p => p + 1)
                                const container = document.querySelector('.overflow-y-auto')
                                if (container) container.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="h-14 px-10 rounded-2xl bg-foreground text-background font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 font-suit shadow-xl shadow-white/5"
                        >
                            다음
                        </button>
                    ) : (
                        !mySubmission && !score && !isMentor && (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="h-14 px-12 rounded-2xl bg-foreground text-background font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 font-suit shadow-xl shadow-white/5 flex items-center justify-center gap-4"
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>최종 제출하기</span>
                                        <Check className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
