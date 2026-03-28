"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signUpAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const email = formData.get("email") as string | null
  const password = formData.get("password") as string | null

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding/connect-mailbox`,
    },
  })

  if (error) {
    if (
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered")
    ) {
      return {
        error:
          "If this email is not registered, you will receive a confirmation email.",
      }
    }
    return { error: error.message }
  }

  redirect("/verify-email")
}
