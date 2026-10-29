# Plan performance — 2026-10-27

Objectif : un écran s'affiche vite, et son coût ne grandit pas avec la taille du
dossier ni avec le nombre d'utilisateurs. Ce plan ne touche **pas** à
l'hébergement : tout ce qui dépend de la bascule Clever Cloud est listé à la
fin, hors plan.

Point de départ : `docs/revues/audit-nextjs-2026-10-14.md` (mesures du lot perf,
H2). Ce qui suit part de ces mesures et du code de `main` au 2026-10-27.

## Constat

| Fait | Source |
|---|---|
| Le tableau de bord fait **105 requêtes SQL** par affichage, dont ≈ 25 pour la barre latérale et le layout, payées sur **chaque** écran | audit du 14/10, mesuré (`log_statement = all`) |
| Calendrier 56, registre 46, équipements 43, DUERP 41-42 | idem |
| Aucun cache d'une visite à l'autre : revenir au board par un lien refait tout (seul « Précédent » ressert la copie du navigateur) | `next.config.ts` (pas de `staleTimes`), aucun `use cache` / `unstable_cache` |
| Aucun `<Suspense>` dans `src/app` : chaque page attend sa lecture la plus lente avant d'afficher quoi que ce soit | grep |
| Un seul `loading.tsx` (`etablissements/[id]`), en forme de board, montré pour toutes les sous-pages ; aucun sous `/duerp` | `find` |
| La même table `Verification` est relue par une dizaine de fonctions différentes sur le même affichage, chacune avec son filtre et ses `include` (une requête de plus par relation, Prisma 6) | `dashboard/queries.ts`, `calendrier/queries.ts`, `calendrier/retards.ts`… |
| Doublons nommés : `compterEtatEcheances` part depuis la barre (`compterEnRetardParFamille`) **et** depuis la page ; `listerEvenementsFenetre` trois fois (7 j, 30 j, frise) ; `getModulesMatrice` (page) et `getEtatModules` (barre) comptent les mêmes modules ; le compte des lignes part deux fois | lecture du code |
| Ce qui va bien : vérification du calendrier en tête de page = une lecture légère ; moteur d'obligations = calcul en mémoire, mémoïsé par rendu ; index par établissement en place ; barre latérale non recalculée entre deux sous-pages | lecture du code |

**Idée directrice : réduire le nombre d'allers-retours vers la base.** Chaque
requête paie une latence fixe, quel que soit l'hébergeur ; c'est elle qui domine
le temps d'un écran, bien plus que le volume lu. Moins d'allers-retours, c'est
plus rapide et plus de monde servi avec la même base.

Le calcul se fait en mémoire (TypeScript), non en SQL, **parce que les règles y
vivent** (ADR-003 : périodicité effective, délai de grâce, prudence « à
confirmer », lectures du calendrier) — pas parce qu'un dossier serait petit.

La taille fixe la limite du procédé, table par table :

- **Bornées par conception — se lisent entières** : lignes de suivi ouvertes
  (une par obligation et porteur, ADR-034), équipements, salariés (≤ 50), zones
  (≤ 3), prestataires.
- **Qui grossissent avec les années — restent filtrées et bornées en SQL** :
  rapports, relevés du carnet sanitaire, actions closes, versions du DUERP
  (40 ans), signatures, jetons d'accès. Jamais chargées entières pour compter :
  `count`/`groupBy` en base, ou une fenêtre de dates.

Le lot 0 vérifie cette hypothèse avant tout code : le gros dossier est semé **à
la limite de la cible** et **avec dix ans d'historique**.

## Confrontation aux bonnes pratiques

