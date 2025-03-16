import { createServerClient } from "@/lib/supabase"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { role } = await request.json()
  const supabase = createServerClient()

  try {
    // Create a fixed user ID based on role for consistency
    const userId = role === "lecturer" ? "test-lecturer-id-123" : "test-student-id-456"
    const email = role === "lecturer" ? "lecturer@test.com" : "student@test.com"
    const firstName = role === "lecturer" ? "Test" : "Test"
    const lastName = role === "lecturer" ? "Lecturer" : "Student"

    // Check if user exists in our custom table
    const { data: existingUser } = await supabase.from("users").select("*").eq("id", userId).single()

    // If not, create the user
    if (!existingUser) {
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        email,
        password: "bypass_auth",
        first_name: firstName,
        last_name: lastName,
        role,
      })

      if (userError) {
        console.error("Error creating user:", userError)
        return NextResponse.json({ success: false, error: userError.message }, { status: 500 })
      }
    }

    // Create a session token directly
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      userId: userId,
      properties: {
        email: email,
      },
    })

    if (sessionError) {
      return NextResponse.json({ success: false, error: sessionError.message }, { status: 500 })
    }

    // Set the session cookie
    const cookieStore = cookies()
    cookieStore.set("sb-access-token", sessionData.session.access_token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    cookieStore.set("sb-refresh-token", sessionData.session.refresh_token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
      },
    })
  } catch (error: any) {
    console.error("Direct login error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

