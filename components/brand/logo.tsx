import Link from "next/link"

// Le chevron ^ extrait de l'accent du è — symbole Brèv
export function BrevMark({
  size = 32,
  className = "",
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fond carré arrondi indigo → violet */}
      <rect width="32" height="32" rx="8" fill="url(#brev-grad)" />
      {/* Chevron ^ — trait épais, angles nets */}
      <path
        d="M8.5 21L16 11.5L23.5 21"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="brev-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Chevron seul sans fond (pour fond coloré ou favicon monochrome)
export function BrevChevron({
  size = 16,
  color = "white",
  strokeWidth = 2.5,
  className = "",
}: {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 11L8 5L13 11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Wordmark complet : icône + "br" + è coloré + "v"
export function BrevWordmark({
  size = "md",
  href,
}: {
  size?: "sm" | "md" | "lg"
  href?: string
}) {
  const iconSize = size === "sm" ? 28 : size === "lg" ? 44 : 38
  const textClass =
    size === "sm"
      ? "text-[15px]"
      : size === "lg"
      ? "text-[24px]"
      : "text-[19px]"

  const content = (
    <span className={`flex items-center gap-2 group`}>
      <BrevMark size={iconSize} />
      <span className={`font-semibold tracking-tight text-white ${textClass}`}>
        br<span style={{ color: "#818cf8" }}>è</span>v
      </span>
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    )
  }

  return content
}
