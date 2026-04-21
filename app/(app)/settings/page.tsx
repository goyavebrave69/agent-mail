import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { DeleteAccountButton } from "@/components/shared/delete-account-button"
import { ConnectGmailButton } from "@/components/shared/connect-gmail-button"
import { ConnectOutlookButton } from "@/components/shared/connect-outlook-button"
import { ImapConnectForm } from "@/components/shared/imap-connect-form"
import { DisconnectMailboxButton } from "@/components/shared/disconnect-mailbox-button"
import { SyncStatusIndicator } from "@/components/shared/sync-status-indicator"
import { SignatureSettings } from "@/components/settings/signature-settings"
import { getSignature } from "@/app/(app)/settings/actions"

interface SettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>
}

async function ConnectedAccounts() {
  const supabase = await createClient()
  const { data: connections } = await supabase
    .from("email_connections")
    .select("id, provider, email")

  const gmailConnection = connections?.find((c) => c.provider === "gmail")
  const outlookConnection = connections?.find((c) => c.provider === "outlook")
  const imapConnection = connections?.find((c) => c.provider === "imap")

  return (
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Comptes connectés</h2>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Gmail</p>
            {gmailConnection ? (
              <p className="text-sm text-muted-foreground">{gmailConnection.email}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Non connecté</p>
            )}
          </div>
          {gmailConnection ? (
            <DisconnectMailboxButton provider="gmail" />
          ) : (
            <ConnectGmailButton />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Outlook</p>
            {outlookConnection ? (
              <p className="text-sm text-muted-foreground">{outlookConnection.email}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Non connecté</p>
            )}
          </div>
          {outlookConnection ? (
            <DisconnectMailboxButton provider="outlook" />
          ) : (
            <ConnectOutlookButton />
          )}
        </div>

        <div>
          <p className="font-medium">IMAP / SMTP</p>

          {imapConnection ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{imapConnection.email}</p>
              <DisconnectMailboxButton provider="imap" />
            </div>
          ) : (
            <div className="mt-3">
              <ImapConnectForm />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

async function SignatureSettingsLoader() {
  const signature = await getSignature()
  return <SignatureSettings initialSignature={signature} />
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedParams = await searchParams
  const successMessage =
    resolvedParams.connected === "gmail"
      ? "Compte Gmail connecté avec succès."
      : resolvedParams.connected === "outlook"
        ? "Compte Outlook connecté avec succès."
        : null

  const errorMessage =
    resolvedParams.error === "gmail_denied"
      ? "Connexion Gmail refusée."
      : resolvedParams.error === "gmail_failed"
        ? "Échec de la connexion Gmail. Veuillez réessayer."
        : resolvedParams.error === "outlook_denied"
          ? "Connexion Outlook refusée."
          : resolvedParams.error === "outlook_failed"
            ? "Échec de la connexion Outlook. Veuillez réessayer."
            : resolvedParams.error === "unknown_provider"
              ? "Échec de la connexion : fournisseur inconnu. Veuillez réessayer depuis les paramètres."
            : null

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">Paramètres du compte</h1>

      {successMessage && (
        <p className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </p>
      )}
      {errorMessage && (
        <p className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <Suspense
        fallback={
          <div className="mb-8 h-40 rounded-lg border p-6 animate-pulse bg-muted" />
        }
      >
        <ConnectedAccounts />
      </Suspense>

      <Suspense
        fallback={
          <div className="mb-8 h-24 rounded-lg border p-6 animate-pulse bg-muted" />
        }
      >
        <SyncStatusIndicator />
      </Suspense>

      <Suspense
        fallback={
          <div className="mb-8 h-32 rounded-lg border p-6 animate-pulse bg-muted" />
        }
      >
        <SignatureSettingsLoader />
      </Suspense>

      <section className="rounded-lg border border-destructive/30 p-6">
        <h2 className="mb-1 text-lg font-semibold text-destructive">Zone dangereuse</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Supprimer définitivement votre compte et toutes les données associées. Cette action est irréversible.
        </p>
        <DeleteAccountButton />
      </section>
    </main>
  )
}
