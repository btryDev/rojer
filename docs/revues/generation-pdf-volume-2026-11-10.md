# Génération des PDF en volume — diagnostic et recommandation (2026-11-10)

Commande : session `rojer-outils-cb` (test de charge, `lot/charge-k6`), pour la
propriétaire. Lecture du code sur `origin/cc` (b635a372). Aucun correctif écrit,
rien poussé, banc Docker non touché.

## 0. En bref

| Problème | Cause | Remède |
|---|---|---|
| 2. Temps surlinéaire | L'ancien moteur de pagination de `@react-pdf` refait la mise en page de tout le reste de la `<Page>` à chaque saut de page, et le registre met tous les rapports dans une seule `<Page>`. | Passer à `@react-pdf/renderer` 4.9 avec `experimentalPagination` : linéaire, 2 000 lignes en 1,1 s au lieu de 13,2 s. |
| 3. `unsupported number` | Bug connu de `@react-pdf` (#3416, #3452) : un pied de page `fixed` avec `render`, sous un `lineHeight` sans unité (`styles.ts`, `page.lineHeight: 1.4`), voit sa hauteur multipliée à chaque page. | Le même passage en 4.9 + `experimentalPagination` (mesuré), ou retirer `render` des pieds de page. |
| 1. Mémoire | Toute la mise en page est gardée en mémoire jusqu'au dernier octet, quel que soit le moteur : `renderToStream` ne diffuse rien. | Rendre le PDF hors du processus web, dans un worker à tas borné (un échec ne tue que l'export), puis en tâche de fond pour les gros dossiers. |

Avant la bascule : la montée en 4.9 avec le nouveau moteur, et le rendu dans un
worker borné. Ensuite : la génération en tâche de fond avec lien de
téléchargement.

## 1. Ce que dit le code (`origin/cc`)

- `RegistreDocument.tsx` (index des rapports, l. ~690-830) : **une seule
  `<Page>`** contient le tableau de *tous* les rapports de l'établissement, puis
  les vérifications en attente, puis les mentions. Les lignes ont un `wrap`
  conditionnel (`wrap={r.points.length > 0}`) et `flexWrap`. Il y a un pied de
  page `fixed` statique.
- `construireRegistreData` (`builders.ts`, l. 421) charge **tous** les rapports
  avec leurs points (`listerRapportsDeLEtablissement`), sans borne. C'est voulu :
  le registre est complet.
- `controle-zip` rend quatre PDF à la suite dans la même requête, dont le
  **même registre**. Il paie donc le même coût, plus le dossier, le DUERP et le
  plan d'actions.
- `DossierConformiteDocument.tsx` et `PlanActionsDocument.tsx` ont des pieds de
  page `fixed` avec `render={({ pageNumber, totalPages }) => …}`, au style
  `s.footer`, qui a une bordure haute. Ils héritent le `lineHeight: 1.4` de la
  page. Le registre a déjà remplacé `render` par un pied statique (commentaire :
  « `render` ne s'imprime jamais »).
- `reponse.ts` / `exports/limite.ts` : `renderToBuffer` est appelé dans la
  requête, dans le processus web. Le sémaphore (1 export de front) borne la
  concurrence ; il ne protège ni contre un seul long rendu (boucle bloquée), ni
  contre un rendu qui sature le tas (processus tué).

### Pourquoi le temps est quadratique

`@react-pdf/layout` 4.6.1, `splitPage` puis `paginate` (lib/index.js
l. 2995-3050) : à chaque page produite, la suite de la `<Page>` est entièrement
re-mise en page (`relayoutPage` = texte + yoga sur tous les nœuds restants).
Pour N lignes sur P pages, le coût est d'environ N × P / 2, donc N². Le
mainteneur le reconnaît : PR #3502 (fusionnée le 2026-08-23), « The old engine
relayouts on every split, so cost grows quadratically with document size. The
new engine is linear. »

## 2. Mesures locales (synthétiques)

Script autonome : un tableau façon registre (5 colonnes, un point à corriger
toutes les 5 lignes, pied de page `fixed`, bordures). Mac de la propriétaire,
Node 22, pas Clever Cloud.

**Ancien moteur (4.5.1, celui de `cc`)**

| Lignes | Une seule `<Page>` (actuel) | Découpé en `<Page>` de 40 |
|---|---|---|
| 1 000 | 4,2 s, RSS 578 Mo | 1,4 s, RSS 321 Mo |
| 2 000 | 14,8 s, RSS 1 138 Mo | 2,5 s, RSS 503 Mo |
| 8 000 | — | 10,6 s, RSS 1 654 Mo |

Le découpage rend le temps linéaire. La mémoire reste linéaire : à 4 000
lignes, le tas finit à 486 Mo avec une limite de 520 Mo (la valeur XS) ; avec
une limite de 400 Mo, le rendu meurt.

**4.9.0 (dossier isolé, hors du dépôt)**

| Lignes | Ancien moteur | `experimentalPagination` |
|---|---|---|
| 1 000 | 3,5 s | **0,6 s** |
| 2 000 | 13,2 s | **1,1 s** |
| 4 000 (tas 520 Mo) | — | 2,2 s, tas 457 Mo |
| 8 000 (tas 520 Mo) | — | **OOM** |

Ordre de grandeur en XS : le banc donne 11 s pour 682 rapports, et la courbe
synthétique 4.5.1 donne environ 3 s pour 700 lignes. Le conteneur 1 cœur est
donc environ 3 à 4 fois plus lent. Avec le nouveau moteur, 2 274 rapports
devraient prendre quelques secondes, au lieu de 105 s. **C'est une
extrapolation, à mesurer sur le banc.**

**Bug 3 reproduit** :
- Page `lineHeight: 1.4`, pied de page `fixed` + `render` + `borderTopWidth`.
- En 4.5.1, 100 lignes passent ; à 300 lignes : `unsupported number:
  -7.43e+21 at clipBorderTop`, la même pile que sur le banc.
- Passer le `lineHeight` du pied de page en points ne suffit pas.
- En 4.9.0, l'ancien moteur plante aussi ; **avec `experimentalPagination`,
  1 000 lignes passent.**
- Que l'erreur dépende des données (3 et 10 ans plantent, 5 ans non) s'explique
  ainsi : l'accumulation se fait page à page, et la position du pied fait ou non
  passer une valeur au-delà de ±1e21 selon le nombre de pages.
- Issues : #3416 (votre combinaison 4.5.1 + pdfkit 5.1.1), #3452 (cause : le
  `lineHeight` est re-multiplié à chaque passe), #3498 (correctif ouvert, non
  fusionné).

