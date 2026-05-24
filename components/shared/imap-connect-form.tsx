"use client"

import { useState, useTransition } from "react"
import { connectImapAction } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ImapConnectForm() {
  const [isPending, startTransition] = useTransition()
  const [host, setHost] = useState("")
  const [port, setPort] = useState(993)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<{ success?: true; error?: string } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await connectImapAction({ host, port, username, password })
      if ("success" in res) {
        setResult({ success: true })
      } else {
        setResult({ error: res.error })
      }
    })
  }

  const errorMessage =
    result?.error === "IMAP_AUTH_FAILED"
      ? "Identifiant ou mot de passe incorrect"
      : result?.error === "IMAP_UNREACHABLE"
        ? "Serveur inaccessible — vérifiez l'hôte et le port"
        : result?.error === "IMAP_STORAGE_FAILED"
          ? "Impossible d'enregistrer la connexion. Veuillez réessayer."
        : result?.error === "IMAP_INVALID_INPUT"
          ? "Veuillez remplir tous les champs"
          : result?.error
            ? result.error
            : null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="imap-host">Serveur IMAP</Label>
        <Input
          id="imap-host"
          type="text"
          placeholder="imap.example.com"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          disabled={isPending}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="imap-port">Port IMAP</Label>
        <Input
          id="imap-port"
          type="number"
          value={port}
          onChange={(e) => setPort(Number(e.target.value))}
          disabled={isPending}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="imap-username">Nom d&apos;utilisateur / Email</Label>
        <Input
          id="imap-username"
          type="text"
          placeholder="vous@example.com"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isPending}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="imap-password">Mot de passe</Label>
        <Input
          id="imap-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      {result?.success && (
        <p className="text-sm text-primary">Compte IMAP connecté avec succès.</p>
      )}
      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      <Button type="submit" disabled={isPending} variant="outline">
        {isPending ? "Connexion en cours..." : "Connecter IMAP"}
      </Button>
    </form>
  )
}
