"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import useEmblaCarousel from 'embla-carousel-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Trophy,
    Plus,
    X,
    Calendar,
    Building2,
    Trash2,
    Search,
    Edit2,
    Award,
    Coins,
    Users,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    Camera,
    Loader2,
    ExternalLink,
    Maximize2,
    Flag,
    Folder as FolderIcon
} from "lucide-react"
import { toast } from "sonner"

type LegacyRecord = {
    id: string
    competition_name: string
    organization: string | null
    award_name: string
    project_id: string | null
    project?: {
        id: string
        name: string
    }
    award_date: string
    prize_money: string | null
    team_members: string | null
    description: string | null
    image_urls: string[]
    created_at: string
}

export default function LegacyPage() {
    const router = useRouter()
    const { user, loading, accessLevel } = useAuth()
    const [records, setRecords] = useState<LegacyRecord[]>([])
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
    const [loadingRecords, setLoadingRecords] = useState(true)
    const [showFormModal, setShowFormModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedRecord, setSelectedRecord] = useState<LegacyRecord | null>(null)
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [editingRecord, setEditingRecord] = useState<LegacyRecord | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 })

    useEffect(() => {
        if (emblaApi) {
            emblaApi.on('select', () => {
                setActiveImageIndex(emblaApi.selectedScrollSnap())
            })
        }
    }, [emblaApi])

    useEffect(() => {
        if (emblaApi && showDetailModal) {
            emblaApi.scrollTo(activeImageIndex, true)
        }
    }, [emblaApi, showDetailModal, activeImageIndex])

    const [formData, setFormData] = useState({
        competition_name: "",
        organization: "",
        award_name: "",
        project_id: "",
        award_date: new Date().toISOString().split('T')[0],
        prize_money: "",
        team_members: "",
        description: "",
        image_urls: [] as string[]
    })

    const fetchRecords = useCallback(async () => {
        if (!user) return
        try {
            setLoadingRecords(true)
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("legacy_records")
                .select("*, project:projects(id, name)")
                .order("award_date", { ascending: false })

            if (error) throw error
            setRecords(data || [])
        } catch (err: any) {
            console.error("Error fetching legacy records:", err.message || err)
        } finally {
            setLoadingRecords(false)
        }
    }, [user])

    const fetchProjects = useCallback(async () => {
        if (!user) return
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("projects")
                .select("id, name")
                .order("name", { ascending: true })
            if (error) throw error
            setProjects(data || [])
        } catch (err) {
            console.error("Error fetching projects:", err)
        }
    }, [user])

    useEffect(() => {
        fetchRecords()
        fetchProjects()
    }, [fetchRecords, fetchProjects])

    const filteredRecords = useMemo(() => {
        return records.filter(r =>
            r.competition_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.award_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (r.team_members?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        )
    }, [records, searchTerm])

    // Prize money calculation
    const totalPrizeMoney = useMemo(() => {
        return records.reduce((acc, record) => {
            if (!record.prize_money) return acc
            // Extract numbers and handle "만" (10000)
            const cleaned = record.prize_money.replace(/,/g, "")
            const match = cleaned.match(/(\d+)/)
            if (!match) return acc
            let value = parseInt(match[1])
            if (record.prize_money.includes("만")) value *= 10000
            return acc + value
        }, 0)
    }, [records])

    const formatCurrency = (val: number) => {
        if (val >= 10000) {
            const man = Math.floor(val / 10000)
            const rest = val % 10000
            return `${man.toLocaleString()}만${rest > 0 ? ` ${rest.toLocaleString()}` : ""}원`
        }
        return `${val.toLocaleString()}원`
    }

    const renderAwardName = (name: string, mainClass: string, subClass: string) => {
        const match = name.match(/^(.*?)\((.*?)\)$/)
        if (match) {
            return (
                <div className="flex flex-col">
                    <span className={mainClass}>{match[1].trim()}</span>
                    <span className={subClass}>{match[2]}</span>
                </div>
            )
        }
        return <span className={mainClass}>{name}</span>
    }

    const renderTeamMembers = (members: string | null, containerClass: string) => {
        if (!members) return null
        const parts = members.split(/[,/|]/).map(p => p.trim()).filter(Boolean)
        if (parts.length === 0) return null

        return (
            <div className={`flex flex-wrap gap-x-2 gap-y-1 ${containerClass}`}>
                {parts.map((p, i) => (
                    <span key={i} className="flex items-center gap-1">
                        {i === 0 ? (
                            <span className="flex items-center gap-1.5 text-white font-bold">
                                <Flag className="w-3 h-3 text-yellow-500 fill-yellow-500/20" />
                                {p}
                            </span>
                        ) : (
                            <span className="text-neutral-500">
                                {p}
                            </span>
                        )}
                        {i < parts.length - 1 && <span className="text-neutral-800 text-[10px] ml-0.5">/</span>}
                    </span>
                ))}
            </div>
        )
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        try {
            const supabase = getSupabase()
            const newUrls = [...formData.image_urls]

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
                const filePath = `legacy/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('project-assets')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('project-assets')
                    .getPublicUrl(filePath)

                newUrls.push(publicUrl)
            }

            setFormData({ ...formData, image_urls: newUrls })
        } catch (err) {
            console.error("Error uploading images:", err)
            toast.error("이미지 업로드 중 오류가 발생했습니다.")
        } finally {
            setUploading(false)
        }
    }

    const removeImage = (index: number) => {
        const newUrls = formData.image_urls.filter((_, i) => i !== index)
        setFormData({ ...formData, image_urls: newUrls })
    }

    const handleSubmit = async () => {
        if (!formData.competition_name.trim() || !formData.award_name.trim() || !formData.award_date) return
        try {
            const supabase = getSupabase()
            const payload = {
                competition_name: formData.competition_name.trim(),
                organization: formData.organization.trim() || null,
                award_name: formData.award_name.trim(),
                project_id: formData.project_id || null,
                award_date: formData.award_date,
                prize_money: formData.prize_money.trim() || null,
                team_members: formData.team_members.trim() || null,
                description: formData.description.trim() || null,
                image_urls: formData.image_urls,
                user_uuid: user?.id
            }

            if (editingRecord) {
                const { error } = await supabase
                    .from("legacy_records")
                    .update(payload)
                    .eq("id", editingRecord.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from("legacy_records")
                    .insert(payload)
                if (error) throw error
            }

            fetchRecords()
        } catch (err) {
            console.error("Error saving record:", err)
            toast.error("저장 중 오류가 발생했습니다.")
        }
    }

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        toast("이 기록을 삭제하시겠습니까?", {
            action: {
                label: "삭제",
                onClick: async () => {
                    try {
                        const supabase = getSupabase()
                        const { error } = await supabase
                            .from("legacy_records")
                            .delete()
                            .eq("id", id)

                        if (error) throw error
                        setShowDetailModal(false)
                        fetchRecords()
                        toast.success("기록이 삭제되었습니다.")
                    } catch (err) {
                        console.error("Error deleting record:", err)
                        toast.error("삭제 중 오류가 발생했습니다.")
                    }
                }
            }
        })
        return
    }

    const openAddModal = () => {
        setEditingRecord(null)
        setFormData({
            competition_name: "",
            organization: "",
            award_name: "",
            project_id: "",
            award_date: new Date().toISOString().split('T')[0],
            prize_money: "",
            team_members: "",
            description: "",
            image_urls: []
        })
        setShowFormModal(true)
    }

    const openEditModal = (record: LegacyRecord) => {
        setEditingRecord(record)
        setFormData({
            competition_name: record.competition_name,
            organization: record.organization || "",
            award_name: record.award_name,
            project_id: record.project_id || "",
            award_date: record.award_date,
            prize_money: record.prize_money || "",
            team_members: record.team_members || "",
            description: record.description || "",
            image_urls: record.image_urls || []
        })
        setShowDetailModal(false)
        setShowFormModal(true)
    }

    const openDetailModal = (record: LegacyRecord) => {
        setSelectedRecord(record)
        setActiveImageIndex(0)
        setShowDetailModal(true)
        // Reset embla to first image when opening
        if (emblaApi) emblaApi.scrollTo(0, true)
    }

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev()
    }, [emblaApi])

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext()
    }, [emblaApi])

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 text-xs tracking-widest uppercase">로딩 중...</div>
    if (!user) return <AuthForm />

    if ((accessLevel ?? 0) < 1) {
        return (
            <div className="min-h-[calc(100vh-65px)] bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <X className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-light mb-2 text-white">접근 권한이 없습니다</h1>
                <p className="text-neutral-500 text-sm max-w-xs">수상 기록 페이지는 인증된 프로젝트 멤버만 접근 가능합니다.</p>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-65px)] bg-black text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
                            명예의 전당
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                            총 {records.length}개의 기록 · 누적 상금 {formatCurrency(totalPrizeMoney)}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-900/40 p-2 rounded-3xl border border-neutral-800">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="기록 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-8 py-4 bg-transparent text-sm text-white focus:outline-none transition-all placeholder:text-neutral-700"
                            />
                        </div>
                        {(accessLevel ?? 0) >= 1 && (
                            <button
                                onClick={openAddModal}
                                className="w-full sm:w-auto px-10 py-4 bg-white text-black text-[13px] font-black rounded-2xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2.5 active:scale-95 whitespace-nowrap shadow-2xl"
                            >
                                <Plus className="w-4 h-4" />
                                기록 추가
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Grid */}
                {
                    loadingRecords ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-[400px] bg-neutral-900/50 rounded-[40px] border border-neutral-800 animate-pulse" />
                            ))}
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="py-40 text-center rounded-[48px] border-2 border-dashed border-neutral-900/50">
                            <Award className="w-20 h-20 text-neutral-900 mx-auto mb-8 opacity-40" />
                            <p className="text-neutral-500 font-bold uppercase tracking-[0.3em] text-sm">기록이 발견되지 않았습니다</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {filteredRecords.map((record) => (
                                <div
                                    key={record.id}
                                    onClick={() => openDetailModal(record)}
                                    className="group relative bg-neutral-950 border border-neutral-800 rounded-[40px] overflow-hidden hover:border-neutral-700 transition-all duration-500 shadow-2xl cursor-pointer"
                                >
                                    <div className="flex flex-col xl:flex-row min-h-[340px]">
                                        {/* Image Section */}
                                        <div className="xl:w-64 bg-neutral-900 relative overflow-hidden group/img shrink-0 aspect-[4/3] xl:aspect-auto">
                                            {record.image_urls && record.image_urls.length > 0 ? (
                                                <img
                                                    src={record.image_urls[0]}
                                                    alt={record.award_name}
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-10">
                                                    <Trophy className="w-12 h-12" />
                                                </div>
                                            )}
                                            {record.image_urls.length > 1 && (
                                                <div className="absolute bottom-6 right-6 px-3 py-2 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                                                    +{record.image_urls.length - 1} photos
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                        </div>

                                        {/* Content Section */}
                                        <div className="flex-1 p-8 md:p-10 flex flex-col justify-between">
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-yellow-500 font-black tracking-[0.2em] uppercase mb-1">{record.competition_name}</span>
                                                        <h3 className="group-hover:text-yellow-500 transition-colors">
                                                            {renderAwardName(record.award_name, "text-2xl font-bold text-white", "text-sm font-medium text-neutral-400 mt-0.5")}
                                                        </h3>
                                                        {record.project?.name && (
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    router.push(`/project/${record.project?.id}`)
                                                                }}
                                                                className="flex items-center gap-1.5 mt-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer w-fit"
                                                            >
                                                                <FolderIcon className="w-3 h-3 text-neutral-500" />
                                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider underline underline-offset-4 decoration-neutral-800">{record.project.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-black text-neutral-500 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800 tracking-widest uppercase">
                                                        {record.award_date.replace(/-/g, '.')}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    {record.organization && (
                                                        <div className="flex items-center gap-2 px-3.5 py-2 bg-neutral-900/50 rounded-xl border border-neutral-800/30">
                                                            <Building2 className="w-3.5 h-3.5 text-neutral-600" />
                                                            <span className="text-[10px] font-bold text-neutral-400 uppercase">{record.organization}</span>
                                                        </div>
                                                    )}
                                                    {record.prize_money && (
                                                        <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                                            <Coins className="w-3.5 h-3.5 text-emerald-500/50" />
                                                            <span className="text-[10px] font-bold text-emerald-400">{record.prize_money}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {record.team_members && (
                                                    <div className="flex items-start gap-3">
                                                        <Users className="w-4 h-4 text-neutral-700 mt-0.5 shrink-0" />
                                                        <div className="max-w-[280px]">
                                                            {renderTeamMembers(record.team_members, "text-[12px] leading-relaxed")}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-8 pt-6 border-t border-neutral-900/50 flex items-center justify-between">
                                                <p className="text-[11px] text-neutral-600 italic line-clamp-1 flex-1 pr-6">
                                                    {record.description ? `"${record.description}"` : "상세 기록이 없습니다."}
                                                </p>
                                                <Maximize2 className="w-4 h-4 text-neutral-800 group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div >

            {/* Detail View Modal */}
            {
                showDetailModal && selectedRecord && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/98 backdrop-blur-2xl transition-all animate-in fade-in duration-500" onClick={() => setShowDetailModal(false)}>
                        <div
                            className="relative w-full max-w-5xl h-full md:max-h-[85vh] bg-neutral-950 border border-neutral-800 rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col md:flex-row"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Gallery Section */}
                            <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center group h-80 md:h-auto">
                                {selectedRecord.image_urls && selectedRecord.image_urls.length > 0 ? (
                                    <>
                                        <div className="w-full h-full overflow-hidden" ref={emblaRef}>
                                            <div className="flex w-full h-full">
                                                {selectedRecord!.image_urls.map((url, i) => (
                                                    <div key={i} className="flex-[0_0_100%] min-w-0 h-full relative">
                                                        <img
                                                            src={url}
                                                            alt={`${selectedRecord!.award_name} - ${i + 1}`}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {selectedRecord.image_urls.length > 1 && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); scrollPrev(); }}
                                                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/5 text-white hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 hidden md:block"
                                                >
                                                    <ChevronLeft className="w-6 h-6" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); scrollNext(); }}
                                                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/5 text-white hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 hidden md:block"
                                                >
                                                    <ChevronRight className="w-6 h-6" />
                                                </button>

                                                {/* Mobile Navigation Dots */}
                                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                                                    {selectedRecord.image_urls.map((_, i) => (
                                                        <div key={i} className={`h-1 rounded-full transition-all ${i === activeImageIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"}`} />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <Trophy className="w-24 h-24 text-neutral-900" />
                                )}
                                <div className="absolute top-8 left-8 p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{selectedRecord.image_urls.length} Photos Attached</p>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 p-8 md:p-14 flex flex-col bg-neutral-950 border-l border-neutral-900 overflow-y-auto no-scrollbar">
                                <div className="flex justify-between items-start mb-12">
                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-yellow-500 text-black rounded-2xl w-fit shadow-2xl">
                                            <Trophy className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-yellow-500 font-black uppercase tracking-[0.3em] mb-1">{selectedRecord.competition_name}</p>
                                            <h2 className="tracking-tight">
                                                {renderAwardName(selectedRecord!.award_name, "text-3xl md:text-4xl font-bold text-white", "text-lg md:text-xl font-medium text-neutral-400 mt-2")}
                                            </h2>
                                            {selectedRecord!.project?.name && (
                                                <div
                                                    onClick={() => router.push(`/project/${selectedRecord!.project?.id}`)}
                                                    className="flex items-center gap-2 mt-4 px-4 py-2 bg-neutral-900/50 rounded-xl border border-neutral-800 w-fit cursor-pointer hover:bg-neutral-800 transition-all"
                                                >
                                                    <FolderIcon className="w-4 h-4 text-neutral-500" />
                                                    <span className="text-sm font-bold text-neutral-300 uppercase tracking-widest">{selectedRecord!.project.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2.5 rounded-full hover:bg-neutral-900 text-neutral-500 transition-colors border border-neutral-800"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-10 flex-1">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Date</p>
                                            <p className="text-lg font-medium text-white">{selectedRecord!.award_date.replace(/-/g, '.')}</p>
                                        </div>
                                        {selectedRecord!.organization && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Organization</p>
                                                <p className="text-lg font-medium text-white">{selectedRecord!.organization}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 py-8 border-y border-neutral-900">
                                        {selectedRecord!.prize_money && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Prize Money</p>
                                                <p className="text-lg font-bold text-emerald-500">{selectedRecord!.prize_money}</p>
                                            </div>
                                        )}
                                        {selectedRecord!.team_members && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Members</p>
                                                <div className="pt-1">
                                                    {renderTeamMembers(selectedRecord!.team_members, "text-sm md:text-base")}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedRecord!.description && (
                                        <div className="space-y-3">
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Description</p>
                                            <p className="text-sm md:text-base text-neutral-400 leading-relaxed italic">"{selectedRecord!.description}"</p>
                                        </div>
                                    )}

                                    {/* Photo Strip (Miniature Gallery) */}
                                    {selectedRecord!.image_urls.length > 1 && (
                                        <div className="space-y-4 pt-4">
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Photo Archive</p>
                                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                {selectedRecord!.image_urls.map((url, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setActiveImageIndex(i)}
                                                        className={`w-24 h-24 rounded-2xl overflow-hidden shrink-0 border cursor-pointer transition-all ${activeImageIndex === i ? "border-yellow-500 ring-2 ring-yellow-500/20 scale-95" : "border-neutral-800 opacity-50 hover:opacity-100"}`}
                                                    >
                                                        <img src={url} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {(accessLevel ?? 0) >= 1 && (
                                    <div className="flex gap-4 p-8 border-t border-neutral-900 bg-neutral-950/50">
                                        <button
                                            onClick={() => openEditModal(selectedRecord!)}
                                            className="flex-1 py-4.5 bg-neutral-900 text-white text-[12px] font-black rounded-2xl hover:bg-neutral-800 transition-all border border-neutral-800 flex items-center justify-center gap-2"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            정보 수정
                                        </button>
                                        {(accessLevel ?? 0) >= 3 && (
                                            <button
                                                onClick={() => handleDelete(selectedRecord!.id)}
                                                className="px-6 py-4.5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Form Modal (Add / Edit) */}
            {
                showFormModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-8 bg-black/95 backdrop-blur-3xl transition-all animate-in fade-in duration-500 overflow-y-auto" onClick={() => setShowFormModal(false)}>
                        <div
                            className="relative w-full md:max-w-5xl h-full md:h-auto md:max-h-[90vh] bg-neutral-950 border-0 md:border md:border-neutral-800 rounded-0 md:rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col md:flex-row my-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Preview Section (Condensed) */}
                            <div className="hidden md:flex flex-[0.7] bg-neutral-900/20 p-12 border-r border-neutral-800 flex-col items-center justify-center gap-12 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-50" />
                                <div className="relative z-10 w-full max-w-sm">
                                    <p className="text-[10px] text-neutral-700 font-black uppercase tracking-[0.5em] mb-10 text-center opacity-40">Card Preview</p>
                                    <div className="bg-neutral-950 border border-neutral-800 rounded-[36px] p-8 shadow-2xl transform hover:rotate-1 transition-transform">
                                        <div className="flex justify-between items-start mb-6">
                                            <Trophy className="w-5 h-5 text-yellow-500" />
                                            <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">{formData.award_date.replace(/-/g, '.')}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[9px] text-yellow-500/60 font-black uppercase tracking-widest">{formData.competition_name || "New Competition"}</p>
                                                <div className="mt-1">
                                                    {renderAwardName(formData.award_name || "Award Name", "text-xl font-bold text-white", "text-[12px] font-medium text-neutral-400 mt-0.5")}
                                                </div>
                                                {formData.project_id && (
                                                    <p className="text-[9px] text-neutral-600 font-bold uppercase mt-2">Proj: {projects.find(p => p.id === formData.project_id)?.name || "Selected Project"}</p>
                                                )}
                                            </div>
                                            {formData.prize_money && <p className="text-[10px] font-bold text-emerald-500">{formData.prize_money}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Input Section (Scrollable) */}
                            <div className="flex-1 p-8 md:p-14 flex flex-col bg-black overflow-y-auto no-scrollbar relative">
                                <div className="flex items-center justify-between mb-12 sticky top-0 bg-black py-2 z-20">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white text-black rounded-2xl shadow-2xl">
                                            {editingRecord ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
                                            {editingRecord ? "기록 수정" : "새 수상 기록"}
                                        </h2>
                                    </div>
                                    <button onClick={() => setShowFormModal(false)} className="p-2 rounded-full border border-neutral-800 text-neutral-500 hover:text-white transition-all">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-10 pb-12">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">대회명</label>
                                            <input
                                                type="text"
                                                value={formData.competition_name}
                                                onChange={(e) => setFormData({ ...formData, competition_name: e.target.value })}
                                                className="w-full px-6 py-4.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-white transition-all font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">연관 프로젝트</label>
                                            <Select
                                                value={formData.project_id || "none"}
                                                onValueChange={(val) => setFormData({ ...formData, project_id: val === "none" ? "" : val })}
                                            >
                                                <SelectTrigger className="w-full h-[54px] bg-neutral-900/40 border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="연관 프로젝트 없음" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-neutral-950 border-neutral-800 text-white">
                                                    <SelectItem value="none">연관 프로젝트 없음</SelectItem>
                                                    {projects.map((project) => (
                                                        <SelectItem key={project.id} value={project.id}>
                                                            {project.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">주관기관</label>
                                            <input
                                                type="text"
                                                value={formData.organization}
                                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                                className="w-full px-6 py-4.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-white transition-all font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">수상 일자</label>
                                            <input
                                                type="date"
                                                value={formData.award_date}
                                                onChange={(e) => setFormData({ ...formData, award_date: e.target.value })}
                                                className="w-full px-6 py-4.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-white transition-all [color-scheme:dark] font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">상 명 (내역)</label>
                                        <input
                                            type="text"
                                            placeholder="예: 최우수상(경기도 교육감상)"
                                            value={formData.award_name}
                                            onChange={(e) => setFormData({ ...formData, award_name: e.target.value })}
                                            className="w-full px-6 py-4.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-white transition-all font-semibold"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-neutral-900 pt-10">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">상금 / 혜택</label>
                                            <input
                                                type="text"
                                                placeholder="예: 1,000만원"
                                                value={formData.prize_money}
                                                onChange={(e) => setFormData({ ...formData, prize_money: e.target.value })}
                                                className="w-full px-6 py-4.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">팀원 (수상자)</label>
                                            <input
                                                type="text"
                                                value={formData.team_members}
                                                onChange={(e) => setFormData({ ...formData, team_members: e.target.value })}
                                                className="w-full px-6 py-4.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6 border-t border-neutral-900 pt-10">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black">사진 갤러리</label>
                                            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-white hover:text-yellow-500 transition-colors uppercase tracking-widest flex items-center gap-2">
                                                <Camera className="w-3 h-3" />
                                                Upload
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                                            {formData.image_urls.map((url, i) => (
                                                <div key={i} className="aspect-square relative rounded-xl overflow-hidden group/img border border-neutral-800">
                                                    <img src={url} className="w-full h-full object-cover" />
                                                    <button onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 p-1 bg-black/80 rounded-md text-red-500 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {uploading && (
                                                <div className="aspect-square rounded-xl border border-neutral-800 flex items-center justify-center bg-neutral-900/50">
                                                    <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                    </div>

                                    <div className="space-y-2.5 border-t border-neutral-900 pt-10">
                                        <label className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] font-black ml-1">세부 내용</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                            className="w-full px-6 py-5 bg-neutral-900/40 border border-neutral-800 rounded-[32px] text-sm text-neutral-400 focus:outline-none focus:border-white transition-all resize-none italic"
                                        />
                                    </div>
                                </div>

                                <div className="mt-auto pt-8 border-t border-neutral-900 sticky bottom-0 bg-black/80 backdrop-blur-xl z-20">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!formData.competition_name.trim() || !formData.award_name.trim() || uploading}
                                        className="w-full py-5 bg-white text-black text-[13px] font-black rounded-3xl hover:bg-neutral-200 transition-all shadow-2xl disabled:opacity-20 uppercase tracking-[0.2em]"
                                    >
                                        {editingRecord ? "기록 수정 완료" : "데이터 아카이브 등록"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
