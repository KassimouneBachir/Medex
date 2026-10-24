"use server"

// Chaque mutation vérifie le rôle et le périmètre du médecin côté serveur.

import { requireRole } from "@/lib/auth"
import { consultationScope, createAccount, normalizeEmail, patientScope, validateCredentials } from "@/lib/auth-core.mjs"
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
import { COLLECTIONS, dossiers, getDb, medecins, typesExamens } from "@/lib/mongodb"
import { shellCall } from "@/lib/shell"
import type { Dossier } from "@/lib/types"
import type { Collection, Document } from "mongodb"
import { revalidatePath } from "next/cache"

export type ActionResult = { ok: true; id: string } | { ok: false; error: string }

type Step = { shell: string; run: () => Promise<Document>; summarize: (r: Document) => string }

/** Les détails des écritures restent sur le serveur. */
async function write(_label: string, ...steps: Step[]) {
  const results: Document[] = []
  for (const step of steps) results.push(await step.run())
  revalidatePath("/", "layout")
  return { results }
}

const updated = (r: Document) => `matchedCount ${r.matchedCount} · modifiedCount ${r.modifiedCount}`

function fail(e: unknown): ActionResult {
  const message = e instanceof Error ? e.message : String(e)
  if (message.includes("E11000")) return { ok: false, error: "Cet identifiant ou cette adresse e-mail est déjà utilisé." }
  return { ok: false, error: "Impossible d’enregistrer la modification. Veuillez réessayer." }
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
  const user = await requireRole("medecin")

  const patient = draftToPatient(draft)
  const invalid = validatePatient(patient)
  if (invalid) return { ok: false, error: invalid }

  try {
    const col = await dossiers()
    const doc: Dossier = { dossierId: await nextId(col, "dossierId", "DM"), patient, medecinId: user.medecinId, consultations: [] }
    await write("Création du dossier", {
      shell: shellCall(COLLECTIONS.dossiers, "insertOne", doc),
      run: () => col.insertOne({ ...doc }),
      summarize: (r) => `insertedId ${r.insertedId.toHexString()}`,
    })
    return { ok: true, id: doc.dossierId }
  } catch (e) {
    return fail(e)
  }
}

