// Migration « référentiels » (syntaxe mongosh).
//
// Les médecins et les types d'examen étaient recopiés dans chaque consultation.
// Ce script les extrait dans leurs propres collections (medecins, typesExamens) et ne laisse
// dans les dossiers que leurs identifiants (medecinId, typeExamenId). Il ajoute aussi les
// statuts du circuit planification → résultat : les consultations existantes sont « realisee »,
// leurs examens « realise ».
//
// Idempotent : un dossier déjà migré n'est pas retouché, un médecin déjà connu n'est pas dupliqué.
// Lancement : npm run migration
//        ou : mongosh "mongodb://127.0.0.1:27017/DossierMedical" --file scripts/migration-referentiels.mongosh.js

const pad = (prefix, n) => prefix + String(n).padStart(3, "0")
const num = (id) => Number(String(id).replace(/\D/g, "")) || 0
const byFields = (...fields) => (a, b) => {
  for (const f of fields) {
    if (a[f] < b[f]) return -1
    if (a[f] > b[f]) return 1
  }
  return 0
}

// ------------------------------------------------------------------ 0. Index
db.medecins.createIndex({ medecinId: 1 }, { unique: true, name: "medecinId_unique" })
db.typesExamens.createIndex({ typeExamenId: 1 }, { unique: true, name: "typeExamenId_unique" })
db.dossiersMedicaux.createIndex({ "consultations.medecinId": 1 }, { name: "consultations_medecinId" })

// ------------------------------------------------------------------ 1. Inventaire
// Dossiers dont au moins une consultation embarque encore le médecin ou le type d'examen.
const aMigrer = db.dossiersMedicaux
  .find({ $or: [{ "consultations.medecin": { $exists: true } }, { "consultations.examens.type": { $exists: true } }] })
  .toArray()

const medecins = new Map() // "nom|prenom|specialite" → { nom, prenom, specialite }
const types = new Map() //    "domaine|categorie|nom" → { domaine, categorie, nom, format, parametres, champs }
const cleMedecin = (m) => [m.nom, m.prenom, m.specialite].join("|")
const cleType = (t) => [t.domaine, t.categorie, t.nom].join("|")

// La forme des résultats existants indique le format du type d'examen.
function formatDe(examen) {
  if (Array.isArray(examen.resultats)) return "mesures"
  if (examen.resultats && typeof examen.resultats === "object") return "cles"
  return "imagerie"
}

for (const dossier of aMigrer) {
  for (const c of dossier.consultations) {
    if (c.medecin) medecins.set(cleMedecin(c.medecin), { ...c.medecin })
    for (const e of c.examens) {
      if (!e.type) continue
      const t = types.get(cleType(e.type)) ?? { ...e.type, format: formatDe(e), parametres: [], champs: [] }
      // On retient les paramètres/champs déjà observés : ils serviront de modèle de saisie.
      if (t.format === "mesures")
        for (const m of e.resultats)
          if (!t.parametres.some((p) => p.parametre === m.parametre)) t.parametres.push({ parametre: m.parametre, unite: m.unite })
      if (t.format === "cles")
        for (const champ of Object.keys(e.resultats)) if (!t.champs.includes(champ)) t.champs.push(champ)
      types.set(cleType(e.type), t)
    }
  }
}

// ------------------------------------------------------------------ 2. Référentiels
const idMedecin = new Map()
let dernierMedecin = db.medecins.find().toArray().reduce((max, m) => Math.max(max, num(m.medecinId)), 0)
for (const m of [...medecins.values()].sort(byFields("nom", "prenom", "specialite"))) {
  const existant = db.medecins.findOne({ nom: m.nom, prenom: m.prenom, specialite: m.specialite })
  const medecinId = existant ? existant.medecinId : pad("MED", ++dernierMedecin)
  if (!existant) db.medecins.insertOne({ medecinId, nom: m.nom, prenom: m.prenom, specialite: m.specialite })
  idMedecin.set(cleMedecin(m), medecinId)
}

const idType = new Map()
let dernierType = db.typesExamens.find().toArray().reduce((max, t) => Math.max(max, num(t.typeExamenId)), 0)
for (const t of [...types.values()].sort(byFields("domaine", "categorie", "nom"))) {
  const existant = db.typesExamens.findOne({ domaine: t.domaine, categorie: t.categorie, nom: t.nom })
  const typeExamenId = existant ? existant.typeExamenId : pad("TE", ++dernierType)
  if (!existant) {
    const doc = { typeExamenId, domaine: t.domaine, categorie: t.categorie, nom: t.nom, format: t.format }
    if (t.format === "mesures") doc.parametres = t.parametres
    if (t.format === "cles") doc.champs = t.champs
    db.typesExamens.insertOne(doc)
  }
  idType.set(cleType(t), typeExamenId)
}

// ------------------------------------------------------------------ 3. Dossiers
let dossiersModifies = 0
for (const dossier of aMigrer) {
  const consultations = dossier.consultations.map((c) => {
    const { consultationId, date, type, medecin, medecinId, motif, symptomes, diagnostics, examens, statut } = c
    return {
      consultationId,
      date,
      type,
      statut: statut ?? "realisee",
      medecinId: medecinId ?? idMedecin.get(cleMedecin(medecin)),
      motif,
      symptomes,
      diagnostics,
      examens: examens.map((e) => {
        if (!e.type) return e
        const { examenId, type: typeEmbarque, ...resultat } = e
        const aUnResultat = Object.keys(resultat).length > 0
        return {
          examenId,
          typeExamenId: idType.get(cleType(typeEmbarque)),
          statut: aUnResultat ? "realise" : "planifie",
          ...resultat,
          ...(aUnResultat ? { dateResultat: date, source: "medecin" } : {}),
        }
      }),
    }
  })
  db.dossiersMedicaux.updateOne({ _id: dossier._id }, { $set: { consultations } })
  dossiersModifies++
}

print(`medecins      : ${db.medecins.countDocuments()} document(s) (${medecins.size} trouvé(s) dans les dossiers)`)
print(`typesExamens  : ${db.typesExamens.countDocuments()} document(s) (${types.size} trouvé(s) dans les dossiers)`)
print(`dossiers      : ${dossiersModifies} migré(s) sur ${db.dossiersMedicaux.countDocuments()}`)
