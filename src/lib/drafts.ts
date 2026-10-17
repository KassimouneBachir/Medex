// Brouillons de formulaire → documents MongoDB. Partagé client/serveur :
// le client s'en sert pour l'aperçu en direct de la requête, le serveur
// pour valider et construire ce qui est réellement écrit.

import { GROUPES_SANGUINS, TYPES_ANTECEDENT } from "./format"
import type {
  Allergie,
  Consultation,
  Diagnostic,
  Examen,
  FormatExamen,
  Medecin,
  Patient,
  ResultatExamen,
  Symptome,
  TypeExamen,
} from "./types"

export const AUTO_ID = "‹auto›"

const t = (s: string | undefined) => (s ?? "").trim()
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

function asValue(raw: string): string | number {
  const s = raw.trim().replace(",", ".")
  return s !== "" && Number.isFinite(Number(s)) ? Number(s) : raw.trim()
}

// ---------------------------------------------------------------- Patient (secrétaire)

export interface PatientDraft {
  nom: string
  prenom: string
  dateNaissance: string
  sexe: "M" | "F"
  groupeSanguin: string
  age: string
  allergies: Allergie[]
  antecedents: { type: string; description: string; annee: string }[]
}

export function emptyPatientDraft(): PatientDraft {
  return { nom: "", prenom: "", dateNaissance: "", sexe: "F", groupeSanguin: "O+", age: "", allergies: [], antecedents: [] }
}

export function patientToDraft(p: Patient): PatientDraft {
  return {
    nom: p.nom,
    prenom: p.prenom,
    dateNaissance: p.dateNaissance,
    sexe: p.sexe,
    groupeSanguin: p.groupeSanguin,
    age: p.age === undefined ? "" : String(p.age),
    allergies: p.allergies.map((a) => ({ ...a })),
    antecedents: (p.antecedents ?? []).map((a) => ({
      type: a.type,
      description: a.description,
      annee: a.annee === undefined ? "" : String(a.annee),
    })),
  }
}

/** Patient tel qu'il sera stocké. `age` absent si le champ est vide. */
export function draftToPatient(d: PatientDraft): Patient {
  const age = t(d.age) === "" ? undefined : Number(d.age)
  return {
    nom: t(d.nom),
    prenom: t(d.prenom),
    dateNaissance: t(d.dateNaissance),
    sexe: d.sexe,
    groupeSanguin: d.groupeSanguin,
    allergies: d.allergies
      .filter((a) => t(a.substance))
      .map((a) => ({ substance: t(a.substance), severite: a.severite })),
    antecedents: d.antecedents
      .filter((a) => t(a.description))
      .map((a) => ({
        type: a.type,
        description: t(a.description),
        ...(t(a.annee) ? { annee: Number(a.annee) } : {}),
      })),
    ...(age !== undefined && Number.isFinite(age) ? { age } : {}),
  }
}

/** Opérateurs de mise à jour du patient : $set champ par champ, $unset de l'âge s'il est vidé. */
export function patientUpdate(p: Patient) {
  const { age, ...fields } = p
  const $set: Record<string, unknown> = Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [`patient.${k}`, v]),
  )
  if (age !== undefined) return { $set: { ...$set, "patient.age": age } }
  return { $set, $unset: { "patient.age": "" as const } }
}

export function validatePatient(p: Patient): string | null {
  if (!p.nom || !p.prenom) return "Le nom et le prénom sont obligatoires."
  if (!isDate(p.dateNaissance)) return "La date de naissance est invalide."
  if (p.sexe !== "M" && p.sexe !== "F") return "Le sexe doit être M ou F."
  if (!GROUPES_SANGUINS.includes(p.groupeSanguin)) return "Le groupe sanguin est invalide."
  if (p.age !== undefined && (!Number.isInteger(p.age) || p.age < 0 || p.age > 130))
    return "L'âge doit être un entier entre 0 et 130."
  for (const a of p.antecedents ?? []) {
    if (!TYPES_ANTECEDENT.some((o) => o.value === a.type)) return "Type d'antécédent invalide."
    if (a.annee !== undefined && (!Number.isInteger(a.annee) || a.annee < 1900 || a.annee > 2100))
      return `Antécédent « ${a.description} » : l'année doit être comprise entre 1900 et 2100.`
  }
  return null
}

