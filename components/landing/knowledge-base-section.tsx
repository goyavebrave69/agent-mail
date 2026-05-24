import { FileText, Table2, FileCode2, FolderOpen, Plus, ArrowRight } from "lucide-react"

const docs = [
  { icon: FileText, name: "Tarifs 2024.pdf", size: "248 Ko", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", active: true },
  { icon: Table2, name: "Catalogue produits.xlsx", size: "1.2 Mo", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", active: true },
  { icon: FileText, name: "Conditions générales.pdf", size: "84 Ko", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", active: true },
  { icon: FileCode2, name: "Procédures SAV.md", size: "32 Ko", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", active: false },
  { icon: FolderOpen, name: "Fiches techniques/", size: "14 fichiers", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", active: false },
]

function KBPanel() {
  return (
    <div
      className="relative rounded-2xl border border-white/[0.08] overflow-hidden"
      style={{ background: "rgba(10,12,25,0.9)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[12px] text-white font-medium">Base de connaissances</span>
        </div>
        <span className="text-[10px] text-slate-600">5 sources · indexé</span>
      </div>

      {/* Docs list */}
      <div className="p-3 space-y-1.5">
        {docs.map((doc) => {
          const Icon = doc.icon
          return (
            <div
              key={doc.name}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                doc.active
                  ? `${doc.bg} ${doc.border}`
                  : "border-transparent hover:border-white/[0.04]"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${doc.bg} border ${doc.border} shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${doc.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-slate-200 truncate">{doc.name}</div>
                <div className="text-[10px] text-slate-600">{doc.size}</div>
              </div>
              {doc.active && (
                <div className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 font-medium">
                  En service
                </div>
              )}
            </div>
          )
        })}

        {/* Add button */}
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/[0.06] text-slate-600 hover:border-white/[0.12] hover:text-slate-400 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[12px]">Ajouter un document</span>
        </button>
      </div>
    </div>
  )
}

type CitedSource = { label: string; color: string; bg: string }

function Cite({ source }: { source: CitedSource }) {
  return (
    <span
      className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${source.color} ${source.bg} border border-current/20`}
      style={{ verticalAlign: "middle", borderColor: "currentColor", opacity: 0.8 }}
    >
      <FileText className="w-2.5 h-2.5" />
      {source.label}
    </span>
  )
}

const tarifs: CitedSource = { label: "Tarifs 2024.pdf", color: "text-rose-400", bg: "bg-rose-500/10" }
const cgv: CitedSource = { label: "Conditions générales.pdf", color: "text-blue-400", bg: "bg-blue-500/10" }
const catalogue: CitedSource = { label: "Catalogue produits.xlsx", color: "text-emerald-400", bg: "bg-emerald-500/10" }

function DraftPanel() {
  return (
    <div
      className="relative rounded-2xl border border-white/[0.08] overflow-hidden"
      style={{ background: "rgba(10,12,25,0.9)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">✦ IA</span>
          <span className="text-[12px] text-white font-medium">Réponse générée</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600">3 sources citées</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Email content */}
      <div className="p-4">
        <div className="space-y-0.5 text-[11px] text-slate-500 mb-3">
          <p>À : <span className="text-slate-300">david.martin@constructions-martin.fr</span></p>
          <p>Objet : <span className="text-slate-300">Re: Demande de devis — Pompe à chaleur résidentielle</span></p>
        </div>

        <div className="border-t border-white/[0.05] pt-3 text-[12px] text-slate-300 leading-relaxed space-y-2.5">
          <p>Bonjour M. Martin,</p>

          <p>
            Merci pour votre demande. Suite à votre projet de rénovation, voici notre proposition
            basée sur notre gamme en vigueur <Cite source={catalogue} /> :
          </p>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">PAC air/eau — 11 kW (réf. PAC-AW-11)</span>
              <span className="text-white font-medium text-[11px]">4 850 € HT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Pose & mise en service</span>
              <span className="text-white font-medium text-[11px]">980 € HT</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/[0.05] pt-1.5">
              <span className="text-white font-semibold text-[11px]">Total HT</span>
              <span className="text-indigo-400 font-bold text-[12px]">5 830 € HT</span>
            </div>
          </div>

          <p className="text-slate-400">
            Ces tarifs sont valables 30 jours <Cite source={tarifs} />. Nos conditions de paiement
            (30 % à la commande, solde à la livraison) sont détaillées dans nos <Cite source={cgv} />.
          </p>

          <p>N&apos;hésitez pas à me contacter pour toute question.</p>
          <p className="text-slate-400">Cordialement,<br /><span className="text-white">Sophie Renard — CVC Pro</span></p>
        </div>
      </div>

      {/* Sources footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-slate-600">Sources utilisées :</span>
        {[tarifs, cgv, catalogue].map((s) => (
          <span key={s.label} className={`text-[9px] px-1.5 py-0.5 rounded ${s.bg} ${s.color} border border-current/20`} style={{ borderColor: "currentColor", opacity: 0.7 }}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function KnowledgeBaseSection() {
  return (
    <section id="knowledge-base" className="py-28 border-t border-white/[0.04]" style={{ background: "#030712" }}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[12px] text-slate-500 mb-6">
              Base de connaissances
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-[1.1]">
              Une IA qui connaît
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #34d399, #10b981)" }}
              >
                votre activité
              </span>
            </h2>

            <p className="text-slate-400 text-[15px] leading-relaxed mb-8">
              Importez vos tarifs, catalogue produits, procédures et conditions générales.
              Brèv les indexe et les cite précisément dans chaque réponse — comme si
              votre meilleur commercial répondait, tout le temps.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                { label: "Tarifs & grilles tarifaires", desc: "PDF, Excel — mis à jour en temps réel" },
                { label: "Catalogue & fiches produits", desc: "Références, descriptions, disponibilités" },
                { label: "Procédures & CGV", desc: "Politique de retour, délais, conditions" },
                { label: "Historique & contexte client", desc: "Contrats, échanges passés, préférences" },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[13px] text-white font-medium">{item.label}</span>
                    <span className="text-[12px] text-slate-500 ml-2">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 text-[13px] text-emerald-400">
              <ArrowRight className="w-4 h-4" />
              <span>Les sources sont citées dans chaque brouillon, vérifiables en un clic</span>
            </div>
          </div>

          {/* Right — visual */}
          <div className="relative">
            {/* Glow */}
            <div
              className="absolute -inset-8 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)" }}
            />

            <div className="relative space-y-3">
              {/* KB panel */}
              <KBPanel />

              {/* Arrow */}
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.3))" }} />
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium text-emerald-400 border border-emerald-500/20"
                  style={{ background: "rgba(16,185,129,0.06)" }}
                >
                  <span className="w-3 h-3 text-[8px] flex items-center justify-center">✦</span>
                  IA contextuelle
                </div>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.3), transparent)" }} />
              </div>

              {/* Draft panel */}
              <DraftPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
