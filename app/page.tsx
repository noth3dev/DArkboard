"use client"

import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import React from "react"

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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-black text-white">
      <div className="relative group">
        <img src="/teamwark.svg" alt="homewArk" className="w-auto h-12" />
        <div className="absolute -inset-8 bg-white/5 blur-3xl rounded-full -z-10" />
      </div>
    </div>
  )
}
