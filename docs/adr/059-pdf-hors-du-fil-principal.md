# ADR-059 — Les PDF se mettent en page ~~dans un fil d'exécution séparé~~ hors du processus web

- Statut : proposée (2026-11-10), à accepter après les preuves sur le vrai
  build (preuve 1) et sur le banc de charge (preuves 4 et 5)
- Décision de la propriétaire : 2026-11-10 (B0 + garde-fou + journal le
  matin ; B1 à B3 lancés le même jour après la mesure du lot pdf-a1 en XS)
- Plan : `docs/plan-pdf-sous-processus.md` ; diagnostic :
  `docs/revues/generation-pdf-volume-2026-11-10.md` ; dette :
  `docs/chantiers-ouverts.md` § 23
- Lots : `lot/pdf-a1`, `lot/pdf-b0`, `lot/pdf-b1`
- **Amendée le 2026-11-10 (soir)** : un processus enfant remplace le
  `worker_thread` (décision 3, variantes, conséquences). Clever Cloud pose
  lui-même `--max-old-space-size` ; ce drapeau, global au processus, annule
  le `resourceLimits` de tout `worker_thread` (mesuré : 1 310 Mo de limite
  pour 64 demandés, par `NODE_OPTIONS` comme en argument, `execArgv: []` et
  `env: {}` sur le `Worker` n'y changent rien). Un enfant lancé par `fork`
  avec son propre drapeau garde sa borne (mesuré : 432 Mo pour 384). Le
  refus au démarrage d'un serveur qui porte ce drapeau est retiré : il
  aurait refusé chaque déploiement. Branche `lot/pdf-b1-cc`, sur `cc`.

## Contexte

Rojer tourne chez Clever Cloud sur **une** instance Node (XS : 1 cœur,
1 152 Mo, au départ). `@react-pdf/renderer` 4.5.1 met un PDF en page par un
calcul synchrone qui garde tout le document en mémoire jusqu'au dernier
octet. Mesuré sur le banc de charge le 2026-11-10 (registre, XS, après le
découpage du lot pdf-a1) :

- un registre d'un an (682 rapports) se rend en environ 7 s, pendant
  lesquelles **toute l'application est figée** pour tous les utilisateurs ;
- à 3 080 rapports, le tas JS sature et **le processus meurt** : tous les
  utilisateurs perdent leur requête.

La file d'export (`exports/limite.ts`, un export de front) protège la
mémoire contre plusieurs exports simultanés, pas la boucle contre un seul
long, ni le processus contre un seul gros.

## Décision

1. **Une seule porte de rendu** : `rendrePdf` / `mettreEnPage`
   (`src/lib/pdf/rendre.ts`). Les routes et le ZIP de contrôle passent une
   demande `{ type, props }` (`documents.ts`), pas un élément React. Une garde
   refuse tout autre rendu et tout import de `@react-pdf/renderer` autre que
   des primitives de mise en page.
2. **Un garde-fou de volume, premier filet** : la demande est pesée
   (`poids.ts`) avant la file d'export ; au-delà d'un seuil par type de
   document (`SEUILS_PDF`, mesuré sur le banc pour le registre), elle est
   refusée sans être mise en page (~~503~~ [2026-11-10, lot pdf-b0, décision
   de la propriétaire : 422] sans `Retry-After`, le document reste
   consultable à l'écran ; pièce absente du ZIP, dite au README).
3. ~~**Un fil d'exécution par rendu, second filet** (`src/lib/pdf/worker/`) :
   un `worker_thread` lancé pour un rendu puis terminé, avec un tas maximal
   (`EXPORT_TAS_MAX_MO`), un délai (`EXPORT_DELAI_MAX_MS`) et l'annulation
   par le signal de la requête. Un tas dépassé ne tue que le fil et revient
   comme le même refus « trop volumineux ».~~ [2026-11-10, soir :]
   **Un processus enfant par rendu, second filet** (`src/lib/pdf/worker/`,
   `lancer.ts`) : `child_process.fork` lancé pour un rendu puis arrêté, avec
   son propre `--max-old-space-size` (`EXPORT_TAS_MAX_MO`), un environnement
   sans `NODE_OPTIONS`, un délai (`EXPORT_DELAI_MAX_MS`) et l'annulation par
   le signal de la requête. Délai ou abandon : l'enfant est tué
   (`SIGKILL`), et l'issue ne revient qu'après sa sortie — la place d'export
   ne se libère pas pendant qu'il se défait. Un tas dépassé (V8 avorte,
   `SIGABRT`) ne tue que l'enfant et revient comme le même refus « trop
   volumineux » (422) ; un délai dépassé rend un 503 avec `Retry-After`, un
   client parti un 503 vide.
4. **Le ~~fil~~ processus de rendu est un fichier autonome**, empaqueté par esbuild
   (`scripts/construire-worker-pdf.mjs` → `dist-pdf/pdf-worker.mjs`), react et
   `@react-pdf` compris, sans aucun module serveur (garde par test). Le build
   CC le construit et `preparer-standalone.sh` le copie dans le serveur
   autonome ; il ne dépend pas du traçage de Next.
5. **Un journal par export** (`journal/export-pdf.ts`) : une ligne JSON, sans
   donnée du dossier, avec le poids, la durée et l'issue ; avertissement dès
   la moitié d'un seuil.

## Ce que la décision ne garantit pas

- **La mémoire hors tas** (wasm de yoga, Buffers) n'est pas bornée par
  ~~`resourceLimits`~~ `--max-old-space-size` : un conteneur saturé reste possible. Le garde-fou en
  amont et un tas calé sur l'instance réduisent le risque, ils ne
  l'annulent pas.
- **La durée** : le rendu ~~dans un fil~~ hors du processus web est plus lent (environ + 50 % sur un
  cœur, + 20 % sur deux, étude de viabilité). Le gain est la disponibilité
  de l'application, pas la vitesse de l'export.
- **La croissance sans fin du registre** : elle relève du lien par mail +
  ZIP en tâche de fond, puis de l'archive annuelle « hybride » (volumes
  figés recollés + année en cours), décidés le 2026-11-10 pour plus tard.

