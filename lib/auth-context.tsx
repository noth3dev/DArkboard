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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessLevel, setAccessLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    async function applySession(session: Session | null) {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (!sessionUser) {
        // 로그아웃 상태
        setAccessLevel(null)
        setLoading(false)
        return
      }

      try {
        // public.users 테이블에서 access_level 조회
        const { data, error } = await supabase
          .from("users")
          .select("access_level")
          .eq("user_uuid", sessionUser.id)
          .single()

        if (error) {
          console.error("Error fetching access_level:", error)
          // 에러인 경우에도 기본값 0으로 처리
          setAccessLevel(0)
        } else {
          setAccessLevel(typeof data?.access_level === "number" ? data.access_level : 0)
        }
      } catch (err) {
        console.error("Unexpected error fetching access_level:", err)
        setAccessLevel(0)
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
  }

  return (
    <AuthContext.Provider value={{ user, loading, accessLevel, signIn, signUp, signOut }}>
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
