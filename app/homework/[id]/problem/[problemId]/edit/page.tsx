"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import {
    ChevronLeft,
    Save,
    Plus,
    Trash2,
    FileCode,
    Settings,
    AlertCircle,
    Code2,
    FileText,
    HelpCircle,
    Layout,
    Layers,
    Sparkles,
    CheckCircle2,
    ToggleLeft,
    ToggleRight,
    X
} from "lucide-react"
import { useState, useEffect, useCallback, use } from "react"
import { getSupabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"

// Dynamic import for BlockNote to avoid SSR issues
// BlockNote removed

type QuizQuestion = {
    id: string
    type: 'short' | 'multiple' | 'essay'
    question: string
    options: string[]
    answer?: string
}

const QuizBuilder = ({ questions, setQuestions }: { questions: QuizQuestion[], setQuestions: (q: QuizQuestion[]) => void }) => {
    const addQuestion = (type: 'short' | 'multiple' | 'essay') => {
        setQuestions([...questions, {
            id: Math.random().toString(36).substr(2, 9),
            type,
            question: "",
            options: type === 'multiple' ? ["옵션 1"] : []
        }])
    }

    const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
    }

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id))
    }

    const addOption = (qId: string) => {
        const q = questions.find(q => q.id === qId)
        if (q && q.type === 'multiple') {
            updateQuestion(qId, { options: [...q.options, `옵션 ${q.options.length + 1}`] })
        }
    }

    const updateOption = (qId: string, idx: number, value: string) => {
        const q = questions.find(q => q.id === qId)
        if (q && q.type === 'multiple') {
            const newOptions = [...q.options]
            const oldOption = newOptions[idx]
            newOptions[idx] = value

            const updates: Partial<QuizQuestion> = { options: newOptions }
            if (q.answer === oldOption) {
                updates.answer = value // Keep answer in sync
            }
            updateQuestion(qId, updates)
        }
    }

    const removeOption = (qId: string, idx: number) => {
        const q = questions.find(q => q.id === qId)
        if (q && q.type === 'multiple' && q.options.length > 1) {
            updateQuestion(qId, { options: q.options.filter((_, i) => i !== idx) })
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-neutral-400">로직 커널 매트릭스</h3>
                <div className="flex gap-2">
                    <button onClick={() => addQuestion('short')} className="px-4 py-2 bg-neutral-900 rounded-xl text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all uppercase tracking-widest">+ 단답형</button>
                    <button onClick={() => addQuestion('multiple')} className="px-4 py-2 bg-neutral-900 rounded-xl text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all uppercase tracking-widest">+ 객관식</button>
                    <button onClick={() => addQuestion('essay')} className="px-4 py-2 bg-neutral-900 rounded-xl text-[10px] font-bold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all uppercase tracking-widest">+ 서술형</button>
                </div>
            </div>

            <div className="grid gap-6">
                {questions.map((q, idx) => (
                    <div key={q.id} className="p-8 rounded-[32px] bg-neutral-950/50 border border-neutral-900 space-y-6 group hover:border-neutral-800 transition-all">
                        <div className="flex items-start justify-between gap-4">
                            <span className="px-3 py-1 bg-neutral-900 rounded-lg text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                                {q.type === 'short' ? '단답형' : q.type === 'multiple' ? '객관식' : '서술형'} Q.{idx + 1}
                            </span>
                            <button onClick={() => removeQuestion(q.id)} className="p-2 text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <input
                            type="text"
                            value={q.question}
                            onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                            placeholder="문제를 입력하세요..."
                            className="w-full bg-transparent text-lg font-bold placeholder:text-neutral-800 outline-none border-b border-transparent focus:border-neutral-800 transition-all pb-2"
                        />

                        {q.type === 'multiple' && (
                            <div className="space-y-3 pl-4 border-l-2 border-neutral-900">
                                {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-3 group/opt">
                                        <div
                                            className={`w-3 h-3 rounded-full cursor-pointer border ${q.answer === opt ? 'bg-blue-500 border-blue-500' : 'border-neutral-700 hover:border-neutral-500'}`}
                                            onClick={() => updateQuestion(q.id, { answer: opt })}
                                            title="정답으로 설정"
                                        />
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                                            className="flex-1 bg-transparent text-sm text-neutral-400 focus:text-white outline-none"
                                            placeholder={`옵션 ${optIdx + 1}`}
                                        />
                                        <button onClick={() => removeOption(q.id, optIdx)} className="text-neutral-700 hover:text-neutral-500 opacity-0 group-hover/opt:opacity-100 transition-all">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => addOption(q.id)} className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest mt-2">+ 옵션 추가</button>
                            </div>
                        )}

                        {(q.type === 'short' || q.type === 'essay') && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">모범 답안</label>
                                <input
                                    type="text"
                                    value={q.answer || ""}
                                    onChange={(e) => updateQuestion(q.id, { answer: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-900/30 rounded-xl text-sm text-neutral-300 outline-none border border-neutral-800 focus:border-neutral-700"
                                    placeholder={q.type === 'short' ? "정답 단어를 입력하세요" : "핵심 키워드나 모범 답안을 입력하세요"}
                                />
                            </div>
                        )}
                    </div>
                ))}
                {questions.length === 0 && (
                    <div className="p-12 rounded-[32px] border border-dashed border-neutral-900 flex flex-col items-center justify-center gap-4 text-neutral-600">
                        <Sparkles className="w-6 h-6 opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">로직 커널 초기화 필요</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function ProblemEditPage({ params }: { params: Promise<{ id: string, problemId: string }> }) {
    const { id, problemId } = use(params)
    const isNew = problemId === "new"
    const { user, loading, role } = useAuth()
    const router = useRouter()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [format, setFormat] = useState("code")
    const [sandpackTemplate, setSandpackTemplate] = useState("static")
    const [allowFileAddition, setAllowFileAddition] = useState(false)
    const [files, setFiles] = useState<Record<string, { code: string }>>({
        "index.html": { code: "<!-- Write your code here -->" }
    })
    const [questions, setQuestions] = useState<QuizQuestion[]>([])
    const [saving, setSaving] = useState(false)
    const [loadingData, setLoadingData] = useState(!isNew)

    const jsonToMarkdown = (jsonStr: string) => {
        try {
            const blocks = JSON.parse(jsonStr)
            if (Array.isArray(blocks)) {
                return blocks.map((block: any) => {
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
        } catch (e) {
            return jsonStr
        }
        return jsonStr
    }

    const fetchData = useCallback(async () => {
        if (isNew || !user) return
        try {
            setLoadingData(true)
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("problems")
                .select("*")
                .eq("id", problemId)
                .single()

            if (error) throw error
            setTitle(data.title)

            // Auto-convert JSON to Markdown if needed
            const desc = data.description || ""
            if (desc.startsWith("[{") && desc.endsWith("}]")) {
                setDescription(jsonToMarkdown(desc))
            } else {
                setDescription(desc)
            }

            setFormat(data.submission_format)
            setSandpackTemplate(data.sandpack_template || "static")
            setAllowFileAddition(data.allow_file_addition || false)
            if (data.files) {
                setFiles(data.files)
                if (data.files['quiz.json']) {
                    try {
                        setQuestions(JSON.parse(data.files['quiz.json'].code))
                    } catch (e) {
                        console.error("Failed to parse quiz data", e)
                    }
                }
            }

        } catch (err) {
            console.error("Error fetching problem:", err)
            router.push(`/homework/${id}`)
        } finally {
            setLoadingData(false)
        }
    }, [user, problemId, isNew, id, router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSave = async () => {
        if (!title.trim()) {
            alert("식별 정보(Title)를 입력해주세요.")
            return
        }
        setSaving(true)
        try {
            const supabase = getSupabase()
            const problemData = {
                homework_id: id,
                title,
                description,
                submission_format: format,
                sandpack_template: sandpackTemplate,
                allow_file_addition: allowFileAddition,
                files: format === 'quiz' ? { "quiz.json": { code: JSON.stringify(questions) } } : files
            }

            if (isNew) {
                const { error } = await supabase.from("problems").insert(problemData)
                if (error) throw error
            } else {
                const { error } = await supabase.from("problems").update(problemData).eq("id", problemId)
                if (error) throw error
            }

            router.refresh()
            router.push(`/homework/${id}/edit`)
        } catch (err) {
            console.error("Error saving problem:", err)
            alert("문제 저장 중 오류가 발생했습니다.")
            setSaving(false)
        }
    }

    const addFile = () => {
        const fileName = prompt("파일 이름을 입력하세요 (예: styles.css)")
        if (fileName && !files[fileName]) {
            setFiles({ ...files, [fileName]: { code: "" } })
        }
    }

    const removeFile = (name: string) => {
        if (Object.keys(files).length <= 1) return
        const newFiles = { ...files }
        delete newFiles[name]
        setFiles(newFiles)
    }

    if (loading || loadingData) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 font-light uppercase text-xs tracking-widest">로딩 중...</div>
    if (!user) return <AuthForm />
    if (role !== 'mentor') {
        router.push(`/homework/${id}`)
        return null
    }

    return (
        <div className="min-h-[calc(100vh-65px)] bg-black text-white overflow-y-auto custom-scrollbar font-pretendard">
            <div className="max-w-6xl mx-auto p-12 space-y-16 pb-32">
                {/* Navigation Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.back()} className="group p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all active:scale-95">
                            <ChevronLeft className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">Mission Designer</span>
                                <h1 className="text-xl font-black uppercase tracking-tighter">{isNew ? "새로운 문제 생성" : "문제 설계 수정"}</h1>
                            </div>
                            <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.2em] mt-1.5 opacity-60">정밀한 기술 평가를 위한 구조적 파라미터 설정</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="group flex items-center gap-2.5 px-8 py-4 bg-white text-black text-[11px] font-black rounded-2xl hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em]"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "배포 중..." : "문제 저장"}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Main Content Area */}
                    <div className="lg:col-span-8 space-y-16">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 ml-2">
                                <div className="w-1 h-1 rounded-full bg-neutral-700" />
                                <label className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.2em]">식별 정보</label>
                            </div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="라면 몰래먹고오기"
                                className="w-full px-8 py-6 bg-transparent border-b border-neutral-800 text-2xl font-black outline-none focus:border-white transition-all placeholder:text-neutral-900 tracking-tighter"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between ml-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-1 rounded-full bg-neutral-700" />
                                    <label className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.2em]">설명 문서</label>
                                </div>
                                <span className="text-[8px] font-black text-neutral-800 uppercase tracking-widest">MD Format Ready</span>
                            </div>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="마크다운 형식으로 설명을 작성하세요..."
                                className="w-full p-8 bg-neutral-950/50 border border-neutral-900 focus:border-neutral-700 rounded-[32px] text-[14px] text-neutral-400 outline-none transition-all resize-none leading-relaxed placeholder:text-neutral-900 font-medium min-h-[400px] custom-scrollbar"
                            />
                        </div>

                        {format === 'quiz' && (
                            <QuizBuilder questions={questions} setQuestions={setQuestions} />
                        )}
                    </div>

                    {/* Configuration Sidebar */}
                    {/* Configuration Sidebar */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-8 space-y-10">
                            <div className="p-8 rounded-[40px] bg-neutral-950 border border-neutral-900 space-y-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 px-2">
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600">핵심 엔진 설정</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'code', icon: Code2, label: 'Standard IDE' },
                                            { id: 'file', icon: FileText, label: 'Manifest Sync' },
                                            { id: 'quiz', icon: HelpCircle, label: 'Logic Kernel' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setFormat(f.id)}
                                                className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${format === f.id ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-transparent text-neutral-600 border-neutral-900 hover:border-neutral-800'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <f.icon className={`w-3.5 h-3.5 ${format === f.id ? 'text-white' : 'text-neutral-800'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{f.label}</span>
                                                </div>
                                                {format === f.id && <div className="w-1 h-1 rounded-full bg-white" />}
                                            </button>
                                        ))}
                                    </div>
                                    {format === 'code' && (
                                        <>
                                            <div className="space-y-6 pt-10 border-t border-neutral-900">
                                                <div className="flex items-center gap-3 px-2">
                                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600">환경 스택 설정</h3>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {[
                                                        { id: 'static', label: 'HTML/CSS/JS' },
                                                        { id: 'react', label: 'React TS Kernel' },
                                                        { id: 'node', label: 'Node.js Runtime' }
                                                    ].map(t => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSandpackTemplate(t.id);
                                                                if (t.id === 'react') {
                                                                    setFiles({
                                                                        "/App.tsx": { code: `export default function App() {\n  return (\n    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>\n      <h1>Hello React</h1>\n      <p>Start editing to see some magic happen!</p>\n    </div>\n  );\n}` },
                                                                        "/index.tsx": { code: `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./styles.css";\nimport App from "./App";\n\nconst root = createRoot(document.getElementById("root"));\nroot.render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);` },
                                                                        "/index.html": { code: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>` },
                                                                        "/styles.css": { code: `* { box-sizing: border-box; } body { margin: 0; }` }
                                                                    });
                                                                } else if (t.id === 'node') {
                                                                    setFiles({
                                                                        "/index.js": { code: `const http = require('http');\n\nconst hostname = '127.0.0.1';\nconst port = 3000;\n\nconst server = http.createServer((req, res) => {\n  res.statusCode = 200;\n  res.setHeader('Content-Type', 'text/plain');\n  res.end('Hello Node.js');\n});\n\nserver.listen(port, hostname, () => {\n  console.log(\`Server running at http://\${hostname}:\${port}/\`);\n});` },
                                                                        "/package.json": { code: `{\n  "name": "node-starter",\n  "version": "1.0.0",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js"\n  },\n  "dependencies": {}\n}` }
                                                                    });
                                                                } else {
                                                                    setFiles({
                                                                        "/index.html": { code: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Document</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <h1>Hello World</h1>\n    <script src="index.js"></script>\n  </body>\n</html>` },
                                                                        "/styles.css": { code: `body { font-family: sans-serif; }` },
                                                                        "/index.js": { code: `console.log("Hello World");` }
                                                                    });
                                                                }
                                                            }}
                                                            className={`px-5 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left ${sandpackTemplate === t.id ? 'bg-white text-black border-white' : 'bg-transparent border-neutral-900 text-neutral-700 hover:border-neutral-800'}`}
                                                        >
                                                            {t.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-6 pt-10 border-t border-neutral-900">
                                                <div className="flex items-center gap-3 px-2">
                                                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600">권한 설정</h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setAllowFileAddition(!allowFileAddition)}
                                                    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border transition-all ${allowFileAddition ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-transparent border-neutral-900 text-neutral-700'}`}
                                                >
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Multi-File Access</span>
                                                    {allowFileAddition ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                                </button>
                                            </div>

                                            <div className="space-y-6 pt-10 border-t border-neutral-900">
                                                <div className="flex items-center justify-between px-2">
                                                    <label className="text-[9px] text-neutral-600 font-black uppercase tracking-[0.3em]">초기 파일 구성</label>
                                                    <button onClick={addFile} className="p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white transition-all">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <div className="grid gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                    {Object.keys(files).map(name => (
                                                        <div key={name} className="group/file flex items-center justify-between p-3.5 pl-5 rounded-xl bg-neutral-950 border border-neutral-900 text-[10px] hover:border-neutral-800 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <FileCode className="w-3.5 h-3.5 text-neutral-700 group-hover/file:text-white transition-all" />
                                                                <span className="font-black text-neutral-500 font-mono group-hover/file:text-neutral-300 transition-all">{name}</span>
                                                            </div>
                                                            <button onClick={() => removeFile(name)} className="p-1.5 text-neutral-800 hover:text-white transition-colors opacity-0 group-hover/file:opacity-100">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {format === 'quiz' && (
                                        <div className="space-y-6 pt-10 border-t border-neutral-900">
                                            <div className="flex items-center gap-3 px-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600">퀴즈 구성</h3>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-4 bg-neutral-900/30 rounded-2xl border border-neutral-900">
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">총 문항 수</span>
                                                <span className="text-xl font-black text-white transform translate-y-[1px]">{questions.length}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 rounded-[32px] bg-neutral-950 border border-neutral-900 flex gap-4">
                                    <AlertCircle className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">동기화 상태</h4>
                                        <p className="text-[9px] text-neutral-700 leading-relaxed font-bold uppercase tracking-tight">
                                            미션 블루프린트 변경사항을 전파하려면 수동 배포가 필요합니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
      `}</style>
            </div>
        </div>
    )
}
