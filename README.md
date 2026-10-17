# Medex : gestion de dossiers médicaux sur MongoDB

Mini-application Next.js qui met en lumière une base MongoDB orientée document. Chaque écran
affiche, dans un panneau « Requête MongoDB », la commande mongosh réellement exécutée, sa durée
et la réponse du serveur. Les formulaires montrent en direct la commande qui sera envoyée.

## Démarrage

```bash
npm install
cp .env.example .env.local   # adapter MONGODB_URI et MONGOSH_PATH
npm run seed                 # base neuve : 12 dossiers, 6 médecins, 11 types d'examen (non destructif)
npm run dev                  # http://localhost:3000
```

Prérequis : Node 20+, un MongoDB accessible (testé avec MongoDB 9.0) et mongosh pour les scripts
`.mongosh.js` (testé avec mongosh 2.13).

| Variable       | Défaut                      | Rôle                                                   |
| -------------- | --------------------------- | ------------------------------------------------------ |
| `MONGODB_URI`  | `mongodb://127.0.0.1:27017` | Chaîne de connexion                                    |
| `MONGODB_DB`   | `DossierMedical`            | Base utilisée                                          |
| `MONGOSH_PATH` | `mongosh` (PATH)            | Chemin de `mongosh.exe` pour `npm run migration` / `npm run mongosh` |

> Utiliser `127.0.0.1` et non `localhost` : Node résout `localhost` en IPv6 (`::1`), alors que
> `mongod` n'écoute qu'en IPv4 par défaut.

| Script              | Effet                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| `npm run seed`      | Insère les données absentes (par identifiant métier) et crée les index       |
| `npm run migration` | Script mongosh : passe une base à l'ancien format (médecins et types recopiés) au modèle actuel. Idempotent |
| `npm run mongosh`   | Ouvre mongosh sur la base du projet                                          |

## Stack

- **Next.js 16** (App Router, Turbopack, Cache Components), **React 19**, **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (composants basés sur Base UI), icônes Lucide, toasts Sonner
- **Driver natif `mongodb` v7** : pas d'ORM ni d'ODM. Le serveur tourne sans authentification
  (choix assumé du projet).

## Comment c'est branché

```
Navigateur
   │  GET (pages)                 POST (Server Actions)
   ▼                              ▼
Server Components  ──lit──►  src/lib/data.ts      src/app/actions.ts  ◄──écrit── formulaires
                                   │                      │
                                   └────►  src/lib/mongodb.ts  ◄────┘
                                           MongoClient unique (pool)
                                                   │
                                                   ▼
                       MongoDB · DossierMedical { dossiersMedicaux, medecins, typesExamens }
```

- **Aucune API REST intermédiaire.** Les lectures se font directement dans les Server Components
  (`src/lib/data.ts`), les écritures dans des Server Actions (`src/app/actions.ts`). Le driver ne
  tourne que côté serveur.
- **Un seul `MongoClient` par process** (`src/lib/mongodb.ts`), mis en cache sur `globalThis` pour
  survivre au hot reload. Le driver gère le pool de connexions.