## Variantes écartées

- ~~**Processus enfant** (`child_process.fork`) : environ 100 Mo de mémoire
  réelle par export, contre 25 à 30 Mo pour un fil ; le confinement d'un tas
  dépassé est le même.~~ [2026-11-10, soir : retenu, voir l'amendement.]
- **`worker_thread`** : 25 à 30 Mo par export au lieu d'environ 100, mais sa
  borne (`resourceLimits`) ne tient pas sous le `--max-old-space-size` que
  Clever Cloud pose au processus. Ce coût de 70 Mo par export se paie sur
  l'instance XS : `EXPORT_TAS_MAX_MO` sera sans doute à baisser (banc, B3).
- **`new Worker(new URL(…))` empaqueté par Next** : fragile sous webpack et
  Turbopack (next.js#56635, #68950) ; le fichier autonome ne dépend pas du
  bundler de l'application.
- **Une application « worker » séparée chez Clever Cloud** : isolation
  mémoire complète, mais parcours asynchrone (stockage du résultat,
  notification, reprise) et environ 16 €/mois de plus. C'est la forme du lien
  par mail + ZIP, pour plus tard.
- **Changer de moteur** (pdfkit en flux, Typst, Chromium) : réécriture de
  tous les gabarits ; Chromium ne tient pas dans 1 Go.
- **Monter `@react-pdf` en 4.9** (nouveau moteur de pagination, opt-in) :
  « expérimental » en novembre 2026, sur un document présenté à un
  contrôleur. À reprendre quand il deviendra le défaut.

## Conséquences

- Les documents PDF n'importent plus aucun module serveur (`fraicheur-texte.ts`,
  corpus lus par fichier) : une nouvelle dépendance serveur dans un document
  casse la garde du paquet — pour les motifs que ce test connaît (Prisma,
  Better Auth, Next, `src/lib/auth`, `src/lib/prisma`, `server-only`), pas
  au-delà.
- Le ~~fil~~ processus de rendu ne sert qu'EN PRODUCTION, où il doit exister (sinon le premier
  export échoue). Hors production, la mise en page reste dans le processus,
  avec le code des documents à jour : un paquet construit au démarrage de
  `next dev` imprimerait l'ancienne version d'un document modifié depuis.
  `PDF_WORKER=1` force le processus enfant en local ; `pnpm pdf-worker` le construit.
  `pnpm build && pnpm start` en local est en production : il exige
  `pnpm pdf-worker` (sinon le serveur répond 500 partout), et un `dist-pdf`
  périmé y imprime les anciens documents.
- Au démarrage (`src/instrumentation.ts`, `pdf/worker/demarrage.ts`), la
  production lève sans le fichier du ~~fil~~ rendu ~~, ou avec un
  `--max-old-space-size` (option de Node ou `NODE_OPTIONS`) qui annulerait sa
  borne de tas~~ [2026-11-10, soir : ce drapeau n'est plus que noté au
  démarrage, il n'atteint pas l'enfant] ; l'enfant revérifie sa limite
  réelle avant de rendre. [2026-11-10, nuit : il vérifie que le drapeau qui
  l'emporte est le sien, et que la limite annoncée par V8 reste dans un
  écart de 256 Mo. La marge fixe de 64 Mo d'abord retenue, calée sur
  Node 22 (+ 48 Mo de jeune génération), refusait TOUS les PDF sous
  Node 24 (+ 192 Mo), que Clever Cloud prend (`borne.ts`). Clever Cloud
  injecte la variable `NODE_OPTIONS` (644 Mo en XS), pas un argument.] ⚠ Vérifié sur le serveur
  autonome : Next ne s'arrête pas pour autant, il répond 500 à toute requête
  (comme pour la validation de l'environnement). ~~Que le contrôle de santé de
  Clever Cloud refuse ce déploiement reste à vérifier ; à défaut, arrêter le
  processus (`process.exit(1)`) — décision en attente.~~ [relevé en préproduction le 2026-11-10 : une erreur dans `register()` fait répondre 500, et Clever Cloud garde l'ancienne instance — le déploiement reste « en cours » jusqu'à son annulation. Décision de la propriétaire du même jour : le refus de démarrer est gardé, sans `process.exit`.]
- Les seuils du garde-fou et les deux réglages du rendu se remesurent avec
  le processus enfant, en XS et en S (B3) ; les documents autres que le registre restent à
  mesurer.
- Le garde-fou est un palliatif nommé : il se relève quand le processus
  de rendu est mesuré, et se retire quand les gros exports passent en tâche de fond.
