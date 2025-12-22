"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { CreditCard, Users, Folder, LogOut, Shield, Settings, Bell } from "lucide-react"
import { NotificationCenter } from "./notification-center"

export function Header() {
  const { user, signOut, accessLevel, profileName } = useAuth()

  if (!user) return null

  const canAccessInnerPages = (accessLevel ?? 0) > 0

  const romanLevels = ["I", "II", "III"]
  const safeLevel = Math.min(Math.max(accessLevel ?? 0, 0), 2)
  const roman = romanLevels[safeLevel]

  // 레벨별 색상 (0: 파랑, 1: 에메랄드, 2: 보라)
  const levelStyles = [
    {
      glow: "bg-sky-500/40",
      border: "border-sky-400",
      bg: "bg-sky-500/8",
      icon: "text-sky-300",
      label: "text-sky-300/80",
      value: "text-sky-100",
    },
    {
      glow: "bg-emerald-500/35",
      border: "border-emerald-400",
      bg: "bg-emerald-500/8",
      icon: "text-emerald-300",
      label: "text-emerald-300/80",
      value: "text-emerald-100",
    },
    {
      glow: "bg-violet-500/40",
      border: "border-violet-400",
      bg: "bg-violet-500/8",
      icon: "text-violet-300",
      label: "text-violet-300/80",
      value: "text-violet-100",
    },
  ] as const

  const style = levelStyles[safeLevel]

  const baseDisplayName = profileName || user.email || "me"
  const nameSlug = encodeURIComponent(baseDisplayName)

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black/50 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/Darkboard.svg" alt="Darkboard" className="w-auto h-6" />
        </Link>
        {canAccessInnerPages && (
          <nav className="hidden md:flex items-center gap-6 border-l border-neutral-800 pl-6 h-6">
            <Link
              href="/expense"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <CreditCard className="w-4 h-4" />
            </Link>
            <Link
              href="/team"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <Users className="w-4 h-4" />
            </Link>
            <Link
              href="/project"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <Folder className="w-4 h-4" />
            </Link>
            {(accessLevel ?? 0) >= 2 && (
              <Link
                href="/management"
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationCenter />

        {/* ACCESS LEVEL 배지 (아이콘 + 레벨별 색상, 약한 글로우) */}
        <div className="hidden sm:flex items-center">
          <div className="relative">
            <div
              className={`absolute -inset-px rounded-full ${style.glow} blur-sm opacity-60 shadow-[0_0_18px_rgba(0,0,0,0.5)]`}
            />
            <div
              className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full border ${style.border} ${style.bg} backdrop-blur-sm`}
            >
              <Shield className={`w-4 h-4 ${style.icon}`} />
              <span className={`text-xs font-semibold ${style.value}`}>LV. {roman}</span>
            </div>
          </div>
        </div>

        <Link
          href={`/${nameSlug}`}
          className="text-xs text-neutral-500 hidden sm:inline-block hover:text-white transition-colors"
        >
          {baseDisplayName}
        </Link>
        <button
          onClick={() => signOut()}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
