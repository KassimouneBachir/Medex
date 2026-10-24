import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"
import "server-only"
import { homeFor, resolveSession } from "./auth-core.mjs"
import { getDb } from "./mongodb"

export const SESSION_COOKIE = "medex_session"
export type Role = "admin" | "medecin"
export type CurrentUser = { id: string; email: string; name: string; role: Role; medecinId?: string }

export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection()
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return resolveSession(await getDb(), token) as Promise<CurrentUser | null>
})

export async function requireUser() {
  const user = await currentUser()
  if (!user) redirect("/connexion")
  return user
}

export async function requireRole(role: Role) {
  const user = await requireUser()
  if (user.role !== role) redirect(homeFor(user))
  return user
}
