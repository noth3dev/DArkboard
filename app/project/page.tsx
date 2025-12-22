"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"

export default function ProjectPage() {
  const { user, loading, accessLevel } = useAuth()

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

  // access_level 0: / 페이지만 접근 가능
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

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl font-light text-neutral-500">Project Page</h1>
        <p className="text-sm text-neutral-600 mt-2">Coming Soon</p>
      </div>
    </div>
  )
}