// ---------------------------------------------------------------- Planification (secrétaire)

export interface PlanningDraft {
  date: string
  type: string
  medecinId: string
  motif: string
  examens: string[] // typeExamenId
}

/** Consultation planifiée : aucun symptôme ni diagnostic, examens « planifie » sans résultat. */
export function draftToPlannedConsultation(
  d: PlanningDraft,
  ids?: { consultationId: string; examenIds: string[] },
): Consultation {
  const typeIds = d.examens.filter(Boolean)
  return {
    consultationId: ids?.consultationId ?? AUTO_ID,
    date: t(d.date),
    type: d.type,
    statut: "planifiee",
    medecinId: d.medecinId,
    motif: t(d.motif),
    symptomes: [],
    diagnostics: [],
    examens: typeIds.map((typeExamenId, i) => ({
      examenId: ids?.examenIds[i] ?? AUTO_ID,
      typeExamenId,
      statut: "planifie",
    })),
  }
}

export function validatePlanning(c: Consultation): string | null {
  if (!isDate(c.date)) return "La date du rendez-vous est invalide."
  if (!c.medecinId) return "Choisissez le médecin."
  if (!c.motif) return "Le motif est obligatoire."
  return null
}

// ---------------------------------------------------------------- Complétion (médecin)

export interface CompletionDraft {
  symptomes: Symptome[]
  diagnostics: Diagnostic[]
}

export function draftToCompletion(d: CompletionDraft): CompletionDraft {
  return {
    symptomes: d.symptomes
      .filter((s) => t(s.nom))
      .map((s) => ({ nom: t(s.nom), duree: t(s.duree), intensite: s.intensite })),
    diagnostics: d.diagnostics.filter((x) => t(x.nom)).map((x) => ({ nom: t(x.nom), statut: x.statut })),
  }
}

/** Filtre + $set avec l'opérateur positionnel $ : la consultation qui a matché dans le filtre. */
export function completionUpdate(dossierId: string, consultationId: string, d: CompletionDraft) {
  const { symptomes, diagnostics } = draftToCompletion(d)
  return {
    filter: { dossierId, "consultations.consultationId": consultationId },
    update: {
      $set: {
        "consultations.$.symptomes": symptomes,
        "consultations.$.diagnostics": diagnostics,
        "consultations.$.statut": "realisee",
      },
    },
  }
}

// ---------------------------------------------------------------- Résultat d'examen (médecin, plus tard appareils)

export interface ResultatDraft {
  mesures: { parametre: string; valeur: string; unite: string }[]
  cles: { cle: string; valeur: string }[]
  zone: string
  images: string
  observations: string
  conclusion: string
}

/** Pré-remplit la saisie : résultat déjà saisi s'il existe, sinon modèle du type d'examen. */
export function resultatToDraft(type: TypeExamen, examen?: Examen): ResultatDraft {
  const r = examen?.resultats
  return {
    mesures: Array.isArray(r)
      ? r.map((m) => ({ parametre: m.parametre, valeur: String(m.valeur), unite: m.unite }))
      : (type.parametres ?? [{ parametre: "", unite: "" }]).map((p) => ({ ...p, valeur: "" })),
    cles:
      r && !Array.isArray(r)
        ? Object.entries(r).map(([cle, valeur]) => ({ cle, valeur: String(valeur) }))
        : (type.champs ?? [""]).map((cle) => ({ cle, valeur: "" })),
    zone: examen?.zone ?? "",
    images: (examen?.images ?? []).join("\n"),
    observations: examen?.rapport?.observations ?? "",
    conclusion: examen?.rapport?.conclusion ?? "",
  }
}

