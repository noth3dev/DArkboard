"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import {
  Folder,
  ExternalLink,
  Calendar,
  Tag,
  Plus,
  Users,
  Clock,
  LayoutGrid,
  CalendarDays,
  Columns3,
  ChevronRight,
  ClipboardList,
  Lock,
  Globe,
  X,
  Check,
  UsersRound,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TeamMember = {
  user_uuid: string
  name: string | null
  name_eng: string | null
}

type ProjectMember = {
  user_uuid: string
  role: string | null
  user: TeamMember
}

type Project = {
  id: string
  name: string
  description: string | null
  status: "active" | "development" | "planning" | "archived"
  url: string | null
  tags: string[]
  deadline: string | null
  created_at: string
  members?: ProjectMember[]
  task_count?: number
  is_public?: boolean
  created_by?: string
  team_id?: string
  team?: {
    name: string
  }
}

const statusConfig = {
  active: { label: "운영 중", dot: "bg-white", order: 1 },
  development: { label: "개발 중", dot: "bg-neutral-400", order: 2 },
  planning: { label: "기획 중", dot: "bg-neutral-600", order: 3 },
  archived: { label: "보관됨", dot: "bg-neutral-700", order: 4 },
} as const

type ViewMode = "grid" | "calendar" | "kanban"