Référence : docs Next.js 16 (récupération de données, mise en cache, streaming),
docs Prisma (performance des requêtes), pratique courante de la performance web
(mesurer chez l'utilisateur, budgets, test de charge). Versions installées :
Next 16.3.8, Prisma 6.19.3.

| Bonne pratique | Le plan | Écart corrigé |
|---|---|---|
| Mesurer avant d'optimiser | Lot 0 | — |
| Lire au plus près du composant, dédoublonner par `cache()` (mémoïsation par requête), lectures en parallèle | Lot 1 proposait un chargeur unique passé en props | Le chargeur reste mémoïsé ; **chaque widget l'appelle lui-même** au lieu de recevoir un gros paquet. C'est ce qui rend possible le streaming du lot 3 |
| Filtrer et agréger dans la base, pas dans l'application | Calcul en TypeScript | Écart **assumé et borné** : les règles vivent en TypeScript (ADR-003), et seules les tables bornées se lisent entières. Les tables d'historique restent en `count`/`groupBy`/fenêtre SQL |
| Pas de N+1 ; `select` plutôt que `include` ; jointures côté base | `include` partout, une requête par relation | Ajouté au lot 1 : `select` strict. `relationJoins` (une requête au lieu d'une par relation) est **en préversion** dans Prisma 6 : à essayer derrière la mesure, pas à adopter d'office |
| Index et plans d'exécution vérifiés | Index par établissement présents | Ajouté au lot 0 : `pg_stat_statements` + `EXPLAIN ANALYZE` des requêtes les plus lentes sur le gros dossier |
| Streaming : `loading.tsx` par segment, `<Suspense>` par bloc | Lot 3 | — |
| Cache de navigation | `staleTimes` au lot 4 | `staleTimes` est sous **`experimental`** dans Next 16 : petit gain, mais option expérimentale. La voie stable (`cacheComponents` + `use cache` + `cacheLife`) dépend du stockage du cache, donc de l'hébergement : hors plan. Lot 4 rétrogradé en option |
| Mesurer chez l'utilisateur réel (LCP, INP, TTFB) | Absent | **Ajouté (lot 7)** : `useReportWebVitals` vers un journal à nous, sans service tiers |
| Traces côté serveur pour voir où part le temps en production | Absent (`instrumentation.ts` ne fait que journaliser les erreurs) | **Ajouté (lot 7)** : OpenTelemetry par `instrumentation.ts`, indépendant de l'hébergeur ; l'export se branche après la bascule |
| Budgets de performance en CI | Budget SQL par écran | Ajouté : budget de poids JS par page (lot 6) |
| Test de charge pour « tenir la charge » | Absent — c'était pourtant la question de départ | **Ajouté (lot 8)** |
| Travail non critique après la réponse (`after()`) | — | Lot 5 : seulement pour ce qui n'a pas à être vu tout de suite (ménage de `LimiteDebit`, journaux). La régénération du calendrier reste avant la redirection : l'écran suivant doit la montrer |

## Lots

### Lot 0 — Mesurer, et garder la mesure (S) — prérequis

- Script de mesure **versionné** cette fois (`scripts/mesure-perf.ts`) : par
  page, nombre de requêtes SQL, temps de rendu serveur, taille RSC et HTML.
  Même méthode que le 14/10 (journal PostgreSQL, faux serveur Auth local, build
  de prod), mais rejouable par n'importe quelle session.
- **Deux dossiers** : la démo (`seed:complet`) et un **gros dossier** semé à
  la limite de la cible : 3 zones, 50 salariés avec leurs
  titres, un parc large (≈ 100 équipements), **dix ans d'historique** (rapports,
  relevés de température, actions closes, versions du DUERP). Le second dit si
  un écran grandit avec la donnée — ce que la démo ne montre pas.
- Pour chaque écran : quelles requêtes coûtent le plus de temps, pas seulement
  combien il y en a. Le plan des lots 1-2 se corrige sur ce relevé.

#### Résultats du lot 0 (2026-10-27, `lot/perf-mesure`, main 10e747a7)

Outils : `scripts/perf/grossir-dossier.ts`, `faux-auth.mjs`, `mesurer.mjs`
(mode d'emploi en tête de chaque fichier). `next build` + `next start`, base
locale, faux serveur Auth local, médiane de 3 essais après une chauffe. Les
temps sont LOCAUX (base sur la même machine, ≈ 0,1 ms par aller-retour) : en
production, chaque requête SQL ajoute la latence du réseau.

Dossiers : démo (`seed:complet` : 10 équipements, 4 salariés, 36 lignes) et
gros (même dossier grossi : 100 équipements, 50 salariés, 290 lignes, 7 888
rapports, 300 actions levées, 1 566 relevés, 11 versions de DUERP). Le gros
reste un restaurant N5 à un seul type ERP : le multi-types n'est pas semé.

| Page | SQL démo → gros | 1er octet démo → gros (ms) | HTML démo → gros (Ko) | RSC démo → gros (Ko) |
|---|---|---|---|---|
| Tableau de bord | 112 → 113 | 48 → 205 | 157 → 394 | 68 → 281 |
| Calendrier | 57 → 57 | 41 → 165 | 235 → 1 447 | 149 → 770 |
| Registre | 47 → 53 | 39 → 80 (total **1 019**) | 129 → **57 585** | 59 → **25 393** |
| Équipements | 46 → 46 | 40 → 106 | 204 → 767 | 95 → 377 |
| Plan d'actions | 43 → 43 | 38 → 80 | 85 → 85 | 38 → 38 |
| Équipe | 40 → 40 | 41 → 86 | 84 → 298 | 38 → 147 |
| Prestataires | 36 → 36 | 33 → 79 | 74 → 74 | 31 → 31 |
| Carnet sanitaire | 41 → 41 | 39 → 81 | 129 → 210 | 60 → 108 |
| Documents | 35 → 35 | 36 → 86 | 91 → 91 | 40 → 40 |
| DUERP (unités) | 42 → 42 | 49 → 93 | 71 → 71 | 25 → 25 |
| DUERP (synthèse) | 43 → 43 | 46 → 84 | 145 → 198 | 68 → 86 |

Deux appels au serveur Auth par page (proxy + rendu) : hors plan (Better Auth).

**Ce que la mesure apprend :**

1. **Le nombre de requêtes ne grandit pas avec le dossier** (pas de N+1) : le
   board fait 112-113 requêtes quelle que soit la taille.
2. **Le temps, si : +40 à +160 ms par page.** La cause principale est nommée :
   `joindreDernieresRealisations` (`rapports/joindre-realisations.ts`) relit
   **tous** les rapports réalisés de toutes les lignes pour n'en garder que le
   dernier — 7 888 lignes, **18 fois sur 11 pages** (la barre latérale l'appelle
   par `compterEtatCalendrier`). Première requête du classement : 131 ms sur un
   seul passage des 11 pages. Le commentaire du code écarte `distinct` et
   `groupBy` ; il ne considère pas un `DISTINCT ON` en SQL, qui rend une ligne
   par échéance, résultat compris.
3. **Le registre n'a aucune borne** : 7 888 rapports affichés d'un coup,
   57 Mo de HTML, 1 s en local. En production, la page est inutilisable dès
   quelques années d'historique. Même tendance, moins forte, sur le calendrier
   (1,4 Mo) et les équipements (0,8 Mo).
4. **Le socle commun coûte ≈ 35 requêtes sur chaque écran** (layout + barre :
   les pages les plus simples en font 35-43).
5. Les plans d'exécution sont sains (parcours d'index) : le coût vient du
   volume relu et du nombre d'allers-retours, pas d'un index manquant.

**Conséquence sur l'ordre des lots** : un lot 1a passe en tête — borner
l'historique (dernière réalisation en une ligne par échéance ; registre par
année ou paginé). C'est lui qui fait grandir le temps avec les années, donc
celui qui « ne tiendra pas » en premier.
- Sortie : un tableau « avant » dans ce fichier.

