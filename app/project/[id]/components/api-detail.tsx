"use client"

import { useState } from "react"
import Editor from "@monaco-editor/react"
import { Activity, Check, Code, Copy, ChevronDown, ChevronRight, Lock, Info, Play, Globe, CornerDownRight, Edit2, Save, X, Trash2, Send, Loader2, Terminal } from "lucide-react"
import { Api } from "../types"
import { getSupabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useEffect, useMemo } from "react"

interface ApiDetailProps {
    api: Api
    projectId: string
    onUpdate?: () => void
    onDelete?: () => void
}

const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('homework-theme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'ff79c6' },
            { token: 'string', foreground: 'f1fa8c' },
            { token: 'number', foreground: 'bd93f9' },
            { token: 'operator', foreground: 'ff79c6' },
            { token: 'type', foreground: '8be9fd' },
            { token: 'function', foreground: '50fa7b' },
        ],
        colors: {
            'editor.background': '#030303',
            'editor.foreground': '#f8f8f2',
            'editor.lineHighlightBackground': '#0a0a0a',
            'editorCursor.foreground': '#aeafad',
            'editorWhitespace.foreground': '#3b3a32',
            'editorIndentGuide.background': '#151515',
            'editorIndentGuide.activeBackground': '#333333',
            'editorLineNumber.foreground': '#333333',
            'editorLineNumber.activeForeground': '#888888',
            'editor.selectionBackground': '#264f78',
        }
    });
}

const commonEditorOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    scrollBeyondLastLine: false,
    wordWrap: "on" as const,
    padding: { top: 16, bottom: 16 },
    lineNumbers: "on" as const,
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    renderLineHighlight: "all" as const,
    fontLigatures: true,
}

