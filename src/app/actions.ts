"use server"

// Écritures MongoDB. Chaque action renvoie la commande exécutée et la réponse
// du serveur ; la dernière écriture est aussi gardée en cookie pour le panneau requête.

import type { Collection, Document } from "mongodb"
import { revalidatePath } from "next/cache"
import {
  completionUpdate,
  draftToMedecin,
  draftToPatient,
  draftToPlannedConsultation,
  draftToResultat,
  draftToTypeExamen,
  patientUpdate,
  resultatUpdate,
  validateMedecin,
  validatePatient,
  validatePlanning,
  validateResultat,
  validateTypeExamen,
  type CompletionDraft,
  type MedecinDraft,
  type PatientDraft,
  type PlanningDraft,
  type ResultatDraft,
  type TypeExamenDraft,
} from "@/lib/drafts"
import { aujourdhui } from "@/lib/format"
import { storeLastWrite } from "@/lib/last-write"
import { COLLECTIONS, dossiers, medecins, typesExamens } from "@/lib/mongodb"
import { shellCall, toShell } from "@/lib/shell"
import type { Dossier, QueryEntry } from "@/lib/types"

export type ActionResult = { ok: true; id: string; entry: QueryEntry } | { ok: false; error: string }

type Step = { shell: string; run: () => Promise<Document>; summarize: (r: Document) => string }

/** Exécute une ou plusieurs commandes, journalise le tout comme une seule écriture. */
async function write(label: string, ...steps: Step[]) {
  const start = performance.now()
  const results: Document[] = []
  for (const step of steps) results.push(await step.run())
  const entry: QueryEntry = {
    label,
    kind: "write",
    shell: steps.map((s) => s.shell).join("\n\n"),
    durationMs: performance.now() - start,
    summary: steps.map((s, i) => s.summarize(results[i])).join(" · "),
    result: results.length === 1 ? toShell(results[0]) : toShell(results),
    at: new Date().toISOString(),
  }
  await storeLastWrite(entry)
  revalidatePath("/", "layout")
  return { results, entry }
}

const updated = (r: Document) => `matchedCount ${r.matchedCount} · modifiedCount ${r.modifiedCount}`

function fail(e: unknown): ActionResult {
  const message = e instanceof Error ? e.message : String(e)
  if (message.includes("E11000")) return { ok: false, error: "Un document avec cet identifiant existe déjà." }
  return { ok: false, error: `Erreur MongoDB : ${message}` }
}

const num = (id: string) => Number(id.replace(/\D/g, "")) || 0
const pad = (prefix: string, n: number) => `${prefix}${String(n).padStart(3, "0")}`

/** Identifiant suivant d'un référentiel ou des dossiers : préfixe + (plus grand numéro + 1). */
async function nextId<T extends Document>(col: Collection<T>, field: string, prefix: string) {
  const last = await col.find({}, { projection: { [field]: 1 } }).sort({ [field]: -1 }).limit(1).next()
  return pad(prefix, num(String(last?.[field] ?? "")) + 1)
}

// ---------------------------------------------------------------- Dossier / patient (secrétaire)

export async function createDossier(draft: PatientDraft): Promise<ActionResult> {
  const patient = draftToPatient(draft)
  const invalid = validatePatient(patient)
  if (invalid) return { ok: false, error: invalid }

  try {
    const col = await dossiers()
    const doc: Dossier = { dossierId: await nextId(col, "dossierId", "DM"), patient, consultations: [] }
    const { entry } = await write("Création du dossier", {
      shell: shellCall(COLLECTIONS.dossiers, "insertOne", doc),
      run: () => col.insertOne({ ...doc }),
      summarize: (r) => `insertedId ${r.insertedId.toHexString()}`,
    })
    return { ok: true, id: doc.dossierId, entry }
  } catch (e) {
    return fail(e)
  }
}

