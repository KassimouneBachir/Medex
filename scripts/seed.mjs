// npm run seed : insère le jeu de données dans la base DossierMedical.
//   medecins          référentiel des médecins (référencés par medecinId)
//   typesExamens      catalogue des examens (référencés par typeExamenId)
//   dossiersMedicaux  un document par patient : identité, consultations, examens et résultats embarqués
// Non destructif : seuls les identifiants absents sont insérés, rien d'existant n'est modifié.
// Produit le même modèle que scripts/migration-referentiels.mongosh.js appliqué aux données d'origine.

import { MongoClient, ObjectId } from "mongodb"

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017"
const dbName = process.env.MONGODB_DB ?? "DossierMedical"

// ------------------------------------------------------------------ Référentiels

const medecins = [
  { medecinId: "MED001", nom: "Alami", prenom: "Karim", specialite: "Medecine generale" },
  { medecinId: "MED002", nom: "Bennani", prenom: "Sara", specialite: "Cardiologie" },
  { medecinId: "MED003", nom: "Chraibi", prenom: "Leila", specialite: "Pneumologie" },
  { medecinId: "MED004", nom: "Idrissi", prenom: "Nadia", specialite: "Dermatologie" },
  { medecinId: "MED005", nom: "Sow", prenom: "Mamadou", specialite: "Endocrinologie" },
  { medecinId: "MED006", nom: "Tazi", prenom: "Youssef", specialite: "Radiologie" },
]

// format : forme des résultats attendue (mesures | cles | imagerie) ; parametres / champs : modèle de saisie.
const typesExamens = [
  {
    typeExamenId: "TE001", domaine: "biologie", categorie: "biochimie", nom: "Bilan renal", format: "mesures",
    parametres: [{ parametre: "Creatinine", unite: "mg/L" }, { parametre: "Potassium", unite: "mmol/L" }],
  },
  { typeExamenId: "TE002", domaine: "biologie", categorie: "biochimie", nom: "Glycemie", format: "mesures", parametres: [{ parametre: "Glucose", unite: "g/L" }] },
  { typeExamenId: "TE003", domaine: "biologie", categorie: "biochimie", nom: "HbA1c", format: "mesures", parametres: [{ parametre: "HbA1c", unite: "%" }] },
  {
    typeExamenId: "TE004", domaine: "biologie", categorie: "gazometrie", nom: "Gaz du sang", format: "mesures",
    parametres: [{ parametre: "SpO2", unite: "%" }, { parametre: "PaO2", unite: "mmHg" }],
  },
  {
    typeExamenId: "TE005", domaine: "biologie", categorie: "hematologie", nom: "NFS", format: "mesures",
    parametres: [{ parametre: "Hemoglobine", unite: "g/dL" }, { parametre: "Leucocytes", unite: "G/L" }],
  },
  { typeExamenId: "TE006", domaine: "cardiologie", categorie: "echographie", nom: "Echocardiographie", format: "imagerie" },
  { typeExamenId: "TE007", domaine: "cardiologie", categorie: "electrophysiologie", nom: "ECG", format: "cles", champs: ["frequenceCardiaque", "rythme", "interpretation"] },
  { typeExamenId: "TE008", domaine: "imagerie", categorie: "IRM", nom: "IRM du genou", format: "imagerie" },
  { typeExamenId: "TE009", domaine: "imagerie", categorie: "IRM", nom: "IRM lombaire", format: "imagerie" },
  { typeExamenId: "TE010", domaine: "imagerie", categorie: "radiographie", nom: "Radiographie thoracique", format: "imagerie" },
  { typeExamenId: "TE011", domaine: "pneumologie", categorie: "exploration fonctionnelle", nom: "Spirometrie", format: "cles", champs: ["vemsPourcent", "cvfPourcent", "interpretation"] },
]

// ------------------------------------------------------------------ Dossiers

/** Consultation déjà réalisée : chaque examen porte son résultat, saisi par le médecin le jour même. */
function realisee({ id, date, type, medecinId, motif, symptomes = [], diagnostics = [], examens = [] }) {
  return {
    consultationId: id, date, type, statut: "realisee", medecinId, motif, symptomes, diagnostics,
    examens: examens.map(({ id: examenId, type: typeExamenId, ...resultat }) => ({
      examenId, typeExamenId, statut: "realise", ...resultat, dateResultat: date, source: "medecin",
    })),
  }
}

