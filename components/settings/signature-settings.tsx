"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { saveSignature } from "@/app/(app)/settings/actions"

interface SignatureSettingsProps {
  initialSignature: string
}

export function SignatureSettings({ initialSignature }: SignatureSettingsProps) {
  const [value, setValue] = useState(initialSignature)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await saveSignature(value)
    setSaving(false)
    if ('error' in result) {
      toast.error("Erreur lors de la sauvegarde de la signature.")
    } else {
      toast.success("Signature enregistrée.")
    }
  }

  return (
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-1 text-lg font-semibold">Signature email</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Ajoutée automatiquement en bas de vos nouveaux emails et réponses.
      </p>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cordialement,&#10;Votre nom"
        rows={4}
        className="mb-3 font-mono text-sm"
      />
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </section>
  )
}