export function ApiDetail({ api, projectId, onUpdate, onDelete }: ApiDetailProps) {
    const [activeTab, setActiveTab] = useState("params")
    const [activeCodeTab, setActiveCodeTab] = useState("js-fetch")
    const [copied, setCopied] = useState(false)
    const [isAuthExpanded, setIsAuthExpanded] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState("")

    const [showDirectRun, setShowDirectRun] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [baseUrl, setBaseUrl] = useState("https://api.example.com")
    const [pathParams, setPathParams] = useState<Record<string, string>>({})
    const [queryParams, setQueryParams] = useState<Record<string, string>>({})
    const [headers, setHeaders] = useState<Record<string, string>>({
        "Authorization": "Bearer ",
        "Content-Type": "application/json"
    })
    const [requestBody, setRequestBody] = useState("")
    const [response, setResponse] = useState<any>(null)

    // Parse path parameters on mount or api change
    useEffect(() => {
        const paramsMatch = api.path.match(/\{([^}]+)\}/g)
        if (paramsMatch) {
            const initialParams: Record<string, string> = {}
            paramsMatch.forEach(p => {
                const name = p.slice(1, -1)
                initialParams[name] = ""
            })
            setPathParams(initialParams)
        } else {
            setPathParams({})
        }

        // Reset other states
        setResponse(null)
        setQueryParams({})
        if (api.request_body) {
            setRequestBody(JSON.stringify(api.request_body.example || {}, null, 2))
        } else {
            setRequestBody("")
        }
    }, [api.id, api.path])

    const handleRun = async () => {
        setIsRunning(true)
        setResponse(null)
        try {
            // Construct path
            let finalPath = api.path
            Object.entries(pathParams).forEach(([key, val]) => {
                finalPath = finalPath.replace(`{${key}}`, val || `{${key}}`)
            })

            // Construct URL
            const url = new URL(finalPath, baseUrl)
            Object.entries(queryParams).forEach(([key, val]) => {
                if (val) url.searchParams.append(key, val)
            })

            const res = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: url.toString(),
                    method: api.method,
                    headers: headers,
                    body: api.method !== "GET" && requestBody ? JSON.parse(requestBody) : undefined
                })
            })

            const data = await res.json()
            setResponse(data)
            if (data.error) throw new Error(data.error)
            toast.success("요청이 완료되었습니다.")
        } catch (err: any) {
            console.error("Execution error:", err)
            toast.error("요청 실패: " + err.message)
        } finally {
            setIsRunning(false)
        }
    }

    const methodColor = {
        GET: "text-neutral-400 bg-neutral-900 border-neutral-800",
        POST: "text-white bg-neutral-800 border-neutral-700",
        PUT: "text-neutral-300 bg-neutral-900 border-neutral-800",
        DELETE: "text-neutral-500 bg-neutral-950 border-neutral-900",
        PATCH: "text-neutral-400 bg-neutral-900 border-neutral-800",
    }[api.method as string] || "text-neutral-400 bg-neutral-900 border-neutral-800"

    const security = api.original_spec?.security || (api.components?.securitySchemes ? [{ bearerAuth: [] }] : [])

    // Helper function to resolve $ref
    const resolveRef = (ref: string): any => {
        if (!ref || !ref.startsWith('#/')) return null
        const parts = ref.substring(2).split('/')
        let current = api.components || {}
        for (const part of parts) {
            if (!current[part]) return null
            current = current[part]
        }
        return current
    }

    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteInput, setDeleteInput] = useState("")

    const generateCodeSnippet = (lang: string) => {
        const url = api.path
        // const hasAuth = security && security.length > 0 // This variable is not used in the new snippets

        switch (lang) {
            case "curl":
                return `curl -X ${api.method} "${url}" \\\n  -H "Authorization: Bearer <token>" \\\n  -H "Content-Type: application/json"`
            case "js-fetch":
                return `fetch("${url}", {\n  method: "${api.method}",\n  headers: {\n    "Authorization": "Bearer <token>",\n    "Content-Type": "application/json"\n  }\n})\n.then(r => r.json())\n.then(data => console.log(data));`
            case "python":
                return `import requests\n\nurl = "${url}"\nheaders = {"Authorization": "Bearer <token>"}\nresponse = requests.request("${api.method}", url, headers=headers)\nprint(response.json())`
            case "go":
                return `package main\n\nimport (\n  "fmt"\n  "net/http"\n)\n\nfunc main() {\n  url := "${url}"\n  req, _ := http.NewRequest("${api.method}", url, nil)\n  req.Header.Add("Authorization", "Bearer <token>")\n  res, _ := http.DefaultClient.Do(req)\n  fmt.Println(res.StatusCode)\n}`
            default: return `// Snippet for ${lang}`
        }
    }

    const copyToClipboard = (text: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("클립보드에 복사되었습니다.")
        setTimeout(() => setCopied(false), 2000)
    }

    const handleEdit = () => {
        const { id, created_at, updated_at, ...editable } = api
        setEditValue(JSON.stringify(editable, null, 2))
        setIsEditing(true)
    }

    const handleSave = async () => {
        try {
            const updatedData = JSON.parse(editValue)
            const supabase = getSupabase()
            const { error } = await supabase.from('apis').update(updatedData).eq('id', api.id)
            if (error) throw error
            toast.success("API 정보가 수정되었습니다.")
            setIsEditing(false)
            onUpdate?.()
        } catch (err) {
            toast.error("저장 실패: " + (err instanceof Error ? err.message : "알 수 없는 오류"))
        }
    }

    const handleDelete = async () => {
        if (deleteInput !== api.path) {
            toast.error("API 경로가 일치하지 않습니다.")
            return
        }

        try {
            const supabase = getSupabase()
            const { error } = await supabase.from('apis').delete().eq('id', api.id)
            if (error) throw error
            toast.success("API가 성공적으로 삭제되었습니다.")
            setIsDeleting(false)
            onDelete?.()
        } catch (err) {
            toast.error("삭제 실패")
        }
    }

    const hasParameters = api.parameters && api.parameters.length > 0
    const hasRequestBody = api.request_body && Object.keys(api.request_body).length > 0

    const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({ "200": true })
    const toggleResponse = (code: string) => {
        setExpandedResponses(prev => ({ ...prev, [code]: !prev[code] }))
    }

    if (isEditing) {
        return (
            <div className="flex flex-col h-full bg-[#030303]">
                <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-800 bg-neutral-900/50 min-h-[44px]">
                    <h2 className="text-sm font-bold text-neutral-300 tracking-widest uppercase flex items-center gap-2">
                        <Edit2 className="w-3.5 h-3.5" /> API 편집
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 text-[11px] font-medium transition-colors">취소</button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-md text-[11px] font-bold hover:bg-neutral-200 transition-colors shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                            <Save className="w-3.5 h-3.5" /> 저장하기
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden bg-[#030303] relative">
                    <Editor
                        height="100%"
                        language="json"
                        theme="homework-theme"
                        beforeMount={handleEditorWillMount}
                        value={editValue}
                        onChange={(v) => setEditValue(v || "")}
                        options={commonEditorOptions}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full overflow-hidden bg-[#030303]">
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {/* Header Section */}
                <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`flex-none px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${methodColor}`}>
                                {api.method}
                            </span>
                            <h1 className="text-xl font-medium truncate font-mono text-neutral-200">
                                {api.path}
                            </h1>
                            <button
                                onClick={() => copyToClipboard(api.path)}
                                className="p-1 text-neutral-500 hover:text-white transition-colors"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleEdit}
                                className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                title="수정"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            {!isDeleting ? (
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    className="p-2 rounded-md hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
                                    title="삭제"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1 pl-2 rounded-md animate-in fade-in slide-in-from-right-2 duration-200">
                                    <input
                                        autoFocus
                                        value={deleteInput}
                                        onChange={e => setDeleteInput(e.target.value)}
                                        placeholder="API 경로를 입력하세요"
                                        className="bg-transparent text-[11px] text-neutral-300 outline-none w-32 font-mono"
                                        onKeyDown={e => e.key === 'Enter' && handleDelete()}
                                    />
                                    <button
                                        onClick={handleDelete}
                                        className="px-2 py-1 text-[11px] bg-red-500 text-white rounded hover:bg-red-600 font-medium"
                                    >
                                        삭제
                                    </button>
                                    <button
                                        onClick={() => { setIsDeleting(false); setDeleteInput(""); }}
                                        className="p-1 text-neutral-500 hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            <button
                                disabled
                                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-500 cursor-not-allowed rounded-md text-sm font-medium transition-all"
                            >
                                <Play className="w-3.5 h-3.5 fill-current opacity-50" />
                                직접 실행하기
                            </button>
                        </div>
                    </div>

                    {showDirectRun && (
                        <div className="fixed inset-0 z-50 bg-[#030303] flex flex-col animate-in fade-in duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md">
                                <div className="flex items-center gap-4 flex-1">
                                    <button onClick={() => setShowDirectRun(false)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 flex-1 max-w-2xl">
                                        <span className={`text-[10px] font-bold uppercase ${methodColor} px-1.5 py-0.5 rounded border`}>{api.method}</span>
                                        <input
                                            value={baseUrl}
                                            onChange={e => setBaseUrl(e.target.value)}
                                            className="bg-transparent text-sm text-neutral-200 outline-none flex-1 font-mono"
                                            placeholder="Base URL (e.g., https://api.example.com)"
                                        />
                                        <span className="text-neutral-600 font-mono text-sm">{api.path}</span>
                                    </div>
                                    <button
                                        onClick={handleRun}
                                        disabled={isRunning}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                    >
                                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Run
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* Left Side: Configuration */}
                                <div className="w-1/2 border-right border-neutral-800 flex flex-col overflow-y-auto no-scrollbar p-6 space-y-8 bg-[#030303]">
                                    {/* Path Params */}
                                    {Object.keys(pathParams).length > 0 && (
                                        <section className="space-y-4">
                                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                                <CornerDownRight className="w-4 h-4" /> Path Parameters
                                            </h3>
                                            <div className="space-y-3">
                                                {Object.entries(pathParams).map(([key, val]) => (
                                                    <div key={key} className="flex items-center gap-3">
                                                        <span className="w-24 text-xs font-mono text-neutral-400">{key}</span>
                                                        <input
                                                            value={val}
                                                            onChange={e => setPathParams(prev => ({ ...prev, [key]: e.target.value }))}
                                                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 outline-none transition-colors"
                                                            placeholder={`Value for ${key}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Query Params */}
                                    <section className="space-y-4">
                                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                            <Globe className="w-4 h-4" /> Query Parameters
                                        </h3>
                                        <div className="space-y-3">
                                            {/* Simplified Query Param Editor */}
                                            <button
                                                onClick={() => setQueryParams(prev => ({ ...prev, "": "" }))}
                                                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                + Add Parameter
                                            </button>
                                            {Object.entries(queryParams).map(([key, val], idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        value={key}
                                                        onChange={e => {
                                                            const newParams = { ...queryParams };
                                                            const v = newParams[key];
                                                            delete newParams[key];
                                                            newParams[e.target.value] = v;
                                                            setQueryParams(newParams);
                                                        }}
                                                        className="w-1/3 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-400 outline-none font-mono"
                                                        placeholder="Key"
                                                    />
                                                    <input
                                                        value={val}
                                                        onChange={e => setQueryParams(prev => ({ ...prev, [key]: e.target.value }))}
                                                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-200 outline-none"
                                                        placeholder="Value"
                                                    />
                                                    <button onClick={() => {
                                                        const newParams = { ...queryParams };
                                                        delete newParams[key];
                                                        setQueryParams(newParams);
                                                    }} className="p-2 text-neutral-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Request Body */}
                                    {api.method !== "GET" && (
                                        <section className="flex-1 flex flex-col min-h-[300px] space-y-4">
                                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                                <Code className="w-4 h-4" /> Request Body (JSON)
                                            </h3>
                                            <div className="flex-1 border border-neutral-800 rounded-lg overflow-hidden group transition-colors">
                                                <Editor
                                                    height="100%"
                                                    defaultLanguage="json"
                                                    theme="homework-theme"
                                                    beforeMount={handleEditorWillMount}
                                                    value={requestBody}
                                                    onChange={v => setRequestBody(v || "")}
                                                    options={commonEditorOptions}
                                                />
                                            </div>
                                        </section>
                                    )}
                                </div>

                                {/* Right Side: Response */}
                                <div className="w-1/2 bg-[#030303] flex flex-col overflow-hidden p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                            <Terminal className="w-4 h-4" /> Response
                                        </h3>
                                        {response && (
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${response.status >= 200 && response.status < 300
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : response.status === 404
                                                        ? "bg-yellow-500/20 text-yellow-400"
                                                        : "bg-red-500/20 text-red-400"
                                                    }`}>
                                                    {response.status} {response.statusText}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 border border-neutral-800 rounded-lg bg-[#030303] overflow-hidden relative">
                                        {!response && !isRunning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-700 space-y-3">
                                                <Activity className="w-12 h-12 opacity-20" />
                                                <p className="text-xs font-medium uppercase tracking-widest">Ready to execute</p>
                                            </div>
                                        )}
                                        {isRunning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500/50 space-y-3 z-10 bg-black/60 backdrop-blur-sm">
                                                <Loader2 className="w-8 h-8 animate-spin" />
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Executing Request...</p>
                                            </div>
                                        )}
                                        {response && (
                                            <Editor
                                                height="100%"
                                                defaultLanguage="json"
                                                theme="homework-theme"
                                                beforeMount={handleEditorWillMount}
                                                value={typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                                                options={{
                                                    ...commonEditorOptions,
                                                    readOnly: true,
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Authentication Section */}
                    <div className="border border-neutral-800/50 rounded-lg bg-neutral-900/20 overflow-hidden">
                        <button
                            onClick={() => setIsAuthExpanded(!isAuthExpanded)}
                            className="w-full flex items-center justify-between p-3 hover:bg-neutral-800/30 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                                <span className="text-sm font-medium text-neutral-300">인증</span>
                            </div>
                            {isAuthExpanded ? <ChevronDown className="w-4 h-4 text-neutral-600" /> : <ChevronRight className="w-4 h-4 text-neutral-600" />}
                        </button>
                        {isAuthExpanded && (
                            <div className="p-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-xs text-neutral-500 leading-relaxed">
                                    보호된 리소스에 요청할 때 <code className="text-white bg-neutral-800 px-1 rounded">Authorization</code> 헤더에 Bearer 토큰을 입력하세요.
                                </p>
                                <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 bg-black/40 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-400">예시:</span>
                                    <code>Authorization: Bearer **************************</code>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Request Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        요청
                    </h2>

                    {hasParameters && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-neutral-400">경로 파라미터</h3>
                            <div className="border border-neutral-800/50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-neutral-900 text-neutral-500 text-[11px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">Name</th>
                                            <th className="px-4 py-2 font-medium">Type</th>
                                            <th className="px-4 py-2 font-medium text-right pr-4">Required</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50">
                                        {api.parameters.map((param: any, idx: number) => (
                                            <tr key={idx} className="group hover:bg-neutral-800/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-mono text-neutral-300 bg-neutral-800 px-1.5 py-0.5 rounded">
                                                        {param.name}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-neutral-500 text-xs text-center">{param.schema?.type || "string"}</td>
                                                <td className="px-4 py-3 text-right pr-4">
                                                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 uppercase">
                                                        required
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {hasRequestBody && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-neutral-400">Body</h3>
                            <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-lg p-4">
                                {Object.entries(api.request_body.content || {}).map(([contentType, content]: [string, any]) => (
                                    <div key={contentType} className="space-y-3">
                                        <div className="text-[10px] text-neutral-500 font-mono bg-neutral-800 px-2 py-0.5 rounded inline-block">
                                            {contentType}
                                        </div>
                                        <SchemaViewer schema={content.schema} resolveRef={resolveRef} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Responses Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        응답
                    </h2>
                    <div className="space-y-4">
                        {Object.entries(api.responses || {})
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([code, response]: [string, any]) => {
                                const isSuccess = code.startsWith("2")
                                const statusColor = isSuccess ? "bg-emerald-500" : code === "404" ? "bg-yellow-500" : code.startsWith("4") ? "bg-orange-500" : "bg-red-500"
                                const isExpanded = expandedResponses[code]

                                return (
                                    <div key={code} className="border border-neutral-800/50 rounded-lg overflow-hidden bg-neutral-900/10">
                                        <button
                                            onClick={() => toggleResponse(code)}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-800/30 transition-colors cursor-pointer group border-b border-neutral-800/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${statusColor} shadow-[0_0_8px_rgba(0,0,0,0.4)] ${statusColor}/40`} />
                                                <span className="text-sm font-medium text-neutral-200">{code} {isSuccess ? "OK" : ""}</span>
                                            </div>
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                                        </button>

                                        {isExpanded && (
                                            <div className="p-4 space-y-4 no-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                                                {response.description && (
                                                    <p className="text-xs text-neutral-500">{response.description}</p>
                                                )}

                                                {response.content ? (
                                                    Object.entries(response.content).map(([contentType, content]: [string, any]) => (
                                                        <div key={contentType} className="space-y-3">
                                                            <div className="text-[10px] text-neutral-500 font-mono bg-neutral-800 px-2 py-0.5 rounded inline-block">
                                                                {contentType}
                                                            </div>
                                                            {content.schema ? (
                                                                <SchemaViewer schema={content.schema} resolveRef={resolveRef} />
                                                            ) : (
                                                                <div className="text-xs text-neutral-600 font-mono italic">No schema defined</div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-xs text-neutral-600 italic">No content returned</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                </section>
            </main>

            {/* Right Panel: Requests & Examples */}
            <aside className="w-[480px] border-l border-neutral-800 bg-[#030303] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-800 bg-neutral-900/50 min-h-[44px]">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                        {[
                            { id: 'js-fetch', label: 'JavaScript' },
                            { id: 'curl', label: 'cURL' },
                            { id: 'python', label: 'Python' },
                            { id: 'go', label: 'Go' },
                        ].map(lang => (
                            <button
                                key={lang.id}
                                onClick={() => setActiveCodeTab(lang.id)}
                                className={`px-2 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap border-b-2 ${activeCodeTab === lang.id ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-neutral-300"}`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => copyToClipboard(generateCodeSnippet(activeCodeTab))}
                        className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all flex items-center gap-1.5 group"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[10px] hidden group-hover:inline">Copy</span>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden bg-[#030303] relative">
                    <Editor
                        height="100%"
                        language={activeCodeTab === 'js-fetch' ? 'javascript' : activeCodeTab === 'python' ? 'python' : activeCodeTab === 'go' ? 'go' : 'shell'}
                        theme="homework-theme"
                        beforeMount={handleEditorWillMount}
                        value={generateCodeSnippet(activeCodeTab)}
                        options={{
                            ...commonEditorOptions,
                            readOnly: true,
                        }}
                    />
                </div>
            </aside>
        </div>
    )
}

function SchemaViewer({ schema, level = 0, resolveRef }: { schema: any, level?: number, resolveRef: (ref: string) => any }) {
    if (!schema) return null

    if (schema.$ref) {
        const resolved = resolveRef(schema.$ref)
        if (resolved) {
            return <SchemaViewer schema={resolved} level={level} resolveRef={resolveRef} />
        }
        return <div className="text-neutral-600 text-xs font-mono">{schema.$ref}</div>
    }

    const properties = schema.properties || (schema.items?.properties) || {}
    const additionalProperties = schema.additionalProperties

    return (
        <div className={`space-y-3 ${level > 0 ? "ml-6 mt-2 shadow-[inset_1px_0_0_0_rgba(255,255,255,0.05)]" : "mt-2"}`}>
            {Object.entries(properties).map(([key, prop]: [string, any]) => (
                <SchemaItem key={key} name={key} prop={prop} level={level} resolveRef={resolveRef} />
            ))}

            {additionalProperties && (
                <div className="flex items-center gap-2 pl-2">
                    <span className="text-[12px] font-mono text-neutral-500 italic">
                        [key: string]
                    </span>
                    <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-wider">
                        {additionalProperties.type || "any"}
                    </span>
                </div>
            )}
        </div>
    )
}

function SchemaItem({ name, prop, level, resolveRef }: { name: string, prop: any, level: number, resolveRef: (ref: string) => any }) {
    const isComplex = prop.type === 'object' || prop.properties || (prop.type === 'array' && prop.items?.properties) || prop.$ref
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <div className="flex flex-col">
            <div
                className={`flex items-center gap-2 py-0.5 group ${isComplex ? "cursor-pointer" : ""}`}
                onClick={() => isComplex && setIsExpanded(!isExpanded)}
            >
                {isComplex && (
                    <ChevronDown
                        className={`w-3 h-3 text-neutral-600 transition-transform duration-300 ease-out ${isExpanded ? "" : "-rotate-90"}`}
                    />
                )}
                {!isComplex && level > 0 && <div className="w-3" />}
                <span className={`text-[12px] font-mono font-medium tracking-tight ${isComplex ? "text-neutral-200 group-hover:text-white" : "text-neutral-500"
                    }`}>
                    {name}
                </span>
                <span className="text-[10px] text-neutral-700 font-mono uppercase tracking-wider">
                    {prop.type === 'array' ? `array [${prop.items?.type || 'object'}]` : (prop.type || "string")}
                </span>
                {prop.required === false && (
                    <span className="text-[9px] text-neutral-800 font-medium px-1 border border-neutral-800 rounded">opt</span>
                )}
            </div>

            {prop.description && (
                <p className="text-[11px] text-neutral-600 mt-0.5 pl-5 leading-relaxed max-w-md italic">
                    {prop.description}
                </p>
            )}

            {isComplex && (
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
                >
                    <SchemaViewer
                        schema={prop.type === 'array' ? (prop.items?.$ref ? prop.items : prop.items) : prop}
                        level={level + 1}
                        resolveRef={resolveRef}
                    />
                </div>
            )}
        </div>
    )
}