## 3. Comment font les autres

Documenté publiquement (recherche du 2026-11-10) :
- **MaintainX** (GMAO) : 200 bons de travail au plus par export, fichier déposé
  dans un « centre de téléchargement », notification quand il est prêt.
  https://help.getmaintainx.com/export-work-order-data
- **UpKeep** (GMAO) : 500 bons de travail par export PDF/CSV, « processed in the
  background », notification, fichier gardé 7 jours.
  https://help.onupkeep.com/en/articles/9736598-how-to-export-work-orders
- **SafetyCulture** (inspections QHSE) : PDF/Word 100 inspections au plus à la
  fois, contre 10 000 en CSV ; au-delà, un outil d'export dédié (offres
  payantes). https://help.safetyculture.com/000072
- **Freshservice** : un rapport complet part en PDF par e-mail.
- Rien de public trouvé pour Fiix, Limble, Carl Source, Mainti4, Kalitys,
  BlueKanGo, Intelex, ni pour les registres de sécurité numériques français
  (Socotec, Bureau Veritas, Apave, Dekra…) : leurs aides ne sont pas indexées.

Le schéma récurrent : un **plafond par export** (100 à 500 éléments), une
**génération en tâche de fond**, une **notification** et un **fichier à
retirer** pendant quelques jours. Aucun ne promet un PDF instantané de tout
l'historique.

