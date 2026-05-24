import { Sparkles, Zap, BookOpen, MailCheck, BarChart3, Plug } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Triage intelligent",
    description:
      "L'IA lit, comprend et classe chaque email selon vos règles métier. Priorités, catégories, urgences — tout est automatique dès la réception.",
    accent: "from-indigo-500 to-violet-500",
    glow: "rgba(99,102,241,0.15)",
    size: "large",
  },
  {
    icon: Zap,
    title: "Devis en un clic",
    description:
      "Détection automatique des demandes de devis dans vos emails. Générez un PDF professionnel en quelques secondes depuis votre base tarifaire.",
    accent: "from-amber-500 to-orange-500",
    glow: "rgba(245,158,11,0.12)",
    size: "normal",
  },
  {
    icon: BookOpen,
    title: "Base de connaissances",
    description:
      "Connectez vos documents, tarifs et procédures. L'IA s'en sert pour rédiger des réponses toujours précises et dans le ton de votre entreprise.",
    accent: "from-emerald-500 to-teal-500",
    glow: "rgba(16,185,129,0.12)",
    size: "normal",
  },
  {
    icon: MailCheck,
    title: "Rédaction assistée",
    description:
      "Brouillons sur mesure avec votre style. Relecture, reformulation, traduction — l'IA amplifie votre équipe sans la remplacer.",
    accent: "from-blue-500 to-cyan-500",
    glow: "rgba(59,130,246,0.12)",
    size: "normal",
  },
  {
    icon: Plug,
    title: "Multi-boîtes & intégrations",
    description:
      "Gmail, Outlook, IMAP. Une interface unifiée pour toute votre équipe avec connexion OAuth sécurisée.",
    accent: "from-rose-500 to-pink-500",
    glow: "rgba(244,63,94,0.12)",
    size: "normal",
  },
  {
    icon: BarChart3,
    title: "Analytics & insights",
    description:
      "Temps de réponse, volumes, performance par catégorie. Pilotez votre relation client avec des données concrètes.",
    accent: "from-violet-500 to-purple-500",
    glow: "rgba(139,92,246,0.12)",
    size: "normal",
  },
]

function FeatureCard({ feature }: { feature: typeof features[number] }) {
  const Icon = feature.icon

  return (
    <div
      className="group relative p-6 rounded-2xl border border-white/[0.06] transition-all duration-300 hover:border-white/[0.12] overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(circle at top left, ${feature.glow}, transparent 60%)` }}
      />

      {/* Border beam on hover */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div
          className="absolute -top-2 left-0 w-20 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, transparent, ${feature.glow.replace('0.15', '0.8').replace('0.12', '0.8')}, transparent)` }}
        />
      </div>

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br"
        style={{ background: `linear-gradient(135deg, ${feature.glow.replace(')', ', 0.4)').replace('rgba', 'rgba')}, transparent)`, border: `1px solid ${feature.glow}` }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-[15px] font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-[13px] text-slate-400 leading-relaxed">{feature.description}</p>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="py-28" style={{ background: "#030712" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[12px] text-slate-500 mb-5">
            Fonctionnalités
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Tout ce dont votre équipe
            <br />
            <span className="text-slate-400">a besoin, sans la friction</span>
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto text-[15px] leading-relaxed">
            Brèv prend en charge la charge cognitive liée aux emails pour que vos équipes restent concentrées sur leur cœur de métier.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
