import { ConnectGmailButton } from "@/components/shared/connect-gmail-button"
import { ConnectOutlookButton } from "@/components/shared/connect-outlook-button"
import { ImapConnectForm } from "@/components/shared/imap-connect-form"

export default function ConnectMailboxPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold">Connect your mailbox</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Connect your email account so MailAgent can read and reply to your emails on your behalf.
        </p>

        <div className="flex flex-col gap-3">
          <ConnectGmailButton />
          <ConnectOutlookButton />

          <ImapConnectForm />
        </div>
      </div>
    </div>
  )
}
