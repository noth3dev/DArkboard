"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { ExpenseTable } from "@/components/expense-table"

export default function ExpensePage() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-neutral-400">로딩 중...</div>
            </div>
        )
    }

    if (!user) {
        return <AuthForm />
    }

    return <ExpenseTable />
}
