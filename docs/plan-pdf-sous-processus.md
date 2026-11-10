# Plan — préparer les PDF hors du fil principal (piste B) — 2026-11-10

> **Décision de la propriétaire du 2026-11-10.**
> - **Maintenant : B0 + garde-fou + journal** (`lot/pdf-b0`). Une seule
>   fonction de rendu (`rendrePdf`), un refus « trop volumineux » au-delà
>   d'un seuil, une ligne de journal par export.
> - ~~**B1 à B3 reportés** : au lancement, les clients n'ont pas d'historique
>   (dossiers de démo : tous les exports en 1-2 s, 9 simultanés servis sans
>   gêner les autres).~~ **[2026-11-10, même jour, après la mesure d'A1 en
>   XS : B1 à B3 LANCÉS** (`lot/pdf-b1`). En XS, le processus meurt dès
>   3 080 rapports, et un registre d'un an fige l'application environ 7 s.
>   Le garde-fou reste le premier filet (refus instantané au-delà du seuil),
>   le fil d'exécution le second (tas dépassé confiné à l'export, boucle
>   libre).]
> - **[2026-11-10, soir : livraison en deux temps.** A1 et B0 (garde-fou,
>   journal) fusionnent seuls dans `cc` : ils ne dépendent pas de la
>   plateforme. Le rendu hors du processus ne fusionne qu'après la
>   préproduction : Clever Cloud pose lui-même `--max-old-space-size`, qui
>   annule la borne de tas d'un `worker_thread` (mesuré : 1 310 Mo reçus pour
>   64 demandés). B1 passe donc à un **processus enfant** (`fork`, drapeaux et
>   environnement explicites), dont la borne tient quel que soit le mode
>   d'injection (mesuré : 432 Mo pour 384 demandés).]
> - **Issue future des « trop volumineux »** : lien par mail + ZIP, générés en
>   tâche de fond ; puis une archive annuelle « hybride » (un seul registre :
>   volumes annuels figés recollés + année en cours générée).
> - **On garde tout et on exporte tout** (même jour) : ni borne du registre à
>   5 ans, ni suppression. Le client type (10 équipements, environ 86 rapports
>   par an) n'atteint le seuil du garde-fou qu'après une vingtaine d'années.
> - **Production en XS au départ**, passage en S sur des seuils à fixer par
>   elle plus tard (proposés : `docs/chantiers-ouverts.md` § 23).
> - **Import de rapports en masse** : vérifié absent le 2026-11-10, les
>   rapports se déposent un par un.
>
> Le plan ci-dessous est celui du 2026-11-10, avant la décision.