Côté technique :
- Le blog de react-pdf recommande un worker pour ne pas bloquer, sans gain de
  durée totale (https://react-pdf.org/blog/large-documents-in-the-browser).
- `worker_threads` avec `resourceLimits.maxOldGenerationSizeMb` : un worker qui
  dépasse son tas meurt seul, le processus principal survit
  (https://nodejs.org/api/worker_threads.html).
- Files sur Postgres sans service tiers : pg-boss, graphile-worker.
- Clever Cloud fournit les workers (`CC_WORKER_COMMAND`, même conteneur, donc
  même RAM — inférence), le cron (`clevercloud/cron.json`, sur chaque instance)
  et Cellar (S3).
- Moteurs alternatifs :
  - Chromium et Gotenberg : gourmands en mémoire sur les gros documents (doc
    Gotenberg) ; rien n'indique que le runtime Node de Clever Cloud fournisse
    Chromium.
  - WeasyPrint : environ 3 Go pour 1 500 pages (issue #671).
  - wkhtmltopdf : archivé.
  - Typst : rapide d'après des retours communautaires (environ 900 pages en
    16 s), mais c'est une réécriture complète des gabarits.
  - pdfkit brut : écrit en flux, avec une mémoire à peu près constante, mais
    toute la mise en page est à la main.

## 4. Options, hiérarchisées

### A. Passer à `@react-pdf/renderer` 4.9 + `experimentalPagination` — avant la bascule

Ce qu'elle règle :
- **2** : le temps devient linéaire, et la boucle n'est plus bloquée que
  quelques secondes.
- **3** : mesuré en synthétique.
- **1** en partie : le tas au pic baisse (2 000 lignes, 249 Mo contre plus de
  660 Mo), et la limite recule à environ 4 000 lignes en XS.

Effort : 1 à 2 jours.
- Mise à jour, puis `experimentalPagination` sur les `<Page>` longues.
- Les pieds de page passent par le nouveau prop `<Page layout>`, qui rétablit
  au passage la numérotation « page X / N » perdue. Un `fixed` en bas de page
  ne réserve plus de place dans le nouveau moteur.
- Contrôle visuel des cinq PDF : la taille du fichier change, la mise en page
  aussi.
- Les tests d'arbre de rendu (`arbre-rendu.test-utils.ts`) sont à repasser.
- La 4.8 remplace aussi le fork `@react-pdf/pdfkit` par pdfkit officiel :
  vérifier les polices et les caractères accentués.

Risques :
- Le moteur est « expérimental » : il reste en opt-in jusqu'à la prochaine
  version majeure, et c'est une sortie d'août 2026.
- Mettre à jour en même temps que la bascule ajoute une inconnue. À isoler dans
  un lot à part, avec un contrôle visuel.

### B. Rendre hors du processus web, dans un worker à tas borné — avant la bascule

Ce qu'elle règle :
- **1** : un dossier trop gros fait échouer son export (réponse « trop
  volumineux, réessayez plus tard » ou bascule vers C), sans tuer
  l'application.
- **2** complètement : la boucle reste libre pendant le rendu.

Effort : 2 à 3 jours.
- `worker_threads` + `resourceLimits` (environ 350-400 Mo en XS, en laissant
  au moins 500 Mo au processus web). Un worker à la fois : le sémaphore
  `limite.ts` reste, il borne déjà à 1.
- Les données sont construites dans le processus web (Prisma, isolation de
  compte inchangée), puis le worker reçoit des données sérialisables. Les
  `*Data` sont déjà des objets plats.
- Point dur : faire empaqueter le script du worker par Next 16 (voir les leçons
  Clever Cloud de GestBAT sur webpack). Un `child_process.fork` sur un script
  compilé à part est l'alternative si `worker_threads` résiste au bundler.

Risques : la RAM du conteneur reste partagée. Un worker à 400 Mo plus le web
doivent tenir dans 1 Go. Cela milite pour S en production, ou pour C.

### C. Génération en tâche de fond + fichier stocké + lien — après la bascule

Ce qu'elle règle : **1** et **2** pour n'importe quelle taille, à condition de
la combiner avec un découpage ou un moteur en flux pour les plus gros.

Effort : 1 à 2 semaines.
- File sur Postgres (pg-boss, sans service tiers) et worker Clever Cloud
  (`CC_WORKER_COMMAND`, ou une application séparée pour avoir sa propre RAM).
- Dépôt dans le stockage existant (`src/lib/storage`, Supabase puis Cellar, UE).
- Écran « Exports » avec état et lien, notification dans l'application (aucun
  e-mail ne part en production aujourd'hui).
- C'est ce que font MaintainX et UpKeep.

Va bien avec : la **pré-génération des années closes**. Le registre d'une année
terminée ne change plus qu'à la marge (rapport déposé en retard) : on le rend
une fois, on l'invalide si une ligne de l'année bouge, et on assemble avec
pdf-lib.

### D. Changer de moteur (pdfkit en flux, Typst) — seulement si A + B + C ne suffisent pas

C'est la seule voie vers une mémoire constante à 10 ans en un seul fichier.
Effort : plusieurs semaines (réécrire les gabarits), et on perd la charte
partagée. Pas recommandé tant que A + C n'ont pas été mesurés à 10 ans.

### Contournement immédiat du problème 3, si A attend

Remplacer les `render` des pieds de page du dossier et du plan d'actions par un
texte `fixed` statique, comme le registre. Le registre n'a pas ce plantage sur
le banc, et le commentaire de `RegistreDocument.tsx` dit que `render` ne
s'imprime de toute façon pas en 4.5.1. **Non mesuré en synthétique** : à
vérifier sur Charge 53.

## 5. Le registre doit rester complet

Aucune option recommandée ne découpe le registre en plusieurs documents. A et B
gardent un seul PDF complet. Des sections par année à l'intérieur du même
document (une `<Page>` par année) restent possibles avec l'ancien moteur, et
cela ne retire rien au contenu. Un export **en plusieurs fichiers** (un par
année) ne serait à envisager qu'avec C, au-delà de 10 ans, et seulement après
avoir relu sur Légifrance si le texte admet un registre en plusieurs volumes.
**Je n'ai pas relu R. 4323-25 / R. 4323-27 CT ni R. 143-38 CCH pour ce
rapport** : la question ne se pose pas tant qu'on reste à un seul document.

## 6. Ce que je propose pour la suite

1. Lot « pdf-4.9 », avant la bascule :
   - Mise à jour, `experimentalPagination`, pieds de page en `layout`.
   - Remesure sur le banc à 1, 2, 3, 5 et 10 ans en XS et en S.
   - Contrôle visuel des cinq PDF.
2. Lot « rendu en worker », avant la bascule si le point 1 laisse encore un OOM
   à 10 ans en XS (attendu d'après la mesure synthétique : environ 8 000 lignes
   au-delà de 520 Mo).
3. Après la bascule : exports en tâche de fond (C), puis pré-génération des
   années closes.

Fichiers de mesure (hors dépôt) :
`/private/tmp/claude-501/-Users-palomasanchezc-Documents-rojer-outils/93761193-8287-4ebb-ac6c-22f39f19b87b/scratchpad/mesure/`
(`mesure.cjs`, `mesure49.cjs`, `pied-lh.cjs`, `pied-lh49.cjs`).
