# Connexion et gestion des accès

## Premier administrateur

Après avoir configuré `.env.local` :

```bash
npm run admin:create
# Ou choisir son adresse et son nom :
npm run admin:create -- --email responsable@cabinet.fr --name "Administration du cabinet"
```

Le script crée un compte `admin@medex.local` par défaut avec un mot de passe aléatoire.
Il enregistre les identifiants dans un fichier `backups/acces-administrateur-….txt`,
lisible uniquement par le propriétaire du fichier et exclu de Git. Il ne réinitialise
pas un compte existant. Ouvrir `/connexion`, puis utiliser « Mon compte » pour modifier
le mot de passe. Il n’existe pas d’inscription publique ni de compte administrateur codé en dur.

## Administrateur

L’espace administrateur permet de :

- créer un médecin avec son adresse e-mail et son mot de passe initial ;
- créer un accès pour un médecin déjà présent, depuis « Créer un accès » sur sa fiche ;
- réinitialiser le mot de passe d’un médecin ou suspendre/réactiver son accès ;
- ajouter des types d’examens et définir les informations attendues dans leurs résultats.

Les identifiants doivent être transmis au médecin par l’administrateur ; aucun e-mail
n’est envoyé automatiquement. Un seul compte est autorisé par médecin et une adresse
e-mail ne peut appartenir qu’à un compte. Les trois médecins issus de la migration
conservent leurs fiches : leurs accès sont à créer par l’administrateur.

## Médecin et périmètre patient

Un médecin connecté peut consulter un dossier s’il en est le créateur (`medecinId`
à la racine) ou si une consultation du dossier lui est attribuée. Les anciens dossiers
restent donc accessibles à leurs médecins via les consultations existantes, sans migration.

| Opération | Administrateur | Médecin |
| --- | --- | --- |
| Gérer médecins, comptes et types d’examens | Oui | Non |
| Lire les informations médicales des patients | Non | Ses patients uniquement |
| Créer un dossier | Non | Oui, automatiquement attribué à son compte |
| Modifier les informations du patient | Non | Ses patients uniquement |
| Planifier une consultation | Non | Pour lui-même, sur ses patients |
| Compléter une consultation ou saisir ses résultats | Non | Seulement ses propres consultations |
| Supprimer une consultation | Non | Seulement ses propres consultations |
| Supprimer un dossier | Non | Ses patients, à condition qu’aucune consultation ne soit attribuée à un autre médecin |
| Modifier son propre mot de passe | Oui | Oui |

Un dossier avec plusieurs médecins est un patient partagé : chacun de ces médecins peut
lire son historique et modifier son identité, mais les écritures sur les consultations
restent limitées au médecin concerné. Aucun écran d’attribution ou de transfert à un autre
médecin n’est fourni dans cette version.

Les vérifications sont effectuées dans les lectures et les Server Actions, et pas seulement
dans les menus. Une URL ou un identifiant deviné ne donne pas accès au dossier d’un confrère.

## Fonctionnement des comptes

- `utilisateurs` : adresse normalisée, rôle, lien vers le médecin, état du compte et hash du mot de passe.
- `sessions` : empreinte SHA-256 d’un jeton aléatoire de 256 bits, utilisateur et expiration.
- `tentativesConnexion` : compteurs temporaires pour limiter les tentatives de connexion.
- Mots de passe de 12 à 128 caractères, hachés avec scrypt (`N=131072`, `r=8`, `p=1`) et un sel aléatoire par mot de passe.
- Sessions de 8 heures dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production.
- L’expiration est vérifiée à chaque lecture, indépendamment du délai de nettoyage des index TTL.
- Déconnexion, suspension et réinitialisation révoquent les sessions concernées.
- Les Server Actions conservent la vérification d’origine de Next.js ; aucun `allowedOrigins` élargi.
- Limite de 10 tentatives par adresse et de 200 au total par fenêtre de 15 minutes, stockée dans MongoDB.

En production, servir l’application en HTTPS pour le cookie sécurisé. La réinitialisation
des médecins passe par l’administrateur ; aucun parcours d’e-mail de récupération ou de
double authentification n’est inclus. Une perte d’accès administrateur se traite depuis
la machine d’administration avec un nouveau compte créé par le script local.

Le compte MongoDB défini dans `.env.local` est le compte technique du serveur. Il est
distinct des identifiants saisis dans l’écran de connexion de Medex.

## Vérification

```bash
npm run lint
npx tsc --noEmit
npm run test:auth
# Avec npm run dev déjà démarré sur le port 3000 :
npm run test:auth:http
```

`test:auth` crée une base au nom aléatoire `MedexAuthTest_…`, puis la supprime. Le compte
MongoDB de test doit être autorisé à créer cette base. Les tests HTTP créent uniquement
des comptes, médecins et dossiers fictifs temporaires dans la base de l’application et
les retirent dans un bloc `finally` ; les données existantes ne sont pas modifiées.

Références : [stockage des mots de passe OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[sessions OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
et guides Next.js installés dans `node_modules/next/dist/docs/01-app/02-guides/authentication*.md`.
