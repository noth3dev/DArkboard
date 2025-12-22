"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { ProfileCard } from "@/components/profile-card"

export default function UserPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  const router = useRouter()
  const { user, loading, profileName, displayName, nameEng, phone, role } = useAuth()

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

  const cardName = profileName || decodeURIComponent(name)

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] bg-black px-4 py-6 gap-4">
      <ProfileCard name={cardName} nameEng={nameEng} role={role} displayName={displayName} phone={phone} />
      <button
        type="button"
        onClick={() => router.back()}
        className="mt-1 px-4 py-2 text-xs md:text-sm text-neutral-400 hover:text-white border border-neutral-800 rounded-full hover:border-neutral-600 transition-colors"
      >
        뒤로가기
      </button>
    </div>
  )
}

