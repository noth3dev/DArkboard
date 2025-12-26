export type Problem = {
    id: string
    homework_id: string
    title: string
    description: string | null
    submission_format: string
    files: any
    sandpack_template?: string
    allow_file_addition?: boolean
}

export type Submission = {
    id: string
    problem_id: string
    mentee_id: string
    files: any
    status: string
    feedback: string | null
    submitted_at: string
    users?: {
        name: string | null
        display_name: string | null
    }
}
