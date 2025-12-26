"use client"

import { Code2, Files, Eye, Maximize2, MessageSquare } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Problem, Submission } from "./types"

interface ProblemDescriptionProps {
    problem: Problem
    submissions: Submission[]
    isMentor: boolean
    onViewSub: (sub: Submission) => void
    onLoadCode: (files: any) => void
    mySub?: Submission
}

export const ProblemDescription = ({
    problem,
    submissions,
    isMentor,
    onViewSub,
    onLoadCode,
    mySub
}: ProblemDescriptionProps) => {
    return (
        <div className="w-[480px] flex flex-col border-r border-border/50 bg-background/50 backdrop-blur-3xl shrink-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-10 lg:p-14 space-y-16">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em] font-suit">
                            <Code2 className="w-3.5 h-3.5" /> 과제 상세 설명
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground font-suit leading-tight">{problem.title}</h2>
                        <div className="w-16 h-1 bg-primary/20 rounded-full" />
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-12 mb-6 text-foreground font-suit tracking-tighter" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-10 mb-5 text-foreground font-suit tracking-tighter" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-8 mb-4 text-foreground font-suit tracking-tighter" {...props} />,
                                p: ({ node, ...props }) => <p className="text-sm text-foreground/70 mb-6 leading-relaxed font-medium" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-6 space-y-2.5 text-foreground/70" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-6 space-y-2.5 text-foreground/70" {...props} />,
                                li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                                code: ({ node, ...props }) => <code className="bg-secondary px-2 py-0.5 rounded text-foreground font-mono text-xs border border-border" {...props} />,
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-primary/20 pl-6 py-2 my-8 italic text-muted-foreground font-medium bg-primary/5 rounded-r-2xl" {...props} />,
                                hr: () => <hr className="border-border/50 my-12" />,
                            }}
                        >
                            {(() => {
                                const rawDesc = problem.description || ""
                                try {
                                    const parsed = JSON.parse(rawDesc)
                                    if (Array.isArray(parsed)) {
                                        return parsed.map((block: any) => {
                                            if (block.type === 'heading') {
                                                const level = "#".repeat(block.props?.level || 1)
                                                const text = block.content?.map((c: any) => c.text).join("") || ""
                                                return `${level} ${text}`
                                            }
                                            if (block.type === 'paragraph') {
                                                return block.content?.map((c: any) => c.text).join("") || ""
                                            }
                                            if (block.type === 'bulletListItem') {
                                                return "- " + (block.content?.map((c: any) => c.text).join("") || "")
                                            }
                                            if (block.type === 'numberedListItem') {
                                                return "1. " + (block.content?.map((c: any) => c.text).join("") || "")
                                            }
                                            if (block.type === 'divider') {
                                                return "---"
                                            }
                                            return ""
                                        }).join("\n\n")
                                    }
                                } catch (e) { }
                                return rawDesc
                            })()}
                        </ReactMarkdown>

                        {!isMentor && (
                            <div className="mt-20 space-y-16">
                                {submissions.length > 0 && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Files className="w-4 h-4 text-muted-foreground/50" /></div>
                                            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em] font-suit">제출 기록</span>
                                        </div>
                                        <div className="grid gap-3">
                                            {submissions.map((sub, idx) => (
                                                <div key={sub.id} className="p-5 rounded-2xl bg-white/[0.02] border border-border/50 flex items-center justify-between group/sub transition-all hover:bg-white/[0.04] hover:border-border">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-foreground/80 font-suit">
                                                            #{submissions.length - idx}번 제출
                                                        </span>
                                                        <span className="text-[10px] font-medium text-muted-foreground/40 tabular-nums">
                                                            {new Date(sub.submitted_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${sub.status === 'completed' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' : 'text-amber-400 bg-amber-400/5 border-amber-400/20'
                                                            }`}>
                                                            {sub.status}
                                                        </span>
                                                        <button
                                                            onClick={() => onViewSub(sub)}
                                                            className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all border border-border"
                                                            title="제출 내용 확인"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onLoadCode(sub.files)}
                                                            className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all border border-border"
                                                            title="에디터로 불러오기"
                                                        >
                                                            <Maximize2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {mySub?.feedback && (
                                    <div className="glass border border-border/50 rounded-[32px] p-8 lg:p-10 relative overflow-hidden group/note shadow-2xl">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20"><MessageSquare className="w-4 h-4 text-primary" /></div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-suit">선생님 피드백</span>
                                        </div>
                                        <div className="text-sm text-foreground/80 leading-relaxed font-medium markdown-feedback">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{mySub.feedback}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-8 border-t border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-1.5 font-suit">제출 프로토콜</span>
                        <span className="text-[10px] font-bold text-foreground uppercase tracking-tight font-suit">{problem.submission_format === 'code' ? '코드 상호작용' : '정적 데이터 파이프라인'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground/20 text-[9px] font-bold uppercase tracking-widest font-suit">
                    homewArk ARCHIVE v2.0
                </div>
            </div>
        </div>
    )
}
