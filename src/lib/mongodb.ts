import { MongoClient } from "mongodb"
import { COLLECTIONS } from "./constants"
import type { Dossier, Medecin, TypeExamen } from "./types"

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017"

export const DB_NAME = process.env.MONGODB_DB ?? "DossierMedical"
export { COLLECTIONS }
export const COLLECTION = COLLECTIONS.dossiers

// Un seul MongoClient par process : il gère son propre pool de connexions.
// En dev, le hot reload ré-exécute les modules, d'où le cache sur globalThis.
const globalForMongo = globalThis as unknown as {
  _medexMongo?: Promise<MongoClient>
}

function getClient(): Promise<MongoClient> {
  if (!globalForMongo._medexMongo) {
    const pending = new MongoClient(uri, {
      serverSelectionTimeoutMS: 4000,
      appName: "medex",
    }).connect()
    // Si la connexion échoue, on oublie la promesse pour retenter à la requête suivante.
    pending.catch(() => {
      if (globalForMongo._medexMongo === pending) globalForMongo._medexMongo = undefined
    })
    globalForMongo._medexMongo = pending
  }
  return globalForMongo._medexMongo
}

export async function getDb() {
  return (await getClient()).db(DB_NAME)
}

export async function dossiers() {
  return (await getDb()).collection<Dossier>(COLLECTIONS.dossiers)
}

export async function medecins() {
  return (await getDb()).collection<Medecin>(COLLECTIONS.medecins)
}

export async function typesExamens() {
  return (await getDb()).collection<TypeExamen>(COLLECTIONS.typesExamens)
}

/** Hôte affichable, sans identifiants. */
export const DB_HOST = uri.replace(/^mongodb(\+srv)?:\/\//, "").replace(/^[^@]*@/, "").split("/")[0]
