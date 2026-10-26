# ADR-028 — Un utilisateur tient plusieurs établissements

- **Statut** : acceptée, 2026-09-01 (réunion d'équipe)
- **Portée** : `prisma/schema.prisma` (`Etablissement.entrepriseId`),
  `src/lib/auth/scope.ts`, `src/lib/etablissements/`, `src/lib/mcp/`,
  `src/components/layout/BarreCompte.tsx`
- **Rend de nouveau effective** l'ADR-001 · **Amende** l'ADR-013 · **Découle
  de** l'ADR-025
- **Amendée le 2026-10-26** (décision de la propriétaire) — voir ci-dessous

## Amendement du 2026-10-26 — une entreprise par SIREN, un onboarding par établissement

**Ce qui change.** ~~Un utilisateur possède une entreprise ; une entreprise
porte autant d'établissements qu'elle en a.~~ Un compte suit **autant
d'entreprises que de sociétés** — une `Entreprise` est l'unité légale,
identifiée par son SIREN —, et chaque entreprise porte ses établissements.
Dans l'interface, rien ne change : on parle d'établissements, chacun avec son
dossier complet et ses zones (trois au plus, ADR-029).

- `Entreprise.userId` **n'est plus unique** ; `@@unique([userId, siren])` et un
  index sur `userId` le remplacent. La racine de tenancy reste
  `entreprise.userId` : elle n'a jamais exigé l'unicité, seulement que chaque
  `where` y remonte — les 109 filtres du produit n'ont pas bougé.
- **Le SIRET et le NAF appartiennent à l'établissement.** `Etablissement.siret`
  (obligatoire à la saisie, clé de contrôle vérifiée, pas d'unicité) et
  `Etablissement.codeNaf` (obligatoire, plus de repli sur l'entreprise). Le
  SIRET d'une entreprise à deux établissements était faux pour l'un des deux.
- **Une seule porte de création : le parcours d'onboarding**, rejoué pour
  chaque établissement (lien « Ajouter un établissement » de la gélule). Un
  SIRET dont le SIREN est déjà suivi par le compte rattache l'établissement à cette
  entreprise : sa raison sociale et son effectif sont repris, en lecture
  seule ; sinon l'entreprise naît avec l'établissement. La conséquence 3 ci-dessous
  (`creerEtablissement`) est **retirée** avec `/etablissements/nouveau`.
- Un SIRET modifié sur la fiche reste dans le SIREN de son entreprise :
  changer de société, c'est ouvrir un établissement.
- Supprimer le dernier établissement d'une entreprise supprime l'entreprise.

**Ce qui reste ouvert** (décision de la propriétaire, à trancher plus tard) :
l'effectif de l'entreprise est aujourd'hui **commun aux établissements d'un même
SIREN** — c'est le chiffre que L. 2311-2 (CSE) et L. 1311-2 (règlement
intérieur) comptent. S'il devait devenir propre à chaque établissement, il
se déplace sur `Etablissement` par une migration additive, sans rien remettre
en cause du reste.

**Retrait en deux temps.** `Entreprise.siret` et `Entreprise.codeNaf` restent
en colonne, plus lus ni écrits, le temps que l'ancien code servi pendant le
build Vercel disparaisse ; la migration suivante les supprime.


## Le problème

L'ADR-001 posait, le 2026-04-21, que la V2 gère « plusieurs établissements par
entreprise », et prévoyait jusqu'au « menu de bascule entre établissements ».
Quatre mois plus tard, la base dit l'inverse : `Etablissement.entrepriseId` et
`Entreprise.userId` portent chacun une contrainte d'unicité, posées par la
migration `20260810120000_integrite_et_conservation`, et le commentaire du schéma
énonce l'invariant « 1 entreprise = 1 établissement ».

Ce verrou n'était pas une erreur : il a servi à ce qu'aucun écran ne suppose
silencieusement le multi-site pendant que le produit n'en avait pas. Il a même
été posé avec sa marche de sortie, écrite dans le schéma : « le jour où le
multi-site entrera au périmètre, il suffira de retirer le `@unique` — sans
réécrire le code appelant. »

Ce jour est le 2026-09-01. Un dirigeant qui tient deux commerces ne veut pas deux
comptes.

## La décision

**Un utilisateur possède une entreprise ; une entreprise porte autant
d'établissements qu'elle en a.**

- `Etablissement.entrepriseId @unique` **tombe**.
- `Entreprise.userId @unique` **reste**. Un compte reste une entreprise : la
  racine de tenancy de l'ADR-005 ne bouge pas, et c'est ce qui permet de ne
  toucher aucun des **neuf** helpers de `auth/scope.ts` qui prennent un
  identifiant explicite (`requireEntreprise`, `requireEtablissement`,
  `requireDuerp`, `requireUnite`, `requireRisque`, `requireAction`,
  `requireVerification`, `assertEtablissementOwnership`,
  `assertEntrepriseOwnership`) — ils bornent déjà par `entreprise.userId`. Le
  dixième, `getOptionalUserEtablissement`, est le seul qui n'en prend pas : il
  change, et c'est l'objet de la conséquence 1.

Trois conséquences, et elles suffisent.

**1. « L'établissement du compte » devient « l'établissement actif ».**
`getOptionalUserEtablissement()` faisait un `findFirst` trié par date de
création. Il lira désormais un cookie `etablissement-actif`, posé par le
sélecteur, avec repli sur le `findFirst` quand il est absent ou périmé. Pas de
table, pas de colonne : les URL portent déjà l'identifiant partout où il compte,
et ce repli n'a besoin d'être qu'un défaut raisonnable.

**2. Le MCP doit désambiguïser.** `chercherEtablissementDeUtilisateur` prenait le
premier élément d'une liste en s'appuyant explicitement sur l'invariant — c'est
le seul `[0]` du code de production, et il est documenté comme sûr par une phrase
qui devient fausse. L'outil accepte un identifiant d'établissement (paramètre
d'URL) ; à défaut, il répond `400` en listant les établissements et l'URL à
former — il ne choisit pas. Un identifiant qui ne désigne aucun établissement du
porteur reçoit la même liste, jamais un repli silencieux. Le seul cas où il ne
demande rien est celui où le compte n'en porte qu'un : il n'y a alors pas de
choix à faire, et exiger le paramètre casserait tous les connecteurs déjà
configurés. **C'est l'amendement à l'ADR-013.**

**3. Créer un second établissement redevient possible.** `creerEtablissement`
redirigeait vers l'existant ; il crée. Les gardes de périmètre de l'ADR-031 —
régimes refusés, borne d'effectif — s'appliquent là comme à l'onboarding : c'est
une création de dossier.

## Ce qui n'est pas décidé ici

Le partage d'un établissement entre plusieurs utilisateurs. Un compte reste une
entreprise, une entreprise reste à un utilisateur ; le multi-utilisateur est
toujours hors roadmap.

## Ce que ça coûte si on se trompe

Le risque est l'étanchéité : deux établissements du même compte qui se mêlent.
Il est faible — le scoping ne change pas — mais il ne se voit pas tout seul. Un
test d'isolation entre deux établissements d'une même entreprise accompagne la
migration, et la contrainte retirée doit disparaître de
`migrations-contraintes.test.ts`, qui la garde aujourd'hui.