### Lot 1a — Borner l'historique (S-M) — né du lot 0

- « Dernière réalisation » : une ligne par échéance, calculée par la base
  (`DISTINCT ON ("verificationId") … ORDER BY "dateRapport" DESC, "createdAt" DESC`),
  résultat compris. Une seule fonction, déjà centrale
  (`joindreDernieresRealisations`) : tous ses appelants en profitent. Gardes
  `tenancy-*` à relancer (requête SQL brute).
- Registre : une année à la fois (`?annee=`, comme le calendrier) ou une
  pagination ; les exports restent complets.
- Calendrier, équipements, équipe : vérifier ce qui fait grossir la charge
  RSC avec le parc, et ne sérialiser que ce qui est affiché.
- Cible : temps et poids du gros dossier ramenés près de ceux de la démo.

#### Résultats du lot 1a (2026-10-27, gros dossier, même méthode)

Fait :
- `joindreDernieresRealisations` : `DISTINCT ON`, une ligne par échéance ;
  équivalence au départage du moteur tenue contre une vraie base
  (`joindre-realisations.integration.test.ts`, éprouvé en inversant le
  départage : rouge).
- Barres du tableau de bord : les rapports de l'année seulement, plus la
  dernière réalisation (`compterObligationsParMois`, `repartirParMois`).