~~Plan seulement : rien n'est codé avant le feu vert de la propriétaire.~~
[2026-11-10 : B0 codé, `lot/pdf-b0` ; ~~B1-B3 reportés~~ B1-B3 lancés le même jour, `lot/pdf-b1`, voir l'encadré.]
Base : `lot/pdf-a1` (fca75951). Entrées : l'étude de viabilité de
`rojer-outils-cb` et `docs/revues/generation-pdf-volume-2026-11-10.md`.

## 1. Ce que le lot règle, et ce qu'il ne règle pas

- **Règle** : pendant un export, l'application reste disponible pour tout le
  monde (étude : pages p99 34 ms au lieu de 3,1 s sur 1 cœur). Un document qui
  dépasse le tas alloué fait échouer **son** export, avec un message, sans
  tuer le processus.
- **Ne règle pas** :
  - la mémoire hors tas : un conteneur saturé reste possible, d'où le plafond
    calé sur le banc (§ 5) ;
  - la durée : l'export est environ 50 % plus lent sur 1 cœur (étude) ;
  - la croissance sans fin du registre : c'est l'affaire des volumes annuels,
    plus tard.

## 2. Architecture

```
route (parent)                                   worker_thread (1 par rendu)
  accès, Prisma, construire*Data
  reserverPlaceExport (inchangé)
  rendrePdf(type, props) ──── { type, props } ──▶ DOCUMENTS[type](props)
                                                   renderToBuffer
  Response / zip.file  ◀──── ArrayBuffer transféré
```

- **Un worker par rendu**, détruit ensuite : toute sa mémoire est rendue
  (étude : environ 25-30 Mo et 100 ms à froid). Pas de pool, pas de Piscina :
  la file borne déjà à 1 export de front.
- **Le parent ne passe plus un élément React** (non clonable) mais
  `{ type, props }`. Les routes changent donc de signature d'appel, pas de
  logique.
- **ZIP de contrôle** : ses quatre rendus passent par la même fonction, l'un
  après l'autre, chacun dans son worker. Un rendu en échec suit le chemin
  existant (`noterEchec`, le README dit la pièce absente et pourquoi).

## 3. Fichiers

### Créés

| Fichier | Rôle |
|---|---|
| `src/lib/pdf/documents.ts` | Le registre unique `DOCUMENTS` : `registre`, `dossier-conformite`, `plan-actions`, `points-a-corriger`, `duerp` → composant. Type `PropsDe<T>` déduit des composants. Aucun import serveur. |
| `src/lib/pdf/rendre.ts` | `rendrePdf(type, props, { signal? })` : **la seule fonction qui rend un PDF**. Lance le worker, attend `message` / `error` / `exit`, applique le délai, `terminate()`. Erreurs typées : `PdfTropVolumineux`, `PdfDelaiDepasse`, `PdfEchec`. |
| `src/lib/pdf/worker/entree.ts` | Entrée du worker : reçoit `{ type, props }`, rend avec `DOCUMENTS`, renvoie l'`ArrayBuffer` en transfert. Rien d'autre. |
| `scripts/construire-worker-pdf.mjs` | esbuild : `entree.ts` → `pdf-worker.mjs` (ESM, Node 22, alias `@/` par le tsconfig). |
| `docs/adr/059-…md` | L'ADR (§ 9). Numéro à confirmer : 058 est le dernier sur `cc`. |
| tests | Voir § 8. |

### Modifiés

| Fichier | Changement |
|---|---|
| `src/lib/pdf/reponse.ts` | `reponsePdf(type, props, nomFichier, demandeur)` appelle `rendrePdf` ; traduit les erreurs typées en réponses (§ 6). |
| 6 routes PDF (registre, dossier, plan, points à corriger, DUERP version, DUERP aperçu) | `reponsePdf("registre", { data }, …)` au lieu de `reponsePdf(RegistreDocument({ data }), …)`. |
| `controle-zip/route.ts` | Les quatre `renderToBuffer(XDocument(…))` deviennent `rendrePdf(type, props)`. Plus d'import de `@react-pdf/renderer` dans les routes. |
| `src/lib/exports/limite.ts` | Inchangé dans son rôle. Son commentaire d'en-tête se raye et se date : la boucle n'est plus bloquée par le rendu. |
| `src/env.ts` | Deux réglages validés au démarrage, comme `EXPORTS_SIMULTANES` : `EXPORT_TAS_MAX_MO`, `EXPORT_DELAI_MAX_MS`. |
| `package.json` | `esbuild` en devDependency (aujourd'hui seulement transitive par `tsx`, donc non résoluble sous pnpm). `build:cc` et `build` lancent `construire-worker-pdf.mjs`. |
| `scripts/preparer-standalone.sh` | Copie `pdf-worker.mjs` dans `.next/standalone/`, et échoue s'il manque. |
| `docker/Dockerfile.cc` | Rien : il appelle `pnpm build:cc`. |
| garde de code | Un test refuse tout `renderToBuffer` hors de `worker/entree.ts` et du repli de dev (§ 7). |

## 4. Deux écarts par rapport à l'étude de viabilité

1. **Tout empaqueter dans `pdf-worker.mjs`, sans externes.** L'étude garde
   `react` et `@react-pdf` en externes, résolus depuis
   `standalone/node_modules`. Or, après ce lot, plus aucune route n'importe
   `@react-pdf/renderer` : le traçage de Next ne le copierait plus dans
   standalone. Un fichier autonome ne dépend pas du traçage (yoga est déjà en
   base64 dans son module, pas de `.wasm` à suivre). Repli si l'empaquetage
   complet échoue : externes + `outputFileTracingIncludes` dans
   `next.config.ts`. La preuve 1 tranche.
2. **Annuler le rendu quand le client part.** `rendrePdf` reçoit le
   `req.signal` de la route : un onglet fermé fait `terminate()` au lieu de
   laisser 100 s de calcul tourner pour personne. C'est possible seulement
   parce que le rendu est dans un worker.

## 5. Plafond de tas (`maxOldGenerationSizeMb`)

- **Règle de calcul** : plafond = (mémoire de l'instance − RSS du serveur web
  en charge − marge) ÷ rapport RSS/tas du worker. Mes mesures donnent un
  RSS de 1,3 à 2 fois le tas ; l'étude donne 241 Mo de tas pour 1 000 lignes.
- **Valeur** : à caler sur les mesures A1 de `rojer-outils-cb` en XS (RSS du
  conteneur au repos et sous vagues, tas par millier de lignes après A1). Ordre
  de grandeur attendu en XS (1 152 Mo) : 250 à 350 Mo. Je ne fixe pas de
  chiffre avant ces mesures.
- **Réglage** : `EXPORT_TAS_MAX_MO`, par instance, parce que XS et S n'ont pas
  la même réponse. Une valeur mal formée arrête le démarrage, sans repli
  silencieux.
- **Piège vérifié à la lecture** : aucun `NODE_OPTIONS` ni
  `--max-old-space-size` dans `scripts/`, `docker/`, `package.json`,
  `.github/`. Reste à vérifier les variables posées dans la console Clever
  Cloud (geste de la propriétaire) : un `NODE_OPTIONS` y prendrait le pas sur
  le plafond du worker.

## 6. Ce que voit l'utilisateur quand ça échoue

| Cas | Réponse d'une route PDF | Dans le ZIP |
|---|---|---|
| Tas dépassé (`ERR_WORKER_OUT_OF_MEMORY`) | 503, texte : « Ce document est trop volumineux pour être préparé ici. Votre dossier n'est pas touché. » Pas de `Retry-After` : réessayer ne changera rien. | Pièce notée absente, raison « document trop volumineux », dite dans le README. |
| Délai dépassé (`EXPORT_DELAI_MAX_MS`) | 503 + `Retry-After`, « La préparation a pris trop de temps. Réessayez dans quelques minutes. » | Idem, raison « délai dépassé ». |
| Autre erreur de rendu | 500, comme aujourd'hui. | Comme aujourd'hui (`noterEchec`). |

- Chaque échec est journalisé avec le type de document, la durée et le motif,
  sans donnée du dossier.
- **Délai** : valeur à caler sur le banc (durée du registre 5 ans après A1,
  plus la marge du worker). À l'échéance : `terminate()`, place d'export
  rendue dans le `finally` existant.
- Le texte « trop volumineux » est honnête mais ne donne pas d'issue. L'issue
  viendra ~~de la borne à 5 ans ou~~ des volumes annuels ~~, selon la décision de la
  propriétaire~~ [2026-11-10 : pas de borne, décision de la propriétaire — lien
  par mail + ZIP, puis archive annuelle hybride].

## 7. Développement (Turbopack) et tests

- `next dev` ne construit pas `pdf-worker.mjs`. Deux choix possibles :
  - **(a) recommandé** : `pnpm dev` lance d'abord `construire-worker-pdf.mjs`
    (environ 100 ms), et le worker sert en dev comme en production. Limite :
    une modification d'un `*Document.tsx` demande de relancer le script (ou
    son mode `--watch`).
  - **(b) repli** : si le fichier manque **et** que `NODE_ENV` n'est pas
    `production`, `rendrePdf` rend dans le processus, avec un avertissement en
    console. En production, un fichier manquant est une erreur au premier
    export, jamais un repli.
  - Je propose (a) + (b) : (b) évite qu'un clone neuf soit cassé, (a) garde le
    dev proche de la production. La preuve 7 confirme.
- Vitest : `rendrePdf` se teste avec le vrai worker, construit par esbuild en
  `globalSetup` du fichier de test (rapide). Les tests d'arbre existants des
  documents ne changent pas.

## 8. Tests

1. **Clonage** (preuve 3) : pour chaque type, `structuredClone(props)` est
   égal à l'entrée, sur des données qui exercent toutes les branches (dates,
   `null`, tableaux). Un `Decimal` ou une fonction ajoutés plus tard cassent
   ce test, pas la production.
