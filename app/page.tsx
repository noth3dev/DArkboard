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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white px-6 py-12">
      <div className="max-w-6xl mx-auto text-center animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-8">
        <div className="relative group">
          <img src="/teamwark.svg" alt="homewArk" className="w-auto h-12 pointer-events-none select-none opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -inset-8 bg-white/5 blur-3xl rounded-full -z-10 transition-colors duration-500" />
        </div>
      </div>
    </div>
  )
}

