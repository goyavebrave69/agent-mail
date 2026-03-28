"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function logoutAction(): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: "Unable to log out. Please try again." }
  }

  redirect("/login")
}
