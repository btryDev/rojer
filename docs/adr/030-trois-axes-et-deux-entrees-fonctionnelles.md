# ADR-030 — Trois axes thématiques, deux entrées fonctionnelles

- **Statut** : acceptée, 2026-09-01 (réunion d'équipe)
- **Portée** : `src/components/layout/sidebar-nav.ts`, `AppSidebar.tsx`,
  `BarreCompte.tsx`, les pages d'entrée de chaque axe
- **Remplace** l'ADR-015 (et, avec elle, l'amendement de l'ADR-017 sur l'entrée
  « Opérations ») · **Découle de** l'ADR-025

## Le problème

L'ADR-015 a posé un rail dont chaque entrée est « une page d'entrée **et** un
panneau », et dont les libellés sont les questions du dirigeant : À faire,
Opérations, Mon établissement, Mes registres, Paramètres. Elle a été révisée
trois fois, chaque fois pour retirer une entrée qui ne désignait pas une page.

Le cadrage du 2026-09-01 organise le produit en trois axes transversaux :
**santé-sécurité**, **équipement et bâtiment**, **documentation**. Ce ne sont
pas les cinq entrées regroupées : c'est une autre découpe, et elle contredit la
précédente.

L'ADR-025 laissait une question ouverte : les trois axes sont-ils une navigation
ou une grille de lecture ? La réponse retenue est **une navigation**. Une grille
de lecture posée par-dessus une navigation qui la contredit ne serait lue par
personne.

## La décision

**Le rail porte cinq entrées : les trois axes, plus « À faire » et
« Paramètres ».**

Le tableau ci-dessous est celui du rail **tel qu'il est construit** par
`construireSections` / `construireRail` — pas celui du premier jet : trois de ses
cases ont été tranchées à l'implémentation, et la section suivante dit lesquelles
et pourquoi.

| Entrée | Nature | Page d'entrée | Ce qu'elle recueille |
|---|---|---|---|
| À faire | fonctionnelle | calendrier | calendrier, plan d'actions, ce qui doit être en place |
| Santé-sécurité | thématique | DUERP | DUERP, équipe et titres, prescriptions, permis de feu, plans de prévention, ~~ce que Rojer ne couvre pas~~ [2026-10-25 : passée sous Documentation, ADR-025 § 8 amendée] |
| Équipement et bâtiment | thématique | équipements | équipements, zones, prestataires, registre de sécurité, accessibilité, carnet sanitaire |
| Documentation | thématique | documents obligatoires | documents obligatoires, préparer un contrôle, comprendre (le guide), ce que Rojer ne couvre pas [2026-10-25] |
| Paramètres | fonctionnelle | fiche établissement | rien — entrée sans panneau |

**L'écart à la lettre de la directive est assumé et il est motivé.** Les trois
axes sont thématiques — ils répondent à « de quoi s'agit-il ». « À faire » et
« Paramètres » sont fonctionnelles — elles répondent à « qu'est-ce que je fais
maintenant » et « où je règle ». Le calendrier est l'écran le plus consulté du
produit ; le ranger sous « santé-sécurité » le mettrait à deux clics de son
usage quotidien pour gagner une symétrie que personne ne regarde.

**Ce que l'ADR-015 avait raison de poser est conservé** : une entrée de rail
désigne une page réelle, jamais une approximation ; cliquer navigue *et* ouvre le
panneau ; les pastilles de retard suivent l'entrée qui les concerne.

## Ce que l'implémentation a tranché, et que la décision ne disait pas

Ajouté au moment de l'écriture de `sidebar-nav.ts`, le 2026-09-01. Trois points
manquaient ou se contredisaient ; les voici avec leur motif, pour que le tableau
ci-dessus soit le rail réel et non l'intention.

**1. Les deux opérations ponctuelles vont sous « Santé-sécurité ».** Le premier
jet du tableau ne les rangeait nulle part. Elles avaient une entrée de rail
propre (ADR-017, « Opérations ») que cette ADR supprime avec les cinq entrées de
l'ADR-015, et rien ne disait où elles atterrissaient. Un permis de feu et un plan
de prévention sont des **actes de prévention datés** : ils suivent les personnes,
pas le lieu. Ce que l'ADR-017 posait ne bouge pas — ce ne sont ni des corrections
ni des registres tenus en continu ; ils gardent d'ailleurs leur qualification
événementielle (`non-ouvert` tant qu'aucun n'est ouvert), au même titre qu'un
registre non commencé. Seule leur entrée de rail disparaît, absorbée par un axe.

**2. « Préparer un contrôle » est rangé sous « Documentation », une seule fois.**
Le premier jet le citait sous deux axes — « À faire » et « Documentation ». Ce
n'est pas un rangement, c'est une hésitation. Il va du côté des documents parce
que sa sortie en est un, et parce que la décision 4 de l'ADR-015 interdit qu'une
entrée figure deux fois : le dirigeant chercherait laquelle est la bonne.

**3. Le guide retrouve une entrée, sous « Documentation ».** La troisième
révision de l'ADR-015 la lui avait retirée faute d'endroit juste — une lecture
n'est pas une des questions du dirigeant, et le rang de rail la mettait au niveau
d'un registre tenu. L'axe documentation en est un : le guide est un document
parmi ceux qui expliquent le dossier. `categorieDeItem("guide")` rend donc
`"documentation"` et non plus `null`.

**Et « Paramètres » n'a pas de panneau.** Sa page d'entrée est la **fiche
établissement** (`/modifier`), qui a quitté « Mon établissement » avec la
disparition de cette entrée. Reste ouvert, et non tranché ici : la page de
connexion d'un assistant (`/connecter`) est rattachée à cette catégorie par
`categorieDeItem`, mais une catégorie sans panneau n'affiche aucun item — la page
existe et plus aucun écran n'y mène.

## Le point qui sera difficile, et qu'il faut regarder en face

Un dirigeant qui cherche son registre de sécurité le cherche-t-il sous
« documentation » ou sous « équipement et bâtiment » ? Les deux réponses sont
défendables. Le registre est rangé sous **équipement et bâtiment**, parce que
son contenu est celui du parc — vérifications, rapports, travaux — et que
« documentation » recueille ce qui parle du dossier, pas ce qui parle du lieu.

Ce choix est le plus fragile de l'ADR. S'il se révèle faux à l'usage, il se
corrige en déplaçant une entrée, pas en rouvrant la découpe.
