// Importable côté client (contrairement à lib/mongodb.ts qui embarque le driver).
export const COLLECTIONS = {
  dossiers: "dossiersMedicaux",
  medecins: "medecins",
  typesExamens: "typesExamens",
} as const

export const COLLECTION_NAME = COLLECTIONS.dossiers
