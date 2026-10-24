"use server"

import { requireUser, SESSION_COOKIE } from "@/lib/auth"
import { authenticate, consumeLoginAttempt, createSession, hashPassword, homeFor, revokeSession, validateCredentials, verifyPassword } from "@/lib/auth-core.mjs"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export type AuthState = { error: string }

export async function login(_state: AuthState, form: FormData): Promise<AuthState> {
  const email = form.get("email")
  const password = form.get("password")
  if (typeof email !== "string" || typeof password !== "string") return { error: "Vérifiez vos identifiants." }
  let destination: string
  try {
    const db = await getDb()
    const user = await authenticate(db, email, password)
    if (!user) return { error: "Connexion impossible. Vérifiez vos identifiants ou réessayez dans 15 minutes." }
    const jar = await cookies()
    await revokeSession(db, jar.get(SESSION_COOKIE)?.value)
    const session = await createSession(db, user)
    jar.set(SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: session.expiresAt })
    jar.delete("medex_last_write")
    destination = homeFor(user)
  } catch {
    return { error: "Le service est temporairement indisponible. Réessayez dans quelques instants." }
  }
  revalidatePath("/", "layout")
  redirect(destination)
}

export async function logout() {
  const jar = await cookies()
  await revokeSession(await getDb(), jar.get(SESSION_COOKIE)?.value)
  jar.delete(SESSION_COOKIE)
  jar.delete("medex_last_write")
  revalidatePath("/", "layout")
  redirect("/connexion")
}

export async function changePassword(_state: AuthState, form: FormData): Promise<AuthState> {
  const user = await requireUser()
  const oldPassword = form.get("currentPassword")
  const password = form.get("password")
  const invalid = validateCredentials(user.email, password)
  if (invalid) return { error: invalid }
  if (password !== form.get("confirmation")) return { error: "Les mots de passe ne correspondent pas." }
  const db = await getDb()
  if (!await consumeLoginAttempt(db, `password-change:${user.id}`)) return { error: "Trop de tentatives. Réessayez dans 15 minutes." }
  const stored = await db.collection("utilisateurs").findOne({ _id: new ObjectId(user.id) })
  if (!stored || !await verifyPassword(oldPassword, stored.passwordHash)) return { error: "Le mot de passe actuel est incorrect." }
  const updated = await db.collection("utilisateurs").updateOne({ _id: stored._id, passwordHash: stored.passwordHash, active: true }, { $set: { passwordHash: await hashPassword(password) }, $inc: { authVersion: 1 } })
  if (!updated.modifiedCount) return { error: "Votre compte a été modifié. Reconnectez-vous avant de réessayer." }
  await db.collection("sessions").deleteMany({ userId: stored._id })
  ;(await cookies()).delete(SESSION_COOKIE)
  revalidatePath("/", "layout")
  redirect("/connexion?password=updated")
}
