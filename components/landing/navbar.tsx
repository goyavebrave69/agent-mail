"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { BrevWordmark } from "@/components/brand/logo"

export function LandingNavbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
        <BrevWordmark href="/" />

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Fonctionnalités", href: "#features" },
            { label: "Comment ça marche", href: "#how-it-works" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[15px] text-slate-400 hover:text-white transition-colors duration-200"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/inbox"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
            >
              Accéder à l&apos;app
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[15px] text-slate-400 hover:text-white transition-colors duration-200 px-3 py-2"
              >
                Connexion
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                Demander une démo
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
