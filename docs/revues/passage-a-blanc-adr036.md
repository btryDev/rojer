# Passage à blanc — l'échéance calculée depuis les faits (ADR-036, lot 2c)

> **Depuis la bascule (lot 4, 2026-09-19)** le script de la branche
> `lot/adr036-bascule` n'a plus deux stratégies à comparer : il compare l'état
> EN BASE au plan du moteur 3 (`comparerAuMoteur`), avec les mêmes catégories
> et le même rejeu à J+400. C'est un contrôle de santé : après la régénération
> d'un dossier, tout doit y être `identique`. Le mode d'emploi ci-dessous
> décrit la version du lot 2c.
>
> **Depuis le lot 5 (2026-09-19)** il n'y a plus de garde du legs, donc plus de
> catégorie `legs_statut_realise` : le contrôle de santé du même jour n'en
> comptait aucun en production. Le script RESTE, comme contrôle de santé — à
> relancer quand un écart est soupçonné : après la régénération d'un dossier,
> tout doit y être `identique`, et le rejeu à J+400 vide.
>
> **Effet visible de la fusion, hors du calendrier** : le moteur 3 réécrit le
> sceau de chaque dossier, donc `Etablissement.updatedAt`. Les fiches
> « Renseignements généraux » et « ERP » du registre PDF impriment cette date
> (`registre/queries.ts`) : elles prendront la date de la première ouverture du
> dossier après la fusion. Ce n'est pas un écart du passage à blanc.

Mode d'emploi du script `scripts/passage-a-blanc-echeances.ts`, écrit le
**2026-09-18** sur la branche `lot/adr036-passage-a-blanc`. Il compare, sans rien
écrire, ce que la stratégie de date **en ligne** (`deciderParConservation`) écrit à
ce que la stratégie **candidate** (`deciderParFaits`, qui appelle
`echeanceDeLigne`) écrirait — établissement par établissement, ligne par ligne,
catégorie par catégorie. C'est la méthode « Scientist » de l'ADR-036 § 9 : le
nouveau calcul tourne à côté de l'ancien, on journalise les écarts, puis on
bascule (lot 4).

**Le script ne modifie rien.** Sa transaction commence par `SET TRANSACTION READ
ONLY` — PostgreSQL refuserait toute écriture, même par erreur —, il ne contient
aucune méthode d'écriture Prisma (un test relit son texte pour le garantir :
`src/lib/calendrier/passage-a-blanc.test.ts`), et il n'a **aucune option
`--appliquer`**. La bascule se fait par le code, au lot 4, pas par un script.

---

## 1. Avant de lancer

- La migration `20260918090000_verification_suivi_depuis` doit être **appliquée
  sur la base lue** : le script lit la colonne `Verification.suiviDepuis`. Elle
  est appliquée par le premier build Vercel qui suit la fusion dans `main`
  (`prisma migrate deploy`). ~~previews comprises~~ — les previews sont
  abandonnées depuis le 2026-09-18 (`docs/chantiers-ouverts.md` § 13), donc la
  migration n'est jouée qu'une fois, au build de production. Avant cela, le
  script échoue en `P2022` (colonne inconnue) — c'est la réponse juste, pas un
  défaut.
- `.env` pointe la base de **production**. Le script l'affiche en tête, mot de
  passe masqué : vérifier cette ligne avant de lire la suite.
- Aucun nom de personne ni d'établissement n'est imprimé — des identifiants
  seulement. **Le fichier `--json` non plus, mais il a fallu le rendre vrai** :
  la première rédaction sérialisait les plans en entier, et une ligne de titre
  naît avec `raisons: ["titre détenu par Prénom Nom"]`, quand
  `libelleObligation` d'une ligne sur mesure porte le libellé de la
  prescription — qui nomme couramment l'assureur (relecture neutre du
  2026-09-18). L'export passe désormais par une projection explicite
  (`projeterPlan`, `projeterLigne`) : identifiants, dates, statuts, rythmes, et
  rien qui vienne d'une saisie. Un test le vérifie sur la sortie réelle.

