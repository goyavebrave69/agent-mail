import { useState, useEffect, useRef } from "react";

const CATEGORIES = {
  devis: { label: "Devis", icon: "📌", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", count: 0 },
  info: { label: "Info", icon: "ℹ️", color: "#10B981", bg: "rgba(16,185,129,0.12)", count: 0 },
  facture: { label: "Facture", icon: "✅", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", count: 0 },
  relance: { label: "🔁 Relance", icon: "🔁", color: "#A855F7", bg: "rgba(168,85,247,0.12)", count: 0 },
  spam: { label: "Spam", icon: "⚠️", color: "#EF4444", bg: "rgba(239,68,68,0.12)", count: 0 },
  autre: { label: "Autre", icon: "📋", color: "#6B7280", bg: "rgba(107,114,128,0.12)", count: 0 },
};

const MAILS = [
  {
    id: 1, cat: "devis", from: "Sophie Martin", email: "sophie.martin@menuiserie-martin.fr",
    subject: "Tarif bois de charpente – chêne et douglas",
    date: "26 mars 2026, 09:14",
    body: "Bonjour,\n\nNous rénovons un corps de ferme en Normandie et recherchons du bois de charpente. Pourriez-vous nous communiquer vos tarifs pour :\n\n- Chêne massif section 15x15 (environ 30 ml)\n- Douglas traité classe 3 section 10x20 (environ 45 ml)\n\nLivraison sur site souhaitée (27300 Bernay).\n\nMerci d'avance pour votre retour rapide.\n\nCordialement,\nSophie Martin\nMenuiserie Martin & Fils",
    draft: "Bonjour Sophie,\n\nMerci pour votre demande. Voici nos tarifs actuels :\n\n• Chêne massif 15x15 : 48,50 € HT/ml\n• Douglas CL3 10x20 : 32,00 € HT/ml\n\nPour 30 ml de chêne + 45 ml de douglas, l'estimation s'élève à environ 2 895 € HT (hors livraison).\n\nLivraison possible sur Bernay – supplément de 180 € HT pour cette distance.\n\nJe peux vous établir un devis formel dès validation de votre part. N'hésitez pas si vous avez des questions.\n\nCordialement,\nL'équipe commerciale",
    confidence: 96, status: "pending"
  },
  {
    id: 2, cat: "devis", from: "Jean-Pierre Dubois", email: "jp.dubois@construction-dubois.com",
    subject: "Demande de devis – bardage mélèze 200m²",
    date: "26 mars 2026, 08:47",
    body: "Bonjour,\n\nDans le cadre d'un projet de construction neuve (maison individuelle), nous avons besoin de bardage en mélèze naturel pour environ 200 m².\n\nProfil ajouré ou claire-voie, épaisseur 20mm minimum.\n\nMerci de me faire parvenir un chiffrage avec délai de livraison.\n\nJean-Pierre Dubois\nConstruction Dubois SARL",
    draft: "Bonjour Jean-Pierre,\n\nMerci pour votre demande de bardage mélèze.\n\nPour 200 m² en profil claire-voie (épaisseur 22mm, largeur 130mm) :\n• Prix unitaire : 38,00 € HT/m²\n• Total estimé : 7 600 € HT\n• Délai de livraison : 2 à 3 semaines\n\nNous proposons également un traitement autoclave en option (+6 €/m²) pour une meilleure durabilité.\n\nJe vous prépare le devis détaillé dès votre confirmation. Souhaitez-vous des échantillons ?\n\nCordialement,\nL'équipe commerciale",
    confidence: 94, status: "pending"
  },
  {
    id: 3, cat: "devis", from: "Nathalie Leroy", email: "n.leroy@archileroy.fr",
    subject: "Projet terrasse IPE – 65m² + fourniture lambourdes",
    date: "25 mars 2026, 17:22",
    body: "Bonjour,\n\nJe suis architecte et je monte un projet de terrasse extérieure pour un de mes clients. Surface totale 65 m².\n\nBesoin :\n- Lames IPE 21x145mm (1ère qualité)\n- Lambourdes exotiques 42x70\n- Visserie inox adaptée\n\nPouvez-vous me transmettre un chiffrage global ?\n\nCordialement,\nNathalie Leroy – Archi Leroy",
    draft: "Bonjour Nathalie,\n\nMerci pour votre demande. Voici notre estimation pour 65 m² de terrasse IPE :\n\n• Lames IPE 21x145 1er choix : 95,00 € HT/m² → 6 175 € HT\n• Lambourdes exotiques 42x70 : 8,50 € HT/ml (≈130 ml) → 1 105 € HT\n• Visserie inox (kit 65m²) : 285 € HT\n\nTotal estimé : 7 565 € HT\nDélai : 10-15 jours ouvrés\n\nNous travaillons régulièrement avec des architectes et pouvons adapter le conditionnement. Souhaitez-vous un devis formel pour votre client ?\n\nCordialement,\nL'équipe commerciale",
    confidence: 97, status: "pending"
  },
  {
    id: 4, cat: "devis", from: "Marc Petit", email: "marc.petit@gmail.com",
    subject: "Prix plancher chêne massif pour salon 35m²",
    date: "25 mars 2026, 14:55",
    body: "Bonjour,\n\nJe rénove mon salon et je voudrais un plancher en chêne massif. Surface environ 35 m², épaisseur 22mm, largeur 140mm si possible.\n\nQuel serait le prix au m² et le délai ?\n\nMerci,\nMarc Petit",
    draft: "Bonjour Marc,\n\nMerci pour votre intérêt pour nos planchers chêne massif.\n\nPour votre salon de 35 m² :\n• Chêne massif 22x140mm (choix rustique) : 52,00 € HT/m²\n• Chêne massif 22x140mm (choix premier) : 68,00 € HT/m²\n\nEstimation totale (avec 10% de marge de coupe) :\n• Rustique : 2 002 € HT\n• Premier : 2 618 € HT\n\nDélai : stock disponible, livraison sous 5-7 jours.\n\nSouhaitez-vous des échantillons avant de vous décider ?\n\nCordialement,\nL'équipe commerciale",
    confidence: 93, status: "pending"
  },
  {
    id: 5, cat: "info", from: "Marie Fontaine", email: "marie.fontaine@orange.fr",
    subject: "Renseignement essences de bois pour clôture",
    date: "26 mars 2026, 10:03",
    body: "Bonjour,\n\nJe souhaite installer une clôture en bois autour de mon jardin. Quelle essence me conseillez-vous pour une bonne tenue en extérieur sans trop d'entretien ?\n\nMerci pour vos conseils.\n\nMarie Fontaine",
    draft: "Bonjour Marie,\n\nPour une clôture extérieure avec peu d'entretien, je vous recommande :\n\n1. Pin traité autoclave (classe 4) : excellent rapport qualité/prix, durabilité 15-20 ans, peu d'entretien\n2. Mélèze naturel : naturellement résistant, grisaille avec le temps (aspect recherché), 20+ ans\n3. Douglas : bonne résistance naturelle, prix intermédiaire\n\nÀ éviter : le sapin et l'épicéa non traités qui se dégradent vite en extérieur.\n\nSouhaitez-vous que je vous prépare un chiffrage selon l'essence choisie et la longueur de clôture ?\n\nCordialement,\nL'équipe commerciale",
    confidence: 91, status: "pending"
  },
  {
    id: 6, cat: "info", from: "Antoine Moreau", email: "a.moreau@bricorama.fr",
    subject: "Disponibilité OSB3 et panneaux contreplaqué",
    date: "26 mars 2026, 08:15",
    body: "Bonjour,\n\nPouvez-vous me confirmer la disponibilité des produits suivants :\n- Panneaux OSB3 2500x1250 ép.18mm\n- Contreplaqué okoumé 2500x1220 ép.15mm\n\nQuantités importantes (palette complète).\n\nMerci,\nAntoine Moreau – Service achat Bricorama",
    draft: "Bonjour Antoine,\n\nMerci pour votre demande. Voici la disponibilité actuelle :\n\n• OSB3 2500x1250 ép.18mm : EN STOCK – palette de 50 panneaux disponible\n• Contreplaqué okoumé 2500x1220 ép.15mm : EN STOCK – palette de 40 panneaux\n\nPour des quantités palettes complètes, nous appliquons un tarif dégressif. Souhaitez-vous que je vous transmette notre grille tarifaire professionnelle ?\n\nCordialement,\nL'équipe commerciale",
    confidence: 89, status: "pending"
  },
  {
    id: 7, cat: "info", from: "Lucie Bernard", email: "lucie.b@gmail.com",
    subject: "Horaires d'ouverture et accès dépôt",
    date: "25 mars 2026, 16:40",
    body: "Bonjour,\n\nPourriez-vous m'indiquer vos horaires d'ouverture ? Est-il possible de venir directement au dépôt pour voir les produits ?\n\nMerci,\nLucie",
    draft: "Bonjour Lucie,\n\nNotre dépôt est ouvert du lundi au vendredi de 7h30 à 12h00 et de 13h30 à 17h30, ainsi que le samedi matin de 8h00 à 12h00.\n\nVous êtes la bienvenue pour visiter notre showroom et voir nos différentes essences. Un conseiller sera disponible pour vous guider.\n\nAdresse : Zone Artisanale des Chênes, 14 rue du Bois, 76000 Rouen\n\nÀ bientôt !\n\nCordialement,\nL'équipe commerciale",
    confidence: 95, status: "pending"
  },
  {
    id: 8, cat: "info", from: "Pierre Garnier", email: "p.garnier@free.fr",
    subject: "Différence entre bois séché et bois vert",
    date: "25 mars 2026, 11:20",
    body: "Bonjour,\n\nJe suis bricoleur amateur et je me pose la question : quelle est la différence entre bois séché en séchoir et bois vert ? Lequel choisir pour un abri de jardin ?\n\nMerci d'avance,\nPierre",
    draft: "Bonjour Pierre,\n\nExcellente question ! Voici les différences principales :\n\n🌲 Bois vert : coupé récemment, taux d'humidité élevé (>30%). Moins cher, mais il va travailler (retrait, déformation) en séchant. Adapté pour de la charpente couverte.\n\n🏭 Bois séché (séchoir) : taux d'humidité ramené à 12-18%. Plus stable, moins de déformation. Idéal pour les assemblages précis.\n\nPour un abri de jardin, je recommande du bois séché pour l'ossature et les montants (stabilité des assemblages), et du bois traité autoclave pour les éléments en contact avec l'extérieur.\n\nBesoin de plus de précisions ?\n\nCordialement,\nL'équipe commerciale",
    confidence: 88, status: "pending"
  },
  {
    id: 9, cat: "info", from: "Claire Dumont", email: "claire.dumont@mairie-rouen.fr",
    subject: "Certification PEFC de vos produits",
    date: "24 mars 2026, 15:30",
    body: "Bonjour,\n\nDans le cadre d'un appel d'offres public, nous avons besoin de fournisseurs certifiés PEFC. Disposez-vous de cette certification ?\n\nPourriez-vous nous transmettre votre numéro de certificat ?\n\nCordialement,\nClaire Dumont\nService Marchés Publics – Mairie de Rouen",
    draft: "Bonjour Claire,\n\nOui, nous sommes certifiés PEFC depuis 2019.\n\nNotre numéro de certificat : PEFC/10-31-2847\nOrganisme certificateur : Bureau Veritas\n\nNous pouvons vous fournir une copie de notre certificat en cours de validité ainsi que la liste de nos produits certifiés sur simple demande.\n\nNous sommes habitués aux marchés publics et pouvons constituer un dossier complet selon vos exigences.\n\nCordialement,\nL'équipe commerciale",
    confidence: 92, status: "pending"
  },
  {
    id: 10, cat: "info", from: "Thomas Renaud", email: "thomas.renaud@outlook.com",
    subject: "Conseil traitement bois terrasse",
    date: "24 mars 2026, 09:10",
    body: "Bonjour,\n\nJ'ai une terrasse en pin qui commence à griser. Quel traitement me recommandez-vous pour la rénover ?\n\nMerci,\nThomas",
    draft: "Bonjour Thomas,\n\nPour rénover une terrasse en pin qui grise, voici la procédure recommandée :\n\n1. Nettoyage : dégriseur bois (nous avons le Owatrol Dégriseur Net en stock – 28 € HT/2,5L)\n2. Ponçage léger si nécessaire (grain 80 puis 120)\n3. Application d'un saturateur : le Saturateur Bois Blanchon est notre meilleure vente – 42 € HT/5L, couvre ~20 m²\n\nCompter 2 couches de saturateur pour un résultat optimal. Renouveler tous les 2 ans.\n\nSouhaitez-vous commander ces produits ?\n\nCordialement,\nL'équipe commerciale",
    confidence: 87, status: "pending"
  },
  {
    id: 11, cat: "facture", from: "Comptabilité Leroy Merlin", email: "compta@leroymerlin-pro.fr",
    subject: "Rappel facture F-2026-0847 – échéance dépassée",
    date: "26 mars 2026, 07:30",
    body: "Bonjour,\n\nNous vous informons que la facture F-2026-0847 d'un montant de 4 230,00 € TTC est arrivée à échéance le 15 mars 2026.\n\nMerci de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,\nService Comptabilité\nLeroy Merlin Pro",
    draft: "Bonjour,\n\nBien reçu votre rappel concernant la facture F-2026-0847.\n\nLe règlement a été effectué par virement ce jour. Vous devriez le recevoir sous 24-48h ouvrées.\n\nRéférence virement : VIR-2026-0326-LM\n\nN'hésitez pas à me contacter si vous ne le recevez pas d'ici vendredi.\n\nCordialement,\nL'équipe comptabilité",
    confidence: 85, status: "pending"
  },
  {
    id: 12, cat: "facture", from: "EDF Pro", email: "factures@edf-pro.fr",
    subject: "Votre facture EDF Pro – Mars 2026",
    date: "25 mars 2026, 06:00",
    body: "Bonjour,\n\nVotre facture d'électricité pour la période du 01/02/2026 au 28/02/2026 est disponible.\n\nMontant : 687,45 € TTC\nÉchéance : 10 avril 2026\nRéférence : EDF-PRO-2026-03-4521\n\nRetrouvez votre facture détaillée dans votre espace client.\n\nCordialement,\nEDF Pro",
    draft: "Bonjour,\n\nBien noté, merci. La facture EDF-PRO-2026-03-4521 est enregistrée dans notre comptabilité.\n\nRèglement prévu avant l'échéance du 10 avril par prélèvement automatique.\n\nCordialement,\nL'équipe comptabilité",
    confidence: 90, status: "pending"
  },
];

const Toast = ({ message, visible }) => (
  <div style={{
    position: "fixed", top: 24, right: 24, zIndex: 1000,
    padding: "14px 24px", borderRadius: 10,
    background: message?.type === "success" ? "#059669" : message?.type === "error" ? "#DC2626" : "#2563EB",
    color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    transform: visible ? "translateY(0)" : "translateY(-120%)",
    opacity: visible ? 1 : 0,
    transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
    pointerEvents: "none",
  }}>
    {message?.text}
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: "⏳", bg: "rgba(255,255,255,0.06)" },
    validated: { label: "✅", bg: "rgba(5,150,105,0.18)" },
    modified: { label: "📝", bg: "rgba(37,99,235,0.18)" },
    rejected: { label: "❌", bg: "rgba(220,38,38,0.18)" },
    spam: { label: "🚫", bg: "rgba(239,68,68,0.18)" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, borderRadius: 6, background: s.bg, fontSize: 12, flexShrink: 0
    }}>{s.label}</span>
  );
};

