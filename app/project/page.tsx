"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { Folder, ExternalLink, Calendar, Tag, Plus, Users, Clock } from "lucide-react"

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
}

const statusConfig = {
  active: { label: "운영 중", dot: "bg-white" },
  development: { label: "개발 중", dot: "bg-neutral-400" },
  planning: { label: "기획 중", dot: "bg-neutral-600" },
  archived: { label: "보관됨", dot: "bg-neutral-700" },
} as const

export default function ProjectPage() {
  const router = useRouter()
  const { user, loading, accessLevel } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "planning" as Project["status"],
    url: "",
    tags: "",
    deadline: "",
  })

  useEffect(() => {
    if (user && (accessLevel ?? 0) >= 1) {
      fetchProjects()
    }
  }, [user, accessLevel])

  async function fetchProjects() {
    try {
      const supabase = getSupabase()

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (projectsError) throw projectsError

      // 각 프로젝트의 멤버 조회
      const projectsWithMembers = await Promise.all(
        (projectsData || []).map(async (project: Project) => {
          const { data: membersData } = await supabase
            .from("project_members")
            .select(`
              user_uuid,
              role,
              user:users(user_uuid, name, name_eng)
            `)
            .eq("project_id", project.id)

          return {
            ...project,
            members: (membersData || []).map((m: { user_uuid: string; role: string | null; user: TeamMember | TeamMember[] }) => ({
              user_uuid: m.user_uuid,
              role: m.role,
              user: Array.isArray(m.user) ? m.user[0] : m.user,
            })),
          }
        })
      )

      setProjects(projectsWithMembers)
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

      const { error } = await supabase.from("projects").insert({
        name: newProject.name.trim(),
        description: newProject.description.trim() || null,
        status: newProject.status,
        url: newProject.url.trim() || null,
        tags: tagsArray,
        deadline: newProject.deadline || null,
      })

      if (error) throw error
      setNewProject({ name: "", description: "", status: "planning", url: "", tags: "", deadline: "" })
      setShowAddForm(false)
      fetchProjects()
    } catch (err) {
      console.error("Error adding project:", err)
    }
  }

  // D-Day 계산
  function getDDay(deadline: string | null) {
    if (!deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  function formatDDay(dday: number | null) {
    if (dday === null) return null
    if (dday === 0) return "D-Day"
    if (dday > 0) return `D-${dday}`
    return `D+${Math.abs(dday)}`
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

  const activeCount = projects.filter((p) => p.status === "active").length
  const devCount = projects.filter((p) => p.status === "development").length

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <Folder className="w-6 h-6 text-neutral-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-tight">프로젝트</h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                {activeCount}개 운영 중 · {devCount}개 개발 중
              </p>
            </div>
          </div>

          {(accessLevel ?? 0) >= 1 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && (accessLevel ?? 0) >= 1 && (
          <div className="mb-6 p-4 border border-neutral-800 rounded-lg bg-neutral-950 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="프로젝트명"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
              <select
                value={newProject.status}
                onChange={(e) =>
                  setNewProject({ ...newProject, status: e.target.value as Project["status"] })
                }
                className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
              >
                <option value="planning">기획 중</option>
                <option value="development">개발 중</option>
                <option value="active">운영 중</option>
                <option value="archived">보관됨</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="URL (선택)"
                value={newProject.url}
                onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
              <input
                type="text"
                placeholder="태그 (쉼표로 구분)"
                value={newProject.tags}
                onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
              <input
                type="date"
                placeholder="마감일"
                value={newProject.deadline}
                onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                className="px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>
            <textarea
              placeholder="설명 (선택)"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 mb-4 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddProject}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-neutral-400">프로젝트 불러오는 중...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center text-neutral-500">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>프로젝트가 없습니다.</p>
              <p className="text-sm text-neutral-600 mt-1">새 프로젝트를 추가해보세요.</p>
            </div>
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project, index) => {
              const status = statusConfig[project.status]
              const dday = getDDay(project.deadline)
              const ddayText = formatDDay(dday)

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="group relative p-6 rounded-xl border bg-neutral-950 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700">
                        <Folder className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white group-hover:text-white">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            <span className="text-[11px] text-neutral-500">{status.label}</span>
                          </div>
                          {ddayText && (
                            <>
                              <span className="text-neutral-700">·</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-neutral-500" />
                                <span
                                  className={`text-[11px] font-medium ${dday !== null && dday < 0
                                      ? "text-neutral-400"
                                      : dday === 0
                                        ? "text-white"
                                        : dday !== null && dday <= 7
                                          ? "text-neutral-300"
                                          : "text-neutral-500"
                                    }`}
                                >
                                  {ddayText}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-neutral-600 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {project.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-md"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 4 && (
                        <span className="px-2 py-0.5 text-[11px] text-neutral-600">
                          +{project.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Members Preview */}
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-3.5 h-3.5 text-neutral-600" />
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 4).map((member) => (
                          <div
                            key={member.user_uuid}
                            className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-300"
                            title={member.user?.name || ""}
                          >
                            {(member.user?.name || "?")[0]}
                          </div>
                        ))}
                        {project.members.length > 4 && (
                          <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-medium text-neutral-400">
                            +{project.members.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500">{project.members.length}명</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-2 text-xs text-neutral-600 pt-2 border-t border-neutral-800/50">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(project.created_at)}</span>
                    {project.deadline && (
                      <>
                        <span className="text-neutral-700">→</span>
                        <span>{formatDate(project.deadline)}</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
