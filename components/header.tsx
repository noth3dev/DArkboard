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
  BookOpen,
  LayoutDashboard,
  Calendar,
  User,
  Trophy,
  ClipboardCheck,
  MonitorPlay,
  GraduationCap,
  Menu,
  X,
  RefreshCw,
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
import { motion, AnimatePresence } from "framer-motion"

export function Header() {
  const { user, signOut, accessLevel, profileName } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [system, setSystem] = useState<'edu' | 'pro'>('edu')
  const router = useRouter()

  // 시스템 초기 설정 (로컬 스토리지)
  useEffect(() => {
    const savedSystem = localStorage.getItem('system_mode') as 'edu' | 'pro'
    if (savedSystem && (accessLevel ?? 0) >= 3) {
      setSystem(savedSystem)
    }
  }, [accessLevel])

  const handleSystemChange = (mode: 'edu' | 'pro') => {
    if (system === mode) return
    setSystem(mode)
    localStorage.setItem('system_mode', mode)
    setIsMenuOpen(false)
    router.push('/')
  }


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

  const romanLevels = ["I", "II", "III", "IV"]
  const safeLevel = Math.min(Math.max(accessLevel ?? 1, 1), 4)
  const roman = romanLevels[safeLevel - 1]

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
    {
      glow: "bg-orange-500/40",
      border: "border-orange-400",
      bg: "bg-orange-500/8",
      icon: "text-orange-300",
      label: "text-orange-300/80",
      value: "text-orange-100",
      dot: "bg-orange-400",
    },
  ] as const

  const style = levelStyles[safeLevel - 1]

  const baseDisplayName = profileName || user.email || "me"
  const nameSlug = encodeURIComponent(baseDisplayName)

  const eduNav = [
    { href: "/homework", label: "숙제", icon: ClipboardCheck, minLevel: 2, title: "나의 숙제" },
    { href: "/calendar", label: "일정", icon: Calendar, minLevel: 2, title: "일정" },
    { href: "/lecture", label: "강의", icon: MonitorPlay, minLevel: 2, title: "강의" },
    { href: "/group", label: "그룹", icon: Users, minLevel: 2, title: "그룹 관리" },
    { href: "/legacy", label: "레거시", icon: Trophy, minLevel: 1, title: "레거시" },
  ]

  const proNav = [
    { href: "/expense", label: "지출", icon: CreditCard, minLevel: 3, title: "지출 관리" },
    { href: "/project", label: "프로젝트", icon: Folder, minLevel: 3, title: "프로젝트" },
    { href: "/team", label: "팀", icon: Users, minLevel: 3, title: "팀 관리" },
    { href: "/calendar", label: "일정", icon: Calendar, minLevel: 3, title: "일정" },
  ]

  const currentNav = system === 'edu' ? eduNav : proNav

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-background/60 backdrop-blur-xl">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-1 system-select-container">
          <div className="relative h-5 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ width: system === 'edu' ? '120px' : '100px' }}>
            <Link href="/" className="absolute inset-0">
              <img
                src="/teamwarkedu.svg"
                alt="Logo"
                className={`absolute left-0 h-5 w-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${system === 'edu'
                  ? 'opacity-100 translate-y-0 scale-100 blur-0'
                  : 'opacity-0 -translate-y-8 scale-95 blur-md pointer-events-none'
                  }`}
              />
              <img
                src="/teamwark.svg"
                alt="Logo"
                className={`absolute left-0 h-5 w-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${system === 'pro'
                  ? 'opacity-100 translate-y-0 scale-100 blur-0'
                  : 'opacity-0 translate-y-8 scale-95 blur-md pointer-events-none'
                  }`}
              />
            </Link>
          </div>

          {(accessLevel ?? 0) >= 3 && (
            <button
              onClick={() => handleSystemChange(system === 'edu' ? 'pro' : 'edu')}
              className="flex items-center justify-center w-6 h-6 hover:bg-white/10 rounded-full transition-all text-muted-foreground hover:text-foreground cursor-pointer outline-none active:scale-90 group/toggle"
              title={`Switch to ${system === 'edu' ? 'Teamwark PRO' : 'Teamwark EDU'}`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-all duration-500 ease-in-out group-hover/toggle:rotate-180 ${system === 'edu' ? 'text-[#00D7D3]' : 'text-muted-foreground/40'}`}
              />
            </button>
          )}
        </div>

        {/* 데스크톱 네비게이션 */}
        {canAccessInnerPages && (
          <nav className="hidden md:flex items-center gap-1 border-l border-border pl-6 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={system}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex items-center gap-1"
              >
                {currentNav.map((item, index) => {
                  if ((accessLevel ?? 0) < item.minLevel) return null
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.href}
                      variants={{
                        initial: { opacity: 0, x: 20 },
                        animate: { opacity: 1, x: 0 },
                        exit: { opacity: 0, x: -20 },
                      }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: [0.23, 1, 0.32, 1],
                      }}
                    >
                      <Link
                        href={item.href}
                        className="px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                        title={item.title}
                      >
                        <Icon className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 유저 배지 (드롭다운 메뉴) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-1.5 bg-secondary hover:bg-accent border border-border rounded-full transition-all outline-none cursor-pointer">
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
              <span className="text-xs text-foreground font-medium truncate max-w-[100px]">{baseDisplayName}</span>
              <div className="w-px h-3 bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground font-suit tracking-tighter">{roman}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border backdrop-blur-xl">
            <DropdownMenuLabel className="font-suit text-xs text-muted-foreground">Account</DropdownMenuLabel>
            <DropdownMenuItem className="flex flex-col items-start gap-0.5 cursor-default focus:bg-transparent px-2 py-2">
              <span className="text-sm font-bold text-foreground font-suit">{baseDisplayName}</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-tight">{roman} Access Level</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => router.push(`/${nameSlug}`)} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span className="text-sm">Profile Card</span>
            </DropdownMenuItem>
            {(accessLevel ?? 0) >= 4 && (
              <DropdownMenuItem onClick={() => router.push("/management")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span className="text-sm">Admin Settings</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => signOut()} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-sm">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationCenter />

        {/* 모바일 햄버거 메뉴 버튼 */}
        <button
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground md:hidden transition-colors cursor-pointer"
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
        <nav className="absolute top-full left-0 w-full bg-background/95 backdrop-blur-2xl border-b border-border md:hidden animate-in slide-in-from-top-4 duration-300 shadow-2xl overflow-hidden z-[40]">
          <div className="flex flex-col p-2 space-y-1">
            {currentNav.map((item) => {
              if ((accessLevel ?? 0) < item.minLevel) return null
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-6 py-4 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-all"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium font-suit">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