const dossiers = [
  // ------------------------------------------------ Jeu de données d'origine
  {
    _id: new ObjectId("6ac8a9a6a99e76d934df8b3f"),
    dossierId: "DM001",
    patient: {
      nom: "Benali", prenom: "Ahmed", dateNaissance: "1998-05-14", sexe: "M", groupeSanguin: "O+",
      allergies: [{ substance: "Penicilline", severite: "elevee" }],
    },
    consultations: [
      realisee({
        id: "C001", date: "2026-09-20", type: "initiale", medecinId: "MED001", motif: "Toux persistante",
        symptomes: [{ nom: "Toux", duree: "2 semaines", intensite: "moderee" }],
        diagnostics: [{ nom: "Asthme", statut: "suspecte" }],
        examens: [{ id: "E001", type: "TE005", resultats: [{ parametre: "Hemoglobine", valeur: 13.8, unite: "g/dL" }] }],
      }),
    ],
  },
  {
    _id: new ObjectId("6ac8b800b819363995d60156"),
    dossierId: "DM002",
    patient: {
      nom: "El Fassi", prenom: "Fatima", dateNaissance: "1995-03-12", sexe: "F", groupeSanguin: "A+", allergies: [],
    },
    consultations: [
      realisee({
        id: "C002", date: "2026-09-25", type: "initiale", medecinId: "MED002", motif: "Douleurs thoraciques",
        symptomes: [
          { nom: "Douleur thoracique", duree: "3 jours", intensite: "moderee" },
          { nom: "Fatigue", duree: "1 semaine", intensite: "legere" },
        ],
        diagnostics: [{ nom: "Douleur thoracique a explorer", statut: "provisoire" }],
        examens: [
          {
            id: "E002", type: "TE007",
            resultats: { frequenceCardiaque: 78, rythme: "sinusal", interpretation: "Pas d'anomalie evidente" },
          },
        ],
      }),
    ],
  },
  {
    _id: new ObjectId("6ac8b800b819363995d60157"),
    dossierId: "DM003",
    patient: {
      nom: "Diallo", prenom: "Ibrahim", dateNaissance: "1988-07-20", sexe: "M", groupeSanguin: "B+",
      allergies: [{ substance: "Arachides", severite: "elevee" }],
    },
    consultations: [
      realisee({
        id: "C003", date: "2026-10-01", type: "initiale", medecinId: "MED006", motif: "Douleurs au genou",
        symptomes: [{ nom: "Douleur au genou droit", duree: "2 semaines", intensite: "forte" }],
        diagnostics: [{ nom: "Lesion articulaire suspectee", statut: "suspecte" }],
        examens: [
          {
            id: "E003", type: "TE008", zone: "Genou droit", images: ["irm_genou_001.jpg", "irm_genou_002.jpg"],
            rapport: { observations: "Anomalie meniscale a explorer", conclusion: "Avis specialise recommande" },
          },
        ],
      }),
    ],
  },
  {
    _id: new ObjectId("6ac8b800b819363995d60158"),
    dossierId: "DM004",
    patient: {
      nom: "Ouattara", prenom: "Aminata", dateNaissance: "2001-11-08", sexe: "F", groupeSanguin: "O-",
      allergies: [], age: 33,
    },
    consultations: [
      realisee({
        id: "C004", date: "2026-10-05", type: "suivi", medecinId: "MED001", motif: "Bilan de sante",
        examens: [{ id: "E004", type: "TE002", resultats: [{ parametre: "Glucose", valeur: 0.92, unite: "g/L" }] }],
      }),
    ],
  },

  // ------------------------------------------------ Dossiers fictifs (démo)
  {
    dossierId: "DM005",
    patient: {
      nom: "Traore", prenom: "Moussa", dateNaissance: "1979-02-03", sexe: "M", groupeSanguin: "A-",
      allergies: [{ substance: "Aspirine", severite: "moderee" }], age: 47,
    },
    consultations: [
      realisee({
        id: "C005", date: "2026-06-12", type: "initiale", medecinId: "MED005", motif: "Soif excessive et fatigue",
        symptomes: [
          { nom: "Polydipsie", duree: "1 mois", intensite: "moderee" },
          { nom: "Fatigue", duree: "3 semaines", intensite: "legere" },
        ],
        diagnostics: [{ nom: "Diabete de type 2", statut: "suspecte" }],
        examens: [
          { id: "E005", type: "TE002", resultats: [{ parametre: "Glucose", valeur: 1.42, unite: "g/L" }] },
          { id: "E006", type: "TE003", resultats: [{ parametre: "HbA1c", valeur: 7.4, unite: "%" }] },
        ],
      }),
      realisee({
        id: "C006", date: "2026-09-15", type: "suivi", medecinId: "MED005", motif: "Suivi du diabete",
        diagnostics: [{ nom: "Diabete de type 2", statut: "confirme" }],
        examens: [{ id: "E007", type: "TE003", resultats: [{ parametre: "HbA1c", valeur: 6.8, unite: "%" }] }],
      }),
    ],
  },
  {
    dossierId: "DM006",
    patient: {
      nom: "Bennis", prenom: "Salma", dateNaissance: "1990-12-22", sexe: "F", groupeSanguin: "AB+", allergies: [], age: 35,
    },
    consultations: [
      realisee({
        id: "C007", date: "2026-07-08", type: "initiale", medecinId: "MED003", motif: "Essoufflement a l'effort",
        symptomes: [{ nom: "Dyspnee", duree: "1 mois", intensite: "moderee" }],
        diagnostics: [{ nom: "Asthme d'effort", statut: "provisoire" }],
        examens: [
          {
            id: "E008", type: "TE011",
            resultats: { vemsPourcent: 82, cvfPourcent: 91, interpretation: "Trouble ventilatoire obstructif leger" },
          },
        ],
      }),
    ],
  },
  {
    dossierId: "DM007",
    patient: {
      nom: "Amrani", prenom: "Youssef", dateNaissance: "1965-04-30", sexe: "M", groupeSanguin: "O+",
      allergies: [{ substance: "Iode", severite: "elevee" }], age: 61,
    },
    consultations: [
      realisee({
        id: "C008", date: "2026-08-02", type: "initiale", medecinId: "MED002", motif: "Palpitations",
        symptomes: [
          { nom: "Palpitations", duree: "2 semaines", intensite: "moderee" },
          { nom: "Vertiges", duree: "1 semaine", intensite: "legere" },
        ],
        diagnostics: [{ nom: "Fibrillation atriale", statut: "confirme" }],
        examens: [
          { id: "E009", type: "TE007", resultats: { frequenceCardiaque: 112, rythme: "irregulier", interpretation: "Fibrillation atriale" } },
        ],
      }),
      realisee({
        id: "C009", date: "2026-09-30", type: "suivi", medecinId: "MED002", motif: "Controle sous traitement",
        diagnostics: [{ nom: "Fibrillation atriale", statut: "confirme" }],
        examens: [
          { id: "E010", type: "TE007", resultats: { frequenceCardiaque: 74, rythme: "sinusal", interpretation: "Retour en rythme sinusal" } },
          {
            id: "E011", type: "TE001",
            resultats: [
              { parametre: "Creatinine", valeur: 9.1, unite: "mg/L" },
              { parametre: "Potassium", valeur: 4.2, unite: "mmol/L" },
            ],
          },
        ],
      }),
    ],
  },
  {
    dossierId: "DM008",
    patient: {
      nom: "Camara", prenom: "Awa", dateNaissance: "2015-09-14", sexe: "F", groupeSanguin: "B-",
      allergies: [{ substance: "Lactose", severite: "legere" }], age: 11,
    },
    consultations: [
      realisee({
        id: "C010", date: "2026-10-10", type: "initiale", medecinId: "MED001", motif: "Fievre et toux",
        symptomes: [
          { nom: "Fievre", duree: "3 jours", intensite: "forte" },
          { nom: "Toux", duree: "4 jours", intensite: "moderee" },
        ],
        diagnostics: [{ nom: "Bronchite aigue", statut: "provisoire" }],
        examens: [
          {
            id: "E012", type: "TE010", zone: "Thorax", images: ["rx_thorax_012.jpg"],
            rapport: { observations: "Pas de foyer de condensation", conclusion: "Radiographie normale" },
          },
          {
            id: "E013", type: "TE005",
            resultats: [
              { parametre: "Leucocytes", valeur: 11.2, unite: "G/L" },
              { parametre: "Hemoglobine", valeur: 12.1, unite: "g/dL" },
            ],
          },
        ],
      }),
    ],
  },
  {
    dossierId: "DM009",
    patient: {
      nom: "Berrada", prenom: "Omar", dateNaissance: "1983-01-17", sexe: "M", groupeSanguin: "A+", allergies: [], age: 43,
    },
    consultations: [
      realisee({
        id: "C011", date: "2026-05-20", type: "initiale", medecinId: "MED004", motif: "Eruption cutanee",
        symptomes: [
          { nom: "Prurit", duree: "10 jours", intensite: "moderee" },
          { nom: "Plaques rouges", duree: "10 jours", intensite: "moderee" },
        ],
        diagnostics: [{ nom: "Eczema de contact", statut: "suspecte" }],
      }),
    ],
  },
  {
    dossierId: "DM010",
    patient: {
      nom: "Ndiaye", prenom: "Fatou", dateNaissance: "1972-06-05", sexe: "F", groupeSanguin: "O+",
      allergies: [
        { substance: "Sulfamides", severite: "elevee" },
        { substance: "Pollen", severite: "legere" },
      ],
      age: 54,
    },
    consultations: [
      realisee({
        id: "C012", date: "2026-09-03", type: "initiale", medecinId: "MED006", motif: "Douleurs lombaires",
        symptomes: [{ nom: "Lombalgie", duree: "1 mois", intensite: "forte" }],
        diagnostics: [{ nom: "Hernie discale", statut: "suspecte" }],
        examens: [
          {
            id: "E014", type: "TE009", zone: "Rachis lombaire",
            images: ["irm_lombaire_001.jpg", "irm_lombaire_002.jpg", "irm_lombaire_003.jpg"],
            rapport: { observations: "Protrusion discale L4-L5", conclusion: "Avis neurochirurgical" },
          },
        ],
      }),
      realisee({
        id: "C013", date: "2026-10-12", type: "suivi", medecinId: "MED001", motif: "Suivi lombalgie",
        symptomes: [{ nom: "Lombalgie", duree: "6 semaines", intensite: "moderee" }],
        diagnostics: [{ nom: "Hernie discale L4-L5", statut: "confirme" }],
      }),
    ],
  },
  {
    dossierId: "DM011",
    patient: {
      nom: "El Idrissi", prenom: "Mehdi", dateNaissance: "1999-10-28", sexe: "M", groupeSanguin: "B+", allergies: [], age: 26,
    },
    consultations: [
      realisee({
        id: "C014", date: "2026-07-22", type: "urgence", medecinId: "MED003", motif: "Crise d'asthme",
        symptomes: [
          { nom: "Dyspnee", duree: "1 jour", intensite: "forte" },
          { nom: "Sifflements", duree: "1 jour", intensite: "forte" },
        ],
        diagnostics: [{ nom: "Exacerbation asthmatique", statut: "confirme" }],
        examens: [
          {
            id: "E015", type: "TE004",
            resultats: [
              { parametre: "SpO2", valeur: 93, unite: "%" },
              { parametre: "PaO2", valeur: 68, unite: "mmHg" },
            ],
          },
        ],
      }),
    ],
  },
  {
    dossierId: "DM012",
    patient: {
      nom: "Lahlou", prenom: "Imane", dateNaissance: "1987-03-09", sexe: "F", groupeSanguin: "A-",
      allergies: [{ substance: "Latex", severite: "moderee" }], age: 39,
    },
    consultations: [
      realisee({
        id: "C015", date: "2026-08-18", type: "initiale", medecinId: "MED002", motif: "Hypertension",
        symptomes: [{ nom: "Cephalees", duree: "2 semaines", intensite: "legere" }],
        diagnostics: [{ nom: "Hypertension arterielle", statut: "confirme" }],
        examens: [
          {
            id: "E016", type: "TE006", zone: "Coeur", images: ["echo_coeur_016.jpg"],
            rapport: { observations: "FEVG 60 %, pas d'hypertrophie", conclusion: "Examen normal" },
          },
        ],
      }),
    ],
  },
]

