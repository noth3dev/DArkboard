"use client"

import { X, Eye, Files } from "lucide-react"
import { Submission } from "./types"

interface SubmissionDetailModalProps {
    viewingSub: Submission
    onClose: () => void
    isMentor: boolean
    onRestore: (files: any) => void
}

export const SubmissionDetailModal = ({ viewingSub, onClose, isMentor, onRestore }: SubmissionDetailModalProps) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-6xl glass border border-border/50 rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 lg:p-10 border-b border-border/50 flex items-center justify-between shrink-0 bg-background/50">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-foreground shrink-0 shadow-inner">
                            <Eye className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                            <h2 className="text-2xl font-bold text-foreground font-suit tracking-tighter leading-none uppercase">제출 상세 정보</h2>
                            <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest font-suit">{new Date(viewingSub.submitted_at).toLocaleString()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-secondary rounded-2xl border border-border text-muted-foreground hover:text-foreground transition-all active:scale-95 group">
                        <X className="w-6 h-6 transition-transform group-hover:rotate-90" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 lg:p-14 custom-scrollbar bg-background/20">
                    <div className="max-w-4xl mx-auto space-y-16">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-border/50 space-y-3 shadow-sm hover:border-border transition-all">
                                <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] font-suit">상태</p>
                                <p className={`text-lg font-bold uppercase tracking-tight font-suit ${viewingSub.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                                    }`}>{viewingSub.status}</p>
                            </div>
                            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-border/50 space-y-3 shadow-sm hover:border-border transition-all">
                                <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] font-suit">파일 개수</p>
                                <p className="text-lg font-bold text-foreground uppercase tracking-tight font-suit">{(viewingSub.files ? Object.keys(viewingSub.files).length : 0)}개</p>
                            </div>
                            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-border/50 space-y-3 shadow-sm hover:border-border transition-all">
                                <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] font-suit">제출자</p>
                                <p className="text-lg font-bold text-foreground uppercase tracking-tight font-suit truncate">{viewingSub.users?.display_name || viewingSub.users?.name || "익명"}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2 opacity-40">
                                <Files className="w-4 h-4 text-muted-foreground" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] font-suit">코드 구성 정보</span>
                            </div>
                            <div className="grid gap-6">
                                {viewingSub.files && Object.keys(viewingSub.files).map(path => (
                                    <div key={path} className="rounded-[32px] border border-border/50 bg-background/40 overflow-hidden group/file shadow-sm hover:border-border transition-all">
                                        <div className="px-8 py-4 bg-white/[0.03] border-b border-border/50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${path.endsWith('.tsx') || path.endsWith('.ts') ? 'bg-[#3178c6]' :
                                                    path.endsWith('.js') ? 'bg-[#f7df1e]' :
                                                        path.endsWith('.css') ? 'bg-[#2965f1]' :
                                                            path.endsWith('.html') ? 'bg-[#e34f26]' :
                                                                'bg-foreground/50'
                                                    }`} />
                                                <span className="text-xs font-mono text-foreground/60 group-hover/file:text-foreground transition-colors font-medium">{path}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground/30 tabular-nums uppercase">{viewingSub.files?.[path]?.code?.length || 0} Bytes</span>
                                        </div>
                                        <pre className="p-10 text-sm font-mono text-foreground/80 bg-background overflow-x-auto custom-scrollbar leading-relaxed">
                                            <code>{viewingSub.files?.[path]?.code || viewingSub.files?.[path]}</code>
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 lg:p-10 border-t border-border/50 bg-background/50 flex flex-col sm:flex-row justify-end gap-4 shrink-0">
                    <button
                        onClick={onClose}
                        className="h-14 px-10 rounded-2xl text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-all font-suit"
                    >
                        닫기
                    </button>
                    <button
                        onClick={() => onRestore(viewingSub.files)}
                        className="h-14 px-12 rounded-2xl bg-foreground text-background text-[10px] font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-white/5 font-suit"
                    >
                        {isMentor ? "코드 검토 환경 초기화" : "에디터로 불러오기"}
                    </button>
                </div>
            </div>
        </div>
    )
}
