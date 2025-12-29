"use client"

import { useState, useMemo, useRef } from "react"
import { Search, Folder, FolderOpen, ChevronRight, ChevronDown, Plus, FolderPlus, FileCode, Check, Copy, Database, Layers, Trash2, Edit2, Play, Upload, FileText, Loader2, X } from "lucide-react"
import { Api } from "../types"
import { ApiDetail } from "./api-detail"
import { getSupabase } from "@/lib/supabase"
import { toast } from "sonner"
import { parseMarkdownToApis } from "../parser"
import { useRouter, useSearchParams } from "next/navigation"

interface ApiViewerProps {
    apis: Api[]
    projectId: string
    onSync: () => void
    accessLevel: number
}

type TreeNode = {
    name: string
    children: TreeNode[]
    apis: Api[]
}

export function ApiViewer({ apis, projectId, onSync, accessLevel }: ApiViewerProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const apiIdFromUrl = searchParams.get('apiId')

    const [selectedApi, setSelectedApi] = useState<Api | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const [isAddingFolder, setIsAddingFolder] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Sync state with URL
    useMemo(() => {
        if (apiIdFromUrl && apis.length > 0) {
            const api = apis.find(a => a.id === apiIdFromUrl)
            if (api && api.id !== selectedApi?.id) {
                setSelectedApi(api)
            }
        }
    }, [apiIdFromUrl, apis])

    const handleSelectApi = (api: Api) => {
        setSelectedApi(api)
        const params = new URLSearchParams(searchParams.toString())
        params.set('apiId', api.id)
        router.push(`?${params.toString()}`, { scroll: false })
    }

    const handleAddFolder = async () => {
        if (!newFolderName.trim()) return

        const newApi = {
            project_id: projectId,
            path: `/new-api-${Date.now()}`,
            method: "GET",
            summary: "새 API",
            description: "",
            folder: newFolderName.trim(),
            parameters: [],
            request_body: {},
            responses: { "200": { description: "OK" } }
        }

        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.from('apis').insert(newApi).select().single()
            if (error) throw error
            toast.success("새 폴더와 API가 추가되었습니다.")
            setIsAddingFolder(false)
            setNewFolderName("")
            onSync()
            handleSelectApi(data)
        } catch (err) {
            toast.error("폴더 추가 실패")
        }
    }

    const filteredApis = useMemo(() => {
        if (!searchQuery) return apis
        return apis.filter(api =>
            api.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
            api.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            api.method.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [apis, searchQuery])

    const tree = useMemo(() => {
        const root: TreeNode = { name: "Root", children: [], apis: [] }
        const map: Record<string, TreeNode> = {}

        filteredApis.forEach(api => {
            const folderName = api.folder || "Ungrouped"
            const parts = folderName.split('/')
            let currentPath = ""
            let parent = root

            parts.forEach((part: string) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part
                if (!map[currentPath]) {
                    const node: TreeNode = { name: part, children: [], apis: [] }
                    map[currentPath] = node
                    parent.children.push(node)
                }
                parent = map[currentPath]
            })
            parent.apis.push(api)
        })

        const sortTree = (node: TreeNode) => {
            node.children.sort((a, b) => a.name.localeCompare(b.name))
            node.apis.sort((a, b) => a.path.localeCompare(b.path))
            node.children.forEach(sortTree)
        }
        sortTree(root)
        return root
    }, [filteredApis])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const content = await file.text()
            const parsedApis = parseMarkdownToApis(content)

            const supabase = getSupabase()
            const apisWithProject = parsedApis.map(api => ({ ...api, project_id: projectId }))

            const { error } = await supabase.from('apis').upsert(apisWithProject, { onConflict: 'project_id,path,method' })
            if (error) throw error

            toast.success(`${parsedApis.length}개의 API가 성공적으로 업로드되었습니다.`)
            onSync()
        } catch (err: any) {
            console.error("Upload error details:", err)
            const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : JSON.stringify(err))
            toast.error("업로드 실패: " + msg)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleAddBlankApi = async () => {
        const newApi = {
            project_id: projectId,
            path: `/new-api-${Date.now()}`,
            method: "GET",
            summary: "새 API",
            description: "",
            folder: "Ungrouped",
            parameters: [],
            request_body: {},
            responses: { "200": { description: "OK" } }
        }

        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.from('apis').insert(newApi).select().single()
            if (error) throw error
            toast.success("새 API가 추가되었습니다.")
            onSync()
            setSelectedApi(data)
        } catch (err) {
            toast.error("API 추가 실패")
        }
    }

    const renderTree = (node: TreeNode) => {
        return (
            <div key={node.name} className="space-y-1">
                {node.name !== "Root" && (
                    <FolderNode node={node} depth={0} onSelectApi={handleSelectApi} selectedApiId={selectedApi?.id} />
                )}
                {node.name === "Root" && (
                    <div className="space-y-4">
                        {node.children.map(child => (
                            <div key={child.name}>
                                <FolderNode node={child} depth={0} onSelectApi={handleSelectApi} selectedApiId={selectedApi?.id} />
                            </div>
                        ))}
                        {node.apis.length > 0 && (
                            <div className="space-y-1">
                                {node.apis.map(api => (
                                    <ApiItem key={api.id} api={api} onSelectApi={handleSelectApi} isSelected={selectedApi?.id === api.id} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-120px)] overflow-hidden">
            {/* Left Sidebar - API Tree */}
            <aside className="w-80 border-r border-neutral-800 bg-black flex flex-col overflow-hidden">
                <div className="p-4 border-b border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-neutral-300 tracking-widest uppercase">APIS</h2>
                        {accessLevel >= 3 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                    title="Markdown 업로드"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setIsAddingFolder(true)}
                                    className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                    title="폴더 추가"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleAddBlankApi}
                                    className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                    title="API 직접 추가"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".md"
                                    onChange={handleFileUpload}
                                />
                            </div>
                        )}
                    </div>

                    {isAddingFolder && (
                        <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded-md animate-in slide-in-from-top-1 duration-200">
                            <Folder className="w-3.5 h-3.5 text-neutral-500" />
                            <input
                                autoFocus
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                                placeholder="폴더 이름 입력..."
                                className="bg-transparent text-[11px] text-white outline-none flex-1 placeholder:text-neutral-600"
                            />
                            <div className="flex items-center gap-1">
                                <button onClick={handleAddFolder} className="p-1 hover:bg-neutral-800 rounded text-emerald-400">
                                    <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setIsAddingFolder(false)} className="p-1 hover:bg-neutral-800 rounded text-neutral-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="API 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-900 border-none text-xs text-white pl-9 pr-3 py-2 rounded-md focus:ring-1 focus:ring-neutral-700 placeholder:text-neutral-600 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                    {apis.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-center text-neutral-500">
                            <Database className="w-10 h-10 mb-4 opacity-20" />
                            <p className="text-xs">API가 없습니다.</p>
                        </div>
                    ) : (
                        renderTree(tree)
                    )}
                </div>
            </aside>

            <div className="flex-1 overflow-hidden bg-black">
                {selectedApi ? (
                    <ApiDetail
                        api={selectedApi}
                        projectId={projectId}
                        onUpdate={onSync}
                        onDelete={() => {
                            setSelectedApi(null)
                            onSync()
                        }}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4">
                        <div className="p-4 rounded-full bg-neutral-900/50">
                            <Layers className="w-12 h-12 opacity-20 text-neutral-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-neutral-400">API를 선택하세요</p>
                            <p className="text-xs mt-1">왼쪽 목록에서 엔드포인트를 클릭하여 상세 정보를 확인합니다.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function FolderNode({ node, depth, onSelectApi, selectedApiId }: any) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center gap-2 w-full p-2 text-left hover:bg-neutral-900 rounded-lg group transition-colors"
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                {isCollapsed ? <Folder className="w-4 h-4 text-zinc-500/80" /> : <FolderOpen className="w-4 h-4 text-neutral-500" />}
                <span className="text-sm font-medium text-neutral-300 group-hover:text-white">{node.name}</span>
                <span className="text-xs text-neutral-600 ml-auto">{node.apis.length + node.children.reduce((acc: number, c: any) => acc + c.apis.length, 0)}</span>
            </button>
            {!isCollapsed && (
                <div className="ml-4 pl-2 border-l border-neutral-800 space-y-1">
                    {node.children.map((child: any) => (
                        <FolderNode key={child.name} node={child} depth={depth + 1} onSelectApi={onSelectApi} selectedApiId={selectedApiId} />
                    ))}
                    {node.apis.map((api: Api) => (
                        <ApiItem key={api.id} api={api} onSelectApi={onSelectApi} isSelected={selectedApiId === api.id} />
                    ))}
                </div>
            )}
        </div>
    )
}

function ApiItem({ api, onSelectApi, isSelected }: { api: Api, onSelectApi: (api: Api) => void, isSelected: boolean }) {
    const methodColor = {
        GET: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        POST: "text-green-400 bg-green-400/10 border-green-400/20",
        PUT: "text-orange-400 bg-orange-400/10 border-orange-400/20",
        DELETE: "text-red-400 bg-red-400/10 border-red-400/20",
        PATCH: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    }[api.method as string] || "text-neutral-400 bg-neutral-800 border-neutral-700"

    return (
        <button
            onClick={() => onSelectApi(api)}
            className={`flex items-center gap-3 w-full p-2 text-left rounded-lg transition-all group ${isSelected ? "bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700" : "hover:bg-neutral-900/50 text-neutral-400 hover:text-neutral-200"}`}
        >
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border w-12 text-center ${methodColor} uppercase`}>{api.method}</span>
            <span className="text-xs font-medium truncate flex-1 font-mono tracking-tight">{api.summary || api.path}</span>
        </button>
    )
}
