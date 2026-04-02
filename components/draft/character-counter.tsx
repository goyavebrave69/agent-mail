'use client'

interface CharacterCounterProps {
  count: number
  max?: number
  warningAt?: number
}

export function CharacterCounter({
  count,
  max = 10000,
  warningAt = Math.floor(max * 0.8),
}: CharacterCounterProps) {
  const toneClass = count >= max
    ? 'text-destructive'
    : count >= warningAt
      ? 'text-amber-600'
      : 'text-muted-foreground'

  return (
    <span className={`text-xs ${toneClass}`}>
      {count} characters
    </span>
  )
}
