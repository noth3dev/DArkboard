"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { Settings, Shield, Users, ChevronDown, ChevronUp, Check, AlertTriangle, Save, Pencil } from "lucide-react"

type User = {
    user_uuid: string
    name: string | null
    name_eng: string | null
    display_name: string | null
    access_level: number
}

type Permission = {
    id: string
    permission_key: string
    permission_name: string
    description: string | null
    level_0: boolean
    level_1: boolean
    level_2: boolean
    sort_order: number
}

// 레벨 설정
const levelConfig = [
    { level: 0, name: "Level I", description: "기본 접근자", color: "bg-neutral-700" },
    { level: 1, name: "Level II", description: "팀 멤버", color: "bg-neutral-500" },
    { level: 2, name: "Level III", description: "관리자", color: "bg-white" },
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
    const [savingUsers, setSavingUsers] = useState(false)

    useEffect(() => {
        if (user && (accessLevel ?? 0) >= 2) {
            fetchData()
        }
    }, [user, accessLevel])

    async function fetchData() {
        try {
            const supabase = getSupabase()

            // 사용자 조회
            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("user_uuid, name, name_eng, display_name, access_level")
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
                console.log("Permissions table not found, using defaults")
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

    // 사용자 레벨 변경 핸들러
    function handleUserLevelChange(userUuid: string, newLevel: number) {
        setUserLevelChanges((prev) => ({
            ...prev,
            [userUuid]: newLevel,
        }))
    }

    // 사용자 변경 저장
    async function handleSaveUsers() {
        if ((accessLevel ?? 0) < 2) return
        if (Object.keys(userLevelChanges).length === 0) {
            setEditingUsers(false)
            return
        }

        setSavingUsers(true)
        try {
            const supabase = getSupabase()

            for (const [userUuid, newLevel] of Object.entries(userLevelChanges)) {
                const { error } = await supabase
                    .from("users")
                    .update({ access_level: newLevel })
                    .eq("user_uuid", userUuid)

                if (error) {
                    console.error("Error updating user:", error)
                    throw error
                }
            }

            setUserLevelChanges({})
            setEditingUsers(false)
            await fetchData()
        } catch (err) {
            console.error("Error saving users:", err)
            alert("저장 중 오류가 발생했습니다. 콘솔을 확인해주세요.")
        } finally {
            setSavingUsers(false)
        }
    }

    // 현재 사용자 레벨 값 (변경사항 포함)
    function getEffectiveUserLevel(u: User) {
        if (userLevelChanges[u.user_uuid] !== undefined) {
            return userLevelChanges[u.user_uuid]
        }
        return u.access_level ?? 0
    }

    // 권한 변경 핸들러
    function handlePermissionChange(permissionId: string, levelKey: "level_0" | "level_1" | "level_2", value: boolean) {
        setPermissionChanges((prev) => ({
            ...prev,
            [permissionId]: {
                ...prev[permissionId],
                [levelKey]: value,
            },
        }))
    }

    // 권한 변경 저장
    async function handleSavePermissions() {
        if ((accessLevel ?? 0) < 2) return
        if (Object.keys(permissionChanges).length === 0) {
            setEditingPermissions(false)
            return
        }

        setSavingPermissions(true)
        try {
            const supabase = getSupabase()

            for (const [permissionId, changes] of Object.entries(permissionChanges)) {
                const { error } = await supabase
                    .from("permissions")
                    .update(changes)
                    .eq("id", permissionId)

                if (error) throw error
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

    function getEffectivePermissionValue(permission: Permission, levelKey: "level_0" | "level_1" | "level_2") {
        if (permissionChanges[permission.id]?.[levelKey] !== undefined) {
            return permissionChanges[permission.id][levelKey]
        }
        return permission[levelKey]
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white">
                <div className="text-neutral-400">로딩 중...</div>
            </div>
        )
    }

    if (!user) {
        return <AuthForm />
    }

    // Level 2만 접근 가능
    if ((accessLevel ?? 0) < 2) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white">
                <div className="text-center text-neutral-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
                    <p className="mb-4">관리자 권한이 필요합니다.</p>
                    <a href="/" className="text-white underline">
                        대시보드로 돌아가기
                    </a>
                </div>
            </div>
        )
    }

    const romanLevels = ["I", "II", "III"]
    const hasPermissionChanges = Object.keys(permissionChanges).length > 0
    const hasUserChanges = Object.keys(userLevelChanges).length > 0

    return (
        <div className="min-h-[calc(100vh-65px)] bg-black text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                        <Settings className="w-6 h-6 text-neutral-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-light tracking-tight">관리</h1>
                        <p className="text-sm text-neutral-500 mt-0.5">권한 및 사용자 관리</p>
                    </div>
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-neutral-400">불러오는 중...</div>
                    </div>
                ) : (
                    <>
                        {/* Users Section */}
                        <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "50ms" }}>
                            <button
                                onClick={() => setExpandedSection(expandedSection === "users" ? null : "users")}
                                className="w-full p-5 flex items-center justify-between hover:bg-neutral-900/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-neutral-400" />
                                    <div className="text-left">
                                        <h2 className="font-medium text-white">사용자 관리</h2>
                                        <p className="text-xs text-neutral-500 mt-0.5">{users.length}명의 사용자</p>
                                    </div>
                                </div>
                                {expandedSection === "users" ? (
                                    <ChevronUp className="w-5 h-5 text-neutral-500" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-neutral-500" />
                                )}
                            </button>

                            {expandedSection === "users" && (
                                <div className="border-t border-neutral-800 animate-in fade-in duration-200">
                                    {/* Edit/Save Button */}
                                    <div className="flex justify-end p-4 border-b border-neutral-800/50">
                                        {editingUsers ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingUsers(false)
                                                        setUserLevelChanges({})
                                                    }}
                                                    className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveUsers}
                                                    disabled={savingUsers || !hasUserChanges}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    {savingUsers ? "저장 중..." : `저장 (${Object.keys(userLevelChanges).length})`}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingUsers(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                수정
                                            </button>
                                        )}
                                    </div>

                                    {users.length === 0 ? (
                                        <div className="p-8 text-center text-neutral-500">사용자가 없습니다.</div>
                                    ) : (
                                        <div className="divide-y divide-neutral-800">
                                            {users.map((u) => {
                                                const effectiveLevel = getEffectiveUserLevel(u)
                                                const safeLevel = Math.min(Math.max(effectiveLevel, 0), 2)
                                                const hasChange = userLevelChanges[u.user_uuid] !== undefined

                                                return (
                                                    <div
                                                        key={u.user_uuid}
                                                        className={`p-4 flex items-center justify-between transition-colors ${hasChange ? "bg-neutral-900/50" : "hover:bg-neutral-900/30"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full bg-neutral-800 border flex items-center justify-center text-sm font-bold text-neutral-300 ${hasChange ? "border-white" : "border-neutral-700"
                                                                }`}>
                                                                {(u.name || u.display_name || "?")[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-white">
                                                                    {u.name || u.display_name || "이름 없음"}
                                                                    {hasChange && (
                                                                        <span className="ml-2 text-xs text-neutral-400">(변경됨)</span>
                                                                    )}
                                                                </p>
                                                                {u.name_eng && (
                                                                    <p className="text-xs text-neutral-500">{u.name_eng}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Level Selector */}
                                                        <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                                                            {levelConfig.map((level) => {
                                                                const isSelected = safeLevel === level.level

                                                                return (
                                                                    <button
                                                                        key={level.level}
                                                                        onClick={() => {
                                                                            if (editingUsers) {
                                                                                handleUserLevelChange(u.user_uuid, level.level)
                                                                            }
                                                                        }}
                                                                        disabled={!editingUsers}
                                                                        className={`
                                      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                                      ${isSelected
                                                                                ? "bg-neutral-700 text-white"
                                                                                : "text-neutral-500 hover:text-white hover:bg-neutral-800"
                                                                            }
                                      ${!editingUsers ? "cursor-default" : "cursor-pointer"}
                                    `}
                                                                    >
                                                                        <div className={`w-2 h-2 rounded-full ${level.color}`} />
                                                                        {romanLevels[level.level]}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Permissions Section */}
                        {permissions.length > 0 && (
                            <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "100ms" }}>
                                <button
                                    onClick={() => setExpandedSection(expandedSection === "permissions" ? null : "permissions")}
                                    className="w-full p-5 flex items-center justify-between hover:bg-neutral-900/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-neutral-400" />
                                        <div className="text-left">
                                            <h2 className="font-medium text-white">권한 설정</h2>
                                            <p className="text-xs text-neutral-500 mt-0.5">각 레벨별 권한 관리</p>
                                        </div>
                                    </div>
                                    {expandedSection === "permissions" ? (
                                        <ChevronUp className="w-5 h-5 text-neutral-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-neutral-500" />
                                    )}
                                </button>

                                {expandedSection === "permissions" && (
                                    <div className="border-t border-neutral-800 p-5 animate-in fade-in duration-200">
                                        {/* Edit/Save Button */}
                                        <div className="flex justify-end mb-4">
                                            {editingPermissions ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingPermissions(false)
                                                            setPermissionChanges({})
                                                        }}
                                                        className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={handleSavePermissions}
                                                        disabled={savingPermissions || !hasPermissionChanges}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        {savingPermissions ? "저장 중..." : "저장"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingPermissions(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white text-sm font-medium rounded-md hover:bg-neutral-700 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    수정
                                                </button>
                                            )}
                                        </div>

                                        {/* Permissions Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-neutral-800">
                                                        <th className="text-left py-3 px-4 text-xs text-neutral-500 uppercase tracking-wider">
                                                            권한
                                                        </th>
                                                        {levelConfig.map((level) => (
                                                            <th
                                                                key={level.level}
                                                                className="text-center py-3 px-4 text-xs text-neutral-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className={`w-3 h-3 rounded-full ${level.color}`} />
                                                                    <span>{level.name}</span>
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {permissions.map((permission) => (
                                                        <tr key={permission.id} className="border-b border-neutral-800/50">
                                                            <td className="py-3 px-4">
                                                                <div>
                                                                    <p className="text-sm text-neutral-300">{permission.permission_name}</p>
                                                                    {permission.description && (
                                                                        <p className="text-xs text-neutral-600 mt-0.5">{permission.description}</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {(["level_0", "level_1", "level_2"] as const).map((levelKey) => {
                                                                const isAllowed = getEffectivePermissionValue(permission, levelKey)
                                                                const hasChange = permissionChanges[permission.id]?.[levelKey] !== undefined

                                                                return (
                                                                    <td key={levelKey} className="py-3 px-4 text-center">
                                                                        {editingPermissions ? (
                                                                            <button
                                                                                onClick={() => handlePermissionChange(permission.id, levelKey, !isAllowed)}
                                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isAllowed
                                                                                        ? "bg-white text-black"
                                                                                        : "bg-neutral-800 text-neutral-600 hover:bg-neutral-700"
                                                                                    } ${hasChange ? "ring-2 ring-neutral-500" : ""}`}
                                                                            >
                                                                                {isAllowed ? <Check className="w-4 h-4" /> : null}
                                                                            </button>
                                                                        ) : isAllowed ? (
                                                                            <Check className="w-4 h-4 text-white mx-auto" />
                                                                        ) : (
                                                                            <span className="text-neutral-700">—</span>
                                                                        )}
                                                                    </td>
                                                                )
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Level Descriptions */}
                                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {levelConfig.map((level) => (
                                                <div
                                                    key={level.level}
                                                    className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-3 h-3 rounded-full ${level.color}`} />
                                                        <span className="font-medium text-white">{level.name}</span>
                                                    </div>
                                                    <p className="text-sm text-neutral-400">{level.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Info Section */}
                        <div className="p-4 rounded-lg bg-neutral-900/30 border border-neutral-800/50 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "150ms" }}>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-neutral-500">
                                    <p className="mb-1">
                                        <strong className="text-neutral-400">안내:</strong> 수정 버튼을 클릭하여 편집 모드로 전환한 후, 변경사항을 저장하세요.
                                    </p>
                                    <p>
                                        Level III 권한을 부여하면 해당 사용자도 이 관리 페이지에 접근하고 모든 설정을 변경할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
