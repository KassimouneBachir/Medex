// Test du serveur Next.js démarré : fixtures temporaires dans la base locale, nettoyées en finally.
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import { MongoClient } from "mongodb"
import { createAccount, tokenHash } from "../src/lib/auth-core.mjs"

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000"
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 })
const db = client.db(process.env.MONGODB_DB ?? "DossierMedical")
const tag = `000_AUTH_TEST_${randomBytes(6).toString("hex")}`
const password = randomBytes(24).toString("base64url")
const ids = []
const cookies = []
const clean = s => s.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
async function get(route, cookie = "") {
  const res = await fetch(base + route, { headers: { cookie }, redirect: "manual", signal: AbortSignal.timeout(45000) })
  return { res, html: await res.text() }
}
async function login(email, loginPassword = password) {
  const { html } = await get("/connexion")
  const form = new FormData()
  for (const match of html.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/name="([^"]*)"/)?.[1]
    if (name?.startsWith("$ACTION")) form.append(clean(name), clean(match[0].match(/value="([^"]*)"/)?.[1] ?? ""))
  }
  form.set("email", email); form.set("password", loginPassword)
  const res = await fetch(base + "/connexion", { method: "POST", body: form, redirect: "manual", headers: { origin: base }, signal: AbortSignal.timeout(45000) })
  assert.equal(res.status, 303, "Le formulaire de connexion doit rediriger")
  const raw = res.headers.getSetCookie().find(c => c.startsWith("medex_session="))
  assert.ok(raw?.includes("HttpOnly")); assert.ok(/SameSite=lax/i.test(raw))
  const cookie = raw.split(";")[0]; cookies.push(cookie); return cookie
}
async function action(name, args, cookie = "", origin = base) {
  const manifest = JSON.parse(fs.readFileSync(".next/dev/server/server-reference-manifest.json", "utf8"))
  const id = Object.entries(manifest.node).find(([,v]) => v.exportedName === name)?.[0]
  assert.ok(id, `Action compilée : ${name}`)
  const res = await fetch(base + "/dossiers", { method: "POST", headers: { "next-action": id, "content-type": "text/plain;charset=UTF-8", origin, cookie }, body: JSON.stringify(args), redirect: "manual", signal: AbortSignal.timeout(45000) })
  return { res, text: await res.text() }
}
const patient = name => ({ nom: name, prenom: "Test", dateNaissance: "1990-01-01", sexe: "F", groupeSanguin: "O+", allergies: [], antecedents: [] })
try {
  await client.connect()
  await db.collection("medecins").insertMany([
    { medecinId: tag + "A", nom: "Test A", prenom: "Médecin", specialite: "Test" },
    { medecinId: tag + "B", nom: "Test B", prenom: "Médecin", specialite: "Test" },
  ])
  for (const [suffix, role] of [["ADMIN","admin"],["A","medecin"],["B","medecin"]]) {
    ids.push(await createAccount(db, { email: `${tag}-${suffix}@example.test`, password, name: "Compte de test", role, ...(role === "medecin" ? { medecinId: tag + suffix } : {}) }))
  }
  await db.collection("dossiersMedicaux").insertMany([
    { dossierId: tag + "A", medecinId: tag + "A", patient: patient(tag + "PatientA"), consultations: [] },
    { dossierId: tag + "B", medecinId: tag + "B", patient: patient(tag + "PatientB"), consultations: [{ consultationId: tag + "CB", medecinId: tag + "B", date: "2026-10-24", type: "initiale", statut: "realisee", motif: "Test", symptomes: [], diagnostics: [], examens: [] }] },
  ])
  const anonymous = await get("/dossiers")
  assert.ok(anonymous.html.includes("/connexion") || anonymous.res.headers.get("location")?.includes("/connexion"))
  assert.ok(!anonymous.html.includes(tag + "PatientA"))
  console.log("OK — les pages privées ne transmettent aucun dossier sans connexion")
  const admin = await login(`${tag}-ADMIN@example.test`)
  const doctor = await login(`${tag}-A@example.test`)
  const otherDoctor = await login(`${tag}-B@example.test`)
  const adminPage = await get("/medecins", admin)
  assert.equal(adminPage.res.status, 200); assert.ok(adminPage.html.includes("Ajouter un médecin"))
  const types = await get("/types-examens", admin); assert.equal(types.res.status, 200)
  const doctorPage = await get("/dossiers", doctor)
  assert.ok(doctorPage.html.includes(tag + "PatientA")); assert.ok(!doctorPage.html.includes(tag + "PatientB"))
  const otherPage = await get("/dossiers", otherDoctor)
  assert.ok(otherPage.html.includes(tag + "PatientB")); assert.ok(!otherPage.html.includes(tag + "PatientA"))
  for (const html of [adminPage.html, doctorPage.html]) assert.ok(!/Requête MongoDB|Document MongoDB|Requête qui sera exécutée|dossierId_unique/.test(html))
  const foreign = await get("/dossiers/" + tag + "B", doctor)
  assert.ok(!foreign.html.includes(tag + "PatientB")); assert.ok(foreign.html.includes("introuvable") || foreign.res.status === 404)
  const own = await get("/dossiers/" + tag + "A", doctor); assert.ok(own.html.includes(tag + "PatientA"))
  await get("/dossiers/nouveau", doctor)
  // Charger les pages qui enregistrent les références des actions dans le serveur dev.
  await get("/dossiers/" + tag + "B/consultations/" + tag + "CB/completer", otherDoctor)
  await get("/dossiers/" + tag + "A/consultations/nouvelle", doctor)
  await get("/dossiers/" + tag + "B/consultations/" + tag + "CB/examens/EXAMEN/resultat", otherDoctor)
  console.log("OK — connexion des deux rôles, listes isolées, accès direct interdit et interface sans requêtes")
  const newEmail = `${tag}-NEW@example.test`.toLowerCase()
  const added = await action("createMedecin", [{ nom: tag + "NouveauMedecin", prenom: "Test", specialite: "Test" }, { email: newEmail, password }], admin)
  assert.ok(added.text.includes('"ok":true'), "Création du médecin et de son compte")
  const newUser = await db.collection("utilisateurs").findOne({ email: newEmail }); assert.ok(newUser); ids.push(newUser._id)
  const duplicate = await action("createMedecin", [{ nom: tag + "Doublon", prenom: "Test", specialite: "Test" }, { email: newEmail, password }], admin)
  assert.ok(duplicate.text.includes('"ok":false'))
  assert.equal(await db.collection("medecins").countDocuments({ nom: tag + "Doublon" }), 0)
  const catalog = await action("createTypeExamen", [{ nom: tag + "Examen", domaine: "imagerie", categorie: "Test", format: "imagerie", parametres: [], champs: [] }], admin)
  assert.ok(catalog.text.includes('"ok":true'))
  console.log("OK — l’administrateur crée médecin, accès et examen ; un e-mail dupliqué ne laisse pas de fiche orpheline")
  const before = await db.collection("dossiersMedicaux").findOne({ dossierId: tag + "B" })
  for (const [name, args] of [
    ["updatePatient", [tag + "B", { ...patient(tag + "Falsifie"), age: "" }]],
    ["deleteDossier", [tag + "B"]],
    ["deleteConsultation", [tag + "B", tag + "CB"]],
    ["completerConsultation", [tag + "B", tag + "CB", { symptomes: [], diagnostics: [] }]],
    ["saisirResultat", [tag + "B", tag + "CB", "EXAMEN", {}]],
    ["planifierConsultation", [tag + "B", { medecinId: tag + "A", date: "2026-10-24", type: "initiale", motif: "Test", examens: [] }]],
  ]) {
    const result = await action(name, args, doctor)
    assert.ok(result.text.includes('"ok":false'), `Refus métier de ${name}`)
  }
  assert.deepEqual(await db.collection("dossiersMedicaux").findOne({ dossierId: tag + "B" }), before)
  const deniedAdmin = await action("createTypeExamen", [{}], doctor)
  assert.ok(deniedAdmin.res.headers.get("x-action-redirect")?.includes("/dossiers"))
  const deniedAnonymous = await action("createDossier", [{}])
  assert.ok(deniedAnonymous.res.headers.get("x-action-redirect")?.includes("/connexion"))
  const csrf = await action("deleteDossier", [tag + "A"], doctor, "https://untrusted.example")
  assert.ok(csrf.res.status >= 400)
  console.log("OK — les six mutations patient et les actions administrateur refusent les accès non autorisés ; origine étrangère refusée")
  const created = await action("createDossier", [{ ...patient(tag + "Cree"), age: "" }], doctor)
  assert.ok(created.text.includes('"ok":true'))
  const saved = await db.collection("dossiersMedicaux").findOne({ "patient.nom": tag + "Cree" })
  assert.equal(saved.medecinId, tag + "A")
  const resetPassword = randomBytes(24).toString("base64url")
  const reset = await action("updateDoctorAccess", [ids[1].toString(), true, resetPassword], admin)
  assert.ok(reset.text.includes('"ok":true'))
  const revoked = await get("/dossiers", doctor); assert.ok(!revoked.html.includes(tag + "PatientA"))
  const renewed = await login(`${tag}-A@example.test`, resetPassword)
  assert.ok((await get("/dossiers", renewed)).html.includes(tag + "PatientA"))
  const accountPage = await get("/compte", renewed)
  const passwordForm = [...accountPage.html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(m => m[0]).find(f => f.includes('name="currentPassword"'))
  assert.ok(passwordForm)
  const change = new FormData()
  for (const m of passwordForm.matchAll(/<input\b[^>]*>/g)) {
    const name = m[0].match(/name="([^"]*)"/)?.[1]
    if (name?.startsWith("$ACTION")) change.append(clean(name), clean(m[0].match(/value="([^"]*)"/)?.[1] ?? ""))
  }
  const ownPassword = randomBytes(24).toString("base64url")
  change.set("currentPassword", resetPassword); change.set("password", ownPassword); change.set("confirmation", ownPassword)
  const passwordChanged = await fetch(base + "/compte", { method: "POST", body: change, redirect: "manual", headers: { origin: base, cookie: renewed }, signal: AbortSignal.timeout(45000) })
  assert.equal(passwordChanged.status, 303)
  assert.ok((passwordChanged.headers.get("location") ?? "").includes("password=updated"))
  assert.ok(!(await get("/dossiers", renewed)).html.includes(tag + "PatientA"))
  await login(`${tag}-A@example.test`, ownPassword)
  console.log("OK — le médecin change son mot de passe et ses anciennes sessions sont révoquées")
  const suspend = await action("updateDoctorAccess", [ids[1].toString(), false, ""], admin)
  assert.ok(suspend.text.includes('"ok":true'))
  const suspended = await get("/dossiers", doctor)
  assert.ok(!suspended.html.includes(tag + "PatientA"))
  const out = await action("logout", [], admin)
  assert.ok(out.res.headers.get("x-action-redirect")?.includes("/connexion"))
  console.log("OK — création d’un dossier attribué au médecin, suspension immédiate et déconnexion")
} finally {
  await db.collection("dossiersMedicaux").deleteMany({ $or: [{ dossierId: { $in: [tag + "A", tag + "B"] } }, { "patient.nom": tag + "Cree" }] })
  await db.collection("sessions").deleteMany({ userId: { $in: ids } })
  await db.collection("utilisateurs").deleteMany({ _id: { $in: ids } })
  await db.collection("medecins").deleteMany({ nom: { $in: [tag + "NouveauMedecin", tag + "Doublon"] } })
  await db.collection("typesExamens").deleteMany({ nom: tag + "Examen" })
  await db.collection("medecins").deleteMany({ medecinId: { $in: [tag + "A", tag + "B"] } })
  for (const suffix of ["ADMIN", "A", "B"]) await db.collection("tentativesConnexion").deleteMany({ _id: { $regex: `^email:${tokenHash(`${tag}-${suffix}@example.test`.toLowerCase())}:` } })
  await client.close()
  console.log("Fixtures temporaires supprimées.")
}
