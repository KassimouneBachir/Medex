"use server"

import { requireRole } from "@/lib/auth"
import { createAccount, hashPassword, normalizeEmail, validateCredentials } from "@/lib/auth-core.mjs"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "./actions"

export async function createDoctorAccess(medecinId: string, email: string, password: string): Promise<ActionResult> {
  await requireRole("admin")
  if (typeof medecinId !== "string") return { ok: false, error: "Médecin invalide." }
  const invalid = validateCredentials(normalizeEmail(email), password)
  if (invalid) return { ok: false, error: invalid }
  const db = await getDb()
  const medecin = await db.collection("medecins").findOne({ medecinId })
  if (!medecin) return { ok: false, error: "Médecin introuvable." }
  try {
    await createAccount(db, { email, password, name: `Dr ${medecin.prenom} ${medecin.nom}`, role: "medecin", medecinId })
  } catch {
    return { ok: false, error: "Impossible de créer cet accès. Vérifiez que l’adresse e-mail et le médecin n’ont pas déjà un compte." }
  }
  revalidatePath("/medecins")
  return { ok: true, id: medecinId }
}

export async function updateDoctorAccess(userId: string, active: boolean, password: string): Promise<ActionResult> {
  await requireRole("admin")
  if (typeof userId !== "string" || !ObjectId.isValid(userId) || typeof active !== "boolean" || typeof password !== "string")
    return { ok: false, error: "Compte invalide." }
  const db = await getDb()
  const filter = { _id: new ObjectId(userId), role: "medecin" }
  const user = await db.collection("utilisateurs").findOne(filter)
  if (!user) return { ok: false, error: "Compte introuvable." }
  const invalid = password ? validateCredentials(user.email, password) : null
  if (invalid) return { ok: false, error: invalid }
  await db.collection("utilisateurs").updateOne(filter, { $set: { active, ...(password ? { passwordHash: await hashPassword(password) } : {}) }, $inc: { authVersion: 1 } })
  await db.collection("sessions").deleteMany({ userId: user._id })
  revalidatePath("/medecins")
  return { ok: true, id: user.medecinId }
}