- Registre : une année à la fois (`?annee=`, pastilles d'années sur le bloc des
  rapports) ; l'export PDF reste complet. Les points sans rapport d'origine
  restent sous le plus récent de TOUT l'historique.
- **Trouvé en mesurant les fiches** : la fiche d'un contrôle lisait les
  signatures rapport par rapport, l'une après l'autre — **564 requêtes** pour
  un contrôle hebdomadaire tenu dix ans. Une seule requête désormais
  (`listSignaturesDesObjets`, portée au propriétaire dans la requête).

| Page (gros dossier) | SQL avant → après | 1er octet avant → après (ms) | HTML avant → après |
|---|---|---|---|
| Tableau de bord | 113 → 110 | 205 → 128 | 394 Ko → 394 Ko |
| Calendrier | 57 → 54 | 165 → 92 (total 174 → 123) | 1 447 Ko → 1 447 Ko |
| Registre | 53 → 54 | 80 → 41 (total 1 019 → 116) | **57 585 Ko → 3 947 Ko** |
| Fiche contrôle | **564 → 44** | 53 → 95 (total 296 → 112) | 3 679 Ko → 3 678 Ko |
| Pages simples | stables | ≈ 80 → 36-49 | stables |

Après les deux revues (code medium, qualité) : une seule lecture « dernière
réalisation » par établissement et par affichage (`cache()`), lancée en
parallèle des lignes sur la barre latérale et le tableau de bord ; portée au
propriétaire en SQL par un prédicat complet (`requireProprietaireSql`,
`scope.ts`) ; registre : un seul mécanisme pour les points sans origine, lu en
parallèle ; fiche contrôle : lectures indépendantes en un `Promise.all`,
signatures réduites aux champs de la preuve.

Écarté à la revue de qualité : nommer le prédicat SQL `portee…` pour éviter
son exclusion nommée dans `scope-proprietaire.test.ts` — la garde devrait alors
reconnaître `portee\w*(`, et `porteeBatiment(` (un filtre de zone, pas une
portée au compte) passerait pour une preuve de propriété.

Mesuré et écarté : un index composite `(verificationId, dateRapport DESC,
createdAt DESC)` avec une jointure `LATERAL` ne gagne qu'≈ 1 ms par appel sur
le gros dossier — pas de migration pour si peu.

Reste, rangé dans les lots suivants :
- le tableau de bord du gros dossier reste à 3× la démo (149 contre 48 ms) :
  c'est le lot 1 ;
