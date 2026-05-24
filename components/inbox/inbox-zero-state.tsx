import { CheckCircle2 } from "lucide-react"

interface InboxZeroStateProps {
  processedCount?: number
}

export function InboxZeroState({ processedCount }: InboxZeroStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Tout est traité</p>
        {processedCount !== undefined && processedCount > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Vous avez traité {processedCount} email{processedCount > 1 ? "s" : ""} aujourd&apos;hui
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Votre boîte de réception est à jour
          </p>
        )}
      </div>
    </div>
  )
}
