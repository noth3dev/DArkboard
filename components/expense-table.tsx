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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type FilterType = "all" | "income" | "expense"

type Project = {
  id: string
  name: string
}

export function ExpenseTable({ hideHeader }: { hideHeader?: boolean }) {
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
    project_id: "",
  })
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split("T")[0],
    item: "",
    amount: "",
    user_id: "",
    type: "expense" as "income" | "expense",
    description: "",
    project_id: "",
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  const [filterType, setFilterType] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")

  useEffect(() => {
    fetchExpenses()
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.from("projects").select("id, name").order("name")
      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error("Error fetching projects:", err)
    }
  }

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
    if ((accessLevel ?? 0) < 3) return

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
        project_id: newExpense.project_id || null,
      })

      if (error) throw error
      setNewExpense({
        date: new Date().toISOString().split("T")[0],
        item: "",
        amount: "",
        user_id: "",
        type: "expense",
        description: "",
        project_id: "",
      })
      setShowAddForm(false)
      fetchExpenses()
    } catch (err) {
      console.error("Error adding expense:", err)
    }
  }

  async function handleUpdate(id: string) {
    // access_level 1 이상만 수정 가능
    if ((accessLevel ?? 0) < 4) return

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
          project_id: editForm.project_id || null,
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
    // access_level 4 이상만 삭제 가능
    if ((accessLevel ?? 0) < 4) return

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
    if ((accessLevel ?? 0) < 3) return

    setEditingId(expense.id)
    setEditForm({
      date: expense.date,
      item: expense.item,
      amount: expense.amount.toString(),
      user_id: expense.user_id || "",
      type: expense.type || "expense",
      description: expense.description || "",
      project_id: expense.project_id || "",
    })
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesType = filterType === "all" || expense.type === filterType
    const matchesSearch =
      searchQuery === "" ||
      expense.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUser = !userFilter || userFilter === "all" || expense.user_id?.toLowerCase().includes(userFilter.toLowerCase())
    const matchesProject = !projectFilter || projectFilter === "all" || expense.project_id === projectFilter
    return matchesType && matchesSearch && matchesUser && matchesProject
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
    const headers = ["날짜", "항목", "프로젝트", "유형", "금액", "사용자", "설명"]
    const rows = filteredExpenses.map((expense) => [
      expense.date,
      expense.item,
      projects.find(p => p.id === expense.project_id)?.name || "",
      expense.type === "income" ? "수입" : "지출",
      expense.amount.toString(),
      expense.user_id || "",
      expense.description || "",
    ])

    rows.push(["", "", "", "수입 합계", totalIncome.toString(), "", ""])
    rows.push(["", "", "", "지출 합계", totalExpense.toString(), "", ""])
    rows.push(["", "", "", "순 합계", netTotal.toString(), "", ""])

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
        <div className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={`bg-black text-white ${!hideHeader && 'p-4 sm:p-6 md:p-12'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        {!hideHeader && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-suit leading-tight tracking-tighter mb-4">
                지출 관리
              </h1>
              <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                모든 지출 내역을 투명하게 관리하고 모니터링하세요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white text-xs font-bold rounded-xl border border-neutral-800 hover:bg-neutral-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>데이터 내보내기</span>
              </button>
              {(accessLevel ?? 0) >= 3 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-white/5"
                >
                  <Plus className="w-4 h-4" />
                  <span>내역 추가</span>
                </button>
              )}
            </div>
          </div>
        )}

        {hideHeader && (
          <div className="flex justify-end gap-2 mb-8">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white text-xs font-bold rounded-xl border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>데이터 내보내기</span>
            </button>
            {(accessLevel ?? 0) >= 3 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-white/5"
              >
                <Plus className="w-4 h-4" />
                <span>내역 추가</span>
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-backwards">
          <div className="p-3 sm:p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-500 mb-0.5 sm:mb-1">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">수입</span>
            </div>
            <p className="text-lg sm:text-xl font-mono text-white">+{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-3 sm:p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-500 mb-0.5 sm:mb-1">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">지출</span>
            </div>
            <p className="text-lg sm:text-xl font-mono text-white">-{formatCurrency(totalExpense)}</p>
          </div>
          <div className="p-3 sm:p-4 bg-neutral-950 border border-neutral-800 rounded-lg sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-neutral-400 mb-0.5 sm:mb-1">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">순 합계</span>
            </div>
            <p className={`text-lg sm:text-xl font-mono ${netTotal >= 0 ? "text-green-500" : "text-red-500"}`}>
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
              placeholder="내역 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 shadow-inner"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 z-10" />
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-auto pl-10 pr-8 bg-neutral-950 border-neutral-800 min-w-[140px]">
                <SelectValue placeholder="모든 사용자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 사용자</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user || ""}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:w-auto">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 z-10" />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-auto pl-10 pr-8 bg-neutral-950 border-neutral-800 min-w-[140px]">
                <SelectValue placeholder="모든 프로젝트" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 프로젝트</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-md">
            <button
              onClick={() => setFilterType("all")}
              className={`flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded transition-all ${filterType === "all" ? "bg-white text-black" : "text-neutral-500 hover:text-white"
                }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded transition-all ${filterType === "income" ? "bg-green-600 text-white" : "text-neutral-500 hover:text-white"
                }`}
            >
              수입
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded transition-all ${filterType === "expense" ? "bg-red-600 text-white" : "text-neutral-500 hover:text-white"
                }`}
            >
              지출
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (accessLevel ?? 0) >= 1 && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 md:p-10 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
            <div
              className="relative w-full h-full sm:h-auto sm:max-w-5xl bg-neutral-950 border-0 sm:border sm:border-neutral-800 rounded-0 sm:rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                {/* Left: Preview Section (Receipt Style) */}
                <div className="hidden md:flex flex-1 bg-neutral-900/30 p-12 border-r border-neutral-800 flex-col items-center justify-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

                  <div className="relative z-10 w-full max-w-[320px]">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em] mb-8 text-center opacity-50">TRANSACTION RECEIPT</p>

                    <div className="bg-white text-black p-8 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
                      {/* Receipt Top */}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">거래처 및 항목</p>
                          <p className="text-xl font-black truncate max-w-[180px]">{newExpense.item || "미지정"}</p>
                        </div>
                        <div className={`p-2 rounded-xl ${newExpense.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {newExpense.type === "income" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-dashed border-neutral-200">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-neutral-400 uppercase">날짜</span>
                          <span className="font-black font-mono">{newExpense.date || "----.--.--"}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-neutral-400 uppercase">사용자</span>
                          <span className="font-black">{newExpense.user_id || "미지정"}</span>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-dashed border-neutral-200">
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">합계 금액</p>
                        <p className={`text-4xl font-black font-mono ${newExpense.type === "income" ? "text-green-600" : "text-black"}`}>
                          {newExpense.amount ? (newExpense.amount.startsWith('+') || newExpense.amount.startsWith('-') ? '' : (newExpense.type === 'income' ? '+' : '-')) : ''}
                          {newExpense.amount || "0"}
                          <span className="text-sm ml-1">원</span>
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
                  <div className="flex items-center justify-between mb-8 sticky top-0 bg-black pt-2 z-20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white text-black shadow-lg">
                        <CreditCard className="w-4 h-4 font-bold" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight uppercase">내역 등록</h2>
                        <p className="text-[9px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5 opacity-60">정확하게 거래 내역을 기록하세요</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all border border-neutral-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">항목 / 거래처</label>
                        <input
                          type="text"
                          placeholder="어디에 사용하셨나요?"
                          value={newExpense.item}
                          onChange={(e) => setNewExpense({ ...newExpense, item: e.target.value })}
                          className="w-full px-4 py-3 bg-neutral-900/30 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 font-semibold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">금액 (+/- 기호로 유형 자동 분류)</label>
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
                            className={`w-full px-4 py-3.5 bg-neutral-900/30 border border-neutral-800 rounded-xl text-lg font-black focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 font-mono ${newExpense.type === "income" ? "text-green-500" : "text-red-500"}`}
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 transition-opacity">
                            {newExpense.type === "income" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">날짜</label>
                        <input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-neutral-900/30 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-white transition-all [color-scheme:dark] font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">사용자</label>
                        <input
                          type="text"
                          placeholder="결제자 성함"
                          value={newExpense.user_id}
                          onChange={(e) => setNewExpense({ ...newExpense, user_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-neutral-900/30 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">프로젝트</label>
                      <select
                        value={newExpense.project_id}
                        onChange={(e) => setNewExpense({ ...newExpense, project_id: e.target.value })}
                        className="w-full px-4 py-2.5 bg-neutral-900/30 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all font-bold appearance-none [color-scheme:dark]"
                      >
                        <option value="">프로젝트 선택 안함</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold ml-1">상세 설명 (선택 사항)</label>
                      <textarea
                        placeholder="상세 내용을 적어주세요"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 bg-neutral-900/30 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-white transition-all placeholder:text-neutral-700 resize-none font-semibold italic opacity-80"
                      />
                    </div>
                  </div>

                  <div className="pt-8 mt-auto border-t border-neutral-800 flex gap-3 sticky bottom-0 bg-black py-4 z-20">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-3 text-[9px] font-bold text-neutral-500 hover:text-white transition-all uppercase tracking-[0.1em]"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={!newExpense.item.trim() || !newExpense.amount}
                      className="flex-[1.5] py-3 bg-white text-black text-[10px] font-black rounded-xl hover:bg-neutral-200 transition-all shadow-lg shadow-white/5 disabled:opacity-20 active:scale-95 uppercase tracking-[0.1em]"
                    >
                      기록 완료
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Table */}
        <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950/20 backdrop-blur-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    날짜
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    항목
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    프로젝트
                  </th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    유형
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    금액
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    사용자
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-500 uppercase tracking-widest w-28">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-neutral-600 font-bold uppercase tracking-widest text-[10px]">
                      기록된 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-neutral-900/50 transition-colors group">
                      {editingId === expense.id ? (
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className="w-full px-2 py-1.5 bg-black border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-white transition-all font-mono"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editForm.item}
                              onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                              className="w-full px-2 py-1.5 bg-black border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-white transition-all font-bold"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={editForm.project_id}
                              onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
                              className="w-full px-1 py-1.5 bg-black border border-neutral-700 rounded-lg text-white text-[10px] focus:outline-none focus:border-white transition-all font-bold [color-scheme:dark]"
                            >
                              <option value="">미지정</option>
                              {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${editForm.type === "income" ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500"} text-[10px] font-bold rounded-full border border-current opacity-60`}>
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
                              className={`w-full px-2 py-1.5 bg-black border border-neutral-700 rounded-lg text-xs text-right focus:outline-none focus:border-white transition-all font-mono font-bold ${editForm.type === "income" ? "text-green-500" : "text-red-500"
                                }`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editForm.user_id}
                              onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })}
                              placeholder="사용자"
                              className="w-full px-2 py-1.5 bg-black border border-neutral-700 rounded-lg text-white text-xs focus:outline-none focus:border-white transition-all font-bold"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleUpdate(expense.id)}
                                className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-neutral-500 hover:bg-neutral-800 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-xs text-neutral-500 font-mono">{expense.date}</td>
                          <td className="px-6 py-4 text-xs text-white font-bold">{expense.item}</td>
                          <td className="px-6 py-4 text-[10px] text-neutral-400 font-bold">
                            {projects.find(p => p.id === expense.project_id)?.name || "-"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {expense.type === "income" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full border border-green-500/20">
                                <TrendingUp className="w-3 h-3" />
                                수입
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-black rounded-full border border-red-500/20">
                                <TrendingDown className="w-3 h-3" />
                                지출
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-mono font-black">
                            <span className={expense.type === "income" ? "text-green-500" : "text-white"}>
                              {expense.type === "income" ? "+" : "-"}
                              {formatCurrency(expense.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-neutral-400 font-bold">{expense.user_id || "-"}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => router.push(`/expense/${expense.id}`)}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                                title="상세보기"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {/* access_level 1 이상: 인라인 수정 버튼 */}
                              {(accessLevel ?? 0) >= 4 && (
                                <button
                                  onClick={() => startEdit(expense)}
                                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                                  title="수정"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {/* access_level 3 이상: 삭제 버튼 */}
                              {(accessLevel ?? 0) >= 4 && (
                                <button
                                  onClick={() => handleDelete(expense.id)}
                                  className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="삭제"
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
    </div>
  )
}
