import { createBrowserClient } from "@supabase/ssr"

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return supabaseInstance
}

export type Expense = {
  id: string
  date: string
  item: string
  amount: number
  type: "income" | "expense" // 수입/지출 구분
  user_id: string | null
  description: string | null // 세부 설명 추가
  project_id: string | null
  created_at: string
}