- ~~**question à la propriétaire** : rattacher les points à corriger sans
  rapport d'origine à leur rapport le plus récent DÈS L'ÉCRITURE (reprise, et à
  la suppression d'un rapport), plutôt qu'à chaque lecture — touche le sens de
  l'ADR-048 ;~~ [2026-10-27, la propriétaire : **à trancher plus tard**. Rien ne
  change d'ici là : la règle reste appliquée à la lecture.]
- le poids par rapport affiché (≈ 5 Ko de HTML chacun) : un registre d'une année
  chargée pèse encore 3,9 Mo, la fiche d'un contrôle hebdomadaire tenu dix ans
  3,7 Mo — lot 6 (poids envoyé) ; ~~**question à la propriétaire** : la fiche
  d'un contrôle doit-elle montrer tout son historique, ou les plus récents et
  un renvoi au registre ?~~ [2026-10-27, la propriétaire : **des filtres sur
  l'historique de la fiche d'un contrôle, plus tard** — ~~à faire, pas encore
  planifié~~.] [2026-10-29, la propriétaire : **pas maintenant** — rangé dans
  les chantiers à envisager (`docs/chantiers-ouverts.md` § 21) : des filtres
  par année, la fiche s'ouvrant probablement sur l'année en cours. D'ici là,
  la page reste telle quelle.]
- calendrier (1,4 Mo) et équipements (0,8 Mo) grossissent avec le parc, pas
  avec l'historique : lot 6.

### Lot 1 — Une lecture, des projections : board + barre latérale (M)

- Un chargeur mémoïsé par rendu (`cache()`), `echeancesDuRendu(id)` : les lignes
  `Verification` de l'établissement avec équipement/zone, salarié, prescription,
  plus les autres échéances. Une fois.
- Les compteurs deviennent des **fonctions pures** sur ce résultat : retards par
  famille, sous 30 j, fenêtres 7 j / 30 j / frise, barres par mois, stats par
  équipement, prochaines vérifications, nombre de lignes. La plupart existent
  déjà en pur (`lecturesCalendrier`, `repartirRetards`, `repartirSous30j`…) ;
  on leur retire la lecture, pas la logique.
- Chaque widget et la barre appellent eux-mêmes le chargeur mémoïsé : pas de
  gros paquet passé en props (bonne pratique Next, et condition du lot 3).
- `select` strict à la place des `include` : seulement les colonnes lues.
- Un seul état des modules partagé entre la page et la barre.
- La garde de tenancy reste dans le chargeur (filtre propriétaire) ; l'ordre
  exigé par `fraicheur-sorties.test.ts` (réparer avant de lire) est conservé.
- **Cible : board ≤ 40 requêtes, barre latérale ≤ 8** — à vérifier par le lot 0.
  Gain sur tous les écrans, puisque la barre est partout.

#### Résultats du lot 1 (2026-10-27)

Méthode d'attribution : un traçage temporaire du client Prisma (pile d'appel
capturée à l'appel, `next dev`), retiré avant commit, a ventilé chaque requête
du tableau de bord par fonction. Le relevé a guidé les fusions ; il n'est pas
resté dans le code.

Fait — chaque lecture partagée est mémoïsée sur le rendu (`cache()`, clés
primitives) et porte sa portée au compte dans sa requête :
- compteurs du plan d'actions et retards : UNE lecture des actions suivies
  (ouvertes, en cours, levées des trente derniers jours) au lieu de cinq
  `count` par origine demandée, plus la lecture des retards
  (`actionsSuiviesDuRendu`) — 11 requêtes → 1 pour les compteurs et le widget
  des retards ; `getDashboardData` garde ses propres lectures d'actions (avec
  l'appareil de la vérification, une relation) ;
- ~~état du calendrier : partagé entre la barre latérale et la page
  (`etatCalendrierDuRendu`) ;~~ [2026-10-27, revue du lot 1 : retiré. La page
  répare le calendrier avant de lire, la barre non ; partager leur lecture
  servait à la page les compteurs d'avant réparation. Voir le commentaire de
  `navigation/sidebar-counts.ts`.]
- fenêtres d'événements 7 j, 30 j et frise : une lecture, horizon posé en
  mémoire (`lignesEvenementsDuRendu`) ;
- permis, plans, carnet : partagés entre la barre et la matrice
  (`comptesModulesDuRendu`, `carnetDuRendu`), comptés dans la base en une
  requête — les
  permis et plans s'accumulent, on ne les lit pas pour les compter
  (équivalence aux `count` Prisma tenue contre une vraie base,
  `comptes-modules.integration.test.ts`, éprouvé en cassant deux conditions) ;
- prestataires : un annuaire lu une fois (`prestatairesDuRendu`) pour la
  vigilance, la matrice, les transmissions et le calendrier ;
- parc : un `groupBy` sur `actif` (`comptesParcDuRendu`) pour la barre, le
  tableau de bord et la couverture ; eau chaude suivie, nombre de rapports :
  mémoïsés.

| Gros dossier (après les revues) | SQL avant → après | Total (ms) avant → après |
|---|---|---|
| Tableau de bord | 110 → 74 | 145 → 143 |
| Page la plus simple (Documents) | 35 → 28 | ≈ 43 → 37 |
| Calendrier | 54 → 47 | 123 → 115 |

**Lecture honnête de ces chiffres.** En local, un aller-retour SQL coûte
≈ 0,1 ms : retirer 36 requêtes ne se voit pas au chronomètre. Le gain est
pour la production, où chaque aller-retour paie le réseau. L'écart restant
entre le gros dossier et la démo (144 contre 73 ms au tableau de bord) ne
vient plus de la base : c'est du calcul et du rendu (390 Ko de HTML, 280 Ko de
RSC) — lots 3 et 6, à profiler avant de toucher.

