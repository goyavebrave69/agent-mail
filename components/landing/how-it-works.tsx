const steps = [
  {
    number: "01",
    title: "Connectez votre boîte mail",
    description:
      "Authentification OAuth en un clic pour Gmail et Outlook. Configuration IMAP pour les autres providers. Vos emails arrivent en temps réel.",
    detail: "Gmail · Outlook · IMAP",
    color: "#6366f1",
  },
  {
    number: "02",
    title: "L'IA analyse et classe",
    description:
      "Chaque email est analysé : intention, urgence, catégorie, entité émettrice. Votre équipe ne voit que ce qui compte.",
    detail: "Triage · Priorité · Catégories",
    color: "#a78bfa",
  },
  {
    number: "03",
    title: "Agissez en quelques secondes",
    description:
      "Répondez avec un brouillon IA, générez un devis, archivez ou déléguez. Ce qui prenait des minutes ne prend plus que des secondes.",
    detail: "Devis · Réponses · Workflows",
    color: "#34d399",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 border-t border-white/[0.04]" style={{ background: "#030712" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[12px] text-slate-500 mb-5">
            Comment ça marche
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Opérationnel en{" "}
            <span className="text-slate-400">moins de 5 minutes</span>
          </h2>
          <p className="text-slate-400 max-w-md mx-auto text-[15px]">
            Pas d&apos;intégration complexe, pas de formation. Votre équipe est productive dès le premier jour.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px hidden lg:block"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(167,139,250,0.3), rgba(52,211,153,0.3), transparent)" }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center lg:items-center">
                {/* Number circle */}
                <div
                  className="relative w-12 h-12 rounded-full flex items-center justify-center mb-6 font-bold text-[13px] z-10"
                  style={{
                    background: `rgba(${step.color === "#6366f1" ? "99,102,241" : step.color === "#a78bfa" ? "167,139,250" : "52,211,153"}, 0.12)`,
                    border: `1px solid ${step.color}30`,
                    color: step.color,
                    boxShadow: `0 0 24px ${step.color}20`,
                  }}
                >
                  {step.number}
                </div>

                <h3 className="text-[17px] font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed max-w-xs mb-4">{step.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {step.detail.split(" · ").map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2.5 py-1 rounded-full border"
                      style={{
                        borderColor: `${step.color}20`,
                        background: `${step.color}08`,
                        color: step.color,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics strip */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/[0.05]">
          {[
            { value: "10×", label: "plus rapide sur les devis" },
            { value: "4h", label: "économisées par semaine" },
            { value: "95%", label: "de précision du triage" },
            { value: "< 5min", label: "de mise en place" },
          ].map((metric, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-8 px-4"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span className="text-3xl md:text-4xl font-bold text-white mb-1">{metric.value}</span>
              <span className="text-[12px] text-slate-500 text-center">{metric.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
