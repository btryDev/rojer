# ADR-040 — Une ligne née d'un changement du référentiel a trois mois avant d'être comptée en retard

- **Statut** : acceptée, 2026-10-08 — décision de la propriétaire du même jour,
  sur un constat de la revue de la relecture du préventeur.
- **Amende** : ADR-011 § 5 (arbitrage sur `a_planifier`), ADR-036 règles 4-5
  (« en retard dès le lendemain » de l'origine), ADR-039 § 3 (« aucun retard
  rétroactif », amendement daté en renvoi).
- **Portée** : migration `20261008120000_verification_grace_jusqu_au`
  (`Verification.graceJusquAu`, nullable) ; `calendrier/grace.ts`
  (`graceANaissance`, `mentionDelaiDeGrace`) ; `calendrier/actions.ts` (le
  `createMany`) ; `lib/dates/retard.ts` (`delaiDeGrace`, et les prédicats qui
  la lisent) ; `calendrier/portee.ts` (`urgenceSeule`, `horsGrace`) ; le
  calendrier et la fiche de vérification (la mention) ; `graceJusquAu` dans
  chaque `select` qui nourrit `VerificationDatee`.

## Contexte

Une ligne qui naît « à planifier » est datée de l'origine de son suivi
(`suiviDepuis`, ADR-036 règles 4 et 5), et l'ADR-011 § 5 la compte en retard
dès le lendemain. C'est juste quand la ligne naît d'un geste du dirigeant : il
déclare un appareil, il sait qu'il doit le faire vérifier.

Ce ne l'est pas quand elle naît d'un changement **du référentiel**. Au
lendemain du déploiement de la relecture du préventeur, chez tout client
existant, chaque ligne nouvellement applicable — rythmes retenus de l'ADR-039,
obligations neuves (extincteurs hors ERP, EPI, RIA, désenfumage, AS 9…) —
passait au rouge à J+1 : un retard que le dirigeant n'a eu aucun moyen
d'éviter, et que l'ADR-039 § 3 promettait de ne pas créer (« aucun retard
rétroactif »).

## Décision

