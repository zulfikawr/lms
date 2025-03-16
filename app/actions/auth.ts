"use server"

import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function registerUser(formData: FormData) {
  const supabase = createServerClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const role = formData.get("role") as "lecturer" | "student"

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user" }
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
      return { success: false, error: userError.message }
    }

    revalidatePath("/login")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

