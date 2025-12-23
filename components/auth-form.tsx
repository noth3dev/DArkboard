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
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8">
          <img src="/Darkboard.svg" alt="Darkboard" className="w-auto h-6 sm:h-7" />
        </h1>

        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-6">
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${isLogin ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${!isLogin ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name selection logic removed */}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                required
                className="w-full pl-10 pr-3 py-2.5 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                minLength={6}
                className="w-full pl-10 pr-3 py-2.5 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading ? (
                "처리 중..."
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  로그인
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  회원가입
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
