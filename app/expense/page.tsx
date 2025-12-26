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

  // access_level 0-2: PRO 시스템 접근 불가
  if ((accessLevel ?? 0) < 3) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white p-6">
        <div className="text-center text-neutral-400">
          <p className="mb-4 text-lg font-light font-suit">이 페이지에 접근할 권한이 없습니다. (Level III 이상 필요)</p>
          <a href="/" className="text-white underline hover:text-primary transition-colors">홈으로 돌아가기</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
              지출 관리
            </h1>
            <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
              모든 지출 내역을 투명하게 관리하고 모니터링하세요.
            </p>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ExpenseTable hideHeader />
        </div>
      </div>
    </div>
  )
}
