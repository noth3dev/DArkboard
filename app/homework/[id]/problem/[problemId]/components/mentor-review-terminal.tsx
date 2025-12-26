"use client"

import { Terminal, Maximize2, Files, FileJson, MessageSquare, Check } from "lucide-react"
import { Submission } from "./types"

interface MentorReviewTerminalProps {
    submissions: Submission[]
    onReview: (sub: Submission) => void
    feedbackTexts: Record<string, string>
    onFeedbackChange: (subId: string, text: string) => void
    onFinalize: (subId: string) => void
}

export const MentorReviewTerminal = ({
    submissions,
    onReview,
    feedbackTexts,
    onFeedbackChange,
    onFinalize
}: MentorReviewTerminalProps) => {
    return (
        <div className="flex-1 overflow-y-auto p-12 lg:p-20 space-y-16 custom-scrollbar bg-background">
            <div className="max-w-4xl mx-auto space-y-16 pb-32">
                <div className="flex items-center justify-between border-b border-border/50 pb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
                            <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter text-foreground font-suit">검토 분석 터미널</h2>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-[0.3em] font-suit">{submissions.length}개의 활성 제출이 감지되었습니다</p>
                    </div>
                </div>

                {submissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 glass border border-border/50 rounded-[48px] shadow-2xl opacity-50">
                        <Terminal className="w-16 h-16 mb-6 text-muted-foreground opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-muted-foreground transition-all">신호를 기다리는 중</p>
                    </div>
                ) : (
                    <div className="grid gap-12">
                        {submissions.map(sub => (
                            <div key={sub.id} className="group p-10 rounded-[48px] glass border border-border/50 hover:border-border transition-all duration-500 space-y-12 shadow-2xl">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                    <div className="flex items-center gap-8">
                                        <div className="w-20 h-20 rounded-3xl bg-secondary border border-border flex items-center justify-center text-2xl font-bold text-foreground font-suit shrink-0 shadow-inner">
                                            {sub.users?.name?.[0] || "?"}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-2xl font-bold text-foreground font-suit tracking-tight leading-none uppercase">{sub.users?.name || "익명"}</p>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-suit">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                                                <div className="w-1 h-1 rounded-full bg-border" />
                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${sub.status === 'completed' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' : 'text-amber-400 bg-amber-400/5 border-amber-400/20'
                                                    }`}>
                                                    {sub.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => onReview(sub)}
                                            className="h-14 px-8 rounded-2xl bg-foreground text-background text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-white/5 flex items-center gap-4 font-suit"
                                        >
                                            <Maximize2 className="w-4 h-4" />
                                            결과물 분석하기
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 opacity-40">
                                        <Files className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] font-suit">제출 파일 목록</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {Object.keys(sub.files || {}).slice(0, 4).map(f => (
                                            <div key={f} className="p-6 bg-white/[0.02] rounded-[24px] border border-border/50 flex items-center justify-between group/file hover:bg-white/[0.04] hover:border-border transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-2 h-2 rounded-full ${f.endsWith('.tsx') || f.endsWith('.ts') ? 'bg-[#3178c6]' :
                                                        f.endsWith('.js') ? 'bg-[#f7df1e]' :
                                                            f.endsWith('.css') ? 'bg-[#2965f1]' :
                                                                f.endsWith('.html') ? 'bg-[#e34f26]' :
                                                                    'bg-foreground/50'
                                                        }`} />
                                                    <span className="text-xs font-semibold text-foreground/60 font-mono group-hover/file:text-foreground transition-colors truncate max-w-[120px]">{f}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tabular-nums font-suit">{(sub.files?.[f]?.code?.length || 0)} Bytes</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-12 border-t border-border/50 space-y-8">
                                    <div className="flex items-center gap-4 opacity-40">
                                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] font-suit">전문가 피드백 전송</span>
                                    </div>
                                    <textarea
                                        value={feedbackTexts[sub.id] ?? sub.feedback ?? ""}
                                        onChange={(e) => onFeedbackChange(sub.id, e.target.value)}
                                        className="w-full p-8 bg-secondary/50 border border-border rounded-[32px] text-sm outline-none transition-all resize-none leading-relaxed placeholder:text-muted-foreground/20 font-medium text-foreground/80 focus:ring-2 focus:ring-primary/10 overflow-hidden min-h-[140px]"
                                        placeholder="분석 결과를 여기에 입력하세요..."
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => onFinalize(sub.id)}
                                            className="h-14 px-10 rounded-2xl bg-secondary text-foreground text-[10px] font-bold border border-border hover:bg-accent hover:border-foreground/20 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-4 font-suit"
                                        >
                                            <Check className="w-5 h-5" /> 피드백 전송 완료
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
