import { createClient } from "@/lib/supabase/server"

interface SyncJob {
  provider: string
  status: string
  last_synced_at: string | null
  last_error: string | null
  retry_count: number
}

function formatLastSynced(ts: string | null): string {
  if (!ts) return "Never"
  const d = new Date(ts)
  return d.toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

export async function SyncStatusIndicator() {
  const supabase = await createClient()
  const { data: jobs, error } = await supabase
    .from("email_sync_jobs")
    .select("provider, status, last_synced_at, last_error, retry_count")

  if (error) {
    return (
      <section className="mb-8 rounded-lg border border-destructive/30 p-6">
        <h2 className="mb-2 text-lg font-semibold">Email Sync Status</h2>
        <p className="text-sm text-destructive">Unable to load sync status right now. Please retry.</p>
      </section>
    )
  }

  if (!jobs || jobs.length === 0) return null

  return (
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Email Sync Status</h2>
      <div className="flex flex-col gap-3">
        {(jobs as SyncJob[]).map((job) => (
          <div key={job.provider} className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium capitalize">{job.provider}</p>
              <p className="text-sm text-muted-foreground">
                Last sync: {formatLastSynced(job.last_synced_at)}
              </p>
              {job.status === "error" && job.last_error && (
                <p className="mt-1 text-sm text-destructive">
                  Sync failed: {job.last_error}
                  {job.retry_count >= 3 && " — manual reconnection may be required"}
                </p>
              )}
            </div>
            <span
              className={
                job.status === "active"
                  ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                  : job.status === "error"
                    ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                    : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              }
            >
              {job.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
