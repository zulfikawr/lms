import { createServerClient } from "@/lib/supabase"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const supabase = createServerClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const role = formData.get("role") as "lecturer" | "student"

  try {
    // Create auth user with auto-confirmation for testing
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This bypasses email confirmation for testing
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 400 })
    }

    // Insert into our custom users table
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      password: "hashed_in_supabase", // We don't store the actual password
      first_name: firstName,
      last_name: lastName,
      role,
    })

    if (userError) {
      return NextResponse.json({ success: false, error: userError.message }, { status: 400 })
    }

    // For testing purposes, let's also auto-confirm the user
    if (authData.user && !authData.user.email_confirmed_at) {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(authData.user.id, {
        email_confirmed_at: new Date().toISOString(),
      })

      if (confirmError) {
        console.error("Error confirming user:", confirmError)
        // Continue anyway, as this is just for testing
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

