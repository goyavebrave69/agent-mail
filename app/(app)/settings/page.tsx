import { DeleteAccountButton } from "@/components/shared/delete-account-button"

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">Account Settings</h1>

      <section className="rounded-lg border border-destructive/30 p-6">
        <h2 className="mb-1 text-lg font-semibold text-destructive">
          Danger Zone
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <DeleteAccountButton />
      </section>
    </main>
  )
}