2. **Même PDF** (preuve 2) : pour chaque type, le PDF du worker est identique
   à celui du rendu dans le processus, à la date de création près.
3. **Tas dépassé** : un document énorme sous un plafond bas donne
   `PdfTropVolumineux`, et le rendu suivant réussit.
4. **Délai** : un plafond de quelques millisecondes donne `PdfDelaiDepasse`,
   le worker est terminé.
5. **Annulation** : un signal annulé termine le worker.
6. **Réponses** : `reponse.test.ts` couvre les trois lignes du tableau du § 6.
7. **Garde** : aucun `renderToBuffer` hors des deux fichiers autorisés.
8. Épreuve de chaque garantie en la cassant (plafond retiré, `terminate`
   retiré), comme pour A1.

## 9. ADR

Oui : c'est une décision d'architecture (un second fil d'exécution, une étape
de build, un contrat de données clonables). ADR-059, « Les PDF se préparent
hors du fil principal ». Contenu : le problème mesuré, le choix worker par
rendu, les deux variantes écartées (processus enfant : environ 100 Mo par
export ; application séparée : parcours asynchrone, pour plus tard), ce que le
lot ne garantit pas, les deux réglages. Écrit avant le code, dans le même lot.

## 10. Découpage et ordre des preuves

| Étape | Contenu | Preuve | Coût machine |
|---|---|---|---|
| B0 | `documents.ts`, `rendrePdf` **dans le processus**, routes et ZIP migrés, garde. ~~Aucun changement de comportement~~ [2026-11-10 : le garde-fou de volume et le journal y sont entrés — refus 503 au-delà d'un seuil, pièce absente du ZIP] ; fusionnable seul. | 3 (clonage) | tests ciblés |
| B1 | Worker, esbuild, délai, annulation, erreurs typées, réponses. | 2 (même PDF), 7 (dev) | tests ciblés |
| B2 | `build:cc`, `preparer-standalone.sh`, standalone isolé. | 1 (standalone), 6 (`NODE_OPTIONS`) | **un build**, après les vagues du banc |
| B3 | Plafond et délai calés ; ADR finalisé. | 4 et 5 (banc, par `rojer-outils-cb`) | banc |

L'ordre met d'abord les preuves qui ne coûtent rien (3, 2, 7), puis celle qui
peut faire changer l'empaquetage (1), puis le banc. Si la preuve 1 échoue
dans ses deux variantes, on s'arrête avec B0 seul, qui reste un gain de
propreté.

**Effort** : B0 une demi-journée, B1 un jour et demi, B2 une demi-journée à un
jour (c'est le risque du lot), B3 une demi-journée plus le temps de banc.
Total : 3 à 4 jours, plus une revue indépendante avant fusion.

## 11. Questions pour la propriétaire

1. Le message « trop volumineux » suffit-il en attendant ~~la borne ou~~ les
   volumes annuels ? [2026-11-10 : oui, en attendant le lien par mail + ZIP ;
   pas de borne.]
2. Production en XS ou en S ? Le plafond, donc la taille de dossier servie,
   en dépend directement.
3. Y a-t-il un `NODE_OPTIONS` dans les variables de l'application Clever
   Cloud ?
