import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single supabase client for the browser
let browserClient: ReturnType<typeof createClient> | null = null

export const createBrowserClient = () => {
  if (browserClient) return browserClient

  browserClient = createClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}

// Create a single supabase client for server components
export const createServerClient = () => {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

