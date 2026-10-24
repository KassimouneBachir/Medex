# Atelier NoSQL avec Medex

Le projet utilise un modèle hybride : certains objets sont imbriqués dans le dossier,
d'autres sont stockés dans des collections séparées et reliés par un identifiant.
Le choix dépend des lectures, des mises à jour et du volume attendu.

## 1. Comprendre la séparation des médecins

Avant la migration, chaque consultation contenait une copie du médecin. Exemple fictif :

```javascript
{
  dossierId: "DM_EXEMPLE",
  consultations: [{
    consultationId: "C_EXEMPLE",
    medecin: { nom: "Exemple", prenom: "Sam", specialite: "Cardiologie" },
    examens: []
  }]
}
```

Après la migration, le médecin est un document de `medecins` :

```javascript
{ medecinId: "MED_EXEMPLE", nom: "Exemple", prenom: "Sam", specialite: "Cardiologie" }
```

La consultation conserve uniquement sa référence :

```javascript
{
  dossierId: "DM_EXEMPLE",
  consultations: [{
    consultationId: "C_EXEMPLE",
    medecinId: "MED_EXEMPLE",
    statut: "realisee",
    examens: []
  }]
}
```

Ces exemples sont simplifiés : les autres champs du dossier restent présents.
Un changement dans `medecins` est visible lors des lectures suivantes utilisant cette
référence. Si l'on voulait conserver le nom ou la spécialité tels qu'ils étaient au moment
de la consultation, on pourrait aussi enregistrer un instantané historique dans celle-ci.

| Collection | Contenu | Pourquoi ce choix ? |
| --- | --- | --- |
| `dossiersMedicaux` | Patient, consultations, examens et résultats imbriqués | Ces informations sont consultées ensemble dans la fiche du patient. |
| `medecins` | Une fiche par médecin | Un médecin intervient dans plusieurs dossiers ; sa fiche peut être mise à jour une seule fois. |
| `typesExamens` | Catalogue et format des examens | Le même type d'examen peut être prescrit plusieurs fois ; les résultats restent propres à chaque patient. |

La migration regroupe les médecins par nom, prénom et spécialité. C'est une convention de
ce jeu de données, pas une preuve d'identité : une application réelle doit gérer les
homonymes avec un identifiant métier fiable.

## 2. Explorer les collections

Depuis le terminal à la racine du projet :

```bash
npm run mongosh
```

Puis, dans `mongosh` (les exercices ci-dessous sont en lecture seule) :

```javascript
show collections
db.dossiersMedicaux.countDocuments()
db.medecins.countDocuments()
db.typesExamens.countDocuments()
```

Observer les références sans afficher les données personnelles des patients :

```javascript
db.dossiersMedicaux.find({}, {
  _id: 0,
  dossierId: 1,
  "consultations.consultationId": 1,
  "consultations.medecinId": 1,
  "consultations.examens.typeExamenId": 1
})
```

## 3. Relier les documents avec `$lookup`

```javascript
db.dossiersMedicaux.aggregate([
  {
    $lookup: {
      from: "medecins",
      localField: "consultations.medecinId",
      foreignField: "medecinId",
      as: "medecinsConsultes"
    }
  },
  {
    $project: {
      _id: 0,
      dossierId: 1,
      "medecinsConsultes.medecinId": 1,
      "medecinsConsultes.specialite": 1
    }
  }
])
```

`$lookup` ajoute au résultat un tableau des médecins correspondants. Il ne modifie pas
le dossier stocké et n'attache pas automatiquement chaque médecin à chaque consultation.
L'application utilise ensuite `medecinId` pour retrouver la bonne fiche.

## 4. Compter les consultations par médecin

```javascript
db.dossiersMedicaux.aggregate([
  { $unwind: "$consultations" },
  { $group: { _id: "$consultations.medecinId", nbConsultations: { $sum: 1 } } },
  { $sort: { nbConsultations: -1, _id: 1 } }
])
```

`$unwind` produit une ligne par consultation dans le pipeline ; `$group` les regroupe
par médecin. Le tableau enregistré dans MongoDB reste inchangé.

## 5. Comprendre les index et les limites

```javascript
db.medecins.getIndexes()
db.dossiersMedicaux.getIndexes()
```

L'index unique sur `medecinId` interdit deux fiches ayant le même identifiant.
Il ne crée pas de clé étrangère : MongoDB n'empêche pas automatiquement une consultation
de référencer un médecin inexistant. Medex vérifie cette existence avant de planifier
une consultation et ne propose pas de suppression de médecin.

Le modèle imbriqué permet de modifier une consultation et ses résultats dans une écriture
atomique sur le dossier. Les modifications de plusieurs documents ne sont pas, par défaut,
une seule opération atomique.

Un historique de consultations qui grandit sans limite justifierait une collection
`consultations` séparée, avec `dossierId` et `medecinId`. Cela demanderait aussi d'adapter
les lectures et les formulaires. Pour ce petit jeu de données, conserver les consultations
imbriquées permet d'étudier les deux approches dans le même projet.

## 6. Observer le résultat dans l'application

- Espace administrateur, `/medecins` : fiches de l’équipe et gestion des accès.
- Espace administrateur, `/types-examens` : catalogue et modèles des résultats.
- Espace médecin : dossiers de ses patients et suivi des consultations.

Les requêtes techniques ne sont plus visibles dans l’application. Pour étudier les
agrégations réellement utilisées, consulter `src/lib/data.ts` ou exécuter les exemples
ci-dessus dans `mongosh`. Les comptes applicatifs ne sont pas des comptes MongoDB :
le shell utilise les droits du compte configuré dans `.env.local`.

Le script `npm run migration` extrait les anciennes données imbriquées. Il ne remplace
pas la base par le jeu de démonstration de `npm run seed`. Une seconde exécution sur les
mêmes données déjà migrées ne doit modifier aucun dossier. Faire une sauvegarde avant
toute nouvelle migration ; ce script réalise plusieurs écritures, sans transaction globale.

Sources : [modélisation MongoDB](https://www.mongodb.com/docs/manual/data-modeling/best-practices/)
et [opérateur `$lookup`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/).