export async function updatePatient(dossierId: string, draft: PatientDraft): Promise<ActionResult> {
  const patient = draftToPatient(draft)
  const invalid = validatePatient(patient)
  if (invalid) return { ok: false, error: invalid }

  try {
    const col = await dossiers()
    const filter = { dossierId }
    const update = patientUpdate(patient)
    const { results, entry } = await write("Mise à jour du patient", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Dossier introuvable." }
    return { ok: true, id: dossierId, entry }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteDossier(dossierId: string): Promise<ActionResult> {
  try {
    const col = await dossiers()
    const filter = { dossierId }
    const { results, entry } = await write("Suppression du dossier", {
      shell: shellCall(COLLECTIONS.dossiers, "deleteOne", filter),
      run: () => col.deleteOne(filter),
      summarize: (r) => `deletedCount ${r.deletedCount}`,
    })
    if (!results[0].deletedCount) return { ok: false, error: "Dossier introuvable." }
    return { ok: true, id: dossierId, entry }
  } catch (e) {
    return fail(e)
  }
}

// ---------------------------------------------------------------- Consultations

async function nextConsultationIds(examCount: number) {
  const col = await dossiers()
  const docs = await col
    .find({}, { projection: { _id: 0, "consultations.consultationId": 1, "consultations.examens.examenId": 1 } })
    .toArray()
  let c = 0
  let e = 0
  for (const d of docs)
    for (const consultation of d.consultations ?? []) {
      c = Math.max(c, num(consultation.consultationId))
      for (const x of consultation.examens ?? []) e = Math.max(e, num(x.examenId))
    }
  return {
    consultationId: pad("C", c + 1),
    examenIds: Array.from({ length: examCount }, (_, i) => pad("E", e + 1 + i)),
  }
}

/** Secrétaire : rendez-vous avec le médecin et les examens prévus ($push). */
export async function planifierConsultation(dossierId: string, draft: PlanningDraft): Promise<ActionResult> {
  const invalid = validatePlanning(draftToPlannedConsultation(draft))
  if (invalid) return { ok: false, error: invalid }

  try {
    // MongoDB ne vérifie pas les références : c'est à l'application de s'assurer qu'elles existent.
    const typeIds = [...new Set(draft.examens.filter(Boolean))]
    const [medecin, nbTypes] = await Promise.all([
      (await medecins()).countDocuments({ medecinId: draft.medecinId }),
      (await typesExamens()).countDocuments({ typeExamenId: { $in: typeIds } }),
    ])
    if (!medecin) return { ok: false, error: `Médecin ${draft.medecinId} introuvable dans le référentiel.` }
    if (nbTypes !== typeIds.length) return { ok: false, error: "Un type d'examen choisi n'existe pas dans le catalogue." }

    const consultation = draftToPlannedConsultation(draft, await nextConsultationIds(draft.examens.filter(Boolean).length))
    const col = await dossiers()
    const filter = { dossierId }
    const update = { $push: { consultations: consultation } }
    const { results, entry } = await write("Planification d'une consultation", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Dossier introuvable." }
    return { ok: true, id: dossierId, entry }
  } catch (e) {
    return fail(e)
  }
}

/** Médecin : symptômes et diagnostics, la consultation passe « realisee » (opérateur positionnel $). */
export async function completerConsultation(
  dossierId: string,
  consultationId: string,
  draft: CompletionDraft,
): Promise<ActionResult> {
  const { filter, update } = completionUpdate(dossierId, consultationId, draft)
  try {
    const col = await dossiers()
    const { results, entry } = await write("Consultation complétée", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Consultation introuvable." }
    return { ok: true, id: dossierId, entry }
  } catch (e) {
    return fail(e)
  }
}

/** Médecin (plus tard un appareil) : résultat écrit dans l'examen embarqué, via arrayFilters. */
export async function saisirResultat(
  dossierId: string,
  consultationId: string,
  examenId: string,
  draft: ResultatDraft,
): Promise<ActionResult> {
  try {
    const col = await dossiers()
    const doc = await col.findOne(
      { dossierId, "consultations.consultationId": consultationId },
      { projection: { _id: 0, "consultations.$": 1 } },
    )
    const examen = doc?.consultations[0]?.examens.find((x) => x.examenId === examenId)
    if (!examen) return { ok: false, error: "Examen introuvable." }

    // Le format des résultats est défini par le type d'examen, pas par le formulaire.
    const type = await (await typesExamens()).findOne({ typeExamenId: examen.typeExamenId })
    if (!type) return { ok: false, error: `Type d'examen ${examen.typeExamenId} introuvable.` }

    const resultat = draftToResultat(type.format, draft)
    const invalid = validateResultat(type.format, resultat)
    if (invalid) return { ok: false, error: invalid }

    const filter = { dossierId }
    const { update, options } = resultatUpdate(consultationId, examenId, resultat, aujourdhui())
    const { results, entry } = await write(`Résultat ${examenId} (${type.nom})`, {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update, options),
      run: () => col.updateOne(filter, update, options),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Dossier introuvable." }
    return { ok: true, id: dossierId, entry }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteConsultation(dossierId: string, consultationId: string): Promise<ActionResult> {
  try {
    const col = await dossiers()
    const filter = { dossierId }
    const update = { $pull: { consultations: { consultationId } } }
    const { results, entry } = await write("Suppression d'une consultation", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].modifiedCount) return { ok: false, error: "Consultation introuvable." }
    return { ok: true, id: dossierId, entry }
  } catch (e) {
    return fail(e)
  }
}

// ---------------------------------------------------------------- Référentiels

export async function createMedecin(draft: MedecinDraft): Promise<ActionResult> {
  const fields = draftToMedecin(draft)
  const invalid = validateMedecin(fields)
  if (invalid) return { ok: false, error: invalid }

  try {
    const col = await medecins()
    const doc = { medecinId: await nextId(col, "medecinId", "MED"), ...fields }
    const { entry } = await write("Ajout d'un médecin", {
      shell: shellCall(COLLECTIONS.medecins, "insertOne", doc),
      run: () => col.insertOne({ ...doc }),
      summarize: (r) => `insertedId ${r.insertedId.toHexString()}`,
    })
    return { ok: true, id: doc.medecinId, entry }
  } catch (e) {
    return fail(e)
  }
}

export async function createTypeExamen(draft: TypeExamenDraft): Promise<ActionResult> {
  const fields = draftToTypeExamen(draft)
  const invalid = validateTypeExamen(fields)
  if (invalid) return { ok: false, error: invalid }

  try {
    const col = await typesExamens()
    const doc = { typeExamenId: await nextId(col, "typeExamenId", "TE"), ...fields }
    const { entry } = await write("Ajout d'un type d'examen", {
      shell: shellCall(COLLECTIONS.typesExamens, "insertOne", doc),
      run: () => col.insertOne({ ...doc }),
      summarize: (r) => `insertedId ${r.insertedId.toHexString()}`,
    })
    return { ok: true, id: doc.typeExamenId, entry }
  } catch (e) {
    return fail(e)
  }
}
