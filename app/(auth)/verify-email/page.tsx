import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>Verification link sent</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a confirmation link to your email address. Click the
            link in the email to activate your account and continue to
            MailAgent.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Didn&apos;t receive an email? Check your spam folder. The link
            expires after 24 hours.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