## 2. La commande

```sh
pnpm tsx --env-file=.env scripts/passage-a-blanc-echeances.ts --json passage-a-blanc-$(date +%F).json
```

Variantes :

```sh
# Un seul établissement
pnpm tsx --env-file=.env scripts/passage-a-blanc-echeances.ts --etablissement <id>

# Sans export
pnpm tsx --env-file=.env scripts/passage-a-blanc-echeances.ts
```

Le fichier `--json` garde **l'état d'avant** (chaque ligne telle qu'elle est en
base) et les deux plans. C'est la trace à laquelle l'ADR-036 § 10 renvoie pour le
retour arrière : une date est une donnée dérivée, aucun fait n'est détruit par la
bascule, mais on veut pouvoir dire ce qu'elle a réécrit. À conserver hors du
dépôt.

## 3. Lire le résultat

Pour chaque établissement, une table **catégorie → nombre**, puis une ligne par
écart hors `identique` et `meme_jour_civil` :

```
[catégorie] <id de ligne> <obligationId> eq=<id> : <ancienne date> → <nouvelle> ; <ancien statut> → <nouveau> ; source=<d'où sort la nouvelle date>
```

Les catégories, dans l'ordre où le classement les essaie (le premier motif qui
tient l'emporte) :

| Catégorie | Ce qu'elle veut dire | Ce qu'on en attend |
|---|---|---|
| ~~`legs_statut_realise`~~ | ~~un ponctuel au statut réalisé **sans rapport** (seed uniquement) : la garde de `deciderParFaits` le conserve tel quel~~ | **retirée au lot 5 (2026-09-19)** avec la garde : zéro en production |
| `identique` | même instant, même statut | la majorité |
| `meme_jour_civil` | même statut, même jour civil de Paris, instant différent | **toutes les lignes « à planifier »** : la règle 5 les réécrit une fois vers minuit de Paris (ADR-036 § 5, conséquence écrite). Normal |
| `statut_seul` | même jour, statut différent | rare : un titre `autre` au statut réalisé redevenant « planifiée », une échéance rendue par la suppression d'un rapport redevenant visible |
| `rythme` | la date en base vaut « ancre + un **autre** rythme » : le rythme a changé, la date était restée | le constat B (S3, D3, rythme allongé). Chaque ligne est une correction attendue |
| `mise_en_service` | la nouvelle date sort de la mise en service, que la date en base ne connaissait pas ou connaissait autrement | S4, S5, un ponctuel daté de `now`. Corrections attendues |
| `retard_invente` | la ligne passe « à planifier » à son origine, alors que la date en base était **antérieure au suivi** | un retard compté sur des jours où Rojer ne suivait rien : sa disparition est juste |
| `date_arbitraire` | la date en base n'est expliquée par **aucun** fait | les seeds de démonstration (`etaler-echeances-demo.ts`, `seed --planifier`, `seed-dossier-complet.ts`). Attendu sur les dossiers fictifs ; **inattendu sur un dossier réel**, à regarder une par une |
| `inexplique` | la date en base est expliquée par un fait, et pourtant aucun motif ne nomme l'écart | **zéro**, ou le lot 2c n'est pas fini |

Puis l'**idempotence temporelle** : le plan candidat est appliqué en mémoire et
replanifié à J+400. Le second plan doit être **vide** (`plan vide ✓`) : une
fonction sans horloge rend la même date quel que soit le jour, donc rien à
réécrire. S'il n'est pas vide, le script imprime les lignes fautives. Une seule
cause légitime : une **prescription particulière dont `dateFin` tombe dans les
400 jours** — la levée change les lignes qu'elle portait, et ce n'est pas un
défaut d'idempotence. Tout autre reste l'est.

## 4. Le critère

**Zéro `inexplique`**, sur tous les établissements. C'est le critère de sortie du
lot 2c (ADR-036 § 9) et le code de sortie du script : `1` s'il en reste un,
`0` sinon. Un `inexplique` veut dire que le classement — `classerEcart`,
`src/lib/calendrier/passage-a-blanc.ts` — ne sait pas nommer ce que la candidate
fait à cette ligne : on l'examine, on écrit le motif manquant avec son test, on
relance. On ne bascule pas avec un écart qu'on ne sait pas nommer.

