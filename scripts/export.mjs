// Export complet de la base en Extended JSON dans backups/ (ignoré par Git). Sessions et tentatives de connexion, éphémères, sont exclues.
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { BSON, MongoClient } from "mongodb"

const EPHEMERES = ["sessions", "tentativesConnexion"]
const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017", { serverSelectionTimeoutMS: 4000 })
try {
  const database = process.env.MONGODB_DB ?? "DossierMedical"
  const db = client.db(database)
  const collections = {}
  // ponytail: tout est chargé en mémoire ; passer à mongodump si la base dépasse quelques centaines de Mo.
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray())
    if (!EPHEMERES.includes(name)) collections[name] = await db.collection(name).find().toArray()
  mkdirSync("backups", { recursive: true, mode: 0o700 })
  const file = resolve("backups", `export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
  writeFileSync(file, BSON.EJSON.stringify({ database, createdAt: new Date(), collections }, { relaxed: false }), { flag: "wx", mode: 0o600 })
  console.log(`Export terminé : ${Object.entries(collections).map(([name, docs]) => `${name} (${docs.length})`).join(", ")}\nFichier : ${file}`)
} catch (error) {
  console.error(`Export impossible : ${error.message}`)
  process.exitCode = 1
} finally { await client.close() }
