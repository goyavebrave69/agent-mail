import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function FinalCta() {
  return (
    <section className="py-28 border-t border-white/[0.04]" style={{ background: "#030712" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* Main CTA card */}
        <div
          className="relative rounded-3xl overflow-hidden px-8 py-20 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(99,102,241,0.12) 100%)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          {/* Background glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 60%)" }}
          />

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-5 tracking-tight leading-[1.08]">
              Prêt à transformer
              <br />
              votre gestion des emails ?
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
              Rejoignez les équipes qui ont récupéré des heures de productivité chaque semaine.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/demo"
                className="group inline-flex items-center gap-2 px-8 py-4 text-[15px] font-semibold text-white rounded-xl transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                  boxShadow: "0 0 0 1px rgba(99,102,241,0.4), 0 12px 40px rgba(99,102,241,0.3)",
                }}
              >
                Demander une démo gratuite
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 text-[15px] font-medium text-slate-300 hover:text-white rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200"
              >
                Créer un compte
              </Link>
            </div>

            <p className="mt-6 text-[12px] text-slate-600">
              Sans engagement · Données hébergées en Europe · Support inclus
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