Les autres catégories ne sont pas des échecs : elles disent **combien** de lignes
la bascule réécrira, et **pourquoi**. `date_arbitraire` sur un dossier réel
mérite une lecture ligne par ligne avant le lot 4.

## 5. Ce que le script ne fait pas

- Il ne compte pas le retard : il compare des dates et des statuts. Le retard
  se lit à l'affichage (`estVerificationEnRetard`, ADR-011).
- Il ne regarde ni les archivages, ni les suppressions, ni les désarchivages :
  ces décisions ne dépendent pas de la stratégie de date, les deux plans les
  partagent.
- Il ne rejoue pas le dépôt ni la suppression d'un rapport : la confluence
  dépôt / régénération est une preuve du lot 4.

---

## 6. Résultats

### Premier passage — 2026-09-18, 23 h 46 (heure de Paris)

Lancé depuis le poste de développement sur la base de **production**
(pooler Supabase de production, hôte et mot de passe gardés hors du dépôt public), après le
déploiement de `a1e4f22` qui a appliqué la migration `suiviDepuis`.
Transaction en lecture seule ; export JSON gardé hors dépôt.

| Date | Base | Établissements | identique | meme_jour_civil | statut_seul | rythme | mise_en_service | retard_invente | date_arbitraire | legs | inexplique | J+400 vide |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-18 | production | 4 | 4 | 62 | 0 | 0 | 8 | 3 | 22 | 0 | **0** | 4 / 4 |

**Critère tenu : zéro `inexplique`, et le rejeu à J+400 est vide partout.**

Ce que les écarts disent, établissement par établissement (identifiants
seulement) :

- **établissement A** (28 lignes) — 27 `meme_jour_civil`, sans
  changement visible, et **un seul écart réel** : la vérification annuelle du
  SSI (identifiant gardé hors du dépôt public), due au 30/08/2026 en base, passerait au
  **01/09/2026** — le rapport réalisé du 1er mars plus les six mois de la
  prescription d'assureur en vigueur. La date en base ne s'explique par aucun
  fait ; la nouvelle, si.
- **établissement B** (36 lignes) — le dossier de démonstration, et
  le seul vraiment touché :
  - **21 `date_arbitraire`** : dates posées par les scripts de démonstration
    (`etaler-echeances-demo`, `seed --planifier`). Elles deviendraient
    « à planifier » à l'origine du suivi (04/09/2026). C'est le lot 3 de
    l'ADR-036 : les démos réécrites en faits ;
  - **8 `mise_en_service`** : les lignes se calent sur la mise en service
    réelle — révisions décennales d'extincteurs à mise en service + 10 ans
    (2031, 2033), vérifications initiales datées de leur mise en service
    (2015 à 2022), donc « à planifier » en retard depuis. C'est déjà la règle
    du générateur pour une ligne neuve ;
  - **3 `retard_invente`** : des « à planifier » datés AVANT l'entrée de la
    ligne dans Rojer ; ils repartiraient de l'origine ;
  - 4 `identique`.
- **établissement C** (29 lignes) — 31 `meme_jour_civil`, dont les
  lignes que la génération créerait.
- **établissement D** (0 ligne) — dossier de test jamais calculé ;
  ses 4 lignes seraient créées, en `meme_jour_civil`.

**Lecture pour la bascule (lot 4).** Sur les dossiers réels, le nouveau calcul
ne fait que corriger — l'écart le plus visible est le SSI qui passe du 30/08 au
01/09. Le dossier de démonstration change beaucoup, parce que ses dates avaient
été fabriquées ; il ne sert pas encore à des présentations (propriétaire,
2026-09-18), et le lot 3 retire les scripts qui fabriquaient ces dates.

À refaire juste avant la fusion du lot 4, et à ajouter ici sous une nouvelle
date.
