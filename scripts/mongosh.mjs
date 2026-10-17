// Lance mongosh sur la base du projet (variables de .env.local).
//   npm run mongosh                      → shell interactif
//   npm run migration                    → exécute un script (--file …)
// Le chemin de mongosh vient de MONGOSH_PATH, sinon de la commande « mongosh » du PATH.

import { spawnSync } from "node:child_process"

const mongosh = process.env.MONGOSH_PATH || "mongosh"
const url = new URL(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017")
url.pathname = `/${process.env.MONGODB_DB ?? "DossierMedical"}`

const run = spawnSync(mongosh, [url.toString(), "--quiet", ...process.argv.slice(2)], { stdio: "inherit" })

if (run.error) {
  console.error(`✖ Impossible de lancer mongosh (${mongosh}) : ${run.error.message}`)
  console.error("  Indiquez le chemin de mongosh.exe dans MONGOSH_PATH (fichier .env.local).")
  process.exitCode = 1
} else {
  process.exitCode = run.status ?? 1
}
