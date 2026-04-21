import Link from "next/link"
import { BrevWordmark } from "@/components/brand/logo"

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04]" style={{ background: "#030712" }}>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Logo + description */}
          <div>
            <div className="mb-3">
              <BrevWordmark size="sm" href="/" />
            </div>
            <p className="text-[12px] text-slate-600 max-w-xs">
              L&apos;essentiel de vos emails, rien de plus.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { label: "Fonctionnalités", href: "#features" },
              { label: "Comment ça marche", href: "#how-it-works" },
              { label: "Connexion", href: "/login" },
              { label: "Créer un compte", href: "/signup" },
              { label: "Demander une démo", href: "/demo" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-700">© 2026 Brèv. Tous droits réservés.</p>
          <div className="flex gap-6">
            <span className="text-[11px] text-slate-700">Données hébergées en Europe</span>
            <span className="text-[11px] text-slate-700">RGPD</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
