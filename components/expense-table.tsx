"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabase, type Expense } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  User,
  Download,
  LogOut,
  Search,
  TrendingUp,
  TrendingDown,
  Filter,
  Eye,
  CreditCard,
  Users,
  Folder,
} from "lucide-react"

type FilterType = "all" | "income" | "expense"

export function ExpenseTable() {
  const router = useRouter()
  const { user, signOut, accessLevel } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    date: "",
    item: "",
    amount: "",
    user_id: "",
    type: "expense" as "income" | "expense",
    description: "",
  })
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split("T")[0],
    item: "",
    amount: "",
    user_id: "",
    type: "expense" as "income" | "expense",
    description: "",
  })
  const [showAddForm, setShowAddForm] = useState(false)

  const [filterType, setFilterType] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState("")

  useEffect(() => {
    fetchExpenses()
  }, [])

  async function fetchExpenses() {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (err) {
      console.error("Error fetching expenses:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    // access_level 1 이상만 추가 가능
    if ((accessLevel ?? 0) < 1) return

    if (!newExpense.date || !newExpense.item || !newExpense.amount) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("expenses").insert({
        date: newExpense.date,
        item: newExpense.item,
        amount: Math.abs(Number.parseInt(newExpense.amount)),
        user_id: newExpense.user_id || null,
        type: newExpense.type,
        description: newExpense.description || null,
      })

      if (error) throw error
      setNewExpense({
        date: new Date().toISOString().split("T")[0],
        item: "",
        amount: "",
        user_id: "",
        type: "expense",
        description: "",
      })
      setShowAddForm(false)
      fetchExpenses()
    } catch (err) {
      console.error("Error adding expense:", err)
    }
  }

  async function handleUpdate(id: string) {
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
          amount: Math.abs(Number.parseInt(editForm.amount)),
          user_id: editForm.user_id || null,
          type: editForm.type,
          description: editForm.description || null,
        })
        .eq("id", id)

      if (error) throw error
      setEditingId(null)
      fetchExpenses()
    } catch (err) {
      console.error("Error updating expense:", err)
    }
  }

  async function handleDelete(id: string) {
    // access_level 2 이상만 삭제 가능
    if ((accessLevel ?? 0) < 2) return

    if (!confirm("정말 삭제하시겠습니까?")) return
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("expenses").delete().eq("id", id)

      if (error) throw error
      fetchExpenses()
    } catch (err) {
      console.error("Error deleting expense:", err)
    }
  }

  function startEdit(expense: Expense) {
    // access_level 1 이상만 인라인 수정 가능
    if ((accessLevel ?? 0) < 1) return

    setEditingId(expense.id)
    setEditForm({
      date: expense.date,
      item: expense.item,
      amount: expense.amount.toString(),
      user_id: expense.user_id || "",
      type: expense.type || "expense",
      description: expense.description || "",
    })
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesType = filterType === "all" || expense.type === filterType
    const matchesSearch =
      searchQuery === "" ||
      expense.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUser = userFilter === "" || expense.user_id?.toLowerCase().includes(userFilter.toLowerCase())
    return matchesType && matchesSearch && matchesUser
  })

  const totalIncome = filteredExpenses.filter((e) => e.type === "income").reduce((sum, e) => sum + Number(e.amount), 0)
  const totalExpense = filteredExpenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const netTotal = totalIncome - totalExpense

  // 고유 사용자 목록
  const uniqueUsers = [...new Set(expenses.map((e) => e.user_id).filter(Boolean))]

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("ko-KR").format(Math.abs(amount)) + "원"
  }

  function exportToExcel() {
    const headers = ["날짜", "항목", "유형", "금액", "사용자", "설명"]
    const rows = filteredExpenses.map((expense) => [
      expense.date,
      expense.item,
      expense.type === "income" ? "수입" : "지출",
      expense.amount.toString(),
      expense.user_id || "",
      expense.description || "",
    ])

    rows.push(["", "", "수입 합계", totalIncome.toString(), "", ""])
    rows.push(["", "", "지출 합계", totalExpense.toString(), "", ""])
    rows.push(["", "", "순 합계", netTotal.toString(), "", ""])

    const BOM = "\uFEFF"
    const csvContent =
      BOM + [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `지출내역_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleSignOut() {
    await signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-neutral-400">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-light tracking-tight">지출 내역</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-md border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              내보내기
            </button>
            {/* access_level 1 이상만 추가 버튼 표시 */}
            {(accessLevel ?? 0) >= 1 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-neutral-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">수입</span>
            </div>
            <p className="text-xl font-mono text-white">+{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">지출</span>
            </div>
            <p className="text-xl font-mono text-white">-{formatCurrency(totalExpense)}</p>
          </div>
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-2 text-neutral-400 mb-1">
              <span className="text-xs uppercase tracking-wider">순 합계</span>
            </div>
            <p className={`text-xl font-mono ${netTotal >= 0 ? "text-green-500" : "text-red-500"}`}>
              {netTotal >= 0 ? "+" : "-"}
              {formatCurrency(netTotal)}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="항목 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
            />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white focus:outline-none focus:border-neutral-600 appearance-none min-w-[140px]"
            >
              <option value="">모든 사용자</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user || ""}>
                  {user}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-md">
            <button
              onClick={() => setFilterType("all")}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${filterType === "all" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              <Filter className="w-3 h-3" />
              전체
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${filterType === "income" ? "bg-green-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
            >
              <TrendingUp className="w-3 h-3" />
              수입
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${filterType === "expense" ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
            >
              <TrendingDown className="w-3 h-3" />
              지출
            </button>
          </div>
        </div>

        {/* Add Form */}
        {/* access_level 1 이상 + showAddForm 일 때만 추가 폼 표시 */}
        {showAddForm && (accessLevel ?? 0) >= 1 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div
              className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-[32px] overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                {/* Left: Preview Section (Receipt Style) */}
                <div className="hidden md:flex flex-1 bg-neutral-900/30 p-12 border-r border-neutral-800 flex-col items-center justify-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  <div className="relative z-10 w-full max-w-[320px]">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em] mb-8 text-center opacity-50">Transaction Preview</p>

                    <div className="bg-white text-black p-8 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
                      {/* Receipt Top */}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Merchant</p>
                          <p className="text-xl font-black truncate max-w-[180px]">{newExpense.item || "---"}</p>
                        </div>
                        <div className={`p-2 rounded-xl ${newExpense.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {newExpense.type === "income" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-dashed border-neutral-200">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-neutral-400 uppercase">Date</span>
                          <span className="font-black">{newExpense.date || "----.--.--"}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-neutral-400 uppercase">User</span>
                          <span className="font-black">{newExpense.user_id || "---"}</span>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-dashed border-neutral-200">
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">Total Amount</p>
                        <p className={`text-4xl font-black ${newExpense.type === "income" ? "text-green-600" : "text-black"}`}>
                          {newExpense.amount ? (newExpense.amount.startsWith('+') || newExpense.amount.startsWith('-') ? '' : (newExpense.type === 'income' ? '+' : '-')) : ''}
                          {newExpense.amount || "0"}
                        </p>
                      </div>

                      {/* Receipt Bottom Notch */}
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <div key={i} className="w-3 h-3 bg-neutral-900/30 rounded-full" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Input Section */}
                <div className="flex-1 p-8 flex flex-col bg-black overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white text-black shadow-lg">
                        <CreditCard className="w-4 h-4 font-bold" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight uppercase">지출 내역</h2>
                        <p className="text-[9px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5 opacity-60">Track your cashflow accurately</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Title / Vendor</label>
                        <input
                          type="text"
                          placeholder="어디에 사용하셨나요?"
                          value={newExpense.item}
                          onChange={(e) => setNewExpense({ ...newExpense, item: e.target.value })}
                          className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Amount (Use +/- to set type)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="예: -15,000 (지출), 50,000 (수입)"
                            value={newExpense.amount}
                            onChange={(e) => {
                              const val = e.target.value
                              const newType = val.startsWith("-") ? "expense" : "income"
                              setNewExpense({ ...newExpense, amount: val, type: newType })
                            }}
                            className={`w-full px-4 py-3.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-lg font-bold focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 ${newExpense.type === "income" ? "text-green-500" : "text-red-500"}`}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                            {newExpense.type === "income" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Date</label>
                        <input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">User</label>
                        <input
                          type="text"
                          placeholder="결제자 성함"
                          value={newExpense.user_id}
                          onChange={(e) => setNewExpense({ ...newExpense, user_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Note (Optional)</label>
                      <textarea
                        placeholder="상세 내용을 적어주세요"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-8 mt-auto border-t border-neutral-800 flex gap-3">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-3 text-[9px] font-bold text-neutral-500 hover:text-white transition-all uppercase tracking-[0.1em]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={!newExpense.item.trim() || !newExpense.amount}
                      className="flex-[1.5] py-3 bg-white text-black text-[10px] font-bold rounded-xl hover:bg-neutral-200 transition-all shadow-lg disabled:opacity-20 active:scale-95 uppercase tracking-[0.1em]"
                    >
                      Record Transaction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Table */}
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950">
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  항목
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    사용자
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider w-28">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-600">
                    데이터가 없습니다
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-neutral-950 transition-colors">
                    {editingId === expense.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="w-full px-2 py-1 bg-black border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editForm.item}
                            onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                            className="w-full px-2 py-1 bg-black border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${editForm.type === "income" ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500"} text-xs rounded-full`}>
                            {editForm.type === "income" ? "수입" : "지출"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editForm.amount}
                            onChange={(e) => {
                              const val = e.target.value
                              const newType = val.startsWith("-") ? "expense" : "income"
                              setEditForm({ ...editForm, amount: val, type: newType })
                            }}
                            className={`w-full px-2 py-1 bg-black border border-neutral-700 rounded text-sm text-right focus:outline-none focus:border-neutral-500 ${editForm.type === "income" ? "text-green-500" : "text-red-500"
                              }`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editForm.user_id}
                            onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })}
                            placeholder="사용자"
                            className="w-full px-2 py-1 bg-black border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-neutral-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleUpdate(expense.id)}
                              className="p-1.5 text-green-500 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-neutral-500 hover:bg-neutral-800 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm text-neutral-300">{expense.date}</td>
                        <td className="px-6 py-4 text-sm text-white">{expense.item}</td>
                        <td className="px-6 py-4 text-center">
                          {expense.type === "income" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600/20 text-green-500 text-xs rounded-full">
                              <TrendingUp className="w-3 h-3" />
                              수입
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-500 text-xs rounded-full">
                              <TrendingDown className="w-3 h-3" />
                              지출
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-mono">
                          <span className={expense.type === "income" ? "text-green-500" : "text-red-400"}>
                            {expense.type === "income" ? "+" : "-"}
                            {formatCurrency(expense.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-400">{expense.user_id || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => router.push(`/expense/${expense.id}`)}
                              className="p-1.5 text-neutral-600 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                              title="상세보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* access_level 1 이상: 인라인 수정 버튼 */}
                            {(accessLevel ?? 0) >= 1 && (
                              <button
                                onClick={() => startEdit(expense)}
                                className="p-1.5 text-neutral-600 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {/* access_level 2 이상: 삭제 버튼 */}
                            {(accessLevel ?? 0) >= 2 && (
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-neutral-800 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