Non atteint, et pourquoi :
- **≤ 40 requêtes au tableau de bord** : 74. Il reste sept lectures de lignes
  de suivi aux formes différentes (frise, prochaines échéances, état, parc,
  barres, score, compte) ; les fondre en une demande de réécrire leurs
  projections — un lot à part, à ne lancer que si la production montre que
  ces allers-retours pèsent.
- **≤ 8 requêtes pour la barre latérale** : ≈ 28. La pastille « en retard »
  lit toutes les sources d'échéances (calendrier, permis, plans, DUERP,
  carnet, actions, prestataires) sur chaque page. Descendre sous ce seuil
  demande soit de retirer la pastille de certaines pages (décision produit),
  soit un cache partagé entre requêtes (hors plan : hébergement).
- Les actions de la source du calendrier ne sont pas fondues dans la lecture
  partagée : elles ont besoin de la vérification et de sa zone, une relation
  qui coûte en SQL autant qu'elle économise.

### Lot 1b — Le calcul serveur et l'historique relu partout (2026-10-28)

Né d'un profil CPU du serveur (`node --cpu-prof`, `next start`, gros dossier) :
après le lot 1, le tableau de bord passait 229 ms dont 92 de SQL — le reste
était du calcul, que la mesure en requêtes ne voyait pas.