**Une ligne « à planifier » née d'un changement du référentiel chez un dossier
existant n'est pas comptée en retard avant origine + 3 mois civils.** Le
dernier jour de grâce compte en entier (ADR-011 § 4 : une échéance du jour
n'est jamais en retard) ; le lendemain, la ligne se lit comme toute autre.

### Le critère : la cause de la passe, écrite à la naissance

Une ligne naît dans une passe de régénération, et la passe sait pourquoi elle
tourne. Le repère `Etablissement.referentielVersionCalendrier`, tel que la
passe le **lit** avant d'écrire le sien, le dit sans ambiguïté :

| Repère lu | Ce qui fait tourner la passe | Grâce |
|---|---|---|
| `null` | dossier neuf (onboarding, création d'établissement), ou marqué périmé après une régénération échouée | non |
| égal à `SCEAU_CALENDRIER` | calendrier à jour : une mutation du dirigeant (équipement, titre, prescription, fiche) | non |
| présent et différent | le référentiel ou le moteur a changé depuis la dernière réconciliation | **oui** |

Ce fait **disparaît** dès que la passe pose le nouveau sceau : aucune lecture
ultérieure ne peut le reconstituer. D'où une **migration additive**, une
colonne nullable sans défaut : `Verification.graceJusquAu`, écrite une fois
dans le `createMany` (`graceANaissance(repèreLu, SCEAU_CALENDRIER, now)` =
`debutDuJour(now)` + 3 mois, ou `null`), jamais touchée par un `update`.
Aucun rétro-remplissage : la cause de naissance d'une ligne existante n'a été
gardée nulle part.

**Pourquoi aucun critère sans migration ne tient.** `referentielVersion` sur
`Verification` n'est écrit par aucun chemin ; `suiviDepuis` comparé à la
création du porteur (établissement, appareil, titre) confond le changement du
référentiel avec une mutation du dirigeant qui rend une obligation applicable
après coup (catégorie d'ERP, effectif, caractéristique d'appareil,
prescription) — et demanderait une jointure dans chaque surface. Une date de
déploiement codée en dur accorderait la grâce aux dossiers créés le même jour.

**Pourquoi une date et non un booléen.** `graceJusquAu` dit la promesse faite
à la naissance ; la durée peut changer dans le code sans redater les lignes
déjà nées. Le prédicat ne lit qu'une colonne, et ne dépend pas de l'égalité
`datePrevue = debutDuJour(suiviDepuis)` d'un « à planifier ».

### Une lecture, une seule

`delaiDeGrace(v, now)` (`lib/dates/retard.ts`) rend le dernier jour de grâce
s'il court, sinon `null` — hors grâce : ligne archivée, soldée, sans
rendez-vous, ou qui a quitté « à planifier ». `estVerificationEnRetard` et
`estVerificationAPlanifier` la lisent (ils restent disjoints) ; la clause SQL
`urgenceSeule` en porte le pendant (`horsGrace`, écrit en positif : une
négation SQL sur une colonne `NULL` aurait écarté tous les retards d'avant la
colonne). Calendrier, tableau de bord, score, recommandations, registre et
PDF, serveur MCP passent tous par ces prédicats. `echeance-de-ligne.ts` ne lit
toujours aucune horloge : la grâce s'évalue dans les prédicats qui reçoivent
déjà « aujourd'hui ».

`graceJusquAu` est **requis** dans `VerificationDatee`, comme `archiveLe` : un
`select` qui l'oublie ne compile pas ; une valeur `undefined` passée par un
`as` se lit « pas de grâce » — du côté visible de l'erreur.

### Ce qui s'affiche

Aucune date inventée : l'échéance reste l'origine (et un « à planifier »
n'affiche pas de date). La pastille reste « À planifier » ; le calendrier
ajoute « délai jusqu'au JJ/MM/AAAA » à la méta de la ligne, la fiche une
pastille « Délai jusqu'au JJ/MM/AAAA » (`mentionDelaiDeGrace`).

### Le moteur

Empreinte recopiée **sans incrément** (`version-moteur.test.ts`) : mêmes
lignes, mêmes dates, même statut, même archivage. Un incrément ne
rétro-remplirait rien et ferait seulement de la prochaine passe de chaque
dossier une « reprise » — ce que le changement de référentiel de la relecture
fait déjà.

## Conséquences

- Au déploiement de la relecture du préventeur, la première passe de chaque
  dossier existant (ouverture du tableau de bord ou du calendrier) crée les
  lignes neuves avec trois mois de grâce. Tout changement futur du référentiel
  ou du moteur fera de même pour les lignes qu'il crée.
- **Limites acceptées, écrites pour ne pas les redécouvrir** :
  1. *Une mutation qui coïncide avec la reprise* : si le premier geste du
     dirigeant après un déploiement est une mutation (déclarer un appareil)
     avant toute ouverture du tableau de bord, la passe est aussi la reprise,
     et les lignes de l'appareil reçoivent la grâce. Erreur généreuse, rare.
  2. *Une reprise qui échoue* : marqué périmé (`null`), le dossier est repris
     plus tard sans grâce. Rare, et visible (la ligne est en retard).
  3. *Une ligne EXISTANTE que le référentiel fait passer « à planifier »* (un
     rythme qui change sur un appareil avec mise en service, l'ADR-036 D3
     appliqué au référentiel) : elle n'est pas « née », elle n'a pas de grâce,
     et son origine ancienne la met en retard. Les quatre obligations
     existantes qui reçoivent un rythme retenu dans la relecture étaient en
     `autre` sur `main` (vérifié le 2026-10-08 : aucune ligne générée, hors
     prescription qui leur aurait donné son propre rythme) : le cas n'est pas
     atteint par ce déploiement, mais il existe.
  4. *Le décompte après la grâce* : les jours de retard se comptent depuis
     l'origine (la date de la ligne) ; un « à planifier » sans rendez-vous
     n'en affiche de toute façon pas (`aUnRendezVous`).

## Alternatives écartées

- **Grâce pour toute ligne « à planifier »**, y compris une déclaration
  d'équipement sans date — *recommandée par l'auteur comme alternative, non
  implémentée*. Elle supprime les limites 1 et 2, n'exige aucune colonne (la
  grâce se lirait sur `datePrevue`), et traite pareil deux situations où le
  dirigeant n'a pas encore pu prendre rendez-vous. Elle s'écarte de l'ADR-011
  § 5 (« ce n'est pas le statut qui crée l'obligation, c'est la date ») pour
  tout le parc, et la décision du 2026-10-08 la borne au changement du
  référentiel : implémentée telle quelle.
- **Déplacer `datePrevue` à origine + 3 mois** : une date inventée, que les
  écrans afficheraient comme une échéance réglementaire.
- **Booléen `neeDUnChangementDeReferentiel`** : écarté pour la raison dite plus
  haut (la promesse se fige à la naissance ; une colonne lue au lieu de deux).
- **Critère sans migration** : aucun n'est fiable (voir « Le critère »).
