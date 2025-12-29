"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { Users, Shield, Phone, Briefcase, Plus, X, UserPlus, UsersRound, ChevronDown, Check } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type TeamMember = {
  user_uuid: string
  name: string | null
  name_eng: string | null
  display_name: string | null
  phone: string | null
  role: string | null
  access_level: number
}

type Team = {
  id: string
  name: string
  description: string | null
  created_at: string
  members?: {
    user_uuid: string
    role: string | null
    user: TeamMember
  }[]
}

export default function TeamPage() {
  const router = useRouter()
  const { user, loading, accessLevel } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState("")
  const [memberRole, setMemberRole] = useState("")
  const [newTeam, setNewTeam] = useState<{ name: string; description: string; members: string[] }>({ name: "", description: "", members: [] })

  useEffect(() => {
    if (user && (accessLevel ?? 0) >= 1) {
      fetchData()
    }
  }, [user, accessLevel])

  async function fetchData() {
    try {
      const supabase = getSupabase()

      // 멤버 조회
      const { data: membersData, error: membersError } = await supabase
        .from("users")
        .select("*")
        .order("access_level", { ascending: false })
        .order("name", { ascending: true })

      if (membersError) throw membersError
      setMembers(membersData || [])

      // 팀 조회
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false })

      if (teamsError) throw teamsError

      // 각 팀의 멤버 조회
      const teamsWithMembers = await Promise.all(
        (teamsData || []).map(async (team: Team) => {
          const { data: teamMembersData } = await supabase
            .from("team_members")
            .select(`
              user_uuid,
              role,
              user:users(*)
            `)
            .eq("team_id", team.id)

          return {
            ...team,
            members: (teamMembersData || []).map((m: { user_uuid: string; role: string | null; user: TeamMember | TeamMember[] }) => ({
              user_uuid: m.user_uuid,
              role: m.role,
              user: Array.isArray(m.user) ? m.user[0] : m.user,
            })),
          }
        })
      )

      setTeams(teamsWithMembers)
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoadingData(false)
    }
  }

  async function handleAddTeam() {
    if ((accessLevel ?? 0) < 1) return
    if (!newTeam.name.trim()) return

    try {
      const supabase = getSupabase()
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: newTeam.name.trim(),
          description: newTeam.description.trim() || null,
        })
        .select()
        .single()

      if (teamError) throw teamError

      // 초기 멤버 추가
      if (newTeam.members.length > 0) {
        const memberInserts = newTeam.members.map(userUuid => ({
          team_id: teamData.id,
          user_uuid: userUuid,
          role: "Member"
        }))
        const { error: membersError } = await supabase.from("team_members").insert(memberInserts)
        if (membersError) throw membersError
      }

      setNewTeam({ name: "", description: "", members: [] })
      setShowAddTeam(false)
      fetchData()
    } catch (err) {
      console.error("Error adding team:", err)
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if ((accessLevel ?? 0) < 3) return
    toast("이 팀을 삭제하시겠습니까?", {
      action: {
        label: "삭제",
        onClick: async () => {
          try {
            const supabase = getSupabase()
            const { error } = await supabase.from("teams").delete().eq("id", teamId)

            if (error) throw error
            fetchData()
            toast.success("팀이 삭제되었습니다.")
          } catch (err) {
            console.error("Error deleting team:", err)
            toast.error("팀 삭제 중 오류가 발생했습니다.")
          }
        }
      }
    })
    return

  }

  async function handleAddMemberToTeam(teamId: string) {
    if ((accessLevel ?? 0) < 1) return
    if (!selectedMember) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("team_members").insert({
        team_id: teamId,
        user_uuid: selectedMember,
        role: memberRole.trim() || null,
      })

      if (error) throw error
      setAddingMemberTo(null)
      setSelectedMember("")
      setMemberRole("")
      fetchData()
    } catch (err) {
      console.error("Error adding member to team:", err)
    }
  }

  async function handleRemoveMemberFromTeam(teamId: string, userUuid: string) {
    if ((accessLevel ?? 0) < 3) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_uuid", userUuid)

      if (error) throw error
      fetchData()
    } catch (err) {
      console.error("Error removing member from team:", err)
    }
  }

  function getAvailableMembers(team: Team) {
    const existingUuids = new Set(team.members?.map((m) => m.user_uuid) || [])
    return members.filter((m) => !existingUuids.has(m.user_uuid))
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

  if ((accessLevel ?? 0) === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white">
        <div className="text-center text-neutral-400">
          <p className="mb-4">이 페이지에 접근할 권한이 없습니다.</p>
          <a href="/" className="text-white underline">
            대시보드로 돌아가기
          </a>
        </div>
      </div>
    )
  }

  const romanLevels = ["I", "II", "III", "IV"]

  return (
    <div className="min-h-[calc(100vh-65px)] bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
              팀 관리
            </h1>
            <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
              전체 멤버 구성원과 각 팀의 역할을 한눈에 확인하세요.
            </p>
          </div>

          {(accessLevel ?? 0) >= 1 && (
            <button
              onClick={() => setShowAddTeam(true)}
              className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-white/5"
            >
              <Plus className="w-4 h-4" />
              <span>팀 만들기</span>
            </button>
          )}
        </div>

        {/* Add Team Form */}
        {showAddTeam && (accessLevel ?? 0) >= 1 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">

            <div
              className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-[32px] overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                {/* Left: Preview Section */}
                <div className="hidden md:flex flex-1 bg-neutral-900/30 p-12 border-r border-neutral-800 flex-col items-center justify-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 blur-[100px] rounded-full" />

                  <div className="relative z-10 w-full flex flex-col items-center">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em] mb-12 opacity-50">Team Preview</p>
                    <div className="w-full max-w-sm transform scale-110 hover:scale-[1.12] transition-transform duration-500">
                      <div className="rounded-xl border bg-neutral-950 border-neutral-800 p-6 shadow-2xl">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-neutral-800 border border-neutral-700">
                              <UsersRound className="w-5 h-5 text-neutral-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-lg">{newTeam.name || "팀 이름을 입력하세요"}</h3>
                              <p className="text-sm text-neutral-500 mt-1">{newTeam.description || "팀의 역할이나 설명을 적어주세요"}</p>
                              <div className="flex items-center gap-2 mt-3">
                                <Users className="w-3.5 h-3.5 text-neutral-600" />
                                <span className="text-[11px] text-neutral-500 font-medium">
                                  {newTeam.members.length}명 참여 중
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex -space-x-2 mt-6">
                          {newTeam.members.length > 0 ? (
                            newTeam.members.slice(0, 5).map((uid) => {
                              const member = members.find(m => m.user_uuid === uid)
                              return (
                                <div key={uid} className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                  {(member?.display_name || member?.name || "?")[0]}
                                </div>
                              )
                            })
                          ) : (
                            [1, 2, 3].map(i => (
                              <div key={i} className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[10px] font-bold text-neutral-700">?</div>
                            ))
                          )}
                          {newTeam.members.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-neutral-900 border-2 border-neutral-950 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                              +{newTeam.members.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Input Section */}
                <div className="flex-1 p-8 flex flex-col bg-black overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white text-black shadow-lg">
                        <UsersRound className="w-4 h-4 font-bold" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight uppercase">New Team</h2>
                        <p className="text-[9px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5 opacity-60">Group your workflow efficiently</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddTeam(false)}
                      className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Team Name</label>
                        <input
                          type="text"
                          placeholder="전략 기획팀, 디자인 스쿼드 등"
                          value={newTeam.name}
                          onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                          className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Team Description</label>
                        <textarea
                          placeholder="팀의 주요 역할에 대해 간단히 기록해 주세요"
                          value={newTeam.description}
                          onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 resize-none"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Add Members ({newTeam.members.length})</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                          {members.map((m) => {
                            const isSelected = newTeam.members.includes(m.user_uuid)
                            return (
                              <button
                                key={m.user_uuid}
                                onClick={() => {
                                  const nextMembers = isSelected
                                    ? newTeam.members.filter(id => id !== m.user_uuid)
                                    : [...newTeam.members, m.user_uuid]
                                  setNewTeam({ ...newTeam, members: nextMembers })
                                }}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left ${isSelected
                                  ? "bg-white border-white text-black shadow-md"
                                  : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                                  }`}
                              >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${isSelected ? "bg-black text-white" : "bg-neutral-800 text-neutral-500"}`}>
                                  {(m.display_name || m.name || "?")[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold truncate">{m.display_name || m.name || "Guest"}</p>
                                  <p className={`text-[8px] opacity-60 truncate ${isSelected ? "text-black/60" : "text-neutral-500"}`}>Lv.{m.access_level}</p>
                                </div>
                                {isSelected && <Check className="w-2.5 h-2.5 ml-auto" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 mt-auto border-t border-neutral-800 flex gap-3">
                    <button
                      onClick={() => setShowAddTeam(false)}
                      className="flex-1 py-3 text-[9px] font-bold text-neutral-500 hover:text-white transition-all uppercase tracking-[0.1em]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTeam}
                      disabled={!newTeam.name.trim()}
                      className="flex-[1.5] py-3 bg-white text-black text-[10px] font-bold rounded-xl hover:bg-neutral-200 transition-all shadow-lg disabled:opacity-20 active:scale-95 uppercase tracking-[0.1em]"
                    >
                      Create Team
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-neutral-400">불러오는 중...</div>
          </div>
        ) : (
          <>
            {/* Teams Section */}
            {teams.length > 0 && (
              <div className="mb-12">
                <h2 className="text-lg font-medium text-neutral-300 mb-4 flex items-center gap-2">
                  <UsersRound className="w-5 h-5" />
                  팀 ({teams.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team, index) => {
                    const isExpanded = expandedTeam === team.id
                    const availableMembers = getAvailableMembers(team)

                    return (
                      <div
                        key={team.id}
                        className="rounded-xl border bg-neutral-950 border-neutral-800 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                      >
                        <div
                          className="p-5 cursor-pointer hover:bg-neutral-900/50 transition-colors"
                          onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700">
                                <UsersRound className="w-4 h-4 text-neutral-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white">{team.name}</h3>
                                {team.description && (
                                  <p className="text-sm text-neutral-500 mt-0.5">{team.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Users className="w-3 h-3 text-neutral-600" />
                                  <span className="text-xs text-neutral-500">
                                    {team.members?.length || 0}명
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              className={`p-2 text-neutral-600 hover:text-white rounded-lg transition-all ${isExpanded ? "rotate-180" : ""}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Member Avatars Preview */}
                          {team.members && team.members.length > 0 && !isExpanded && (
                            <div className="flex -space-x-2 mt-3">
                              {team.members.slice(0, 5).map((member) => (
                                <div
                                  key={member.user_uuid}
                                  className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[10px] font-bold text-neutral-300"
                                  title={member.user?.name || ""}
                                >
                                  {(member.user?.name || "?")[0]}
                                </div>
                              ))}
                              {team.members.length > 5 && (
                                <div className="w-7 h-7 rounded-full bg-neutral-800 border-2 border-neutral-950 flex items-center justify-center text-[10px] font-medium text-neutral-400">
                                  +{team.members.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-neutral-800 bg-neutral-900/30 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-neutral-400">멤버</span>
                              <div className="flex items-center gap-2">
                                {(accessLevel ?? 0) >= 1 && availableMembers.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAddingMemberTo(addingMemberTo === team.id ? null : team.id)
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                                  >
                                    <UserPlus className="w-3 h-3" />
                                    추가
                                  </button>
                                )}
                                {(accessLevel ?? 0) >= 3 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteTeam(team.id)
                                    }}
                                    className="px-2 py-1 text-xs text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Add Member Form */}
                            {addingMemberTo === team.id && (
                              <div className="flex gap-2 mb-3 animate-in fade-in duration-200">
                                <Select value={selectedMember} onValueChange={setSelectedMember}>
                                  <SelectTrigger className="flex-1 h-auto py-1.5 bg-black border-neutral-700 rounded text-sm">
                                    <SelectValue placeholder="멤버 선택..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" disabled>멤버 선택...</SelectItem>
                                    {availableMembers.map((m) => (
                                      <SelectItem key={m.user_uuid} value={m.user_uuid}>
                                        {m.name || m.name_eng || m.user_uuid.slice(0, 8)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <input
                                  type="text"
                                  placeholder="역할"
                                  value={memberRole}
                                  onChange={(e) => setMemberRole(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-20 px-2 py-1.5 bg-black border border-neutral-700 rounded text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAddMemberToTeam(team.id)
                                  }}
                                  disabled={!selectedMember}
                                  className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                >
                                  추가
                                </button>
                              </div>
                            )}

                            {/* Members List */}
                            {team.members && team.members.length > 0 ? (
                              <div className="space-y-2">
                                {team.members.map((member) => (
                                  <div
                                    key={member.user_uuid}
                                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-200">
                                        {(member.user?.name || "?")[0]}
                                      </div>
                                      <div>
                                        <p className="text-sm text-white">{member.user?.name || "Unknown"}</p>
                                        {member.role && (
                                          <p className="text-[10px] text-neutral-500">{member.role}</p>
                                        )}
                                      </div>
                                    </div>
                                    {(accessLevel ?? 0) >= 3 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRemoveMemberFromTeam(team.id, member.user_uuid)
                                        }}
                                        className="p-1 text-neutral-600 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-neutral-600 text-center py-2">멤버가 없습니다.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* All Members Section */}
            <div>
              <h2 className="text-lg font-medium text-neutral-300 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                전체 멤버 ({members.length})
              </h2>
              {members.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center text-neutral-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>팀 멤버가 없습니다.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member, index) => {
                    const safeLevel = Math.min(Math.max(member.access_level ?? 0, 0), 3)
                    const roman = romanLevels[safeLevel]

                    return (
                      <div
                        key={member.user_uuid}
                        className="group relative p-6 rounded-xl border transition-all duration-300 bg-neutral-950 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 animate-in fade-in slide-in-from-bottom-4"
                        style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
                      >
                        {/* Level Badge */}
                        <div className="absolute top-4 right-4">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-700 bg-neutral-900">
                            <Shield className="w-3 h-3 text-neutral-400" />
                            <span className="text-[10px] font-bold text-neutral-300">LV. {roman}</span>
                          </div>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-4">
                          {/* Avatar & Name */}
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-neutral-800 border border-neutral-700">
                              <span className="text-lg font-bold text-neutral-300">
                                {(member.name || member.display_name || "?")[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-white truncate">
                                {member.name || member.display_name || "이름 없음"}
                              </h3>
                              {member.name_eng && (
                                <p className="text-sm text-neutral-500 truncate">{member.name_eng}</p>
                              )}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-2 pt-2 border-t border-neutral-800/50">
                            {member.role && (
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                                <span className="text-neutral-300 truncate">{member.role}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                                <span className="text-neutral-400">{member.phone}</span>
                              </div>
                            )}
                            {!member.role && !member.phone && (
                              <p className="text-sm text-neutral-600 italic">추가 정보 없음</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
