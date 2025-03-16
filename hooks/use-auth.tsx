"use client"

import type React from "react"
import type { User } from "@/types"

import { createBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    // In the useEffect function, modify the getUser function to handle missing users
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        // Fetch user details from our custom users table
        const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single()

        if (data) {
          setUser(data as User)
        } else {
          // If user exists in auth but not in our custom table, create an entry
          const userData = session.user.user_metadata
          if (userData && userData.first_name && userData.last_name && userData.role) {
            const newUser = {
              id: session.user.id,
              email: session.user.email || "",
              first_name: userData.first_name,
              last_name: userData.last_name,
              role: userData.role,
              password: "hashed_in_supabase",
            }

            const { error } = await supabase.from("users").insert(newUser)
            if (!error) {
              setUser(newUser as User)
            }
          }
        }
      }

      setLoading(false)
    }

    getUser()

    // Also update the onAuthStateChange callback with similar logic
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user details from our custom users table
        const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single()

        if (data) {
          setUser(data as User)
        } else {
          // If user exists in auth but not in our custom table, create an entry
          const userData = session.user.user_metadata
          if (userData && userData.first_name && userData.last_name && userData.role) {
            const newUser = {
              id: session.user.id,
              email: session.user.email || "",
              first_name: userData.first_name,
              last_name: userData.last_name,
              role: userData.role,
              password: "hashed_in_supabase",
            }

            const { error } = await supabase.from("users").insert(newUser)
            if (!error) {
              setUser(newUser as User)
            }
          }
        }
      } else {
        setUser(null)
      }

      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error && data.user) {
      // Fetch user details from our custom users table
      const { data: userData } = await supabase.from("users").select("*").eq("id", data.user.id).single()

      if (userData) {
        setUser(userData as User)
      }
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

