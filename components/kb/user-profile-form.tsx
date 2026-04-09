"use client"

import { useState } from "react"
import { saveUserProfileAction } from "@/app/(app)/knowledge-base/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const MAX_LENGTH = 2000

interface UserProfileFormProps {
  initialDescription: string
}

export function UserProfileForm({ initialDescription }: UserProfileFormProps) {
  const [description, setDescription] = useState(initialDescription)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("saving")
    setError(null)
    const result = await saveUserProfileAction(description)
    if ("error" in result) {
      setError(result.error)
      setStatus("error")
    } else {
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="user-profile-description" className="sr-only">
          Description métier
        </Label>
        <textarea
          id="user-profile-description"
          value={description}
          onChange={(e) => { setDescription(e.target.value); setStatus("idle") }}
          placeholder="Ex. : Consultant e-commerce B2B, je travaille avec des PME retail. Je vends des solutions SaaS avec un ton professionnel mais accessible."
          maxLength={MAX_LENGTH}
          rows={5}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
        <p className="text-right text-xs text-muted-foreground">{description.length}/{MAX_LENGTH}</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={status === "saving"}>
          {status === "saving" ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
        {status === "saved" && (
          <span className="text-sm text-muted-foreground">Sauvegardé ✓</span>
        )}
      </div>
    </form>
  )
}
