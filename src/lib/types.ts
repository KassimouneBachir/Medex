import type { ObjectId } from "mongodb"

export type Sexe = "M" | "F"
export type StatutConsultation = "planifiee" | "realisee"
export type StatutExamen = "planifie" | "realise"
export type FormatExamen = "mesures" | "cles" | "imagerie"

// ---------------------------------------------------------------- Référentiels (collections à part)

/** Collection medecins : un document par médecin, référencé par medecinId dans les consultations. */
export interface Medecin {
  medecinId: string
  nom: string
  prenom: string
  specialite: string
}

/** Collection typesExamens : le format dit quelle forme prennent les résultats de ce type d'examen. */
export interface TypeExamen {
  typeExamenId: string
  domaine: string
  categorie: string
  nom: string
  format: FormatExamen
  parametres?: { parametre: string; unite: string }[] // modèle de saisie (format mesures)
  champs?: string[] //                                   modèle de saisie (format cles)
}

// ---------------------------------------------------------------- Dossier (tout embarqué)

export interface Allergie {
  substance: string
  severite: string
}

export interface Antecedent {
  type: string
  description: string
  annee?: number
}

export interface Patient {
  nom: string
  prenom: string
  dateNaissance: string
  sexe: Sexe
  groupeSanguin: string
  allergies: Allergie[]
  antecedents?: Antecedent[]
  age?: number
}

export interface Symptome {
  nom: string
  duree: string
  intensite: string
}

export interface Diagnostic {
  nom: string
  statut: string
}

export interface Mesure {
  parametre: string
  valeur: number
  unite: string
}

/** Résultat embarqué dans l'examen ; sa forme dépend du format du type d'examen. */
export interface ResultatExamen {
  resultats?: Mesure[] | Record<string, string | number>
  zone?: string
  images?: string[]
  rapport?: { observations?: string; conclusion?: string }
}

export interface Examen extends ResultatExamen {
  examenId: string
  typeExamenId: string
  statut: StatutExamen
  dateResultat?: string
  source?: string
}

export interface Consultation {
  consultationId: string
  date: string
  type: string
  statut: StatutConsultation
  medecinId: string
  motif: string
  symptomes: Symptome[]
  diagnostics: Diagnostic[]
  examens: Examen[]
}

export interface Dossier {
  _id?: ObjectId
  dossierId: string
  patient: Patient
  consultations: Consultation[]
}

/** Dossier sérialisable (ObjectId converti en chaîne) pour les composants. */
export type DossierPlain = Omit<Dossier, "_id"> & { _id: string }

/** Ligne projetée par le pipeline d'agrégation de la liste. */
export interface DossierRow {
  dossierId: string
  patient: Patient
  nbConsultations: number
  nbPlanifiees: number
  derniereConsultation: string | null
  prochaineConsultation: string | null
  specialites: string[]
}

export interface QueryEntry {
  label: string
  kind: "read" | "write" | "preview"
  shell: string
  durationMs?: number
  summary?: string
  result?: string
  at?: string
}
