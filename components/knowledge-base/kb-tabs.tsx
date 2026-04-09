'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, FileText } from 'lucide-react'
import { UserProfileForm } from '@/components/kb/user-profile-form'
import { KbUploadZone } from '@/components/kb/kb-upload-zone'
import { KbFileList } from '@/components/kb/kb-file-list'
import { InvoiceSettingsSection } from '@/components/knowledge-base/invoice-settings-section'
import type { KbFile } from '@/app/(app)/knowledge-base/page'
import type { InvoiceSettings } from '@/lib/quotes/types'

interface KbTabsProps {
  files: KbFile[]
  profileDescription: string
  invoiceSettings: InvoiceSettings | null
}

export function KbTabs({ files, profileDescription, invoiceSettings }: KbTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') === 'devis' ? 'devis' : 'ai'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="mb-8 h-10 w-full justify-start rounded-lg border bg-transparent p-0">
        <TabsTrigger
          value="ai"
          className="flex h-10 items-center gap-2 rounded-none border-b-2 border-transparent px-5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <Brain className="h-4 w-4" />
          Contexte IA
        </TabsTrigger>
        <TabsTrigger
          value="devis"
          className="flex h-10 items-center gap-2 rounded-none border-b-2 border-transparent px-5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <FileText className="h-4 w-4" />
          Devis &amp; Facturation
        </TabsTrigger>
      </TabsList>

      {/* ── Tab 1 : Contexte IA ─────────────────────────────────────────── */}
      <TabsContent value="ai" className="mt-0 space-y-6">
        {/* Business profile */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold">Profil métier</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Décrivez votre activité : secteur, types de clients, ton de communication. L&apos;IA
              utilise ce contexte pour personnaliser chaque brouillon.
            </p>
          </div>
          <UserProfileForm initialDescription={profileDescription} />
        </section>

        {/* Documents */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold">Documents de référence</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Importez des fichiers CSV ou Excel — tarifs, fiches produits, FAQ. L&apos;IA les
              consulte lors de la rédaction pour répondre avec précision.
            </p>
          </div>
          <KbUploadZone />
          <KbFileList files={files} />
        </section>
      </TabsContent>

      {/* ── Tab 2 : Devis & Facturation ──────────────────────────────────── */}
      <TabsContent value="devis" className="mt-0">
        <section className="rounded-xl border bg-card shadow-sm">
          <InvoiceSettingsSection initialSettings={invoiceSettings} />
        </section>
      </TabsContent>
    </Tabs>
  )
}
