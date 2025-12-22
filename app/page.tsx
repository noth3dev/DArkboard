"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"

export default function Home() {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white px-4">
      <div className="text-center animate-in fade-in zoom-in duration-700 slide-in-from-bottom-4">
        <p className="text-neutral-400 text-sm md:text-base mb-4 tracking-wider uppercase">Ark의 팀 내 관리 플랫폼</p>
        <img src="/Darkboard.svg" alt="Darkboard" className="w-auto h-12" />
      </div>
    </div>
  )
}

