import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DraftSection } from '@/components/draft/draft-section'
import { fetchEmail, fetchDraftForEmail } from './actions'

interface Props {
  params: Promise<{ emailId: string }>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EmailDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

async function EmailDetailContent({ emailId }: { emailId: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const [email, draft] = await Promise.all([
    fetchEmail(emailId),
    fetchDraftForEmail(emailId),
  ])

  if (!email) notFound()

  return (
    <>
      <div className="mb-6 space-y-2">
        <h1 className="text-xl font-bold">{email.subject ?? '(no subject)'}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" aria-hidden="true" />
          <span>{email.from_name ?? email.from_email ?? 'Unknown sender'}</span>
          <span>·</span>
          <time dateTime={email.received_at}>{formatDate(email.received_at)}</time>
        </div>
      </div>

      {email.body_text ? (
        <div className="mb-8 rounded-lg border p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </h2>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{email.body_text}</pre>
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Body not yet available — will appear after the next sync.
        </div>
      )}

      <DraftSection draft={draft} emailId={emailId} userId={user.id} />
    </>
  )
}

export default async function EmailDetailPage({ params }: Props) {
  const { emailId } = await params

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/inbox"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </Link>

      <Suspense fallback={<EmailDetailSkeleton />}>
        <EmailDetailContent emailId={emailId} />
      </Suspense>
    </main>
  )
}
