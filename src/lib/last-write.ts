import { cookies } from "next/headers"
import type { QueryEntry } from "./types"

// La dernière écriture est gardée dans un cookie httpOnly pour que le panneau
// « Requête MongoDB » puisse la réafficher après navigation.
const COOKIE = "medex_last_write"

export async function storeLastWrite(entry: QueryEntry) {
  const stored = { ...entry, shell: entry.shell.length > 1500 ? `${entry.shell.slice(0, 1500)}\n…` : entry.shell }
  ;(await cookies()).set(COOKIE, Buffer.from(JSON.stringify(stored)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  })
}

export async function readLastWrite(): Promise<QueryEntry | null> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as QueryEntry
  } catch {
    return null
  }
}
