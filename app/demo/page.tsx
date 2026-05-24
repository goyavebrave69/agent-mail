"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { BrevWordmark } from "@/components/brand/logo"

export default function DemoPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle")
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("submitting")
    // Simulate async submit
    await new Promise((r) => setTimeout(r, 800))
    setStatus("success")
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#030712" }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(99,102,241,0.1) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Back link */}
        <div className="w-full max-w-md mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l&apos;accueil
          </Link>
        </div>

        {status === "success" ? (
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Demande reçue !</h2>
            <p className="text-slate-400 text-[14px] mb-8 leading-relaxed">
              Merci <strong className="text-white">{form.name}</strong>. Notre équipe vous contactera sous 24h à l&apos;adresse{" "}
              <strong className="text-white">{form.email}</strong> pour organiser votre démo personnalisée.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 text-[13px] font-medium text-white rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-4">
                <BrevWordmark size="sm" href="/" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Demander une démo</h1>
              <p className="text-slate-400 text-[14px]">
                Réservez un créneau avec notre équipe. Démo personnalisée, questions bienvenues.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                    Prénom & Nom <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Marie Dupont"
                    className="w-full px-3.5 py-2.5 text-[13px] text-white placeholder-slate-600 rounded-lg border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                    Entreprise <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Acme Corp"
                    className="w-full px-3.5 py-2.5 text-[13px] text-white placeholder-slate-600 rounded-lg border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                  Email professionnel <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="marie@acmecorp.fr"
                  className="w-full px-3.5 py-2.5 text-[13px] text-white placeholder-slate-600 rounded-lg border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 00 00 00 00"
                  className="w-full px-3.5 py-2.5 text-[13px] text-white placeholder-slate-600 rounded-lg border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                  Message (optionnel)
                </label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Décrivez votre besoin, le volume d'emails traités par semaine..."
                  className="w-full px-3.5 py-2.5 text-[13px] text-white placeholder-slate-600 rounded-lg border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 text-[14px] font-semibold text-white rounded-xl transition-all duration-300 disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                  boxShadow: "0 0 0 1px rgba(99,102,241,0.3), 0 8px 24px rgba(99,102,241,0.2)",
                }}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  "Envoyer ma demande"
                )}
              </button>

              <p className="text-[11px] text-slate-600 text-center">
                Sans engagement · Réponse sous 24h
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
