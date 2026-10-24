import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const derive = promisify(scrypt)
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }
export const SESSION_SECONDS = 8 * 60 * 60
export const normalizeEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : ""
export const tokenHash = (token) => createHash("sha256").update(token).digest("hex")
export const homeFor = (user) => user.role === "admin" ? "/medecins" : "/dossiers"

export function validateCredentials(email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return "Indiquez une adresse e-mail valide."
  if (typeof password !== "string" || password.length < 12 || password.length > 128)
    return "Le mot de passe doit contenir entre 12 et 128 caractères."
  return null
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex")
  const key = await derive(password, salt, 64, SCRYPT)
  return `scrypt$${salt}$${key.toString("hex")}`
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== "string" || password.length > 128 || typeof encoded !== "string") return false
  const [scheme, salt, hash, extra] = encoded.split("$")
  if (scheme !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash) || extra) return false
  const actual = await derive(password, salt, 64, SCRYPT)
  return timingSafeEqual(actual, Buffer.from(hash, "hex"))
}

const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`

export async function ensureAuthIndexes(db) {
  await Promise.all([
    db.collection("utilisateurs").createIndex({ email: 1 }, { unique: true }),
    db.collection("utilisateurs").createIndex({ medecinId: 1 }, { unique: true, partialFilterExpression: { medecinId: { $type: "string" } } }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("sessions").createIndex({ userId: 1 }),
    db.collection("tentativesConnexion").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ])
}

export async function createAccount(db, { email, password, name, role, medecinId }) {
  email = normalizeEmail(email)
  const error = validateCredentials(email, password)
  if (error) throw new Error(error)
  if (!["admin", "medecin"].includes(role)) throw new Error("Rôle invalide.")
  if (role === "medecin" && (typeof medecinId !== "string" || !await db.collection("medecins").findOne({ medecinId })))
    throw new Error("Médecin introuvable.")
  await ensureAuthIndexes(db)
  const doc = { email, passwordHash: await hashPassword(password), name: String(name).slice(0, 160), role, active: true, authVersion: 0, createdAt: new Date(), ...(role === "medecin" ? { medecinId } : {}) }
  return (await db.collection("utilisateurs").insertOne(doc)).insertedId
}

// Compteurs atomiques partagés entre processus, avant le calcul coûteux du mot de passe.
export async function consumeLoginAttempt(db, email, now = new Date()) {
  const window = Math.floor(now.getTime() / (15 * 60 * 1000))
  const keys = [{ key: `email:${tokenHash(email)}:${window}`, max: 10 }, { key: `global:${window}`, max: 200 }]
  for (const { key, max } of keys) {
    const result = await db.collection("tentativesConnexion").findOneAndUpdate(
      { _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * 15 * 60 * 1000) } },
      { upsert: true, returnDocument: "after" },
    )
    if (result.count > max) return false
  }
  return true
}

export async function authenticate(db, email, password) {
  email = normalizeEmail(email)
  if (!email || email.length > 254 || typeof password !== "string" || password.length > 128) return null
  if (!await consumeLoginAttempt(db, email)) return null
  const user = await db.collection("utilisateurs").findOne({ email })
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
  if (!valid || !user?.active || !["admin", "medecin"].includes(user.role)) return null
  if (user.role === "medecin" && !await db.collection("medecins").findOne({ medecinId: user.medecinId })) return null
  return user
}

export async function createSession(db, user) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000)
  await db.collection("sessions").insertOne({ _id: tokenHash(token), userId: user._id, authVersion: user.authVersion, expiresAt })
  return { token, expiresAt }
}

export async function resolveSession(db, token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null
  const session = await db.collection("sessions").findOne({ _id: tokenHash(token), expiresAt: { $gt: new Date() } })
  if (!session) return null
  const user = await db.collection("utilisateurs").findOne({ _id: session.userId, active: true, authVersion: session.authVersion }, { projection: { passwordHash: 0 } })
  if (!user || !["admin", "medecin"].includes(user.role)) return null
  if (user.role === "medecin" && !await db.collection("medecins").findOne({ medecinId: user.medecinId })) return null
  return { id: user._id.toHexString(), email: user.email, name: user.name, role: user.role, medecinId: user.medecinId }
}

export async function revokeSession(db, token) {
  if (typeof token === "string") await db.collection("sessions").deleteOne({ _id: tokenHash(token) })
}

/** Les patients créés et les patients ayant une consultation avec ce médecin. */
export function patientScope(user) {
  if (user?.role !== "medecin" || typeof user.medecinId !== "string" || !user.medecinId)
    throw new Error("Accès réservé aux médecins.")
  return { $or: [{ medecinId: user.medecinId }, { "consultations.medecinId": user.medecinId }] }
}

export function consultationScope(user, dossierId, consultationId) {
  patientScope(user)
  return { dossierId, consultations: { $elemMatch: { consultationId, medecinId: user.medecinId } } }
}
