import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { BrevMark } from "@/components/brand/logo"

function MockEmailInterface() {
  return (
    <div className="relative mt-16 mx-auto max-w-5xl px-4">
      {/* Glow behind the mockup */}
      <div className="absolute -inset-10 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -inset-10 bg-violet-500/5 blur-3xl rounded-full pointer-events-none" />

      {/* Mockup window */}
      <div
        className="relative rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_64px_rgba(0,0,0,0.6)]"
        style={{ background: "rgba(10,12,25,0.9)", backdropFilter: "blur(24px)" }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 flex justify-center items-center gap-2">
            <BrevMark size={18} />
            <div className="px-4 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 text-xs w-48 text-center">
              app.getbrev.io/inbox
            </div>
          </div>
        </div>

        {/* App layout */}
        <div className="flex h-[380px]">
          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-white/[0.06] p-3 space-y-0.5" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="px-2 py-1.5 mb-2">
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Boîte de réception</span>
            </div>
            {[
              { label: "Prioritaires", count: 5, active: true, color: "text-indigo-400", dot: "bg-indigo-400" },
              { label: "Devis", count: 3, active: false, color: "text-slate-400", dot: "bg-amber-400" },
              { label: "Clients", count: 8, active: false, color: "text-slate-400", dot: "bg-emerald-400" },
              { label: "Partenaires", count: 2, active: false, color: "text-slate-400", dot: "bg-blue-400" },
              { label: "À traiter", count: 0, active: false, color: "text-slate-600", dot: "bg-slate-600" },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] ${
                  item.active ? "bg-indigo-500/15 text-indigo-300" : item.color
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                <span className="flex-1">{item.label}</span>
                {item.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.active ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-slate-500"}`}>
                    {item.count}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Email list */}
          <div className="w-72 shrink-0 border-r border-white/[0.06] divide-y divide-white/[0.04]">
            {[
              {
                from: "Acme Corp",
                initials: "AC",
                subject: "Demande de devis - Prestation Q4",
                preview: "Suite à notre appel, nous souhaiterions...",
                badge: "Urgent",
                badgeStyle: "bg-red-500/15 text-red-400",
                ai: true,
                active: true,
              },
              {
                from: "TechStart SAS",
                initials: "TS",
                subject: "Renouvellement contrat maintenance",
                preview: "Bonjour, notre contrat arrive à échéance...",
                badge: "Devis",
                badgeStyle: "bg-amber-500/15 text-amber-400",
                ai: true,
                active: false,
              },
              {
                from: "Marie Lambert",
                initials: "ML",
                subject: "Re: Livraison projet Phase 2",
                preview: "Merci pour le retour, tout est conforme...",
                badge: "Client",
                badgeStyle: "bg-emerald-500/15 text-emerald-400",
                ai: false,
                active: false,
              },
            ].map((email, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-3 py-3 cursor-pointer ${
                  email.active ? "bg-indigo-500/8" : "hover:bg-white/[0.02]"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400/80 to-violet-500/80 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {email.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[12px] text-white font-medium truncate">{email.from}</span>
                    {email.ai && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 shrink-0 font-medium">✦ IA</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mb-1">{email.subject}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${email.badgeStyle}`}>{email.badge}</span>
                    <span className="text-[10px] text-slate-600 truncate">{email.preview}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Draft panel */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Draft header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-violet-400 font-medium">
                  <span className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-[9px]">✦</span>
                  Brouillon IA · Devis
                </div>
              </div>
              <div className="flex gap-2">
                <div className="text-[10px] px-2.5 py-1 rounded-md border border-white/[0.08] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">Régénérer</div>
                <div className="text-[10px] px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 cursor-pointer">Envoyer</div>
              </div>
            </div>

            {/* Draft content */}
            <div className="flex-1 p-4 overflow-hidden">
              <div className="text-[12px] text-slate-300 leading-relaxed space-y-2">
                <p className="text-slate-400">À : <span className="text-slate-300">contact@acmecorp.fr</span></p>
                <p className="text-slate-400">Objet : <span className="text-slate-300">Devis #2024-089 – Prestation Q4</span></p>
                <div className="border-t border-white/[0.05] pt-2 mt-2 space-y-1.5">
                  <p>Bonjour,</p>
                  <p className="text-slate-400">Suite à votre demande, veuillez trouver ci-joint notre devis pour la prestation Q4 2024. Conformément à nos échanges, nous proposons :</p>
                  <div className="mt-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Développement API</span>
                      <span className="text-slate-300">3 200 €</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Intégration & tests</span>
                      <span className="text-slate-300">800 €</span>
                    </div>
                    <div className="flex justify-between text-[10px] border-t border-white/[0.05] pt-1">
                      <span className="text-white font-medium">Total HT</span>
                      <span className="text-indigo-400 font-medium">4 000 €</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence indicator */}
            <div className="px-4 py-2 border-t border-white/[0.04] flex items-center gap-2">
              <div className="text-[9px] text-slate-600">Confiance IA</div>
              <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
                <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
              </div>
              <div className="text-[9px] text-emerald-400 font-medium">87%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-10 overflow-hidden" style={{ background: "#030712" }}>
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center top, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
      />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none opacity-50"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)" }}
      />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #030712)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 flex flex-col items-center text-center">
        {/* Announcement badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-sm text-slate-300 mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[13px]">Propulsé par Majid DEV — Intelligence native</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.08] tracking-tight max-w-4xl animate-fade-up" style={{ animationDelay: "0.05s", opacity: 0 }}>
          La boîte mail qui{" "}
          <span
            className="inline-block bg-clip-text text-transparent animate-gradient-x"
            style={{
              backgroundImage: "linear-gradient(90deg, #818cf8, #a78bfa, #c4b5fd, #818cf8)",
              backgroundSize: "200% auto",
            }}
          >
            travaille à votre place
          </span>
        </h1>

        {/* Sub */}
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: "0.12s", opacity: 0 }}>
          Brèv analyse chaque email, priorise vos demandes clients et génère des devis en un clic.
          Vos équipes se concentrent sur ce qui crée de la valeur.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <Link
            href="/demo"
            className="group inline-flex items-center gap-2 px-7 py-3.5 text-[14px] font-semibold text-white rounded-xl transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              boxShadow: "0 0 0 1px rgba(99,102,241,0.3), 0 8px 32px rgba(99,102,241,0.2)",
            }}
          >
            Demander une démo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-[14px] font-medium text-slate-300 hover:text-white rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200"
          >
            Accéder à l&apos;app
          </Link>
        </div>

        {/* Trust signal */}
        <p className="mt-6 text-[12px] text-slate-600 animate-fade-in" style={{ animationDelay: "0.35s", opacity: 0 }}>
          Compatible Gmail, Outlook & IMAP · Données hébergées en Europe
        </p>
      </div>

      {/* Product mockup */}
      <div className="relative z-10 w-full animate-fade-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
        <MockEmailInterface />
      </div>
    </section>
  )
}
