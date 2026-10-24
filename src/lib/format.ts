// Libellés d'affichage. Les valeurs stockées restent sans accents (comme dans la base),
// seule l'interface les traduit. Une valeur inconnue s'affiche telle quelle.

export type Tone = "neutral" | "teal" | "sky" | "amber" | "rose" | "violet" | "emerald"

type Option = { value: string; label: string; tone: Tone }

function lookup(options: Option[], value: string): Option {
  return options.find((o) => o.value === value) ?? { value, label: value, tone: "neutral" }
}

export const GROUPES_SANGUINS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export const SEXES: Option[] = [
  { value: "F", label: "Femme", tone: "neutral" },
  { value: "M", label: "Homme", tone: "neutral" },
]

export const SEVERITES: Option[] = [
  { value: "legere", label: "Légère", tone: "amber" },
  { value: "moderee", label: "Modérée", tone: "amber" },
  { value: "elevee", label: "Élevée", tone: "rose" },
]

export const INTENSITES: Option[] = [
  { value: "legere", label: "Légère", tone: "neutral" },
  { value: "moderee", label: "Modérée", tone: "amber" },
  { value: "forte", label: "Forte", tone: "rose" },
]

export const STATUTS_DIAGNOSTIC: Option[] = [
  { value: "suspecte", label: "Suspecté", tone: "amber" },
  { value: "provisoire", label: "Provisoire", tone: "sky" },
  { value: "confirme", label: "Confirmé", tone: "emerald" },
]

export const TYPES_CONSULTATION: Option[] = [
  { value: "initiale", label: "Initiale", tone: "teal" },
  { value: "suivi", label: "Suivi", tone: "violet" },
  { value: "urgence", label: "Urgence", tone: "rose" },
]

export const STATUTS_CONSULTATION: Option[] = [
  { value: "planifiee", label: "Planifiée", tone: "amber" },
  { value: "realisee", label: "Réalisée", tone: "emerald" },
]

export const STATUTS_EXAMEN: Option[] = [
  { value: "planifie", label: "En attente", tone: "amber" },
  { value: "realise", label: "Résultat saisi", tone: "emerald" },
]

export const TYPES_ANTECEDENT: Option[] = [
  { value: "medical", label: "Médical", tone: "sky" },
  { value: "chirurgical", label: "Chirurgical", tone: "violet" },
  { value: "familial", label: "Familial", tone: "teal" },
]

export const FORMATS_EXAMEN: Option[] = [
  { value: "mesures", label: "Mesures", tone: "sky" },
  { value: "cles", label: "Observations", tone: "violet" },
  { value: "imagerie", label: "Imagerie", tone: "rose" },
]

export const DOMAINES_EXAMEN = ["biologie", "cardiologie", "imagerie", "pneumologie"]

export const severite = (v: string) => lookup(SEVERITES, v)
export const intensite = (v: string) => lookup(INTENSITES, v)
export const statutDiagnostic = (v: string) => lookup(STATUTS_DIAGNOSTIC, v)
export const typeConsultation = (v: string) => lookup(TYPES_CONSULTATION, v)
export const statutConsultation = (v: string) => lookup(STATUTS_CONSULTATION, v)
export const statutExamen = (v: string) => lookup(STATUTS_EXAMEN, v)
export const typeAntecedent = (v: string) => lookup(TYPES_ANTECEDENT, v)
export const formatExamen = (v: string) => lookup(FORMATS_EXAMEN, v)
export const sexe = (v: string) => lookup(SEXES, v)

/** Qui a écrit le résultat : le médecin aujourd'hui, des appareils connectés demain. */
export const source = (v: string) => ({ medecin: "médecin", appareil: "appareil" })[v] ?? v

/** Date du jour AAAA-MM-JJ dans le fuseau du serveur (toISOString donnerait la date UTC). */
export function aujourdhui() {
  return new Date().toLocaleDateString("sv-SE")
}

export function nomMedecin(m: { prenom: string; nom: string } | undefined, medecinId?: string) {
  return m ? `Dr ${m.prenom} ${m.nom}` : `Médecin inconnu (${medecinId ?? "?"})`
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]

/** '2026-09-20' → '20 sept. 2026' (parsing manuel : pas de fuseau horaire en jeu). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])} ${MOIS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`
}

/** 'frequenceCardiaque' → 'Frequence cardiaque' */
export function humanizeKey(k: string): string {
  const s = k.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fullName(p: { prenom: string; nom: string }) {
  return `${p.prenom} ${p.nom}`
}

export function initials(p: { prenom: string; nom: string }) {
  return `${p.prenom.charAt(0)}${p.nom.charAt(0)}`.toUpperCase()
}

export function formatMs(ms: number | undefined) {
  if (ms === undefined) return ""
  return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`
}
