import Link from "next/link"

const NAV_LINKS = [
  { href: "/knowledge-base", label: "Knowledge Base" },
  { href: "/settings", label: "Settings" },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  )
}
