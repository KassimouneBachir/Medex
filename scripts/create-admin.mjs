// Provisionnement local uniquement : aucun endpoint public d'inscription administrateur.
import { randomBytes } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { MongoClient } from "mongodb"
import { createAccount, normalizeEmail } from "../src/lib/auth-core.mjs"

const args = process.argv.slice(2)
const option = (key, fallback) => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : fallback }
const email = normalizeEmail(option("--email", "admin@medex.local"))
const name = option("--name", "Administration Medex")
const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017", { serverSelectionTimeoutMS: 4000 })
try {
  const db = client.db(process.env.MONGODB_DB ?? "DossierMedical")
  if (await db.collection("utilisateurs").findOne({ email })) throw new Error("Cette adresse possède déjà un compte. Aucun mot de passe n'a été modifié.")
  const password = randomBytes(24).toString("base64url")
  // Écrire les accès avant l'insertion afin de ne jamais créer de compte sans identifiants récupérables.
  mkdirSync("backups", { recursive: true, mode: 0o700 })
  const file = resolve("backups", `acces-administrateur-${Date.now()}.txt`)
  writeFileSync(file, `Medex — accès administrateur local\n\nConnexion : http://127.0.0.1:3000/connexion\nE-mail : ${email}\nMot de passe : ${password}\n\nVous pouvez modifier ce mot de passe dans Mon compte après connexion.\n`, { flag: "wx", mode: 0o600 })
  await createAccount(db, { email, password, name, role: "admin" })
  await Promise.all([
    db.collection("dossiersMedicaux").createIndex({ dossierId: 1 }, { unique: true, name: "dossierId_unique" }),
    db.collection("dossiersMedicaux").createIndex({ medecinId: 1 }),
  ])
  console.log(`Compte administrateur créé. Identifiants enregistrés dans : ${file}`)
} catch (error) {
  console.error(error.code === 11000 ? "Ce compte existe déjà." : `Création impossible : ${error.message}`)
  process.exitCode = 1
} finally { await client.close() }
