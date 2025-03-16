"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// Update the testUsers array with more realistic email addresses
const testUsers = [
  { email: "lecturer.test@university.edu", password: "password123", role: "Lecturer" },
  { email: "student.test@university.edu", password: "password123", role: "Student" },
]

export function TestLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleTestLogin = async (email: string, password: string) => {
    setLoading(true)
    setError("")

    try {
      // First check if the user exists
      const { data: existingUser } = await supabase.from("users").select("*").eq("email", email).single()

      // If user doesn't exist, create it
      if (!existingUser) {
        const role = email.includes("lecturer") ? "lecturer" : "student"
        const firstName = role === "lecturer" ? "Test" : "Student"
        const lastName = role === "lecturer" ? "Lecturer" : "User"

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              role: role,
            },
          },
        })

        if (authError) {
          throw new Error(authError.message)
        }

        if (authData.user) {
          // Auto-confirm the user for testing
          await supabase.auth.admin.updateUserById(authData.user.id, { email_confirmed_at: new Date().toISOString() })

          // Insert into our custom users table
          await supabase.from("users").insert({
            id: authData.user.id,
            email,
            password: "hashed_in_supabase",
            first_name: firstName,
            last_name: lastName,
            role,
          })
        }
      }

      // Now sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw new Error(signInError.message)
      }

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Test Accounts</CardTitle>
        <CardDescription>Use these accounts for quick testing without email confirmation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {testUsers.map((user) => (
          <div key={user.email} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{user.role}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button onClick={() => handleTestLogin(user.email, user.password)} disabled={loading}>
              Login as {user.role}
            </Button>
          </div>
        ))}
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      </CardContent>
    </Card>
  )
}