export default function MailAgent() {
  const [mails, setMails] = useState(MAILS);
  const [selectedId, setSelectedId] = useState(1);
  const [draftEdits, setDraftEdits] = useState({});
  const [toast, setToast] = useState({ visible: false, message: null });
  const [syncAge, setSyncAge] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setSyncAge(a => a + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (text, type = "success") => {
    setToast({ visible: true, message: { text, type } });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  const selectedMail = mails.find(m => m.id === selectedId);

  const selectMail = (id) => {
    setSelectedId(id);
    setFadeKey(k => k + 1);
  };

  const updateStatus = (id, status) => {
    setMails(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  const handleValidate = () => {
    updateStatus(selectedId, "validated");
    showToast("✅ Mail envoyé avec succès !", "success");
  };
  const handleModify = () => {
    updateStatus(selectedId, "modified");
    showToast("📝 Brouillon modifié et sauvegardé", "info");
  };
  const handleReject = () => {
    updateStatus(selectedId, "rejected");
    showToast("❌ Brouillon rejeté — mail non traité", "error");
  };
  const handleSpam = () => {
    updateStatus(selectedId, "spam");
    showToast("🚫 Marqué comme spam", "error");
  };

  const getDraft = (id) => draftEdits[id] !== undefined ? draftEdits[id] : mails.find(m => m.id === id)?.draft || "";

  // Group mails by category
  const grouped = {};
  Object.keys(CATEGORIES).forEach(k => { grouped[k] = []; });
  mails.forEach(m => { if (grouped[m.cat]) grouped[m.cat].push(m); });

  const pendingCount = mails.filter(m => m.status === "pending").length;

  const formatSync = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m${sec.toString().padStart(2, "0")}s` : `${sec}s`;
  };

  const catOrder = ["devis", "info", "facture", "relance", "spam", "autre"];

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#0C0F14",
      color: "#E4E7EC",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .mail-item { transition: all 0.2s ease; cursor: pointer; }
        .mail-item:hover { background: rgba(255,255,255,0.04) !important; }
        .action-btn { transition: all 0.18s ease; cursor: pointer; border: none; font-family: 'DM Sans', sans-serif; }
        .action-btn:hover { transform: translateY(-1px); filter: brightness(1.15); }
        .action-btn:active { transform: translateY(0) scale(0.97); }
        .fade-panel { animation: fadeSlideIn 0.3s ease forwards; }
      `}</style>

      <Toast message={toast.message} visible={toast.visible} />

      {/* HEADER BAR */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        background: "linear-gradient(135deg, #111520, #161B27)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#10B981",
            animation: "pulse 2s ease infinite",
            boxShadow: "0 0 8px rgba(16,185,129,0.5)",
          }} />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>
            MAIL<span style={{ color: "#3B82F6" }}>AGENT</span>
          </span>
          <span style={{
            fontSize: 12, color: "#6B7280", marginLeft: 8,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Dernière sync : {formatSync(syncAge)} ago
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            background: "rgba(59,130,246,0.12)", color: "#3B82F6",
            padding: "5px 12px", borderRadius: 6, fontWeight: 600,
          }}>
            {pendingCount} en attente
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            background: "rgba(16,185,129,0.12)", color: "#10B981",
            padding: "5px 12px", borderRadius: 6, fontWeight: 600,
          }}>
            {mails.length - pendingCount} traités
          </span>
          <button style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, padding: "6px 14px", color: "#9CA3AF",
            cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          }} onClick={() => { setSyncAge(0); showToast("🔄 Synchronisation lancée", "info"); }}>
            ⚙️ Sync
          </button>
        </div>
      </div>

      {/* 3-PANEL LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* PANEL 1 — INBOX */}
        <div style={{
          width: "24%", minWidth: 240,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "8px 0",
          background: "#0E1119",
        }}>
          {catOrder.map(catKey => {
            const cat = CATEGORIES[catKey];
            const items = grouped[catKey];
            if (!items || items.length === 0) return (
              <div key={catKey} style={{ padding: "10px 18px", opacity: 0.3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: cat.color }}>
                  {cat.icon} {cat.label} <span style={{ fontWeight: 400, color: "#4B5563" }}>(0)</span>
                </span>
              </div>
            );
            return (
              <div key={catKey} style={{ marginBottom: 4 }}>
                <div style={{
                  padding: "10px 18px 6px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cat.color, letterSpacing: "0.04em" }}>
                    {cat.icon} {cat.label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: cat.color,
                    background: cat.bg, padding: "2px 8px", borderRadius: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{items.length}</span>
                </div>
                {items.map(mail => (
                  <div
                    key={mail.id}
                    className="mail-item"
                    onClick={() => selectMail(mail.id)}
                    style={{
                      padding: "10px 18px 10px 28px",
                      display: "flex", alignItems: "center", gap: 10,
                      background: selectedId === mail.id ? "rgba(255,255,255,0.06)" : "transparent",
                      borderLeft: selectedId === mail.id ? `3px solid ${cat.color}` : "3px solid transparent",
                    }}
                  >
                    <StatusBadge status={mail.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: "#D1D5DB",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{mail.from}</div>
                      <div style={{
                        fontSize: 11, color: "#6B7280", marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{mail.subject}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* PANEL 2 — DETAIL */}
        <div style={{
          width: "36%", overflowY: "auto", padding: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "#0F1218",
        }}>
          {selectedMail ? (
            <div key={fadeKey} className="fade-panel">
              {/* Mail header */}
              <div style={{
                padding: "22px 26px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#F3F4F6", lineHeight: 1.4, marginBottom: 14 }}>
                  {selectedMail.subject}
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    { label: "De", value: selectedMail.from },
                    { label: "Email", value: selectedMail.email },
                    { label: "Date", value: selectedMail.date },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "#4B5563",
                        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3,
                      }}>{label}</div>
                      <div style={{
                        fontSize: 13, color: "#D1D5DB",
                        fontFamily: label === "Email" ? "'JetBrains Mono', monospace" : "inherit",
                      }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mail body */}
              <div style={{ padding: "22px 26px" }}>
                <pre style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, lineHeight: 1.7, color: "#C9CDD4",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: "rgba(255,255,255,0.02)",
                  padding: 20, borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  {selectedMail.body}
                </pre>
              </div>

              {/* Classification tag */}
              <div style={{ padding: "0 26px 22px" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: CATEGORIES[selectedMail.cat]?.bg,
                  border: `1px solid ${CATEGORIES[selectedMail.cat]?.color}33`,
                  borderRadius: 8, padding: "10px 16px",
                }}>
                  <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>Classé comme</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: CATEGORIES[selectedMail.cat]?.color,
                  }}>
                    {CATEGORIES[selectedMail.cat]?.icon} {CATEGORIES[selectedMail.cat]?.label}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    color: "#6B7280", background: "rgba(255,255,255,0.06)",
                    padding: "2px 8px", borderRadius: 4,
                  }}>
                    {selectedMail.confidence}% confiance
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "#4B5563" }}>
              Sélectionnez un mail
            </div>
          )}
        </div>

        {/* PANEL 3 — DRAFT */}
        <div style={{
          width: "40%", overflowY: "auto",
          background: "#10141C",
          display: "flex", flexDirection: "column",
        }}>
          {selectedMail ? (
            <div key={fadeKey} className="fade-panel" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {/* Draft header */}
              <div style={{
                padding: "22px 26px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "#4B5563",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
                }}>Brouillon de réponse</div>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>À : </span>
                  <span style={{
                    fontSize: 13, color: "#D1D5DB",
                    fontFamily: "'JetBrains Mono', monospace",
                    background: "rgba(255,255,255,0.04)",
                    padding: "3px 10px", borderRadius: 5,
                  }}>{selectedMail.email}</span>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Objet : </span>
                  <span style={{ fontSize: 13, color: "#D1D5DB" }}>
                    RE: {selectedMail.subject}
                  </span>
                </div>
              </div>

              {/* Draft textarea */}
              <div style={{ padding: "18px 26px", flex: 1 }}>
                <textarea
                  ref={textareaRef}
                  value={getDraft(selectedMail.id)}
                  onChange={(e) => setDraftEdits(prev => ({ ...prev, [selectedMail.id]: e.target.value }))}
                  style={{
                    width: "100%", minHeight: 280,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: 18,
                    color: "#D1D5DB", fontSize: 14, lineHeight: 1.7,
                    fontFamily: "'DM Sans', sans-serif",
                    resize: "vertical", outline: "none",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(59,130,246,0.4)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />
              </div>

              {/* Confidence */}
              <div style={{ padding: "0 26px 14px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 8, padding: "10px 16px",
                }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Confiance réponse :</span>
                  <div style={{
                    flex: 1, height: 6, background: "rgba(255,255,255,0.06)",
                    borderRadius: 3, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${selectedMail.confidence}%`, height: "100%",
                      background: selectedMail.confidence > 90 ? "#10B981" : selectedMail.confidence > 80 ? "#F59E0B" : "#EF4444",
                      borderRadius: 3,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: selectedMail.confidence > 90 ? "#10B981" : selectedMail.confidence > 80 ? "#F59E0B" : "#EF4444",
                  }}>{selectedMail.confidence}%</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{
                padding: "14px 26px 24px",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              }}>
                <button className="action-btn" onClick={handleValidate} style={{
                  background: "linear-gradient(135deg, #059669, #047857)",
                  color: "#fff", padding: "14px 18px", borderRadius: 10,
                  fontSize: 14, fontWeight: 700, letterSpacing: "0.02em",
                  boxShadow: "0 4px 16px rgba(5,150,105,0.25)",
                }}>✅ VALIDER & ENVOYER</button>
                <button className="action-btn" onClick={handleModify} style={{
                  background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  color: "#fff", padding: "14px 18px", borderRadius: 10,
                  fontSize: 14, fontWeight: 700, letterSpacing: "0.02em",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.25)",
                }}>✏️ SAUVEGARDER</button>
                <button className="action-btn" onClick={handleReject} style={{
                  background: "rgba(220,38,38,0.12)",
                  color: "#EF4444", padding: "14px 18px", borderRadius: 10,
                  fontSize: 14, fontWeight: 700, letterSpacing: "0.02em",
                  border: "1px solid rgba(220,38,38,0.2)",
                }}>❌ REJETER</button>
                <button className="action-btn" onClick={handleSpam} style={{
                  background: "rgba(245,158,11,0.12)",
                  color: "#F59E0B", padding: "14px 18px", borderRadius: 10,
                  fontSize: 14, fontWeight: 700, letterSpacing: "0.02em",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}>🚫 SPAM</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "#4B5563" }}>
              Aucun mail sélectionné
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
