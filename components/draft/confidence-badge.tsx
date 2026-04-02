'use client'

import { useEffect, useState } from 'react'

export interface ConfidenceBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function getScoreConfig(score: number) {
  if (score >= 90) {
    return {
      className: 'bg-green-100 text-green-800',
      label: 'High confidence',
      pulse: false,
    }
  }
  if (score >= 70) {
    return {
      className: 'bg-blue-100 text-blue-800',
      label: 'Good confidence',
      pulse: false,
    }
  }
  if (score >= 50) {
    return {
      className: 'bg-amber-100 text-amber-800',
      label: 'Moderate confidence',
      pulse: false,
    }
  }
  return {
    className: 'bg-rose-100 text-rose-800',
    label: 'Low confidence — review recommended',
    pulse: true,
  }
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

export function ConfidenceBadge({ score, size = 'md', showLabel = true }: ConfidenceBadgeProps) {
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    if (score === 0) {
      setDisplayScore(0)
      return
    }

    const duration = 600
    const steps = 30
    const interval = duration / steps
    const increment = score / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setDisplayScore(score)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.floor(current))
      }
    }, interval)

    return () => clearInterval(timer)
  }, [score])

  const { className, label, pulse } = getScoreConfig(score)

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
        className,
        SIZE_CLASSES[size],
        pulse ? 'animate-pulse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-label={`Confidence score: ${score}%. ${label}`}
    >
      <span aria-hidden="true" data-testid="confidence-score">
        {displayScore}%
      </span>
      {showLabel && (
        <span data-testid="confidence-label">— {label}</span>
      )}
    </span>
  )
}
