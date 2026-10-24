// Recharge un fichier de `npm run export` dans la base MONGODB_DB, qui doit être vide, et recrée ses index.
//   npm run import -- backups/export-….json
//   MONGODB_DB=AutreBase npm run import -- backups/export-….json
import { readFileSync } from "node:fs"
import { BSON, MongoClient } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017", { serverSelectionTimeoutMS: 4000 })
try {
  const file = process.argv[2]
  if (!file) throw new Error("indiquez le fichier : npm run import -- backups/export-….json")
  const { collections, indexes = {} } = BSON.EJSON.parse(readFileSync(file, "utf8"), { relaxed: false })
  if (!collections || typeof collections !== "object" || !Object.values(collections).every(Array.isArray))
    throw new Error("ce fichier n'est pas un export Medex.")
  const database = process.env.MONGODB_DB ?? "DossierMedical"
  const db = client.db(database)
  // Jamais par-dessus des données existantes : un import partiel mélangerait deux états de la base.
  for (const name of Object.keys(collections))
    if (await db.collection(name).countDocuments({}, { limit: 1 }))
      throw new Error(`la collection ${name} de ${database} contient déjà des documents. Importez dans une base vide (MONGODB_DB=AutreBase).`)
  // Index d'abord : les index uniques vérifient les documents dès leur insertion.
  for (const [name, specs] of Object.entries(indexes)) if (specs.length) await db.collection(name).createIndexes(specs)
  for (const [name, docs] of Object.entries(collections)) if (docs.length) await db.collection(name).insertMany(docs)
  console.log(`Import terminé dans ${database} : ${Object.entries(collections).map(([name, docs]) => `${name} (${docs.length})`).join(", ")}`)
  if (!Object.keys(indexes).length) console.warn("Ce fichier ne contient aucun index : refaites un export récent pour les retrouver.")
} catch (error) {
  console.error(`Import impossible : ${error.message}`)
  process.exitCode = 1
} finally { await client.close() }
