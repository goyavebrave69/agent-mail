import { ConnectGmailButton } from "@/components/shared/connect-gmail-button"
import { ConnectOutlookButton } from "@/components/shared/connect-outlook-button"
import { ImapConnectForm } from "@/components/shared/imap-connect-form"

export default function ConnectMailboxPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold">Connectez votre boîte mail</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Connectez votre compte email pour que Brèv puisse lire et répondre à vos emails en votre nom.
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
