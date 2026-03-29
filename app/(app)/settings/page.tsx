import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { DeleteAccountButton } from "@/components/shared/delete-account-button"
import { ConnectGmailButton } from "@/components/shared/connect-gmail-button"
import { ConnectOutlookButton } from "@/components/shared/connect-outlook-button"

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

  return (
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Connected Accounts</h2>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Gmail</p>
            {gmailConnection ? (
              <p className="text-sm text-muted-foreground">{gmailConnection.email}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </div>
          {gmailConnection ? (
            <button
              disabled
              className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground opacity-50"
              title="Disconnect available in Story 2.4"
            >
              Disconnect
            </button>
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
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </div>
          {outlookConnection ? (
            <button
              disabled
              className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground opacity-50"
              title="Disconnect available in Story 2.4"
            >
              Disconnect
            </button>
          ) : (
            <ConnectOutlookButton />
          )}
        </div>
      </div>
    </section>
  )
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedParams = await searchParams
  const successMessage =
    resolvedParams.connected === "gmail"
      ? "Gmail account connected successfully."
      : resolvedParams.connected === "outlook"
        ? "Outlook account connected successfully."
        : null

  const errorMessage =
    resolvedParams.error === "gmail_denied"
      ? "Gmail connection was denied."
      : resolvedParams.error === "gmail_failed"
        ? "Gmail connection failed. Please try again."
        : resolvedParams.error === "outlook_denied"
          ? "Outlook connection was denied."
          : resolvedParams.error === "outlook_failed"
            ? "Outlook connection failed. Please try again."
            : resolvedParams.error === "unknown_provider"
              ? "Mailbox connection failed: unknown provider callback. Please retry from settings."
            : null

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">Account Settings</h1>

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

      <section className="rounded-lg border border-destructive/30 p-6">
        <h2 className="mb-1 text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <DeleteAccountButton />
      </section>
    </main>
  )
}
