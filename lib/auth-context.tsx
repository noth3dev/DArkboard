"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getSupabase } from "@/lib/supabase"
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  /** 인증 + 권한 정보 로딩 여부 */
  loading: boolean
  /** public.users.access_level (0: 대시보드만, 1: 작성/수정, 2: 삭제 포함 전체 권한) */
  accessLevel: number | null
  /** public.users.name (표시용 이름) */
  profileName: string | null
  /** public.users.display_name (명함용 이름 등) */
  displayName: string | null
  /** public.users.name_eng (영문 이름) */
  nameEng: string | null
  /** public.users.phone */
  phone: string | null
  /** public.users.role */
  role: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessLevel, setAccessLevel] = useState<number | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [nameEng, setNameEng] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    async function applySession(session: Session | null) {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (!sessionUser) {
        // 로그아웃 상태
        setAccessLevel(null)
        setProfileName(null)
        setDisplayName(null)
        setNameEng(null)
        setPhone(null)
        setRole(null)
        setLoading(false)
        return
      }

      try {
        // public.users 테이블에서 access_level, name, display_name, name_eng, phone, role 조회
        const { data, error } = await supabase
          .from("users")
          .select("access_level, name, display_name, name_eng, phone, role")
          .eq("user_uuid", sessionUser.id)
          .single()

        if (error) {
          console.error("Error fetching access_level:", error)
          // 에러인 경우에도 기본값 0으로 처리
          setAccessLevel(0)
          setProfileName(null)
          setDisplayName(null)
          setNameEng(null)
          setPhone(null)
          setRole(null)
        } else {
          setAccessLevel(typeof data?.access_level === "number" ? data.access_level : 0)
          setProfileName(data?.name ?? null)
          setDisplayName(data?.display_name ?? null)
          setNameEng(data?.name_eng ?? null)
          setPhone(data?.phone ?? null)
          setRole(data?.role ?? null)
        }
      } catch (err) {
        console.error("Unexpected error fetching access_level:", err)
        setAccessLevel(0)
        setProfileName(null)
        setDisplayName(null)
        setNameEng(null)
        setPhone(null)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    // 현재 세션 확인
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        return applySession(data.session)
      })
      .catch((err: unknown) => {
        console.error("Error getting session:", err)
        setUser(null)
        setAccessLevel(null)
        setProfileName(null)
        setDisplayName(null)
        setNameEng(null)
        setPhone(null)
        setRole(null)
        setLoading(false)
      })

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setLoading(true)
      void applySession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string) {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
      },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setUser(null)
    setAccessLevel(null)
    setProfileName(null)
    setDisplayName(null)
    setNameEng(null)
    setPhone(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessLevel,
        profileName,
        displayName,
        nameEng,
        phone,
        role,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