export async function updatePatient(dossierId: string, draft: PatientDraft): Promise<ActionResult> {
  const user = await requireRole("medecin")
  if (typeof dossierId !== "string" || !dossierId || dossierId.length > 100) return { ok: false, error: "Identifiant invalide." }

  const patient = draftToPatient(draft)
  const invalid = validatePatient(patient)
  if (invalid) return { ok: false, error: invalid }

  try {
    const col = await dossiers()
    const filter = { ...patientScope(user), dossierId }
    const update = patientUpdate(patient)
    const { results } = await write("Mise à jour du patient", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Dossier introuvable." }
    return { ok: true, id: dossierId }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteDossier(dossierId: string): Promise<ActionResult> {
  const user = await requireRole("medecin")
  if (typeof dossierId !== "string" || !dossierId || dossierId.length > 100) return { ok: false, error: "Identifiant invalide." }

  try {
    const col = await dossiers()
    const filter = { ...patientScope(user), dossierId, consultations: { $not: { $elemMatch: { medecinId: { $ne: user.medecinId } } } } }
    const { results } = await write("Suppression du dossier", {
      shell: shellCall(COLLECTIONS.dossiers, "deleteOne", filter),
      run: () => col.deleteOne(filter),
      summarize: (r) => `deletedCount ${r.deletedCount}`,
    })
    if (!results[0].deletedCount) return { ok: false, error: "Dossier introuvable ou suivi par un autre médecin." }
    return { ok: true, id: dossierId }
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
  const user = await requireRole("medecin")
  if (typeof dossierId !== "string" || !dossierId || dossierId.length > 100) return { ok: false, error: "Identifiant invalide." }

  if (draft.medecinId !== user.medecinId) return { ok: false, error: "Vous pouvez planifier uniquement vos propres consultations." }
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
    const filter = { ...patientScope(user), dossierId }
    const update = { $push: { consultations: consultation } }
    const { results } = await write("Planification d'une consultation", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Dossier introuvable." }
    return { ok: true, id: dossierId }
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
  const user = await requireRole("medecin")
  if (typeof dossierId !== "string" || !dossierId || dossierId.length > 100) return { ok: false, error: "Identifiant invalide." }
  if (typeof consultationId !== "string" || !consultationId || consultationId.length > 100) return { ok: false, error: "Identifiant invalide." }

  const { update } = completionUpdate(dossierId, consultationId, draft)
  const filter = consultationScope(user, dossierId, consultationId)
  try {
    const col = await dossiers()
    const { results } = await write("Consultation complétée", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Consultation introuvable." }
    return { ok: true, id: dossierId }
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
  const user = await requireRole("medecin")
  if (typeof dossierId !== "string" || !dossierId || dossierId.length > 100) return { ok: false, error: "Identifiant invalide." }
  if (typeof consultationId !== "string" || !consultationId || consultationId.length > 100) return { ok: false, error: "Identifiant invalide." }
  if (typeof examenId !== "string" || !examenId || examenId.length > 100) return { ok: false, error: "Identifiant invalide." }

  try {
    const col = await dossiers()
    const doc = await col.findOne(
      consultationScope(user, dossierId, consultationId),
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

    const filter = consultationScope(user, dossierId, consultationId)
    const { update, options } = resultatUpdate(consultationId, examenId, resultat, aujourdhui())
    const { results } = await write(`Résultat ${examenId} (${type.nom})`, {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update, options),
      run: () => col.updateOne(filter, update, options),
      summarize: updated,
    })
    if (!results[0].matchedCount) return { ok: false, error: "Dossier introuvable." }
    return { ok: true, id: dossierId }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteConsultation(dossierId: string, consultationId: string): Promise<ActionResult> {
  const user = await requireRole("medecin")
  if (typeof dossierId !== "string" || !dossierId || dossierId.length > 100) return { ok: false, error: "Identifiant invalide." }
  if (typeof consultationId !== "string" || !consultationId || consultationId.length > 100) return { ok: false, error: "Identifiant invalide." }

  try {
    const col = await dossiers()
    const filter = consultationScope(user, dossierId, consultationId)
    const update = { $pull: { consultations: { consultationId } } }
    const { results } = await write("Suppression d'une consultation", {
      shell: shellCall(COLLECTIONS.dossiers, "updateOne", filter, update),
      run: () => col.updateOne(filter, update),
      summarize: updated,
    })
    if (!results[0].modifiedCount) return { ok: false, error: "Consultation introuvable." }
    return { ok: true, id: dossierId }
  } catch (e) {
    return fail(e)
  }
}

// ---------------------------------------------------------------- Référentiels

export async function createMedecin(draft: MedecinDraft, access: { email: string; password: string }): Promise<ActionResult> {
  await requireRole("admin")

  const fields = draftToMedecin(draft)
  const invalid = validateMedecin(fields)
  if (invalid) return { ok: false, error: invalid }

  const invalidAccess = validateCredentials(normalizeEmail(access.email), access.password)
  if (invalidAccess) return { ok: false, error: invalidAccess }

  try {
    const col = await medecins()
    const doc = { medecinId: await nextId(col, "medecinId", "MED"), ...fields }
    await write("Ajout d'un médecin", {
      shell: shellCall(COLLECTIONS.medecins, "insertOne", doc),
      run: async () => {
        const inserted = await col.insertOne({ ...doc })
        try {
          await createAccount(await getDb(), { ...access, role: "medecin", medecinId: doc.medecinId, name: `Dr ${doc.prenom} ${doc.nom}` })
        } catch (error) {
          await col.deleteOne({ _id: inserted.insertedId })
          throw error
        }
        return inserted
      },
      summarize: (r) => `insertedId ${r.insertedId.toHexString()}`,
    })
    return { ok: true, id: doc.medecinId }
  } catch (e) {
    return fail(e)
  }
}

export async function createTypeExamen(draft: TypeExamenDraft): Promise<ActionResult> {
  await requireRole("admin")

  const fields = draftToTypeExamen(draft)
  const invalid = validateTypeExamen(fields)
  if (invalid) return { ok: false, error: invalid }

  try {
    const col = await typesExamens()
    const doc = { typeExamenId: await nextId(col, "typeExamenId", "TE"), ...fields }
    await write("Ajout d'un type d'examen", {
      shell: shellCall(COLLECTIONS.typesExamens, "insertOne", doc),
      run: () => col.insertOne({ ...doc }),
      summarize: (r) => `insertedId ${r.insertedId.toHexString()}`,
    })
    return { ok: true, id: doc.typeExamenId }
  } catch (e) {
    return fail(e)
  }
}
