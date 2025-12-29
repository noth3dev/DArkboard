"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, Activity, Code, Database, Globe, Lock, Copy, Check, ChevronDown, ChevronRight, FileJson } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Api } from "../../types"

export default function ApiDetailPage({ params }: { params: Promise<{ id: string; apiId: string }> }) {
    const { id, apiId } = use(params)
    const router = useRouter()
    const { user } = useAuth()
    const [api, setApi] = useState<Api | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("params")
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        fetchApi()
    }, [apiId])

    async function fetchApi() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("apis")
                .select("*")
                .eq("id", apiId)
                .single()

            if (error) throw error
            setApi(data)
        } catch (err) {
            console.error("Error fetching api:", err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-neutral-400 animate-pulse">API 정보 로딩 중...</div>
            </div>
        )
    }

    if (!api) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-neutral-400 mb-4">API 정보를 찾을 수 없습니다.</p>
                    <button onClick={() => router.back()} className="text-white hover:underline">돌아가기</button>
                </div>
            </div>
        )
    }

    const methodColor = {
        GET: "text-blue-400 bg-blue-900/30 border-blue-800",
        POST: "text-green-400 bg-green-900/30 border-green-800",
        PUT: "text-orange-400 bg-orange-900/30 border-orange-800",
        DELETE: "text-red-400 bg-red-900/30 border-red-800",
        PATCH: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
    }[api.method as string] || "text-neutral-400 bg-neutral-800 border-neutral-700"

    const apidogName = api.original_spec?.["x-apidog-name"]

    const generateCodeSnippet = (lang: string) => {
        const url = `https://api.example.com${api.path}` // Replace with actual base URL
        if (lang === "curl") {
            return `curl -X ${api.method} "${url}" \\
  -H "Content-Type: application/json"`
        }
        if (lang === "js") {
            return `fetch("${url}", {
  method: "${api.method}",
  headers: {
    "Content-Type": "application/json"
  }${api.request_body ? `,\n  body: JSON.stringify(${JSON.stringify(api.request_body)})` : ""}
})
.then(response => response.json())
.then(data => console.log(data));`
        }
        return ""
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
            <header className="flex-none bg-black/80 backdrop-blur-xl border-b border-neutral-800">
                <div className="px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/project/${id}?tab=api`)}
                        className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`flex-none px-2 py-0.5 rounded text-xs font-bold uppercase border ${methodColor}`}>
                            {api.method}
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold truncate flex items-center gap-2">
                                {apidogName ? (
                                    <>
                                        {apidogName}
                                        <span className="text-sm font-normal text-neutral-500 font-mono">({api.path})</span>
                                    </>
                                ) : (
                                    <span className="font-mono">{api.path}</span>
                                )}
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-neutral-800">

                    {/* Description */}
                    {(api.description || api.summary) && (
                        <section className="space-y-2">
                            {/* <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Description</h2> */}
                            <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">{api.description || api.summary}</p>
                        </section>
                    )}

                    {/* Tabs for Request */}
                    <section>
                        <div className="flex items-center gap-1 border-b border-neutral-800 mb-4">
                            <button
                                onClick={() => setActiveTab("params")}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "params" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-neutral-300"}`}
                            >
                                Parameters
                            </button>
                            {api.request_body && (
                                <button
                                    onClick={() => setActiveTab("body")}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "body" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-neutral-300"}`}
                                >
                                    Body
                                </button>
                            )}
                        </div>

                        {activeTab === "params" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {api.parameters && api.parameters.length > 0 ? (
                                    <div className="border border-neutral-800 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-neutral-500 uppercase bg-neutral-900">
                                                <tr>
                                                    <th className="px-4 py-3">Name</th>
                                                    <th className="px-4 py-3">In</th>
                                                    <th className="px-4 py-3">Type</th>
                                                    <th className="px-4 py-3">Required</th>
                                                    <th className="px-4 py-3">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                                                {api.parameters.map((param: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-neutral-900/50">
                                                        <td className="px-4 py-3 font-mono text-white">{param.name}</td>
                                                        <td className="px-4 py-3 text-neutral-400">{param.in}</td>
                                                        <td className="px-4 py-3 text-blue-400 font-mono text-xs">{param.schema?.type || "any"}</td>
                                                        <td className="px-4 py-3">
                                                            {param.required ? <span className="text-red-400 text-xs font-bold">YES</span> : <span className="text-neutral-600 text-xs">NO</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-neutral-400">{param.description || "-"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-neutral-500 text-sm p-4 border border-dashed border-neutral-800 rounded-lg text-center">No parameters required.</p>
                                )}
                            </div>
                        )}

                        {activeTab === "body" && api.request_body && (
                            <div className="animate-in fade-in duration-200">
                                <SchemaViewer schema={api.request_body?.content?.["application/json"]?.schema} />
                            </div>
                        )}
                    </section>

                    {/* Responses */}
                    <section>
                        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Responses
                        </h2>
                        <div className="space-y-6">
                            {Object.entries(api.responses || {})
                                .sort((a, b) => {
                                    // Sort by x-apidog-ordering if available, else by status code
                                    const orderA = (a[1] as any)["x-apidog-ordering"] ?? 999
                                    const orderB = (b[1] as any)["x-apidog-ordering"] ?? 999
                                    if (orderA !== orderB) return orderA - orderB
                                    return a[0].localeCompare(b[0])
                                })
                                .map(([code, response]: [string, any]) => {
                                    const isSuccess = code.startsWith("2")
                                    const apidogName = response["x-apidog-name"]

                                    return (
                                        <div key={code} className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/50">
                                            <div className="flex items-center gap-4 px-4 py-3 bg-neutral-900/30 border-b border-neutral-800">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${isSuccess ? "bg-green-900/30 text-green-400 border border-green-900/50" :
                                                        code.startsWith("4") ? "bg-yellow-900/30 text-yellow-400 border border-yellow-900/50" :
                                                            "bg-red-900/30 text-red-400 border border-red-900/50"
                                                    }`}>{code}</span>
                                                <span className="text-sm font-medium text-white">{apidogName || response.description || "No description"}</span>
                                            </div>

                                            {response.content?.["application/json"]?.schema ? (
                                                <div className="p-4 bg-neutral-950">
                                                    <SchemaViewer schema={response.content["application/json"].schema} />
                                                </div>
                                            ) : response.content ? (
                                                <div className="p-4 text-xs text-neutral-500 font-mono">
                                                    {/* Fallback for non-json or empty schema */}
                                                    Has content but no JSON schema to display.
                                                </div>
                                            ) : (
                                                <div className="p-4 text-sm text-neutral-500">No content returned.</div>
                                            )}
                                        </div>
                                    )
                                })}
                        </div>
                    </section>
                </main>

                {/* Right Panel: Code & Examples */}
                <aside className="w-[400px] border-l border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                            <Code className="w-4 h-4" /> Code Examples
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-500 font-bold uppercase">cURL</span>
                                <button onClick={() => copyToClipboard(generateCodeSnippet("curl"))} className="text-neutral-500 hover:text-white transition-colors">
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <div className="bg-black border border-neutral-800 rounded-lg p-3 overflow-x-auto group relative">
                                <code className="text-xs font-mono text-green-400 whitespace-pre">
                                    {generateCodeSnippet("curl")}
                                </code>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-neutral-500 font-bold uppercase">JavaScript (App Router)</span>
                            </div>
                            <div className="bg-black border border-neutral-800 rounded-lg p-3 overflow-x-auto">
                                <code className="text-xs font-mono text-blue-400 whitespace-pre">
                                    {generateCodeSnippet("js")}
                                </code>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

// Recursive Schema Viewer Component
function SchemaViewer({ schema, level = 0 }: { schema: any, level?: number }) {
    const [expanded, setExpanded] = useState(true)

    if (!schema) return null

    const type = schema.type || (schema.properties ? "object" : "any")
    const description = schema.description
    const apidogName = schema["x-apidog-name"]
    const properties = schema.properties
    const items = schema.items

    const isComplex = type === "object" || type === "array"

    return (
        <div className={`font-mono text-xs ${level > 0 ? "ml-4 pl-4 border-l border-neutral-800" : ""}`}>
            <div className="flex items-start gap-2 py-1">
                {isComplex && (
                    <button onClick={() => setExpanded(!expanded)} className="mt-0.5 hover:text-white text-neutral-500">
                        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                )}
                {!isComplex && <span className="w-3" />} {/* Spacer */}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {apidogName && <span className="text-neutral-300 font-semibold">{apidogName}</span>}
                        <span className={`px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] ${type === "string" ? "text-green-400" :
                                type === "integer" || type === "number" ? "text-orange-400" :
                                    type === "boolean" ? "text-red-400" :
                                        "text-blue-400"
                            }`}>{type}</span>
                        {description && <span className="text-neutral-500 truncate">{description}</span>}
                    </div>
                </div>
            </div>

            {expanded && isComplex && (
                <div className="py-1">
                    {type === "object" && properties && (
                        <div className="space-y-1">
                            {Object.entries(properties).map(([key, propSchema]: [string, any]) => (
                                <div key={key} className="group">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-neutral-400">{key}</span>
                                        {searchRequired(schema.required, key) && <span className="text-[9px] text-red-500 font-bold">*</span>}
                                    </div>
                                    <SchemaViewer schema={propSchema} level={level + 1} />
                                </div>
                            ))}
                        </div>
                    )}
                    {type === "array" && items && (
                        <div className="mt-1">
                            <div className="text-neutral-600 text-[10px] mb-1">Array of:</div>
                            <SchemaViewer schema={items} level={level + 1} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function searchRequired(required: string[] | undefined, key: string) {
    return required?.includes(key)
}