// ------------------------------------------------------------------ Insertion

/** insertMany des seuls documents dont l'identifiant métier est absent. */
async function insertMissing(col, idField, docs) {
  const existing = new Set(await col.distinct(idField))
  const missing = docs.filter((d) => !existing.has(d[idField]))
  if (missing.length) await col.insertMany(missing, { ordered: false })
  return `${missing.length} inséré(s), ${docs.length - missing.length} déjà présent(s)`
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 })

try {
  await client.connect()
  const db = client.db(dbName)

  await db.collection("medecins").createIndex({ medecinId: 1 }, { unique: true, name: "medecinId_unique" })
  await db.collection("typesExamens").createIndex({ typeExamenId: 1 }, { unique: true, name: "typeExamenId_unique" })
  await db.collection("dossiersMedicaux").createIndex({ dossierId: 1 }, { unique: true, name: "dossierId_unique" })
  await db.collection("dossiersMedicaux").createIndex({ "patient.nom": 1, "patient.prenom": 1 }, { name: "patient_nom_prenom" })
  await db.collection("dossiersMedicaux").createIndex({ "consultations.medecinId": 1 }, { name: "consultations_medecinId" })

  console.log(`✔ ${dbName} sur ${uri}`)
  console.log(`  medecins          ${await insertMissing(db.collection("medecins"), "medecinId", medecins)}`)
  console.log(`  typesExamens      ${await insertMissing(db.collection("typesExamens"), "typeExamenId", typesExamens)}`)
  console.log(`  dossiersMedicaux  ${await insertMissing(db.collection("dossiersMedicaux"), "dossierId", dossiers)}`)
} catch (e) {
  console.error(`✖ Seed impossible : ${e.message}`)
  process.exitCode = 1
} finally {
  await client.close()
}
