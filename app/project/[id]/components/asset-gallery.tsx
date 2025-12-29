import { useRef, useState } from "react"
import { AlertCircle, ExternalLink, FileText, Link as LinkIcon, Loader2, Paperclip, Plus, Trash2, Upload, X } from "lucide-react"
import { Asset } from "../types"
import { toast } from "sonner"
import { getSupabase } from "@/lib/supabase"

interface AssetGalleryProps {
    assets: Asset[]
    projectId: string
    userId: string
    accessLevel: number
    onRefresh: () => void
}

export function AssetGallery({ assets, projectId, userId, accessLevel, onRefresh }: AssetGalleryProps) {
    const [showAddAsset, setShowAddAsset] = useState(false)
    const [newAsset, setNewAsset] = useState({
        name: "",
        url: "",
        type: "link" as Asset["type"],
    })
    const [isUploading, setIsUploading] = useState(false)
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
    const [assetFilter, setAssetFilter] = useState<Asset["type"] | "all">("all")
    const fileInputRef = useRef<HTMLInputElement>(null)

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    }

    async function handleAddAsset() {
        if (!newAsset.name.trim() || !newAsset.url.trim()) return

        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
        if (!urlPattern.test(newAsset.url.trim())) {
            toast.error("올바른 URL 형식이 아닙니다. (예: https://google.com)")
            return
        }

        try {
            const supabase = getSupabase()
            let finalUrl = newAsset.url.trim()
            if (!finalUrl.startsWith('http')) {
                finalUrl = 'https://' + finalUrl
            }

            const { error } = await supabase.from("project_assets").insert({
                project_id: projectId,
                name: newAsset.name.trim(),
                url: finalUrl,
                type: newAsset.type,
                added_by: userId,
            })
            if (error) throw error
            setNewAsset({ name: "", url: "", type: "link" })
            setShowAddAsset(false)
            onRefresh()
        } catch (err) {
            console.error("Error adding asset:", err)
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !userId) return

        try {
            setIsUploading(true)
            const supabase = getSupabase()

            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
            const filePath = `${projectId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('project-assets')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('project-assets')
                .getPublicUrl(filePath)

            const assetType: Asset["type"] = file.type.startsWith('image/') ? 'image' : 'document'

            const { error: assetError } = await supabase.from("project_assets").insert({
                project_id: projectId,
                name: file.name,
                url: publicUrl,
                type: assetType,
                added_by: userId,
            })

            if (assetError) throw assetError

            onRefresh()
            setShowAddAsset(false)
        } catch (err: any) {
            console.error("Error uploading file:", err)
            toast.error(`파일 업로드 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    async function handleDeleteAsset(assetId: string) {
        if (accessLevel < 3) return

        toast("정말 이 에셋을 삭제하시겠습니까?", {
            action: {
                label: "삭제",
                onClick: async () => {
                    try {
                        const supabase = getSupabase()

                        const { data: asset, error: fetchError } = await supabase
                            .from("project_assets")
                            .select("url")
                            .eq("id", assetId)
                            .single()

                        if (fetchError) throw fetchError

                        if (asset.url.includes('project-assets')) {
                            const urlParts = asset.url.split('/project-assets/')
                            if (urlParts.length > 1) {
                                const filePath = decodeURIComponent(urlParts[1])
                                const { error: storageError } = await supabase.storage
                                    .from('project-assets')
                                    .remove([filePath])
                                if (storageError) console.error("Storage deletion error:", storageError)
                            }
                        }

                        const { error: dbError } = await supabase.from("project_assets").delete().eq("id", assetId)
                        if (dbError) throw dbError
                        onRefresh()
                        toast.success("에셋이 삭제되었습니다.")
                    } catch (err) {
                        console.error("Error deleting asset:", err)
                        toast.error("에셋 삭제 중 오류가 발생했습니다.")
                    }
                }
            }
        })
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">프로젝트 에셋 & 파일</h2>
                {accessLevel >= 1 && (
                    <button
                        onClick={() => setShowAddAsset(!showAddAsset)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        에셋 추가
                    </button>
                )}
            </div>

            {showAddAsset && (
                <div className="mb-8 p-6 rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3 block">1. 에셋 형태 선택</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setNewAsset({ ...newAsset, type: 'link' })}
                                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all duration-300 ${newAsset.type === 'link' ? 'bg-white text-black border-white shadow-lg' : 'bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-neutral-300'}`}
                                    >
                                        <LinkIcon className={`w-6 h-6 ${newAsset.type === 'link' ? 'animate-bounce' : ''}`} />
                                        <span className="text-xs font-bold uppercase tracking-tighter">외부 링크 추가</span>
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-neutral-300 transition-all duration-300 disabled:opacity-50"
                                    >
                                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                        <span className="text-xs font-bold uppercase tracking-tighter">파일 직접 업로드</span>
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            </div>

                            <div>
                                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3 block">2. 카테고리 설정</label>
                                <div className="flex flex-wrap gap-2">
                                    {['link', 'image', 'document', 'other'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setNewAsset({ ...newAsset, type: type as Asset["type"] })}
                                            className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase transition-all ${newAsset.type === type ? 'bg-white text-black border-white' : 'bg-black text-neutral-500 border-neutral-800 hover:border-neutral-600'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 border-t md:border-t-0 md:border-l border-neutral-800 pt-8 md:pt-0 md:pl-8 flex flex-col justify-between">
                            <div className="space-y-5">
                                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">3. 상세 정보 입력</label>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="에셋 이름 (예: 피그마 시안, API 문서)"
                                        value={newAsset.name}
                                        onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors"
                                    />
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="URL 주소를 입력하세요 (https://...)"
                                            value={newAsset.url}
                                            onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                                            className={`w-full px-4 py-3 bg-neutral-900/50 border rounded-xl text-sm text-white focus:outline-none transition-all ${newAsset.url && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(newAsset.url) ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-neutral-500'}`}
                                        />
                                        {newAsset.url && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(newAsset.url) && (
                                            <p className="text-[10px] text-red-500 mt-1.5 ml-1 animate-pulse flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> 유효한 URL 형식이 아닙니다.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] text-neutral-600 italic">* 파일을 업로드할 경우 이름과 타입은 자동으로 설정됩니다.</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={() => setShowAddAsset(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-500 hover:text-white transition-colors">취소</button>
                                <button
                                    onClick={handleAddAsset}
                                    disabled={!newAsset.name.trim() || !newAsset.url.trim()}
                                    className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 disabled:opacity-30 transition-all shadow-lg"
                                >
                                    에셋 등록 완료
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setAssetFilter("all")}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${assetFilter === "all" ? "bg-white text-black" : "bg-neutral-900 text-neutral-500 hover:text-white"}`}
                >
                    전체 ({assets.length})
                </button>
                {[
                    { id: "image", label: "이미지", count: assets.filter(a => a.type === "image").length },
                    { id: "document", label: "문서", count: assets.filter(a => a.type === "document").length },
                    { id: "link", label: "링크", count: assets.filter(a => a.type === "link").length },
                    { id: "other", label: "기타", count: assets.filter(a => a.type === "other").length },
                ].map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setAssetFilter(cat.id as Asset["type"])}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${assetFilter === cat.id ? "bg-white text-black" : "bg-neutral-900 text-neutral-500 hover:text-white"}`}
                    >
                        {cat.label} ({cat.count})
                    </button>
                ))}
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/30">
                    <Paperclip className="w-10 h-10 text-neutral-700 mx-auto mb-4 opacity-20" />
                    <p className="text-neutral-500">등록된 에셋이나 파일이 없습니다.</p>
                    <p className="text-xs text-neutral-600 mt-2">새로운 파일이나 링크를 추가해 보세요.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets
                        .filter(asset => assetFilter === "all" || asset.type === assetFilter)
                        .map((asset) => {
                            const isImage = asset.type === 'image' || asset.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)

                            return (
                                <button
                                    key={asset.id}
                                    onClick={() => setSelectedAsset(asset)}
                                    className="group relative flex flex-col bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-600 transition-all duration-300 text-left"
                                >
                                    <div className="aspect-video w-full bg-neutral-900 flex items-center justify-center relative overflow-hidden border-b border-neutral-800">
                                        {isImage ? (
                                            <img
                                                src={asset.url}
                                                alt={asset.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-full bg-neutral-800 text-neutral-500">
                                                    {asset.type === 'link' ? <LinkIcon className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">{asset.type}</span>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                상세 보기
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-neutral-950/50">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className="text-sm font-semibold text-white truncate flex-1" title={asset.name}>
                                                {asset.name}
                                            </h4>
                                            {asset.type === 'link' && <LinkIcon className="w-3.5 h-3.5 text-neutral-600" />}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                                            <span className="truncate max-w-[120px]">{new URL(asset.url).hostname}</span>
                                            <span>{formatDate(asset.created_at)}</span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                </div>
            )}

            {selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />

                    <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-full">
                        <button
                            onClick={() => setSelectedAsset(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="md:flex-1 bg-black flex items-center justify-center p-6 min-h-[300px]">
                            {selectedAsset.type === 'image' || selectedAsset.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                                <img
                                    src={selectedAsset.url}
                                    className="max-w-full max-h-[70vh] object-contain shadow-2xl"
                                    alt={selectedAsset.name}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-6 text-neutral-500">
                                    <div className="p-8 rounded-full bg-neutral-800">
                                        {selectedAsset.type === 'link' ? <LinkIcon className="w-16 h-16" /> : <FileText className="w-16 h-16" />}
                                    </div>
                                    <p className="text-xl font-light">프리뷰를 제공하지 않는 파일 형식입니다.</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-[350px] border-l border-neutral-800 bg-neutral-900 p-8 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{selectedAsset.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 uppercase tracking-tighter">
                                            {selectedAsset.type}
                                        </span>
                                        <span className="text-[10px] text-neutral-600">{formatDate(selectedAsset.created_at)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-black/40 border border-neutral-800">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-bold">원본 주소</p>
                                        <p className="text-xs text-neutral-300 break-all font-mono leading-relaxed">{selectedAsset.url}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 space-y-3">
                                <a
                                    href={selectedAsset.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-neutral-200 transition-all text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    원본 열기 / 다운로드
                                </a>

                                {accessLevel >= 3 && (
                                    <button
                                        onClick={() => {
                                            if (confirm("정말 이 에셋을 삭제하시겠습니까?")) {
                                                handleDeleteAsset(selectedAsset.id)
                                                setSelectedAsset(null)
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 w-full py-4 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all text-sm border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        에셋 삭제하기
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