Fait :
- **Dates civiles** (`dates/index.ts`) : une seule fonction prenait ≈ 115 ms
  par affichage du tableau de bord — `composantesCiviles`, un
  `Intl.formatToParts` par appel, deux par `instantCivil`, trois par
  `debutDuJour`. Le décalage de Paris est désormais lu une fois par heure UTC
  ~~(les changements d'heure tombent à 01:00 UTC pile depuis 1981)~~
  [2026-10-29, `/simplify` : une heure n'est mémorisée que si le décalage y
  est le même au début et à la fin ; sinon, lecture `Intl` — aucune hypothèse
  sur les données de fuseau] et les composantes en dérivent par
  l'arithmétique UTC. Résultat identique à une référence `Intl` écrite dans
  le test : ~~chacun des 438 changements d'heure de 1981 à 2199~~ [2026-10-29 :
  chacun des changements de 1900 à 2300, dont d'anciens hors des heures
  pleines (1911)] est retrouvé dans les données de fuseau, puis le calcul est
  comparé autour de chacun, et sur 20 000 instants distincts de l'an 900 à
  10 100 (`composantes-rapides.test.ts`, éprouvé en faussant le décalage puis
  en retirant la vérification de l'heure : rouge). Mémoire à deux
  générations, bornée, précédée de la dernière heure lue. Le sceau du moteur
  est recopié sans incrément : aucun dossier régénéré.
- **Dernière réalisation** (`rapports/joindre-realisations.ts`, lue sur chaque
  écran par la barre latérale) : le `DISTINCT ON` lisait et triait TOUT
  l'historique (≈ 12 ms à dix ans, linéaire en années). Une descente d'index
  par ligne (`LATERAL … LIMIT 1`, index
  `(verificationId, dateRapport DESC, createdAt DESC)` qui remplace celui sur
  `verificationId` seul) : ≈ 1,1 ms, et le coût suit le nombre de lignes, pas
  la longueur de l'historique. Équivalence tenue contre une vraie base
  (`joindre-realisations.integration.test.ts`, éprouvé en inversant l'ordre :
  rouge). Le lot 1a l'avait écartée pour « ≈ 1 ms » : mesuré à nouveau, avec
  les statistiques de la base à jour, l'écart est de dix à un.
- **Index sans verrou** (2026-10-29, décision de la propriétaire : « on pense
  à long terme », pas de choix selon la taille de la table au jour J) : l'index
  se pose en `CONCURRENTLY` et l'ancien se retire de même, chaque instruction
  seule dans sa migration (`20261028200000_rapport_index_dernier_par_ligne`,
  `20261028200100_rapport_retrait_index_verification`) — vérifié par un
  `migrate deploy` complet sur une base neuve, sans écart au schéma. La règle
  vaut pour toute migration à venir : `migrations-index.test.ts` refuse un
  index ordinaire sur une table existante, un `DROP INDEX` ordinaire, et un
  `CONCURRENTLY` accompagné (éprouvé en remettant l'ancienne migration :
  rouge). [2026-10-29, `/simplify` : la garde lit les migrations par
  `migrations-lecture.ts`, partagé avec la garde RLS (renommages, `public."X"`,
  tables supprimées), et vise aussi les contraintes qui verrouillent une table
  existante — `UNIQUE`/`PRIMARY KEY` hors `USING INDEX`, clé étrangère sans
  `NOT VALID`. Pas encore lus : `ALTER COLUMN … TYPE`, `SET NOT NULL`.]
- **Proposé, non fait — décision de la propriétaire** : un `lock_timeout` sur
  la connexion de `migrate deploy` (`scripts/migrer-en-production.sh`), pour
  qu'une instruction qui attend un verrou échoue vite au lieu de faire
  attendre l'application, quelle que soit sa forme ; ou un linter de
  migrations PostgreSQL en CI (squawk). Le premier touche le script de
  déploiement de production, le second ajoute un outil.

| Gros dossier (médianes, local) | SQL avant → après (ms) | Total avant → après (ms) |
|---|---|---|
| Tableau de bord | 92 → 65 | 229 → 109 |
| Calendrier | 49 → 28 | 196 → 107 |
| Équipements | 40 → 28 | 109 → 79 |
| Plan d'actions | 37 → 17 | 59 → 45 |
| Équipe | 35 → 21 | 87 → 64 |
| Documents | 44 → 15 | 69 → 44 |
| Carnet sanitaire | 44 → 18 | 79 → 64 |
| Fiche équipement | 40 → 25 | 81 → 64 |
| Registre | 46 → 37 | 171 → 158 |
| Fiche contrôle | 38 → 22 | 157 → 155 |

Dossier de démo (36 lignes), même build de prod, `main` 2f837b49 contre ce
lot : `mesurer.mjs` donnait le tableau de bord 75 → 82 ms et le calendrier
55 → 60 ms — du bruit, la mesure faisant journaliser chaque requête à
PostgreSQL. Rejoué sans journal, deux séries de 25 chargements complets :
tableau de bord 42–48 → 28–29 ms, calendrier 31–32 → 24 ms. Aucune page de
la démo ne recule.

Mesuré et écarté :
- les classes du bouton (≈ 800 caractères, 2 665 fois sur le registre) :
  4 Mo de HTML, mais 91 Ko en gzip et ≈ 20 ms de rendu — pas une refonte du
  bouton de toute l'application pour si peu ;
- `COLLATE "C"` sur l'ancien `DISTINCT ON` (12 → 7 ms) : remplacé par la
  descente d'index.

Reste, et c'est ce qui grandit encore avec les années : **le registre et la
fiche d'un contrôle** rendent chaque rapport (532 lignes pour une année
chargée, dix ans d'historique sur la fiche). Le registre est borné à l'année ;
la fiche ne l'est pas — ~~décision de la propriétaire attendue (« des filtres
plus tard », lot 1a)~~ [2026-10-29, la propriétaire : pas maintenant ; filtres
par année à envisager, `docs/chantiers-ouverts.md` § 21. La page reste telle
quelle].

### Lot 2 — Même traitement pour les autres écrans lourds (M)

Calendrier, registre, équipements, DUERP, dans cet ordre (le plus consulté
d'abord). Chaque écran réutilise le chargeur du lot 1 plutôt que d'écrire sa
propre lecture. Cible indicative : ≤ 25 requêtes par écran.

### Lot 3 — Afficher tout de suite (S-M)

- Board : le hero et la barre partent d'abord, les widgets arrivent en
  `<Suspense>` par bloc, chacun avec son squelette à sa taille (pas de saut).
- Un `loading.tsx` par section, à la forme de l'écran (calendrier, listes,
  DUERP), au lieu du squelette de board pour tout.
