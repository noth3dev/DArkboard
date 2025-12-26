"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { Award, Plus, Search, X, Pencil, Trash2, Eye, ShieldCheck, Settings, Users, ChevronDown, ChevronUp, Check, AlertTriangle, Save, UserCheck, Shield } from "lucide-react"

type User = {
    user_uuid: string
    name: string | null
    name_eng: string | null
    display_name: string | null
    access_level: number
    role: string | null
}

type Permission = {
    id: string
    permission_key: string
    permission_name: string
    description: string | null
    level_1: boolean
    level_2: boolean
    level_3: boolean
    level_4: boolean
    sort_order: number
}

// 레벨 설정
const levelConfig = [
    { level: 1, name: "Level I", description: "기본 접근자", color: "bg-neutral-700" },
    { level: 2, name: "Level II", description: "Impluse", color: "bg-neutral-500" },
    { level: 3, name: "Level III", description: "Ark", color: "bg-white" },
    { level: 4, name: "Level IV", description: "관리자", color: "bg-orange-500" },
]

export default function ManagementPage() {
    const { user, loading, accessLevel } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [expandedSection, setExpandedSection] = useState<string | null>("users")

    // 권한 편집 상태
    const [editingPermissions, setEditingPermissions] = useState(false)
    const [permissionChanges, setPermissionChanges] = useState<Record<string, Partial<Permission>>>({})
    const [savingPermissions, setSavingPermissions] = useState(false)

    // 사용자 편집 상태
    const [editingUsers, setEditingUsers] = useState(false)
    const [userLevelChanges, setUserLevelChanges] = useState<Record<string, number>>({})
    const [userRoleChanges, setUserRoleChanges] = useState<Record<string, string>>({})
    const [savingUsers, setSavingUsers] = useState(false)

    useEffect(() => {
        if (user && (accessLevel ?? 0) >= 4) {
            fetchData()
        }
    }, [user, accessLevel])

    async function fetchData() {
        try {
            const supabase = getSupabase()

            // 사용자 조회
            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("user_uuid, name, name_eng, display_name, access_level, role")
                .order("access_level", { ascending: false })
                .order("name", { ascending: true })

            if (usersError) throw usersError
            setUsers(usersData || [])

            // 권한 조회
            const { data: permissionsData, error: permissionsError } = await supabase
                .from("permissions")
                .select("*")
                .order("sort_order", { ascending: true })

            if (permissionsError) {
                setPermissions([])
            } else {
                setPermissions(permissionsData || [])
            }
        } catch (err) {
            console.error("Error fetching data:", err)
        } finally {
            setLoadingData(false)
        }
    }

    function handleUserLevelChange(userUuid: string, newLevel: number) {
        setUserLevelChanges((prev) => ({ ...prev, [userUuid]: newLevel }))
    }

    function handleUserRoleChange(userUuid: string, newRole: string) {
        setUserRoleChanges((prev) => ({ ...prev, [userUuid]: newRole }))
    }

    async function handleSaveUsers() {
        if ((accessLevel ?? 0) < 4) return
        setSavingUsers(true)
        try {
            const supabase = getSupabase()
            for (const [userUuid, newLevel] of Object.entries(userLevelChanges)) {
                await supabase.from("users").update({ access_level: newLevel }).eq("user_uuid", userUuid)
            }
            for (const [userUuid, newRole] of Object.entries(userRoleChanges)) {
                await supabase.from("users").update({ role: newRole }).eq("user_uuid", userUuid)
            }
            setUserLevelChanges({})
            setUserRoleChanges({})
            setEditingUsers(false)
            await fetchData()
        } catch (err) {
            console.error("Error saving users:", err)
        } finally {
            setSavingUsers(false)
        }
    }

    function getEffectiveUserLevel(u: User) {
        return userLevelChanges[u.user_uuid] !== undefined ? userLevelChanges[u.user_uuid] : (u.access_level ?? 0)
    }

    function getEffectiveUserRole(u: User) {
        return userRoleChanges[u.user_uuid] !== undefined ? userRoleChanges[u.user_uuid] : (u.role || "mentee")
    }

    function handlePermissionChange(permissionId: string, levelKey: "level_1" | "level_2" | "level_3" | "level_4", value: boolean) {
        setPermissionChanges((prev) => ({
            ...prev,
            [permissionId]: { ...prev[permissionId], [levelKey]: value }
        }))
    }

    async function handleSavePermissions() {
        if ((accessLevel ?? 0) < 4) return
        setSavingPermissions(true)
        try {
            const supabase = getSupabase()
            for (const [permissionId, changes] of Object.entries(permissionChanges)) {
                await supabase.from("permissions").update(changes).eq("id", permissionId)
            }
            setPermissionChanges({})
            setEditingPermissions(false)
            fetchData()
        } catch (err) {
            console.error("Error saving permissions:", err)
        } finally {
            setSavingPermissions(false)
        }
    }

    function getEffectivePermissionValue(permission: Permission, levelKey: "level_1" | "level_2" | "level_3" | "level_4") {
        return permissionChanges[permission.id]?.[levelKey] !== undefined ? (permissionChanges[permission.id] as any)[levelKey] : (permission as any)[levelKey]
    }

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 font-suit">로딩 중...</div>
    if (!user) return <AuthForm />
    if ((accessLevel ?? 0) < 3) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white p-6">
                <div className="text-center text-neutral-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
                    <p className="mb-4 text-lg font-light">관리자 권한이 필요합니다.</p>
                    <a href="/" className="text-white underline hover:text-blue-400 transition-colors">홈으로 돌아가기</a>
                </div>
            </div>
        )
    }

    const romanLevels = ["I", "II", "III", "IV"]
    const hasUserChanges = Object.keys(userLevelChanges).length > 0 || Object.keys(userRoleChanges).length > 0
    const hasPermissionChanges = Object.keys(permissionChanges).length > 0

    return (
        <div className="min-h-[calc(100vh-65px)] bg-black text-white p-6 md:p-12 font-suit">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-4">
                            설정 및 관리
                        </h1>
                        <p className="text-sm text-neutral-500 font-medium max-w-md leading-relaxed">
                            사용자 권한과 시스템 설정을 통합적으로 관리합니다.
                        </p>
                    </div>
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-20 text-[10px] font-bold uppercase tracking-widest text-neutral-700">데이터를 불러오는 중...</div>
                ) : (
                    <div className="space-y-6">
                        {/* Users Section */}
                        <div className="rounded-3xl border border-neutral-900 bg-neutral-950/50 overflow-hidden backdrop-blur-sm">
                            <button
                                onClick={() => setExpandedSection(expandedSection === "users" ? null : "users")}
                                className="w-full p-6 flex items-center justify-between hover:bg-neutral-900/40 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-neutral-900">
                                        <Users className="w-4 h-4 text-neutral-400" />
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-sm font-bold text-white tracking-tight">사용자 관리</h2>
                                        <p className="text-[10px] text-neutral-600 font-bold mt-0.5 tracking-wider">{users.length}명의 활성 사용자</p>
                                    </div>
                                </div>
                                {expandedSection === "users" ? <ChevronUp className="w-4 h-4 text-neutral-700" /> : <ChevronDown className="w-4 h-4 text-neutral-700" />}
                            </button>

                            {expandedSection === "users" && (
                                <div className="border-t border-neutral-900 p-6 pt-2">
                                    <div className="flex justify-end mb-6">
                                        {editingUsers ? (
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => { setEditingUsers(false); setUserLevelChanges({}); setUserRoleChanges({}); }} className="px-4 py-2 text-[11px] font-bold text-neutral-500 hover:text-white transition-colors">취소</button>
                                                <button onClick={handleSaveUsers} disabled={savingUsers || !hasUserChanges} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[11px] font-bold rounded-xl hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-30">
                                                    <Save className="w-3 h-3" /> {savingUsers ? "저장 중..." : "변경사항 적용"}
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setEditingUsers(true)} className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[11px] font-bold rounded-xl hover:bg-neutral-800 border border-neutral-800 transition-all">
                                                <Pencil className="w-3 h-3" /> 설정 변경
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {users.map((u) => {
                                            const effectiveLevel = getEffectiveUserLevel(u)
                                            const effectiveRole = getEffectiveUserRole(u)
                                            const levelChanged = userLevelChanges[u.user_uuid] !== undefined
                                            const roleChanged = userRoleChanges[u.user_uuid] !== undefined

                                            return (
                                                <div key={u.user_uuid} className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${levelChanged || roleChanged ? "bg-white/[0.04] border-white/20" : "bg-black/40 border-neutral-900"}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">{(u.name || u.display_name || "?")[0]}</div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white tracking-tight">{u.name || u.display_name || "알 수 없는 사용자"}</p>
                                                            <p className="text-[10px] text-neutral-600 font-medium mt-0.5 tracking-tight">{u.name_eng || "영문 이름 미설정"}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        {/* Role Selector */}
                                                        <div className="flex items-center gap-1 bg-neutral-950 rounded-lg p-1 border border-neutral-900">
                                                            {['mentor', 'mentee'].map(r => (
                                                                <button key={r} onClick={() => editingUsers && handleUserRoleChange(u.user_uuid, r)} disabled={!editingUsers} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${effectiveRole === r ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-700 hover:text-neutral-500'} ${!editingUsers ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}>{r === 'mentor' ? '멘토' : '멘티'}</button>
                                                            ))}
                                                        </div>

                                                        {/* Level Selector */}
                                                        <div className="flex items-center gap-1 bg-neutral-950 rounded-lg p-1 border border-neutral-900">
                                                            {levelConfig.map((level) => (
                                                                <button key={level.level} onClick={() => editingUsers && handleUserLevelChange(u.user_uuid, level.level)} disabled={!editingUsers} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${effectiveLevel === level.level ? (level.level === 4 ? "bg-orange-500 text-white" : "bg-neutral-800 text-white") : "text-neutral-700 hover:text-neutral-500"} ${!editingUsers ? "cursor-default" : "cursor-pointer active:scale-95"}`}>
                                                                    <div className={`w-1 h-1 rounded-full ${effectiveLevel === level.level ? "bg-white" : "bg-neutral-800"}`} />
                                                                    {romanLevels[level.level - 1]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 rounded-2xl bg-neutral-900/20 border border-neutral-900 flex items-start gap-4">
                            <AlertTriangle className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
                            <div className="text-[10px] leading-relaxed text-neutral-600 font-medium">
                                <p className="mb-2"><span className="text-neutral-500 font-bold mr-2">도움말:</span> 멘토/멘티 설정은 시스템 내부의 워크플로우에 영향을 줍니다. 멘토는 과제 생성 및 평가 권한을 가질 수 있으며, 멘티는 과제 제출 및 수행에 중점을 둡니다.</p>
                                <p>레벨 IV(관리자)는 시스템의 모든 설정과 사용자의 권한 레벨을 수정할 수 있는 절대적인 권한을 가집니다.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
