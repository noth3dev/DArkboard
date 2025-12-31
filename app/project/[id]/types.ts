export type TeamMember = {
    user_uuid: string
    name: string | null
    name_eng: string | null
}

export type ProjectMember = {
    user_uuid: string
    role: string | null
    user: TeamMember
}

export type Asset = {
    id: string
    project_id: string
    task_id: string | null
    name: string
    url: string
    type: string
    added_by: string
    created_at: string
}

export type Task = {
    id: string
    title: string
    description: string | null
    status: "todo" | "in_progress" | "review" | "done"
    priority: "low" | "medium" | "high" | "urgent"
    assignee_uuid: string | null // For backward compatibility
    assignee_uuids?: string[]
    due_date: string | null
    sort_order: number
    assignee?: TeamMember // Primary assignee for UI backward compatibility
    assignees?: TeamMember[]
}

export type Project = {
    id: string
    name: string
    description: string | null
    status: "active" | "development" | "planning" | "archived"
    url: string | null
    tags: string[]
    deadline: string | null
    created_at: string
    updated_at: string
    is_public: boolean
    created_by: string | null
}

export type Api = {
    id: string
    path: string
    method: string
    summary: string | null
    description: string | null
    tags: string[] | null
    parameters: any
    request_body: any
    responses: any
    original_spec: any
    components?: any  // Store full OpenAPI components for $ref resolution
    folder?: string | null
    markdown_content?: string | null
    created_at?: string
    updated_at?: string
}

export const statusConfig = {
    active: { label: "운영 중", dot: "bg-white" },
    development: { label: "개발 중", dot: "bg-neutral-400" },
    planning: { label: "기획 중", dot: "bg-neutral-600" },
    archived: { label: "보관됨", dot: "bg-neutral-700" },
} as const

export const taskStatusConfig = {
    todo: { label: "할 일", color: "text-neutral-500", bg: "bg-neutral-800" },
    in_progress: { label: "진행 중", color: "text-blue-400", bg: "bg-blue-900/30" },
    review: { label: "검토", color: "text-yellow-400", bg: "bg-yellow-900/30" },
    done: { label: "완료", color: "text-green-400", bg: "bg-green-900/30" },
} as const

export const priorityConfig = {
    low: { label: "낮음", color: "bg-neutral-600" },
    medium: { label: "보통", color: "bg-blue-600" },
    high: { label: "높음", color: "bg-yellow-600" },
    urgent: { label: "긴급", color: "bg-red-600" },
} as const
