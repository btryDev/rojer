# ADR-059 — Les PDF se mettent en page dans un fil d'exécution séparé

- Statut : proposée (2026-11-10), à accepter après les preuves sur le vrai
  build (preuve 1) et sur le banc de charge (preuves 4 et 5)
- Décision de la propriétaire : 2026-11-10 (B0 + garde-fou + journal le
  matin ; B1 à B3 lancés le même jour après la mesure du lot pdf-a1 en XS)
- Plan : `docs/plan-pdf-sous-processus.md` ; diagnostic :
  `docs/revues/generation-pdf-volume-2026-11-10.md` ; dette :
  `docs/chantiers-ouverts.md` § 23
- Lots : `lot/pdf-a1`, `lot/pdf-b0`, `lot/pdf-b1`

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
   refusée sans être mise en page (503 sans `Retry-After`, le document reste
   consultable à l'écran ; pièce absente du ZIP, dite au README).
3. **Un fil d'exécution par rendu, second filet** (`src/lib/pdf/worker/`) :
   un `worker_thread` lancé pour un rendu puis terminé, avec un tas maximal
   (`EXPORT_TAS_MAX_MO`), un délai (`EXPORT_DELAI_MAX_MS`) et l'annulation
   par le signal de la requête. Un tas dépassé ne tue que le fil et revient
   comme le même refus « trop volumineux ».
4. **Le fil est un fichier autonome**, empaqueté par esbuild
   (`scripts/construire-worker-pdf.mjs` → `dist-pdf/pdf-worker.mjs`), react et
   `@react-pdf` compris, sans aucun module serveur (garde par test). Le build
   CC le construit et `preparer-standalone.sh` le copie dans le serveur
   autonome ; il ne dépend pas du traçage de Next.
5. **Un journal par export** (`journal/export-pdf.ts`) : une ligne JSON, sans
   donnée du dossier, avec le poids, la durée et l'issue ; avertissement dès
   la moitié d'un seuil.

## Ce que la décision ne garantit pas

- **La mémoire hors tas** (wasm de yoga, Buffers) n'est pas bornée par
  `resourceLimits` : un conteneur saturé reste possible. Le garde-fou en
  amont et un tas calé sur l'instance réduisent le risque, ils ne
  l'annulent pas.
- **La durée** : le rendu dans un fil est plus lent (environ + 50 % sur un
  cœur, + 20 % sur deux, étude de viabilité). Le gain est la disponibilité
  de l'application, pas la vitesse de l'export.
- **La croissance sans fin du registre** : elle relève du lien par mail +
  ZIP en tâche de fond, puis de l'archive annuelle « hybride » (volumes
  figés recollés + année en cours), décidés le 2026-11-10 pour plus tard.

## Variantes écartées

- **Processus enfant** (`child_process.fork`) : environ 100 Mo de mémoire
  réelle par export, contre 25 à 30 Mo pour un fil ; le confinement d'un tas
  dépassé est le même.
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
  casse la garde du paquet.
- `pnpm dev` construit le fil d'abord ; sans lui, le développement met en
  page dans le processus et l'écrit en console. La production, elle, échoue
  au premier export.
- Les seuils du garde-fou et les deux réglages du fil se remesurent avec le
  fil, en XS et en S (B3) ; les documents autres que le registre restent à
  mesurer.
- Le garde-fou est un palliatif nommé : il se relève quand le fil est
  mesuré, et se retire quand les gros exports passent en tâche de fond.