/** Champs de résultat à écrire dans l'examen, selon le format du type. */
export function draftToResultat(format: FormatExamen, d: ResultatDraft): ResultatExamen {
  if (format === "mesures")
    return {
      resultats: d.mesures
        .filter((m) => t(m.parametre))
        .map((m) => ({ parametre: t(m.parametre), valeur: Number(t(m.valeur).replace(",", ".")), unite: t(m.unite) })),
    }
  if (format === "cles")
    return { resultats: Object.fromEntries(d.cles.filter((c) => t(c.cle)).map((c) => [t(c.cle), asValue(c.valeur)])) }
  return {
    zone: t(d.zone),
    images: d.images.split(/[\n,]/).map(t).filter(Boolean),
    rapport: { observations: t(d.observations), conclusion: t(d.conclusion) },
  }
}

/** $set ciblé avec arrayFilters : $[c] = la consultation, $[e] = l'examen, à n'importe quelle profondeur. */
export function resultatUpdate(consultationId: string, examenId: string, resultat: ResultatExamen, dateResultat: string) {
  const champ = (k: string) => `consultations.$[c].examens.$[e].${k}`
  return {
    update: {
      $set: {
        ...Object.fromEntries(Object.entries(resultat).map(([k, v]) => [champ(k), v])),
        [champ("statut")]: "realise",
        [champ("dateResultat")]: dateResultat,
        [champ("source")]: "medecin",
      },
    },
    options: { arrayFilters: [{ "c.consultationId": consultationId }, { "e.examenId": examenId }] },
  }
}

export function validateResultat(format: FormatExamen, r: ResultatExamen): string | null {
  if (format === "mesures") {
    const mesures = (r.resultats ?? []) as { valeur: number }[]
    if (!mesures.length) return "Saisissez au moins une mesure."
    if (mesures.some((m) => !Number.isFinite(m.valeur))) return "Chaque mesure doit avoir une valeur numérique."
  }
  if (format === "cles" && !Object.keys(r.resultats ?? {}).length) return "Saisissez au moins un champ."
  if (format === "imagerie" && !r.rapport?.conclusion && !r.rapport?.observations && !r.images?.length)
    return "Saisissez au moins une image, des observations ou une conclusion."
  return null
}

// ---------------------------------------------------------------- Référentiels

export type MedecinDraft = Omit<Medecin, "medecinId">

export function draftToMedecin(d: MedecinDraft): MedecinDraft {
  return { nom: t(d.nom), prenom: t(d.prenom), specialite: t(d.specialite) }
}

export function validateMedecin(m: MedecinDraft): string | null {
  if (!m.nom || !m.prenom || !m.specialite) return "Nom, prénom et spécialité sont obligatoires."
  return null
}

export interface TypeExamenDraft {
  domaine: string
  categorie: string
  nom: string
  format: FormatExamen
  parametres: { parametre: string; unite: string }[]
  champs: { nom: string }[]
}

export function emptyTypeExamenDraft(): TypeExamenDraft {
  return { domaine: "biologie", categorie: "", nom: "", format: "mesures", parametres: [{ parametre: "", unite: "" }], champs: [] }
}

export function draftToTypeExamen(d: TypeExamenDraft): Omit<TypeExamen, "typeExamenId"> {
  return {
    domaine: t(d.domaine),
    categorie: t(d.categorie),
    nom: t(d.nom),
    format: d.format,
    ...(d.format === "mesures"
      ? { parametres: d.parametres.filter((p) => t(p.parametre)).map((p) => ({ parametre: t(p.parametre), unite: t(p.unite) })) }
      : {}),
    ...(d.format === "cles" ? { champs: d.champs.map((c) => t(c.nom)).filter(Boolean) } : {}),
  }
}

export function validateTypeExamen(x: Omit<TypeExamen, "typeExamenId">): string | null {
  if (!x.domaine || !x.nom) return "Le domaine et le nom sont obligatoires."
  return null
}
