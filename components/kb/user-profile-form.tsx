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
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-1 text-lg font-semibold">Business Profile</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Describe your activity so the AI can generate relevant, personalised replies. Include your
        sector, client types, and communication style.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="user-profile-description" className="sr-only">
            Business description
          </Label>
          <textarea
            id="user-profile-description"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setStatus("idle") }}
            placeholder="E.g. I am a B2B e-commerce consultant working with SME retailers. I sell SaaS solutions and communicate in a professional but approachable tone."
            maxLength={MAX_LENGTH}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground text-right">{description.length}/{MAX_LENGTH}</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save profile"}
          </Button>
          {status === "saved" && (
            <span className="text-sm text-muted-foreground">Saved</span>
          )}
        </div>
      </form>
    </section>
  )
}
