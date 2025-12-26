"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Mail, Lock, LogIn, UserPlus } from "lucide-react"

export function AuthForm() {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const result = isLogin ? await signIn(email, password) : await signUp(email, password)

      if (result.error) {
        setError(result.error)
      } else if (!isLogin) {
        setSuccess("가입 확인 이메일을 확인해주세요")
      }
    } catch (err) {
      setError("알 수 없는 오류가 발생했습니다")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-12 flex justify-center">
          <img src="/teamwark.svg" alt="homewArk" className="w-auto h-8" />
        </div>

        <div className="glass border border-border/50 rounded-[32px] p-10 shadow-2xl">
          <div className="flex mb-10 bg-white/5 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs font-bold font-suit rounded-xl transition-all ${isLogin ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs font-bold font-suit rounded-xl transition-all ${!isLogin ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-secondary border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3.5 bg-secondary border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="min-h-[20px] pt-1">
              {error && <p className="text-red-400 text-[10px] font-bold flex items-center gap-2 animate-in slide-in-from-left-2">{error}</p>}
              {success && <p className="text-emerald-400 text-[10px] font-bold flex items-center gap-2 animate-in slide-in-from-left-2">{success}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 flex items-center justify-center gap-3 bg-foreground text-background text-sm font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95 disabled:opacity-50 mt-6"
            >
              {loading ? (
                "Processing..."
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Initiate Login</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .glass { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); }
      `}</style>
    </div>
  )
}
