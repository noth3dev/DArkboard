"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { ExpenseTable } from "@/components/expense-table"

export default function ExpensePage() {
  const { user, loading, accessLevel } = useAuth()

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

  // access_level 0: / 페이지만 접근 가능
  if ((accessLevel ?? 0) === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-neutral-400">
          <p className="mb-4">이 페이지에 접근할 권한이 없습니다.</p>
          <a href="/" className="text-white underline">
            대시보드로 돌아가기
          </a>
        </div>
      </div>
    )
  }

  return <ExpenseTable />
}
