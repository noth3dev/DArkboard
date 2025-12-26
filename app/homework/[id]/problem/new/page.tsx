"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import ProblemEditPage from "../[problemId]/edit/page"
import { use } from "react"

export default function NewProblemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)

    // Create a fake params object to satisfy the reuse of ProblemEditPage
    const fakeParams = Promise.resolve({ id, problemId: "new" })

    return <ProblemEditPage params={fakeParams} />
}
