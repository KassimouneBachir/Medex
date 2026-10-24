import "server-only"
import { requireRole, requireUser } from "./auth"
import { patientScope } from "./auth-core.mjs"
// Lectures MongoDB (serveur uniquement). Chaque fonction renvoie ses données
// et l'entrée de journal correspondante, affichée dans le panneau « Requête MongoDB ».

import type { Document } from "mongodb"
import { connection } from "next/server"
import { COLLECTIONS, DB_HOST, DB_NAME, getDb } from "./mongodb"
import { shellCall, toShell } from "./shell"
import type { Dossier, DossierPlain, DossierRow, Medecin, QueryEntry, TypeExamen } from "./types"

// Avec Cache Components, Next prérend tout ce qui n'est pas marqué dynamique.
// connection() indique que ces lectures doivent se faire à chaque requête, jamais au build.
async function db() {
  await connection()
  await requireUser()
  return getDb()
}

async function timed<T>(
  label: string,
  shell: string,
  run: () => Promise<T>,
  summarize: (data: T) => string,
): Promise<{ data: T; entry: QueryEntry }> {
  const start = performance.now()
  const data = await run()
  const durationMs = performance.now() - start
  return { data, entry: { label, kind: "read", shell, durationMs, summary: summarize(data) } }
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`
const { dossiers: D, medecins: M, typesExamens: T } = COLLECTIONS

// ---------------------------------------------------------------- Liste

export interface Filters {
  q: string
  sexe: string
  groupe: string
  specialite: string
  allergies: "" | "oui" | "non"
}

type SearchParams = Record<string, string | string[] | undefined>

export function parseFilters(sp: SearchParams): Filters {
  const one = (k: string) => {
    const v = sp[k]
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
  }
  const allergies = one("allergies")
  return {
    q: one("q"),
    sexe: one("sexe"),
    groupe: one("groupe"),
    specialite: one("specialite"),
    allergies: allergies === "oui" || allergies === "non" ? allergies : "",
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const realisees = { $filter: { input: { $ifNull: ["$consultations", []] }, cond: { $eq: ["$$this.statut", "realisee"] } } }
const planifiees = { $filter: { input: { $ifNull: ["$consultations", []] }, cond: { $eq: ["$$this.statut", "planifiee"] } } }

export async function listDossiers(f: Filters) {
  const user = await requireRole("medecin")
  const database = await db()
  const entries: QueryEntry[] = []
  const match: Document = { $and: [patientScope(user)] }

  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q), "i")
    match.$or = [{ "patient.nom": rx }, { "patient.prenom": rx }, { dossierId: rx }]
  }
  if (f.sexe) match["patient.sexe"] = f.sexe
  if (f.groupe) match["patient.groupeSanguin"] = f.groupe
  if (f.allergies) match["patient.allergies.0"] = { $exists: f.allergies === "oui" }

  // La spécialité est dans medecins, pas dans les dossiers : on récupère d'abord les
  // identifiants des médecins concernés, puis on filtre les consultations par medecinId.
  if (f.specialite) {
    const filter = { specialite: f.specialite }
    const options = { projection: { _id: 0, medecinId: 1 } }
    const res = await timed(
      "Médecins de la spécialité (filtre)",
      shellCall(M, "find", filter, { _id: 0, medecinId: 1 }),
      () => database.collection<Medecin>(M).find(filter, options).toArray(),
      (rows) => plural(rows.length, "médecin"),
    )
    entries.push(res.entry)
    match["consultations.medecinId"] = { $in: res.data.map((m) => m.medecinId) }
  }

  const pipeline: Document[] = [
    { $match: match },
    {
      $lookup: {
        from: M,
        localField: "consultations.medecinId",
        foreignField: "medecinId",
        as: "medecinsConsultes",
      },
    },
    {
      $project: {
        _id: 0,
        dossierId: 1,
        patient: 1,
        nbConsultations: { $size: { $ifNull: ["$consultations", []] } },
        nbPlanifiees: { $size: planifiees },
        derniereConsultation: { $max: { $map: { input: realisees, in: "$$this.date" } } },
        prochaineConsultation: { $min: { $map: { input: planifiees, in: "$$this.date" } } },
        specialites: { $setUnion: ["$medecinsConsultes.specialite"] },
      },
    },
    { $sort: { dossierId: 1 } },
  ]
  const list = await timed(
    "Liste des dossiers (agrégation + $lookup medecins)",
    shellCall(D, "aggregate", pipeline),
    () => database.collection<Dossier>(D).aggregate<DossierRow>(pipeline).toArray(),
    (rows) => plural(rows.length, "document"),
  )
  return { rows: list.data, entries: [...entries, list.entry] }
}

export async function filterOptions() {
  const user = await requireRole("medecin")
  const database = await db()
  const [specialites, groupes] = await Promise.all([
    timed(
      "Spécialités disponibles (filtre)",
      shellCall(M, "distinct", "specialite"),
      () => database.collection(M).distinct("specialite", { medecinId: user.medecinId }) as Promise<string[]>,
      (v) => plural(v.length, "valeur"),
    ),
    timed(
      "Groupes sanguins présents (filtre)",
      shellCall(D, "distinct", "patient.groupeSanguin"),
      () => database.collection(D).distinct("patient.groupeSanguin", patientScope(user)) as Promise<string[]>,
      (v) => plural(v.length, "valeur"),
    ),
  ])
  return {
    specialites: specialites.data.sort((a, b) => a.localeCompare(b)),
    groupes: groupes.data.sort(),
    entries: [specialites.entry, groupes.entry],
  }
}

// ---------------------------------------------------------------- Détail

export interface DossierVue {
  dossier: DossierPlain
  medecins: Record<string, Medecin>
  types: Record<string, TypeExamen>
}

/** Le dossier et, en une seule requête, les médecins et types d'examen qu'il référence. */
export async function getDossier(dossierId: string) {
  const user = await requireRole("medecin")
  const database = await db()
  const pipeline: Document[] = [
    { $match: { ...patientScope(user), dossierId } },
    {
      $lookup: {
        from: M,
        localField: "consultations.medecinId",
        foreignField: "medecinId",
        pipeline: [{ $project: { _id: 0 } }],
        as: "_medecins",
      },
    },
    {
      $lookup: {
        from: T,
        localField: "consultations.examens.typeExamenId",
        foreignField: "typeExamenId",
        pipeline: [{ $project: { _id: 0 } }],
        as: "_typesExamens",
      },
    },
  ]
  type Joined = Dossier & { _medecins: Medecin[]; _typesExamens: TypeExamen[] }
  const { data, entry } = await timed(
    "Dossier + référentiels ($lookup)",
    shellCall(D, "aggregate", pipeline),
    () => database.collection<Dossier>(D).aggregate<Joined>(pipeline).next(),
    (doc) => (doc ? `1 dossier · ${doc._medecins.length} médecin(s) · ${doc._typesExamens.length} type(s)` : "aucun document"),
  )
  if (!data) return { vue: null, raw: "", entry }

  const { _id, _medecins, _typesExamens, ...stored } = data
  const vue: DossierVue = {
    dossier: { ...stored, _id: _id?.toHexString() ?? "" },
    medecins: Object.fromEntries(_medecins.map((m) => [m.medecinId, m])),
    types: Object.fromEntries(_typesExamens.map((x) => [x.typeExamenId, x])),
  }
  // « Document brut » : le document tel qu'il est stocké, sans les champs ajoutés par $lookup.
  return { vue, raw: toShell({ _id, ...stored }), entry }
}

// ---------------------------------------------------------------- Référentiels

export async function listMedecins() {
  const user = await requireRole("medecin")
  const database = await db()
  const res = await timed(
    "Médecins (référentiel)",
    `${shellCall(M, "find", {}, { _id: 0 })}.sort(${toShell({ nom: 1, prenom: 1 })})`,
    () => database.collection<Medecin>(M).find({ medecinId: user.medecinId }, { projection: { _id: 0 } }).sort({ nom: 1, prenom: 1 }).toArray(),
    (rows) => plural(rows.length, "médecin"),
  )
  return { medecins: res.data, entry: res.entry }
}

export async function listTypesExamens() {
  const database = await db()
  const sort = { domaine: 1, categorie: 1, nom: 1 } as const
  const res = await timed(
    "Types d'examen (catalogue)",
    `${shellCall(T, "find", {}, { _id: 0 })}.sort(${toShell(sort)})`,
    () => database.collection<TypeExamen>(T).find({}, { projection: { _id: 0 } }).sort(sort).toArray(),
    (rows) => plural(rows.length, "type"),
  )
  return { types: res.data, entry: res.entry }
}

/** Référentiel + nombre de dossiers qui y font référence ($lookup « à l'envers »). */
async function withUsage<R>(collection: string, idField: string, refPath: string, sort: Document, label: string) {
  await requireRole("admin")
  const database = await db()
  const pipeline: Document[] = [
    {
      $lookup: {
        from: D,
        localField: idField,
        foreignField: refPath,
        pipeline: [{ $project: { _id: 0, dossierId: 1 } }],
        as: "dossiers",
      },
    },
    { $addFields: { nbDossiers: { $size: "$dossiers" } } },
    { $project: { _id: 0, dossiers: 0 } },
    { $sort: sort },
  ]
  return timed(
    label,
    shellCall(collection, "aggregate", pipeline),
    () => database.collection(collection).aggregate<R & { nbDossiers: number }>(pipeline).toArray(),
    (rows) => plural(rows.length, "document"),
  )
}

export function medecinsAvecUsage() {
  return withUsage<Medecin>(M, "medecinId", "consultations.medecinId", { nom: 1, prenom: 1 }, "Médecins et dossiers qui les référencent")
}

export function typesAvecUsage() {
  return withUsage<TypeExamen>(
    T,
    "typeExamenId",
    "consultations.examens.typeExamenId",
    { domaine: 1, categorie: 1, nom: 1 },
    "Types d'examen et dossiers qui les référencent",
  )
}

// ---------------------------------------------------------------- Statut

export async function dbStatus() {
  await requireRole("admin")
  await connection()
  try {
    const database = await getDb()
    const [info, ...counts] = await Promise.all([
      database.admin().command({ buildInfo: 1 }),
      ...[D, M, T].map((c) => database.collection(c).estimatedDocumentCount()),
    ])
    return {
      ok: true as const,
      version: String(info.version),
      host: DB_HOST,
      db: DB_NAME,
      collections: [D, M, T].map((name, i) => ({ name, count: counts[i] as number })),
    }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e), host: DB_HOST, db: DB_NAME }
  }
}
