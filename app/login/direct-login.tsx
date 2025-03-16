"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export function DirectLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleDirectLogin = async (role: "lecturer" | "student") => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/direct-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Login failed")
      }

      // Force a refresh to update the auth state
      window.location.href = "/dashboard"
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-6 border-2 border-red-500">
      <CardHeader className="bg-red-50">
        <CardTitle>Emergency Login (No Email Required)</CardTitle>
        <CardDescription>Use these buttons to bypass all authentication checks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => handleDirectLogin("lecturer")}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            Login as Lecturer
          </Button>
          <Button
            onClick={() => handleDirectLogin("student")}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Login as Student
          </Button>
        </div>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      </CardContent>
    </Card>
  )
}