export default function ProjectPage() {
  const router = useRouter()
  const { user, loading, accessLevel } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [showAddForm, setShowAddForm] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())

  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "planning" as Project["status"],
    url: "",
    tags: "",
    deadline: "",
    is_public: true,
    team_id: "",
    members: [] as string[]
  })

  useEffect(() => {
    if (user) {
      fetchProjects()
      fetchInitialData()
    }
  }, [user])

  async function fetchInitialData() {
    try {
      const supabase = getSupabase()
      // 사용자 목록 조회
      const { data: usersData } = await supabase.from("users").select("*").order("name")
      setAllUsers(usersData || [])

      // 팀 목록 조회
      const { data: teamsData } = await supabase.from("teams").select("*").order("name")
      setAllTeams(teamsData || [])
    } catch (err) {
      console.error("Error fetching initial data:", err)
    }
  }

  async function fetchProjects() {
    try {
      setLoadingProjects(true)
      const supabase = getSupabase()

      const { data, error } = await supabase
        .from("projects")
        .select("*, team:teams(name)")
        .order("created_at", { ascending: false })

      if (error) throw error

      const projectsWithDetails = await Promise.all(
        ((data as any[]) || []).map(async (project: any) => {
          // 멤버 조회
          const { data: membersData } = await supabase
            .from("project_members")
            .select(`
              user_uuid,
              role,
              user:users(user_uuid, name, name_eng)
            `)
            .eq("project_id", project.id)

          // 태스크 수 조회
          const { count } = await supabase
            .from("project_tasks")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id)

          return {
            ...project,
            members: ((membersData as any[]) || []).map((m: any) => ({
              user_uuid: m.user_uuid,
              role: m.role,
              user: Array.isArray(m.user) ? m.user[0] : m.user,
            })),
            task_count: count || 0,
          }
        })
      )

      setProjects(projectsWithDetails)
    } catch (err) {
      console.error("Error fetching projects:", err)
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleAddProject() {
    if ((accessLevel ?? 0) < 1) return
    if (!newProject.name.trim()) return

    try {
      const supabase = getSupabase()
      const tagsArray = newProject.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const { data, error } = await supabase.from("projects").insert({
        name: newProject.name.trim(),
        description: newProject.description.trim() || null,
        status: newProject.status,
        url: newProject.url.trim() || null,
        tags: tagsArray,
        deadline: newProject.deadline || null,
        is_public: newProject.is_public,
        created_by: user?.id,
        team_id: newProject.team_id || null,
      }).select().single()

      if (error) throw error

      // 생성자를 고정 멤버로 등록하고 추가 선택된 멤버들도 등록
      if (data) {
        const memberIds = Array.from(new Set([user?.id, ...newProject.members])).filter(Boolean) as string[]
        const memberInserts = memberIds.map(uid => ({
          project_id: data.id,
          user_uuid: uid,
          role: uid === user?.id ? "manager" : "member"
        }))

        await supabase.from("project_members").insert(memberInserts)
      }

      setNewProject({ name: "", description: "", status: "planning", url: "", tags: "", deadline: "", is_public: true, team_id: "", members: [] })
      setShowAddForm(false)
      fetchProjects()
    } catch (err: any) {
      console.error("Error adding project:", err?.message || err)
      alert(`프로젝트 추가 중 오류가 발생했습니다: ${err?.message || "알 수 없는 오류"}`)
    }
  }

  function getDDay(deadline: string | null) {
    if (!deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  function formatDDay(dday: number | null) {
    if (dday === null) return null
    if (dday === 0) return "D-Day"
    if (dday > 0) return `D-${dday}`
    return `D+${Math.abs(dday)}`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  function getCalendarDays() {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const padding = firstDay.getDay()
    const days: (Date | null)[] = []
    for (let i = 0; i < padding; i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
    return days
  }

  function getProjectsForDate(date: Date) {
    const dateStr = date.toISOString().split("T")[0]
    return projects.filter((p) => p.deadline === dateStr)
  }

  function nextMonth() { setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)) }
  function prevMonth() { setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)) }

  function ProjectCard({ project, index, compact = false }: { project: Project; index: number; compact?: boolean }) {
    const status = statusConfig[project.status]
    const dday = getDDay(project.deadline)
    const ddayText = formatDDay(dday)

    return (
      <div
        onClick={() => router.push(`/project/${project.id}`)}
        className={`group relative rounded-xl border bg-neutral-950 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all duration-300 cursor-pointer ${compact ? "p-3" : "p-6"}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {!compact && (
              <div className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400">
                <Folder className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="flex flex-col">
              <h3 className={`font-semibold text-white ${compact ? "text-sm" : "text-base"}`}>{project.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {project.team?.name && (
                  <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold uppercase tracking-tight mr-1">
                    <UsersRound className="w-2.5 h-2.5" />
                    <span>{project.team.name}</span>
                  </div>
                )}
                {project.is_public ? (
                  <div className="flex items-center gap-1 text-[9px] text-green-400 opacity-70"><Globe className="w-2.5 h-2.5" /><span>전체 공개</span></div>
                ) : (
                  <div className="flex items-center gap-1 text-[9px] text-yellow-400 opacity-70"><Lock className="w-2.5 h-2.5" /><span>멤버 전용</span></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {!compact && project.description && <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{project.description}</p>}

        <div className="flex items-center justify-between text-[10px] text-neutral-600 pt-2 border-t border-neutral-800/50">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span>{status.label}</span>
            {ddayText && <span className="text-neutral-700">·</span>}
            {ddayText && <span className={dday !== null && dday <= 3 && dday >= 0 ? "text-red-400" : "text-neutral-500"}>{ddayText}</span>}
          </div>
          <div className="flex items-center gap-2">
            {project.task_count !== undefined && project.task_count > 0 && (
              <div className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /><span>{project.task_count}</span></div>
            )}
            {project.members && project.members.length > 0 && (
              <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span>{project.members.length}</span></div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400">로딩 중...</div>
  if (!user) return <AuthForm />

  return (
    <div className="min-h-[calc(100vh-65px)] bg-black text-white p-4 sm:p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800"><Folder className="w-6 h-6 text-neutral-400" /></div>
            <div>
              <h1 className="text-2xl font-light tracking-tight">프로젝트</h1>
              <p className="text-sm text-neutral-500 mt-0.5">{projects.length}개의 프로젝트</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(accessLevel ?? 0) >= 1 && (
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors"><Plus className="w-4 h-4" />추가</button>
            )}
          </div>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 md:p-10 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
            <div
              className="relative w-full h-full sm:h-auto sm:max-w-5xl bg-neutral-950 border-0 sm:border sm:border-neutral-800 rounded-0 sm:rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                {/* Left: Preview Section */}
                <div className="hidden md:flex flex-1 bg-neutral-900/30 p-12 border-r border-neutral-800 flex-col items-center justify-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 blur-[100px] rounded-full" />

                  <div className="relative z-10 w-full flex flex-col items-center">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em] mb-12 opacity-50">CARD PREVIEW</p>
                    <div className="w-full max-w-sm transform scale-110 hover:scale-[1.12] transition-transform duration-500">
                      <ProjectCard
                        project={{
                          ...newProject,
                          id: 'preview',
                          created_at: new Date().toISOString(),
                          members: Array.from(new Set([user?.id, ...newProject.members])).filter(Boolean).map(uid => {
                            const m = allUsers.find(u => u.user_uuid === uid)
                            return {
                              user_uuid: uid,
                              role: uid === user?.id ? "manager" : "member",
                              user: {
                                user_uuid: uid,
                                name: m?.display_name || m?.name || (uid === user?.id ? "나" : "사용자"),
                                name_eng: null
                              }
                            }
                          }) as any[],
                          task_count: 0,
                          team: allTeams.find(t => t.id === newProject.team_id)
                        } as any}
                        index={0}
                      />
                    </div>
                    <div className="mt-16 text-center space-y-2">
                      <p className="text-xs text-neutral-400 font-medium font-bold uppercase tracking-widest">실시간 프리뷰</p>
                      <p className="text-[10px] text-neutral-600 leading-relaxed italic">작성 중인 내용이 어떻게 표시될지 확인하세요.<br />완성도 높은 정보 입력은 협업의 효율을 높입니다.</p>
                    </div>
                  </div>
                </div>

                {/* Right: Input Section */}
                <div className="flex-1 p-8 flex flex-col bg-black overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white text-black shadow-lg">
                        <Plus className="w-4 h-4 font-bold" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight uppercase">새 프로젝트</h2>
                        <p className="text-[9px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5 opacity-60">협업을 위한 새로운 워크스페이스 생성</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all border border-neutral-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6 flex-1">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">제목</label>
                        <input
                          type="text"
                          placeholder="프로젝트명을 입력하세요"
                          value={newProject.name}
                          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                          className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700"
                        />
                      </div>

                      <div className="space-y-2 text-white">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">상태</label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => setNewProject({ ...newProject, status: key as Project["status"] })}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${newProject.status === key ? 'bg-white text-black border-white shadow-md' : 'bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}
                            >
                              <span>{config.label}</span>
                              <div className={`w-1 h-1 rounded-full ${config.dot}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Meta Info: Deadline, Team, Visibility */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">마감일</label>
                        <input
                          type="date"
                          value={newProject.deadline}
                          onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                          className="w-full px-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">팀 배정</label>
                        <Select
                          value={newProject.team_id || "none"}
                          onValueChange={(val) => setNewProject({ ...newProject, team_id: val === "none" ? "" : val })}
                        >
                          <SelectTrigger className="w-full h-[42px] bg-neutral-900/50 border-neutral-800 text-[10px] uppercase font-bold">
                            <SelectValue placeholder="배정된 팀 없음" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">배정된 팀 없음</SelectItem>
                            {allTeams.map((team: any) => (
                              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">공개 여부</label>
                        <button
                          onClick={() => setNewProject({ ...newProject, is_public: !newProject.is_public })}
                          className={`flex items-center justify-between px-4 py-2.5 w-full h-[42px] rounded-xl border transition-all ${newProject.is_public ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"}`}
                        >
                          <span className="text-[9px] font-bold uppercase tracking-wider">{newProject.is_public ? "전체 공개" : "비공개 (멤버 전용)"}</span>
                          {newProject.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Member Selection */}
                    <div className="space-y-3 pt-5 border-t border-neutral-800">
                      <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">멤버 선택 ({newProject.members.length})</label>
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                        {allUsers.map((m: any) => {
                          const isSelected = newProject.members.includes(m.user_uuid)
                          const isSelf = m.user_uuid === user?.id
                          return (
                            <button
                              key={m.user_uuid}
                              onClick={() => {
                                if (isSelf) return
                                const nextMembers = isSelected
                                  ? newProject.members.filter(id => id !== m.user_uuid)
                                  : [...newProject.members, m.user_uuid]
                                setNewProject({ ...newProject, members: nextMembers })
                              }}
                              disabled={isSelf}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left ${isSelf ? "opacity-30 border-neutral-800 bg-neutral-900/10" :
                                isSelected
                                  ? "bg-white border-white text-black shadow-md"
                                  : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                                }`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold ${isSelected ? "bg-black text-white" : "bg-neutral-800 text-neutral-500"}`}>
                                {(m.display_name || m.name || "?")[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[8px] font-bold truncate">{m.display_name || (isSelf ? "나" : m.name)}</p>
                              </div>
                              {isSelected && <Check className="w-2.5 h-2.5 ml-auto text-black" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-neutral-800">
                      <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">상세 설명 (선택 사항)</label>
                      <textarea
                        placeholder="상세 내용을 입력하세요"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-8 mt-auto border-t border-neutral-800 flex gap-3">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-3 text-[9px] font-bold text-neutral-500 hover:text-white transition-all uppercase tracking-[0.1em]"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddProject}
                      disabled={!newProject.name.trim()}
                      className="flex-[1.5] py-3 bg-white text-black text-[10px] font-bold rounded-xl hover:bg-neutral-200 transition-all shadow-lg disabled:opacity-20 active:scale-95 uppercase tracking-[0.1em]"
                    >
                      프로젝트 생성
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {loadingProjects ? <div className="py-20 text-center text-neutral-400 font-bold uppercase tracking-widest text-[10px]">로딩 중...</div> : projects.length === 0 ? (
          <div className="py-20 text-center text-neutral-500"><Folder className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>프로젝트가 없습니다.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}
          </div>
        )}
      </div>
    </div>
  )
}
