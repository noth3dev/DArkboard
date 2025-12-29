"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { toast } from "sonner"
import { Project, ProjectMember, TeamMember, Task, Asset, Api, taskStatusConfig } from "./types"
import { ProjectHeader } from "./components/project-header"
import { TaskBoard } from "./components/task-board"
import { AssetGallery } from "./components/asset-gallery"
import { ApiViewer } from "./components/api-viewer"
import { ProjectSettings } from "./components/project-settings"

type TaskViewMode = "list" | "kanban" | "calendar"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { user, loading: authLoading, accessLevel } = useAuth()
    const [project, setProject] = useState<Project | null>(null)
    const [members, setMembers] = useState<ProjectMember[]>([])
    const [allMembers, setAllMembers] = useState<TeamMember[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [assets, setAssets] = useState<Asset[]>([])
    const [apis, setApis] = useState<Api[]>([])
    const [loading, setLoading] = useState(true)
    const searchParams = useSearchParams()
    const activeTab = (searchParams.get("tab") as "tasks" | "assets" | "settings" | "api") || "tasks"

    function setActiveTab(tab: "tasks" | "assets" | "settings" | "api") {
        router.push(`/project/${id}?tab=${tab}`)
    }
    const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("list")

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [id, user])

    async function fetchData() {
        await Promise.all([fetchProject(), fetchAllMembers(), fetchTasks(), fetchAssets(), fetchApis()])
    }

    async function createNotification(recipientUuid: string, type: string, content: string, taskId?: string) {
        try {
            const supabase = getSupabase()
            await supabase.from("notifications").insert({
                recipient_uuid: recipientUuid,
                actor_uuid: user?.id,
                type,
                project_id: id,
                task_id: taskId || null,
                content,
            })
        } catch (err) {
            console.error("Error creating notification:", err)
        }
    }

    async function fetchAllMembers() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("users")
                .select("user_uuid, name, name_eng")
                .order("name", { ascending: true })

            if (error) throw error
            setAllMembers(data || [])
        } catch (err) {
            console.error("Error fetching members:", err)
        }
    }

    async function fetchProject() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase.from("projects").select("*").eq("id", id).single()

            if (error) throw error
            setProject(data)

            const { data: membersData } = await supabase
                .from("project_members")
                .select(`user_uuid, role, user:users(user_uuid, name, name_eng)`)
                .eq("project_id", id)

            setMembers(
                (membersData || []).map((m: { user_uuid: string; role: string | null; user: TeamMember | TeamMember[] }) => ({
                    user_uuid: m.user_uuid,
                    role: m.role,
                    user: Array.isArray(m.user) ? m.user[0] : m.user,
                }))
            )
        } catch (err) {
            console.error("Error fetching project:", err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchTasks() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("project_tasks")
                .select(`*, assignee:users(user_uuid, name, name_eng)`)
                .eq("project_id", id)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false })

            if (error) throw error
            setTasks(
                (data || []).map((t: Task & { assignee: TeamMember | TeamMember[] }) => ({
                    ...t,
                    assignee: Array.isArray(t.assignee) ? t.assignee[0] : t.assignee,
                }))
            )
        } catch (err) {
            console.error("Error fetching tasks:", err)
        }
    }

    async function fetchAssets() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("project_assets")
                .select("*")
                .eq("project_id", id)
                .order("created_at", { ascending: false })

            if (error) throw error
            setAssets(data || [])
        } catch (err) {
            console.error("Error fetching assets:", err)
        }
    }

    async function fetchApis() {
        try {
            const supabase = getSupabase()
            const { data, error } = await supabase
                .from("apis")
                .select("*")
                .eq("project_id", id)
                .order("path", { ascending: true })

            if (error) throw error
            setApis(data || [])
        } catch (err) {
            console.error("Error fetching apis:", err)
        }
    }

    async function handleSyncApis() {
        if ((accessLevel ?? 0) < 3) return
        fetchApis()
    }

    async function handleUpdateProject(editForm: any) {
        if ((accessLevel ?? 0) < 3) return
        if (!editForm.name.trim()) return

        try {
            const supabase = getSupabase()
            const tagsArray = editForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean)

            const { error } = await supabase
                .from("projects")
                .update({
                    name: editForm.name.trim(),
                    description: editForm.description.trim() || null,
                    status: editForm.status,
                    url: editForm.url.trim() || null,
                    tags: tagsArray,
                    deadline: editForm.deadline || null,
                    is_public: editForm.is_public,
                    created_by: project?.created_by || user?.id,
                })
                .eq("id", id)

            if (error) throw error
            fetchProject()
        } catch (err) {
            console.error("Error updating project:", err)
        }
    }

    async function handleDeleteProject() {
        if ((accessLevel ?? 0) < 4) return
        if (!confirm("정말 이 프로젝트를 삭제하시겠습니까? 관련 모든 파일과 데이터가 영구 삭제됩니다.")) return

        try {
            const supabase = getSupabase()

            const { data: assets } = await supabase
                .from("project_assets")
                .select("url")
                .eq("project_id", id)

            if (assets && assets.length > 0) {
                const storagePaths = (assets as { url: string }[])
                    .filter((a: { url: string }) => a.url.includes('project-assets'))
                    .map((a: { url: string }) => {
                        const parts = a.url.split('/project-assets/')
                        return parts.length > 1 ? decodeURIComponent(parts[1]) : null
                    })
                    .filter((p): p is string => p !== null)

                if (storagePaths.length > 0) {
                    await supabase.storage.from('project-assets').remove(storagePaths)
                }
            }

            const { error } = await supabase.from("projects").delete().eq("id", id)
            if (error) throw error
            router.push("/project")
        } catch (err) {
            console.error("Error deleting project:", err)
            toast.error("프로젝트 삭제 중 오류가 발생했습니다.")
        }
    }

    async function handleAddMember(userUuid: string, role: string) {
        if ((accessLevel ?? 0) < 3 || !userUuid) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_members").insert({
                project_id: id,
                user_uuid: userUuid,
                role: role.trim() || null,
            })
            if (error) throw error

            createNotification(
                userUuid,
                "new_member",
                `'${project?.name}' 프로젝트의 멤버로 초대되었습니다.`
            )

            fetchProject()
        } catch (err) {
            console.error("Error adding member:", err)
        }
    }

    async function handleRemoveMember(userUuid: string) {
        if ((accessLevel ?? 0) < 3) return
        try {
            const supabase = getSupabase()

            if (project?.created_by === userUuid) {
                const nextOwner = members.find(m => m.user_uuid !== userUuid)

                if (nextOwner) {
                    const { error: ownerError } = await supabase
                        .from("projects")
                        .update({ created_by: nextOwner.user_uuid })
                        .eq("id", id)

                    if (ownerError) throw ownerError
                } else {
                    toast("프로젝트의 마지막 멤버이자 소유자입니다.", {
                        description: "삭제하면 소유자 없는 프로젝트가 됩니다. 계속하시겠습니까?",
                        action: {
                            label: "계속",
                            onClick: async () => {
                                await proceedRemoveMember(userUuid)
                            }
                        }
                    })
                    return
                }
            }
            await proceedRemoveMember(userUuid)
        } catch (err) {
            console.error("Error removing member:", err)
        }
    }

    async function proceedRemoveMember(userUuid: string) {
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_members").delete().eq("project_id", id).eq("user_uuid", userUuid)
            if (error) throw error
            fetchProject()
        } catch (err) {
            console.error("Error removing member:", err)
        }
    }

    async function handleAddTask(newTask: any) {
        if ((accessLevel ?? 0) < 3 || !newTask.title.trim()) return

        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_tasks").insert({
                project_id: id,
                title: newTask.title.trim(),
                description: newTask.description.trim() || null,
                status: newTask.status,
                priority: newTask.priority,
                assignee_uuid: newTask.assignee_uuid || null,
                due_date: newTask.due_date || null,
            })
            if (error) throw error

            if (newTask.assignee_uuid && newTask.assignee_uuid !== user?.id) {
                createNotification(
                    newTask.assignee_uuid,
                    "task_assigned",
                    `'${project?.name}' 프로젝트에서 새로운 태스크 '${newTask.title}'이(가) 할당되었습니다.`
                )
            }

            fetchTasks()
        } catch (err) {
            console.error("Error adding task:", err)
        }
    }

    async function handleUpdateTaskStatus(taskId: string, newStatus: Task["status"]) {
        if ((accessLevel ?? 0) < 3) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_tasks").update({ status: newStatus }).eq("id", taskId)
            if (error) throw error

            const task = tasks.find(t => t.id === taskId)
            if (task && task.assignee_uuid && task.assignee_uuid !== user?.id) {
                createNotification(
                    task.assignee_uuid,
                    "status_changed",
                    `과제 '${task.title}'의 상태가 '${taskStatusConfig[newStatus].label}'(으)로 변경되었습니다.`
                )
            }

            fetchTasks()
        } catch (err) {
            console.error("Error updating task:", err)
        }
    }

    async function handleDeleteTask(taskId: string) {
        if ((accessLevel ?? 0) < 3) return
        try {
            const supabase = getSupabase()
            const { error } = await supabase.from("project_tasks").delete().eq("id", taskId)
            if (error) throw error
            fetchTasks()
        } catch (err) {
            console.error("Error deleting task:", err)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-neutral-400">로딩 중...</div>
            </div>
        )
    }

    if (!user) return <AuthForm />

    if ((accessLevel ?? 0) === 0) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center text-neutral-400">
                    <p className="mb-4">이 페이지에 접근할 권한이 없습니다.</p>
                    <button onClick={() => router.push("/")} className="text-white underline">대시보드로 돌아가기</button>
                </div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-neutral-400 mb-4">프로젝트를 찾을 수 없습니다</p>
                    <button onClick={() => router.push("/project")} className="text-white hover:underline">목록으로 돌아가기</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <ProjectHeader
                project={project}
                accessLevel={accessLevel ?? 0}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                taskViewMode={taskViewMode}
                setTaskViewMode={setTaskViewMode}
                tasksCount={tasks.length}
                assetsCount={assets.length}
                onDelete={handleDeleteProject}
            />

            {activeTab === "api" ? (
                <ApiViewer
                    apis={apis}
                    projectId={id}
                    accessLevel={accessLevel ?? 0}
                    onSync={handleSyncApis}
                />
            ) : (
                <div className="max-w-6xl mx-auto p-6">
                    {activeTab === "tasks" && (
                        <TaskBoard
                            tasks={tasks}
                            members={allMembers}
                            accessLevel={accessLevel ?? 0}
                            viewMode={taskViewMode}
                            onTasksChange={fetchTasks}
                            onAddTask={handleAddTask}
                            onUpdateStatus={handleUpdateTaskStatus}
                            onDeleteTask={handleDeleteTask}
                        />
                    )}

                    {activeTab === "assets" && (
                        <AssetGallery
                            assets={assets}
                            projectId={id}
                            userId={user.id}
                            accessLevel={accessLevel ?? 0}
                            onRefresh={fetchAssets}
                        />
                    )}

                    {activeTab === "settings" && (
                        <ProjectSettings
                            project={project}
                            members={members}
                            allMembers={allMembers}
                            accessLevel={accessLevel ?? 0}
                            onUpdate={handleUpdateProject}
                            onAddMember={handleAddMember}
                            onRemoveMember={handleRemoveMember}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
