"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { getSupabase, type Expense } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { ArrowLeft, Calendar, FileText, User, TrendingUp, TrendingDown, Pencil, Trash2, X, Save } from "lucide-react"

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: authLoading, accessLevel } = useAuth()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    date: "",
    item: "",
    amount: "",
    user_id: "",
    type: "expense" as "income" | "expense",
    description: "",
  })

  useEffect(() => {
    if (user) {
      fetchExpense()
    }
  }, [id, user])

  async function fetchExpense() {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.from("expenses").select("*").eq("id", id).single()

      if (error) throw error
      setExpense(data)
      setEditForm({
        date: data.date,
        item: data.item,
        amount: data.amount.toString(),
        user_id: data.user_id || "",
        type: data.type || "expense",
        description: data.description || "",
      })
    } catch (err) {
      console.error("Error fetching expense:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    // access_level 1 이상만 수정 가능
    if ((accessLevel ?? 0) < 1) return

    if (!editForm.date || !editForm.item || !editForm.amount) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("expenses")
        .update({
          date: editForm.date,
          item: editForm.item,
          amount: Number.parseInt(editForm.amount),
          user_id: editForm.user_id || null,
          type: editForm.type,
          description: editForm.description || null,
        })
        .eq("id", id)

      if (error) throw error
      setIsEditing(false)
      fetchExpense()
    } catch (err) {
      console.error("Error updating expense:", err)
    }
  }

  async function handleDelete() {
    // access_level 3 이상만 삭제 가능
    if ((accessLevel ?? 0) < 3) return

    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("expenses").delete().eq("id", id)

      if (error) throw error
      router.push("/")
    } catch (err) {
      console.error("Error deleting expense:", err)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("ko-KR").format(Math.abs(amount)) + "원"
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  // access_level 0: / 페이지만 접근 가능
  if ((accessLevel ?? 0) === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-neutral-400">
          <p className="mb-4">이 페이지에 접근할 권한이 없습니다.</p>
          <button onClick={() => router.push("/")} className="text-white underline">
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">로딩 중..</div>
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">항목을 찾을 수 없습니다</p>
          <button onClick={() => router.push("/")} className="text-white hover:underline">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/expense")}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>목록</span>
          </button>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  저장
                </button>
              </>
            ) : (
              <>
                {/* access_level 1 이상: 수정 가능 */}
                {(accessLevel ?? 0) >= 1 && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-md border border-neutral-800 hover:bg-neutral-800 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    수정
                  </button>
                )}
                {/* access_level 3 이상: 삭제 가능 */}
                {(accessLevel ?? 0) >= 3 && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-500 text-sm font-medium rounded-md hover:bg-red-600/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden">
          {/* Type Badge & Amount Header */}
          <div className="p-6 border-b border-neutral-800">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, type: "expense" })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border transition-colors ${editForm.type === "expense"
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    지출
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, type: "income" })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border transition-colors ${editForm.type === "income"
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    수입
                  </button>
                </div>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  placeholder="금액"
                  className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-md text-white text-2xl font-mono text-center focus:outline-none focus:border-neutral-600"
                />
              </div>
            ) : (
              <div className="text-center">
                {expense.type === "income" ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-600/20 text-green-500 text-sm rounded-full mb-4">
                    <TrendingUp className="w-4 h-4" />
                    수입
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 text-red-500 text-sm rounded-full mb-4">
                    <TrendingDown className="w-4 h-4" />
                    지출
                  </span>
                )}
                <p
                  className={`text-4xl font-mono font-bold ${expense.type === "income" ? "text-green-500" : "text-red-400"}`}
                >
                  {expense.type === "income" ? "+" : "-"}
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="divide-y divide-neutral-800">
            {/* Item */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500 uppercase tracking-wider">항목</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.item}
                  onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                  placeholder="항목"
                  className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
                />
              ) : (
                <p className="text-lg text-white">{expense.item}</p>
              )}
            </div>

            {/* Date */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500 uppercase tracking-wider">날짜</span>
              </div>
              {isEditing ? (
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
                />
              ) : (
                <p className="text-lg text-white">{expense.date}</p>
              )}
            </div>

            {/* User */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500 uppercase tracking-wider">사용자</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.user_id}
                  onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })}
                  placeholder="사용자"
                  className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600"
                />
              ) : (
                <p className="text-lg text-white">{expense.user_id || "-"}</p>
              )}
            </div>

            {/* Description */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500 uppercase tracking-wider">설명</span>
              </div>
              {isEditing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="세부 설명을 입력하세요..."
                  rows={4}
                  className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
                />
              ) : (
                <p className="text-lg text-white whitespace-pre-wrap">{expense.description || "-"}</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="p-6 bg-neutral-900/50 border-t border-neutral-800">
            <p className="text-xs text-neutral-600">생성일: {new Date(expense.created_at).toLocaleString("ko-KR")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
