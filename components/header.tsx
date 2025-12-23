"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  Users,
  Folder,
  LogOut,
  Shield,
  Settings,
  Bell,
  Menu,
  X,
  Calendar,
  User,
  Trophy,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationCenter } from "./notification-center"

export function Header() {
  const { user, signOut, accessLevel, profileName } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  // 메뉴 열릴 때 스크롤 방지
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isMenuOpen])

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
      dot: "bg-sky-400",
    },
    {
      glow: "bg-emerald-500/35",
      border: "border-emerald-400",
      bg: "bg-emerald-500/8",
      icon: "text-emerald-300",
      label: "text-emerald-300/80",
      value: "text-emerald-100",
      dot: "bg-emerald-400",
    },
    {
      glow: "bg-violet-500/40",
      border: "border-violet-400",
      bg: "bg-violet-500/8",
      icon: "text-violet-300",
      label: "text-violet-300/80",
      value: "text-violet-100",
      dot: "bg-violet-400",
    },
  ] as const

  const style = levelStyles[safeLevel]

  const baseDisplayName = profileName || user.email || "me"
  const nameSlug = encodeURIComponent(baseDisplayName)

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800 bg-black/50 backdrop-blur-xl">
      <div className="flex items-center gap-2 sm:gap-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0">
          <img src="/Darkboard.svg" alt="Darkboard" className="w-auto h-5 sm:h-6" />
        </Link>

        {/* 데스크톱 네비게이션 */}
        {canAccessInnerPages && (
          <nav className="hidden md:flex items-center gap-6 border-l border-neutral-800 pl-6 h-6">
            <Link
              href="/expense"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              title="지출 가계부"
            >
              <CreditCard className="w-4 h-4" />
            </Link>
            <Link
              href="/team"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              title="팀 관리"
            >
              <Users className="w-4 h-4" />
            </Link>
            <Link
              href="/project"
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              title="프로젝트 관리"
            >
              <Folder className="w-4 h-4" />
            </Link>

            {(accessLevel ?? 0) >= 1 && (
              <Link
                href="/calendar"
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                title="일정 관리"
              >
                <Calendar className="w-4 h-4" />
              </Link>
            )}
            {(accessLevel ?? 0) >= 1 && (
              <div className="w-[1px] h-3 bg-neutral-800 mx-1" />
            )}

            {(accessLevel ?? 0) >= 1 && (
              <Link
                href="/legacy"
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                title="명예의 전당"
              >
                <Trophy className="w-4 h-4" />
              </Link>
            )}
            {(accessLevel ?? 0) >= 2 && (
              <div className="w-[1px] h-3 bg-neutral-800 mx-1" />
            )}
            {(accessLevel ?? 0) >= 2 && (
              <Link
                href="/management"
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                title="관리자 설정"
              >
                <Settings className="w-4 h-4" />
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* 유저 배지 (드롭다운 메뉴) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 bg-neutral-900/50 border border-neutral-800 rounded-full hover:bg-neutral-800 transition-all outline-none">
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              <span className="text-[10px] sm:text-xs text-neutral-400 font-medium truncate max-w-[60px] sm:max-w-[100px]">{baseDisplayName}</span>
              <div className="w-px h-3 bg-neutral-800 hidden sm:block" />
              <span className="text-[8px] sm:text-[9px] font-black text-neutral-600 uppercase tracking-wider hidden sm:block">{roman}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>내 정보</DropdownMenuLabel>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-default focus:bg-transparent">
              <span className="text-xs font-bold text-white">{baseDisplayName}</span>
              <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-widest">{roman} Access</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/${nameSlug}`)}>
              <User className="mr-2 h-4 w-4" />
              <span>비즈니스 카드</span>
            </DropdownMenuItem>
            {(accessLevel ?? 0) >= 2 && (
              <DropdownMenuItem onClick={() => router.push("/management")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>관리자 설정</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-red-500 focus:text-red-400 focus:bg-red-500/10">
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationCenter />

        {/* 모바일 햄버거 메뉴 버튼 */}
        <button
          className="p-2 -mr-2 text-neutral-400 hover:text-white md:hidden transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div className="relative w-4 h-4 overflow-visible">
            <span
              className={`absolute left-0 w-4 h-[1.2px] bg-current rounded-full transition-all duration-300 ease-in-out ${isMenuOpen ? "top-[7.4px] rotate-45" : "top-[2px]"
                }`}
            />
            <span
              className={`absolute left-0 w-4 h-[1.2px] bg-current rounded-full transition-all duration-300 ease-in-out ${isMenuOpen ? "top-[7.4px] opacity-0 scale-x-0" : "top-[7.4px] opacity-100"
                }`}
            />
            <span
              className={`absolute left-0 w-4 h-[1.2px] bg-current rounded-full transition-all duration-300 ease-in-out ${isMenuOpen ? "top-[7.4px] -rotate-45" : "top-[12.8px]"
                }`}
            />
          </div>
        </button>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {isMenuOpen && (
        <nav className="absolute top-full left-0 w-full bg-black/95 backdrop-blur-2xl border-b border-neutral-800 md:hidden animate-in slide-in-from-top-4 duration-300 shadow-2xl overflow-hidden z-[40]">
          <div className="flex flex-col p-2">
            <Link
              href="/expense"
              className="flex items-center gap-3 px-6 py-4 text-neutral-400 hover:text-white active:bg-neutral-900 transition-colors border-b border-neutral-900/50"
              onClick={() => setIsMenuOpen(false)}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-medium">지출 가계부</span>
            </Link>
            <Link
              href="/team"
              className="flex items-center gap-3 px-6 py-4 text-neutral-400 hover:text-white active:bg-neutral-900 transition-colors border-b border-neutral-900/50"
              onClick={() => setIsMenuOpen(false)}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">팀 관리</span>
            </Link>
            <Link
              href="/project"
              className="flex items-center gap-3 px-6 py-4 text-neutral-400 hover:text-white active:bg-neutral-900 transition-colors border-b border-neutral-900/50"
              onClick={() => setIsMenuOpen(false)}
            >
              <Folder className="w-4 h-4" />
              <span className="text-sm font-medium">프로젝트 관리</span>
            </Link>
            {(accessLevel ?? 0) >= 1 && (
              <Link
                href="/calendar"
                className="flex items-center gap-3 px-6 py-4 text-neutral-400 hover:text-white active:bg-neutral-900 transition-colors border-b border-neutral-900/50"
                onClick={() => setIsMenuOpen(false)}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">일정 관리</span>
              </Link>
            )}
            {(accessLevel ?? 0) >= 1 && (
              <div className="px-6 pt-4 pb-2">
                <div className="h-px bg-neutral-900 w-full" />
                <p className="text-[9px] text-neutral-600 font-black uppercase tracking-[0.2em] mt-3">Legacy & Records</p>
              </div>
            )}
            {(accessLevel ?? 0) >= 1 && (
              <Link
                href="/legacy"
                className="flex items-center gap-3 px-6 py-4 text-neutral-400 hover:text-white active:bg-neutral-900 transition-colors border-b border-neutral-900/50"
                onClick={() => setIsMenuOpen(false)}
              >
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">명예의 전당</span>
              </Link>
            )}

            {(accessLevel ?? 0) >= 2 && (
              <div className="px-6 pt-4 pb-2">
                <div className="h-px bg-neutral-900 w-full" />
                <p className="text-[9px] text-neutral-600 font-black uppercase tracking-[0.2em] mt-3">Administration</p>
              </div>
            )}
            {(accessLevel ?? 0) >= 2 && (
              <Link
                href="/management"
                className="flex items-center gap-3 px-6 py-4 text-neutral-400 hover:text-white active:bg-neutral-900 transition-colors border-b border-neutral-900/50"
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">관리자 설정</span>
              </Link>
            )}


          </div>
        </nav>
      )}
    </header>
  )
}
