import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { KbTabs } from "@/components/knowledge-base/kb-tabs"
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

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

async function KbContent() {
  const supabase = await createClient()
  const [{ data: files }, { data: profile }, { data: invoiceSettings }] = await Promise.all([
    supabase
      .from("kb_files")
      .select("id, filename, file_size, mime_type, status, error_message, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_profile").select("description").maybeSingle(),
    supabase.from("invoice_settings").select("*").maybeSingle(),
  ])

  return (
    <KbTabs
      files={(files as KbFile[]) ?? []}
      profileDescription={profile?.description ?? ""}
      invoiceSettings={(invoiceSettings as InvoiceSettings | null) ?? null}
    />
  )
}

export default function KnowledgeBasePage() {
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Base de connaissances</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Configurez le contexte de l&apos;IA et vos paramètres de facturation.
          </p>
        </div>

        <Suspense fallback={<PageSkeleton />}>
          <KbContent />
        </Suspense>
      </div>
    </main>
  )
}
