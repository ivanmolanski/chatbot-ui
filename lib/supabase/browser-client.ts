import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = url && key
  ? createBrowserClient<Database>(url, key)
  : (null as any)
