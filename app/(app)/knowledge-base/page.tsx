import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { KbUploadZone } from "@/components/kb/kb-upload-zone"
import { KbFileList } from "@/components/kb/kb-file-list"
import { UserProfileForm } from "@/components/kb/user-profile-form"
import { InvoiceSettingsSection } from "@/components/knowledge-base/invoice-settings-section"
import type { InvoiceSettings } from "@/lib/quotes/types"

export interface KbFile {
  id: string
  filename: string
  file_size: number
  mime_type: string
  status: "pending" | "ready" | "error"
  error_message: string | null
  created_at: string
}

async function KbContent() {
  const supabase = await createClient()
  const [{ data: files }, { data: profile }, { data: invoiceSettings }] = await Promise.all([
    supabase
      .from("kb_files")
      .select("id, filename, file_size, mime_type, status, error_message, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_profile")
      .select("description")
      .maybeSingle(),
    supabase
      .from("invoice_settings")
      .select("*")
      .maybeSingle(),
  ])

  return (
    <>
      <UserProfileForm initialDescription={profile?.description ?? ""} />
      <KbUploadZone />
      <KbFileList files={(files as KbFile[]) ?? []} />
      <InvoiceSettingsSection initialSettings={(invoiceSettings as InvoiceSettings | null) ?? null} />
    </>
  )
}

export default function KnowledgeBasePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Knowledge Base</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Configure your business profile and upload reference files. The AI uses this context to
        generate accurate, personalised draft replies.
      </p>

      <Suspense
        fallback={
          <div className="h-64 rounded-lg border p-6 animate-pulse bg-muted" />
        }
      >
        <KbContent />
      </Suspense>
    </main>
  )
}