- Contrôle visuel : avant/après sur les écrans touchés.

### Lot 4 — Ne pas refaire ce qui vient d'être fait (S, optionnel — option expérimentale)

- `staleTimes.dynamic` (proposé : 30 s) : un aller-retour board → page → board
  dans la demi-minute ne refait aucune requête.
- Ce qui reste juste : chaque action serveur appelle déjà `revalidatePath`
  (121 appels), ce qui vide ce cache — l'utilisateur voit toujours ses propres
  modifications. À vérifier action par action dans le lot.
- **Décision à prendre** : ce qu'écrit un tiers (prestataire par lien, MCP)
  apparaîtrait jusqu'à 30 s plus tard. Acceptable ?

### Lot 5 — Le coût des écritures (S pour mesurer, M si à corriger)

`regenererApresMutation` régénère tout le calendrier après chaque modification
(équipement, fiche, salarié). Le mesurer sur le gros dossier. Au-delà de
≈ 300 ms, ne régénérer que le porteur touché ; en dessous, ne rien changer.

### Lot 6 — Le poids envoyé au navigateur (S)

- Analyse du bundle par page (`@next/bundle-analyzer`, hors dépendances livrées).
- `@dnd-kit` n'est utile qu'en mode « Personnaliser » : le charger à la demande.
- Charge RSC du calendrier (148 Ko) et du board (80 Ko) : retirer ce que les
  widgets ne lisent pas.

### Lot 7 — Voir la performance en production (S)

- Web Vitals des vrais utilisateurs (`useReportWebVitals`) envoyés à une route
  à nous, journalisés par page ; pas de service tiers (RGPD).
- Traces OpenTelemetry (`instrumentation.ts`) : temps par requête SQL et par
  rendu. Le code est posé maintenant ; la destination des traces se choisit
  avec Clever Cloud.

### Lot 8 — Test de charge (S, lourd pour le Mac : seul, jamais en parallèle)

- Scénario réaliste (connexion, board, calendrier, retour au board, dépôt d'un
  rapport) rejoué par N utilisateurs simultanés (k6 ou autocannon) contre un
  build de prod local et le gros dossier.
- Sortie : débit tenu et temps au 95ᵉ centile, avant et après les lots 1-3.
- Rejoué sur Clever Cloud à la bascule : c'est là que la réponse à « ça tient
  la charge » devient vraie pour la prod.

## Garde-fous

- **Budget de requêtes par écran, testé** : un test qui rend le board sur une
  base réelle et échoue au-delà du budget. La CI de tests n'a pas de base
  (`tests.yml`, URL factice) ; `derive-schema.yml` en a une, le test s'y
  greffe. Éprouvé en le cassant (réintroduire une lecture en double → rouge).
- Chaque lot : mesure avant/après collée depuis la sortie du script, jamais
  annoncée.
- Une revue indépendante avant chaque merge (lots 1 et 2 touchent la tenancy).

## Ordre et charge

0 (fait) → 8 (référence « avant ») → **1a** → 1 → 3 → 2 → 5 → 6 → 7 → 8
(« après ») ; 4 en option. Les lots 1 et 3 donnent l'essentiel du gain perçu ; le 2 répète le 1
écran par écran ; le 7 peut partir en parallèle de n'importe quel autre.

## Hors plan — lié à la bascule Clever Cloud

- `connection_limit` et pool de connexions (aujourd'hui 1 : les `Promise.all`
  sont sérialisés en prod).
- Région des fonctions vs région de la base (`dub1` / base Supabase).
- Plan Vercel Hobby (journaux d'une heure, usage non commercial).
- Appel réseau au serveur Auth Supabase à chaque rendu (Better Auth le remplace).
- Cache serveur partagé (`use cache` + étiquette par établissement) : son
  stockage dépend de l'hébergement, à concevoir sur Node permanent.

Les lots 1 à 3 restent valables quel que soit l'hébergeur : moins
d'allers-retours, c'est plus rapide partout.
