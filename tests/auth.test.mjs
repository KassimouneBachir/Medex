import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { MongoClient } from "mongodb"
import { authenticate, consultationScope, consumeLoginAttempt, createAccount, createSession, ensureAuthIndexes, hashPassword, patientScope, resolveSession, revokeSession, tokenHash, verifyPassword } from "../src/lib/auth-core.mjs"

test("Mots de passe salés et vérification constante", async () => {
  const password = "Phrase de test ! 2026"
  const a = await hashPassword(password)
  const b = await hashPassword(password)
  assert.notEqual(a, b)
  assert.ok(!a.includes(password))
  assert.equal(await verifyPassword(password, a), true)
  assert.equal(await verifyPassword("incorrect", a), false)
  assert.equal(await verifyPassword(password, "scrypt$invalide"), false)
  assert.equal(await verifyPassword("x".repeat(129), a), false)
})

test("Authentification, sessions et isolation des patients sur MongoDB", async (t) => {
  const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017", { serverSelectionTimeoutMS: 4000 })
  const db = client.db(`MedexAuthTest_${randomBytes(8).toString("hex")}`)
  try {
    await client.connect()
    await ensureAuthIndexes(db)
    await db.collection("medecins").insertMany([{ medecinId: "MED_A" }, { medecinId: "MED_B" }])
    await db.collection("dossiersMedicaux").insertMany([
      { dossierId: "A", medecinId: "MED_A", consultations: [] },
      { dossierId: "B", consultations: [{ consultationId: "CB", medecinId: "MED_B" }] },
      { dossierId: "SHARED", consultations: [{ consultationId: "CA", medecinId: "MED_A" }, { consultationId: "CB2", medecinId: "MED_B" }] },
    ])
    const id = await createAccount(db, { email: "DOCTOR@EXAMPLE.TEST", password: "Mot de passe de test 2026", name: "Test", role: "medecin", medecinId: "MED_A" })
    const stored = await db.collection("utilisateurs").findOne({ _id: id })
    const actor = { role: "medecin", medecinId: "MED_A" }

    await t.test("Connexion normalisée et mot de passe incorrect", async () => {
      assert.equal((await authenticate(db, " doctor@example.test ", "Mot de passe de test 2026"))._id.toString(), id.toString())
      assert.equal(await authenticate(db, "doctor@example.test", "incorrect"), null)
      assert.equal(await authenticate(db, "absent@example.test", "incorrect"), null)
      await assert.rejects(createAccount(db, { email: "doctor@example.test", password: "Mot de passe de test 2026", name: "Test", role: "admin" }))
      await assert.rejects(createAccount(db, { email: "other@example.test", password: "Mot de passe de test 2026", name: "Test", role: "medecin", medecinId: "MED_A" }))
    })
    await t.test("Session opaque, expiration, révocation et absence du hash dans le profil", async () => {
      const { token } = await createSession(db, stored)
      const profile = await resolveSession(db, token)
      assert.equal(profile.medecinId, "MED_A")
      assert.equal(profile.passwordHash, undefined)
      assert.equal(await resolveSession(db, "forged"), null)
      assert.equal(await db.collection("sessions").findOne({ _id: token }), null)
      await db.collection("sessions").updateOne({ _id: tokenHash(token) }, { $set: { expiresAt: new Date(0) } })
      assert.equal(await resolveSession(db, token), null)
      const fresh = await createSession(db, stored)
      await revokeSession(db, fresh.token)
      assert.equal(await resolveSession(db, fresh.token), null)
    })
    await t.test("Suspension et changement de mot de passe invalident immédiatement les sessions", async () => {
      const { token } = await createSession(db, stored)
      await db.collection("utilisateurs").updateOne({ _id: id }, { $set: { active: false } })
      assert.equal(await resolveSession(db, token), null)
      assert.equal(await authenticate(db, stored.email, "Mot de passe de test 2026"), null)
      await db.collection("utilisateurs").updateOne({ _id: id }, { $set: { active: true }, $inc: { authVersion: 1 } })
      assert.equal(await resolveSession(db, token), null)
    })
    await t.test("Les listes et lectures directes excluent les patients des autres médecins", async () => {
      const docs = await db.collection("dossiersMedicaux").find(patientScope(actor)).toArray()
      assert.deepEqual(docs.map(d => d.dossierId).sort(), ["A", "SHARED"])
      assert.equal(await db.collection("dossiersMedicaux").findOne({ ...patientScope(actor), dossierId: "B" }), null)
      assert.throws(() => patientScope({ role: "admin" }))
      assert.throws(() => patientScope({ role: "medecin" }))
    })
    await t.test("Modifier la consultation d’un confrère reste interdit sur un patient partagé", async () => {
      const rejected = await db.collection("dossiersMedicaux").updateOne(consultationScope(actor, "SHARED", "CB2"), { $set: { "consultations.$.motif": "Interdit" } })
      assert.equal(rejected.matchedCount, 0)
      const allowed = await db.collection("dossiersMedicaux").updateOne(consultationScope(actor, "SHARED", "CA"), { $set: { "consultations.$.motif": "Autorisé" } })
      assert.equal(allowed.modifiedCount, 1)
    })
    await t.test("Les tentatives sont limitées avant la vérification du mot de passe", async () => {
      const now = new Date()
      for (let i = 0; i < 10; i++) assert.equal(await consumeLoginAttempt(db, "limited@example.test", now), true)
      assert.equal(await consumeLoginAttempt(db, "limited@example.test", now), false)
      assert.equal(await consumeLoginAttempt(db, "limited@example.test", new Date(now.getTime() + 16 * 60 * 1000)), true)
    })
  } finally {
    // Uniquement la base temporaire au nom aléatoire créée par ce test.
    await db.dropDatabase()
    await client.close()
  }
})
