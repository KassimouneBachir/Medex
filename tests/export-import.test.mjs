// Aller-retour `npm run export` → `npm run import` entre deux bases jetables, supprimées à la fin avec leurs fichiers.
import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { readFileSync, rmSync } from "node:fs"
import { BSON, MongoClient } from "mongodb"

const run = (script, database, ...args) =>
  execFileSync(process.execPath, [script, ...args], { env: { ...process.env, MONGODB_DB: database }, encoding: "utf8", stdio: "pipe" })
const exportOf = (database) => run("scripts/export.mjs", database).match(/Fichier : (.+)/)[1].trim()
const load = (file) => BSON.EJSON.parse(readFileSync(file, "utf8"), { relaxed: false })
const sorted = (o) => BSON.EJSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))), { relaxed: false })

test("Un export se réimporte à l'identique, index compris, et jamais par-dessus des données", async () => {
  const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017", { serverSelectionTimeoutMS: 4000 })
  const tag = `MedexExportTest_${randomBytes(6).toString("hex")}`
  const [source, target] = [client.db(`${tag}_src`), client.db(`${tag}_dst`)]
  const files = []
  try {
    await source.collection("dossiersMedicaux").createIndex({ dossierId: 1 }, { unique: true, name: "dossierId_unique" })
    await source.collection("utilisateurs").createIndex({ medecinId: 1 }, { unique: true, partialFilterExpression: { medecinId: { $type: "string" } } })
    await source.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    await source.collection("dossiersMedicaux").insertMany([
      { dossierId: "DM001", patient: { nom: "Test", age: 42, poids: 70.5 }, consultations: [{ date: new Date("2026-10-24T10:00:00Z"), medecinId: "MED001" }] },
      { dossierId: "DM002", patient: { nom: "Autre", age: BSON.Long.fromNumber(7) }, consultations: [] },
    ])
    await source.collection("utilisateurs").insertOne({ email: "a@example.test", medecinId: "MED001", authVersion: 0 })
    await source.collection("sessions").insertOne({ _id: "jeton", expiresAt: new Date(Date.now() + 3600_000) })

    files.push(exportOf(source.databaseName))
    const original = load(files[0])
    assert.ok(!("sessions" in original.collections), "les sessions ne sont pas exportées")
    assert.equal(Number(original.indexes.sessions[0].expireAfterSeconds), 0, "mais leur index d'expiration l'est")

    assert.match(run("scripts/import.mjs", target.databaseName, files[0]), /Import terminé/)
    files.push(exportOf(target.databaseName))
    const copy = load(files[1])
    assert.equal(sorted(copy.collections), sorted(original.collections))
    assert.equal(sorted(copy.indexes), sorted(original.indexes))
    await assert.rejects(target.collection("dossiersMedicaux").insertOne({ dossierId: "DM001" }), /duplicate key/)

    assert.throws(() => run("scripts/import.mjs", target.databaseName, files[0]), /contient déjà des documents/)
    assert.equal(await target.collection("dossiersMedicaux").countDocuments(), 2)
    assert.throws(() => run("scripts/import.mjs", `${tag}_vide`, "package.json"), /pas un export Medex/)
    assert.throws(() => run("scripts/import.mjs", `${tag}_vide`), /indiquez le fichier/)
  } finally {
    for (const name of [`${tag}_src`, `${tag}_dst`, `${tag}_vide`]) await client.db(name).dropDatabase()
    await client.close()
    for (const file of files) rmSync(file)
  }
})