- **Pourquoi le driver natif ?** Les requêtes du code sont identiques à celles de mongosh, et le
  schéma est volontairement polymorphe (résultats d'examen). La validation est faite à la main
  dans `src/lib/drafts.ts`.
- **Journal des requêtes.** Chaque lecture et chaque écriture passe par un wrapper qui chronomètre
  l'appel et sérialise la commande en syntaxe mongosh (`src/lib/shell.ts`).

## Modèle de données : embarquer, sauf ce qui se répète

Règle retenue : **tout ce qui appartient au patient est embarqué dans son dossier**, résultats
d'examens compris. **Seules les données répétées d'un dossier à l'autre sont extraites** dans
leur propre collection et référencées par identifiant.

| Collection         | Contenu                                                                    | Lien                         |
| ------------------ | -------------------------------------------------------------------------- | ---------------------------- |
| `dossiersMedicaux` | patient (identité, allergies, antécédents), consultations, examens et leurs résultats | —                 |
| `medecins`         | `medecinId`, nom, prénom, spécialité                                       | `consultations.medecinId`    |
| `typesExamens`     | `typeExamenId`, domaine, catégorie, nom, **format** et modèle de saisie    | `consultations.examens.typeExamenId` |

```
dossier {
  dossierId, patient { …, allergies[], antecedents[{ type, description, annee }] },
  consultations [ { consultationId, date, type, statut, medecinId, motif, symptomes[], diagnostics[],
                    examens [ { examenId, typeExamenId, statut, <résultat>, dateResultat, source } ] } ]
}
```

Le **format** du type d'examen fixe la forme du résultat embarqué : c'est le schéma flexible de
MongoDB dans une même collection.

| Format       | Résultat dans l'examen                          | Exemples        |
| ------------ | ----------------------------------------------- | --------------- |
| `mesures`    | `resultats: [{ parametre, valeur, unite }]`     | NFS, Glycémie   |
| `cles`       | `resultats: { frequenceCardiaque, … }`          | ECG, Spirométrie |
| `imagerie`   | `zone`, `images[]`, `rapport{}`                 | IRM, Radiographie |

Index : `dossierId_unique`, `patient_nom_prenom`, `consultations_medecinId` (dossiersMedicaux),
`medecinId_unique` (medecins) et `typeExamenId_unique` (typesExamens).

## Circuit d'une consultation

1. **Secrétaire** : crée le dossier (identité, antécédents, allergies), puis planifie une
   consultation (date, médecin choisi dans le référentiel, examens choisis dans le catalogue).
   La consultation est `planifiee`, ses examens `planifie`.
2. **Médecin** : complète la consultation (symptômes, diagnostics) → `realisee`.
3. **Médecin** : saisit le résultat de chaque examen ; le formulaire dépend du format du type et
   est pré-rempli avec son modèle (paramètres et unités, ou champs attendus). L'examen passe
   `realise` avec `dateResultat` et `source: 'medecin'`.
4. *Plus tard* : des appareils connectés écriront eux-mêmes les résultats (`source` prévu pour).

L'application ne gère pas d'utilisateurs : ces étapes sont des écrans distincts, accessibles à tous.

## Opérations MongoDB par écran

| Écran                    | Opération                                                                 |
| ------------------------ | ------------------------------------------------------------------------- |
| Liste + filtres          | `aggregate([$match, $lookup medecins, $project ($size, $filter, $map, $max/$min, $setUnion), $sort])` ; filtre spécialité : `medecins.find` puis `$in` sur `consultations.medecinId` |
| Fiche dossier            | `aggregate([$match, $lookup medecins, $lookup typesExamens])` : le dossier et ses références en une requête |
| Nouveau dossier          | `insertOne`                                                               |
| Modifier le patient      | `updateOne` + `$set` (et `$unset` de `patient.age` si vidé)               |
| Planifier                | `updateOne` + `$push` (l'app vérifie d'abord que le médecin et les types existent) |
| Compléter                | `updateOne` + opérateur positionnel `consultations.$`                     |
| Saisir un résultat       | `updateOne` + `$set` sur `consultations.$[c].examens.$[e]` avec `arrayFilters` |
| Supprimer consultation   | `updateOne` + `$pull`                                                     |
| Supprimer dossier        | `deleteOne`                                                               |
| Médecins / Types d'examen | `aggregate` avec `$lookup` inversé (nombre de dossiers qui référencent), `insertOne` |

## Fichiers clés

```
src/lib/mongodb.ts                        connexion (singleton MongoClient)
src/lib/data.ts                           toutes les lectures
src/app/actions.ts                        toutes les écritures (Server Actions)
src/lib/drafts.ts                         formulaire → document + validation (partagé client/serveur)
src/lib/shell.ts                          sérialisation mongosh + coloration
src/app/dossiers/…, medecins/, types-examens/   pages
scripts/seed.mjs                          jeu de données + index
scripts/migration-referentiels.mongosh.js migration vers le modèle à référentiels (mongosh)
scripts/mongosh.mjs                       lance mongosh avec la config de .env.local
```

## À savoir sur Next.js 16

- **Cache Components est actif** : tout ce qui n'est pas marqué dynamique est prérendu au build.
  Les lectures MongoDB appellent donc `connection()` et sont rendues sous `<Suspense>`.
- Après une écriture, `revalidatePath("/", "layout")` rafraîchit les pages concernées.

## Choix et limites

- **Intégrité référentielle** : MongoDB ne connaît pas les clés étrangères. L'app vérifie
  l'existence du médecin et des types avant de planifier. Il n'existe pas d'écran de suppression
  d'un médecin ou d'un type, pour ne pas laisser de références orphelines.
- **Atomicité** : chaque écriture ne touche qu'un document (le dossier), donc elle est atomique
  sans transaction. C'est un bénéfice direct du modèle embarqué.
- **Ordre des champs** : un `$set` qui crée de nouveaux champs les ajoute par ordre alphabétique
  (visible dans les résultats saisis). C'est le comportement de MongoDB, sans impact fonctionnel.
- **Identifiants** (`DM…`, `C…`, `E…`, `MED…`, `TE…`) : générés côté serveur par « max + 1 ». À
  grande échelle, il faudrait un compteur atomique (`findOneAndUpdate` + `$inc`).
- **Âge** : l'app affiche le champ stocké `patient.age`, qui peut diverger de `dateNaissance`.
- **Recherche** : regex insensible à la casse, sans index ; un index texte serait préférable sur
  gros volume.
- **Pas d'authentification** sur MongoDB ni dans l'app : à ajouter avant toute mise en ligne.
