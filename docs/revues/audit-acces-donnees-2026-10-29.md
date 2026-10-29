# Audit indépendant — l'accès aux données — 2026-10-29

Demandé par la propriétaire, par la session `perf-lot3-15`. Il porte sur la
conception de l'accès aux données, pas sur un écran. Base : `main` d8e52975,
`docs/plan-performance.md` (lots 0 à 3), le code cité, et la documentation
officielle citée en fin de document. **Aucun code modifié**, aucune base
touchée.

## En une phrase

**Le nombre de requêtes n'est pas le vrai problème : c'est le nombre
d'allers-retours que la production fait attendre l'un après l'autre.** Le
réglage `connection_limit=1` et la distance entre l'application et la base les
mettent en file. La bascule vers Clever Cloud (Node permanent, base Clever
Cloud) supprime les deux causes. Le minimum suffisant est donc de régler le
pool et la région à la bascule et de mesurer avant et après. Il n'y a pas
d'architecture de cache à construire.

## 1. Diagnostic

### 1.1 Ce que coûte une page, ramené à une formule

Temps serveur d'une page ≈ **calcul** + **(nombre d'allers-retours en série)
× (durée d'un aller-retour)**.

- **Le nombre d'allers-retours en série** dépend du pool. Avec
  `connection_limit=1`, les 73 requêtes du tableau de bord passent **toutes**
  en série : chaque `Promise.all` est une file. Les ≈ 20 requêtes de la barre
  latérale partagent cette même connexion unique. Le `<Suspense>` de la PR #115
  ne change donc pas la file, seulement l'ordre d'affichage. Avec un pool de
  10, la série se réduit à la **profondeur** de la chaîne d'`await`. Pour le
  tableau de bord, c'est à peu près : repère du calendrier → établissement →
  zones → la vague de 16 lectures, chacune de 1 à 3 requêtes à cause des
  `include`. Cela fait **6 à 8 allers-retours en série**, pas 73.
- **La durée d'un aller-retour** dépend de la distance. Aujourd'hui, les
  fonctions tournent à Dublin (`vercel.json` : `dub1`), passent par le pooler
  Supabase (Supavisor) et atteignent une base dont la région n'est écrite
  nulle part dans le dépôt. L'exemple de `.env.example` dit `eu-west-3`
  (Paris). Si c'est bien Paris, l'ordre de grandeur Dublin ↔ Paris est de
  **10 à 20 ms par aller-retour**, pooler compris. **Ce chiffre n'est pas
  mesuré.** Chez Clever Cloud, avec l'application et la base dans la même
  région, on s'attend à **moins d'1 ms**, plus le proxy de Clever Cloud (voir
  § 4).

Ordre de grandeur, sous ces hypothèses (à mesurer, § 5) :

| Tableau de bord, gros dossier | Aujourd'hui (pool 1, inter-région) | Après la bascule (pool 10, même région) |
|---|---|---|
| Allers-retours en série | 73 (+ la barre, sur la même connexion) | 6 à 8 |
| Attente réseau | 73 × 10–20 ms ≈ **0,7 à 1,5 s** | 8 × ≈ 1 ms ≈ **< 10 ms** |
| SQL (mesuré) | 18,5 ms | 18,5 ms |
| Calcul serveur (mesuré en local, lot 1b) | quelques dizaines de ms | idem |

**Ce qui découle du tableau :** aujourd'hui, tout ce qui retire une requête
paie. Après la bascule, presque rien n'en vaut la peine : diviser le nombre de
requêtes par deux ferait gagner quelques millisecondes. Les lots 1 et 1a
restent justes (requêtes en double, historique non borné, N+1 de la fiche
contrôle). Mais **la suite du chantier « moins de requêtes » (lot 2,
`relationJoins`, chargeur unique) ne doit pas être engagée avant les
chiffres d'après la bascule.**

### 1.2 Vos quatre causes, une par une

| Cause relevée | D'accord ? | Commentaire |
|---|---|---|
| **(a)** Une requête par relation incluse (Prisma 6) | Oui, c'est le comportement documenté | Cela coûte de la profondeur (chaque `include` ajoute un aller-retour en série dans sa branche), pas seulement du nombre. Sans gravité une fois l'aller-retour court. |
| **(b)** Mêmes données relues sous plusieurs formes | Oui | C'est un coût de **cohérence** autant que de performance : sept lectures de lignes, c'est sept filtres à tenir alignés. C'est la meilleure raison de poursuivre le travail de `duerp-9e`, mais pas une urgence de temps de réponse. |
| **(c)** La barre latérale recalcule tout à chaque chargement complet | En partie | Avec un pool de 1, ses 20 requêtes **retardent la page**, même sous `Suspense`, parce qu'elles prennent la même connexion. Avec un pool > 1, elles tournent à côté. Le coût restant est la charge de la base, faible (§ 1.4). |
| **(d)** La portée au compte dans chaque lecture | **Non, ce n'est pas un coût d'allers-retours** | `etablissement: { entreprise: { userId } }` est un filtre de relation : Prisma l'écrit en sous-requête **dans la même instruction SQL**. Il coûte un parcours d'index, pas un aller-retour. À garder tel quel : c'est la défense en profondeur. Le vrai aller-retour « de sécurité » de chaque rendu est ailleurs : `supabase.auth.getUser()` interroge le serveur Auth par HTTP à chaque rendu (`require-user.ts`, une fois grâce à `cache()`). Il disparaît avec Better Auth, hors champ. |

Une cause manque à la liste : **le pool de 1 est probablement aussi partagé
entre requêtes HTTP simultanées.** Si le projet Vercel utilise *Fluid
compute*, qui permet plusieurs requêtes par instance (à vérifier dans le
projet), deux utilisateurs servis par la même instance font la queue sur la
même connexion. Encore une raison de ne pas lire les mesures d'aujourd'hui
comme celles de demain.

### 1.3 Où sera le plafond après la bascule : le calcul, pas la base

Node exécute le JavaScript d'un processus sur un seul fil. Si un tableau de
bord du gros dossier demande, disons, 50 ms de calcul, un processus en sert au
plus ≈ 20 par seconde, quelle que soit la vitesse de la base. **C'est le
calcul serveur qui limitera la montée en charge**, d'où la valeur du lot 1b
(dates civiles, −115 ms), bien plus que celle des requêtes retirées. On monte
en charge en ajoutant des instances. Ce point compte pour l'hypothèse 2
ci-dessous.

### 1.4 La base ne sera pas le goulet avant longtemps

18,5 ms de SQL par tableau de bord représentent environ 50 tableaux de bord
par seconde **par cœur** de la base. Une TPE-SaaS de quelques milliers de
dossiers, ouverts surtout aux heures de bureau, reste loin de ce débit. Le lot
8 (test de charge) dira le chiffre réel. Rien ne justifie aujourd'hui un cache
pour soulager la base.

## 2. Vos trois hypothèses

### H1 — Un chargeur par agrégat, des projections pures par widget

**Bonne direction, mauvaise priorité.** C'est le modèle recommandé par Next :
une lecture mémoïsée par `cache()`, que chaque composant appelle, avec des
projections pures (`docs/plan-performance.md`, lot 1). C'est aussi le seul
moyen pour qu'un compteur du tableau de bord et celui du calendrier ne
divergent pas. Mais :

- **Le gain en temps disparaît presque après la bascule** (§ 1.1). Le gain
  restant est la cohérence et la lisibilité.
- **Il se heurte à « réparer avant de lire ».** Un chargeur partagé entre la
  barre (qui ne répare pas et tourne en parallèle) et la page (qui répare
  d'abord) sert un état d'avant la réparation. C'est la raison pour laquelle
  `etatCalendrierDuRendu` a été retiré (`navigation/sidebar-counts.ts`). Un
  agrégat « dossier » unique ne peut donc exister que **côté page, après
  `assurerCalendrierAJour`**. La barre garde sa lecture à elle, ou attend la
  réparation, ce qui la ralentirait.

**Recommandation :** pas de grand chantier. On adopte la **règle** et pas la
refonte : une table lue au plus une fois par rendu côté page, par un chargeur
mémoïsé qui porte la portée au compte, et des widgets en fonctions pures. On
l'applique quand on touche un écran (ce que fait `duerp-9e`). La garde de
budget de requêtes (#116) empêche la dérive. Pas de DataLoader : `cache()` fait
déjà la déduplication par rendu. Prisma regroupe aussi seul les `findUnique`
identiques lancés dans le même tour de boucle (son *dataloader* intégré), mais
**pas** les `findMany`.

### H2 — Un résumé dérivé mis en cache, invalidé à chaque écriture

**À écarter. Ce n'est pas une rustine de plus, c'est une source d'erreur
nouvelle sur un produit qui « ne ment pas sur son niveau de conformité ».**
Quatre raisons, dont trois ne dépendent pas de l'hébergeur :

1. **Le temps rend un compteur faux sans aucune écriture.** « En retard » change
   à minuit, heure de Paris (ADR-011), sans qu'aucune action serveur ne passe.
   Une invalidation « à chaque écriture » ne le voit pas. Il faudrait mettre le
   jour civil dans la clé, puis le délai de grâce (ADR-040)… Cela revient à
   recopier les règles de l'ADR-036 dans une politique de cache.
2. **Des écritures se font pendant un rendu.** `assurerCalendrierAJour`
   régénère pendant l'affichage. Or `updateTag` n'est appelable **que depuis
   une action serveur**, et Next refuse `revalidatePath`/`revalidateTag`
   pendant un rendu (`regeneration-sure.ts` le dit déjà). Le cache garderait
   l'état d'avant la réparation : c'est exactement le défaut qui a fait
   retirer le partage du lot 1.
3. **Des écritures viennent d'ailleurs** : le prestataire par lien, le MCP,
   les scripts de reprise, les migrations. Chaque chemin doit invalider, et un
   seul oubli rend un compteur faux sans que rien ne le signale. On connaît
   déjà ce mode d'échec dans ce dépôt (§ 11 des règles de conduite : la ligne
   non rayée).
4. **Avec plusieurs instances** (§ 1.3), le cache par défaut de `use cache`
   vit en mémoire, **dans chaque instance**. Un `revalidateTag` sur une
   instance n'invalide que celle-là. Il faut un gestionnaire de cache partagé
   (Redis…) avec `refreshTags()` : un service de plus à opérer, pour
   l'hébergeur qu'on quitte justement pour simplifier.

Le cache entre requêtes a sa place pour des données **identiques pour tous et
lentes à produire** : le référentiel, les textes du guide « Comprendre ».
C'est déjà du TypeScript en mémoire, donc rien à faire. Il n'a pas sa place
pour l'état d'un dossier.

Si, après la bascule, la barre latérale pèse encore (§ 5), la marche suivante
n'est pas un cache serveur. C'est `staleTimes` côté navigateur (lot 4 :
un retour au tableau de bord dans les 30 s ne refait rien), qui n'invente
aucun état côté serveur. Elle reste expérimentale dans Next 16 : à décider en
connaissance de cause.

### H3 — Passer `connection_limit` au-dessus de 1

**Oui. C'est le levier principal, et il est lié à l'hébergement, comme vous le
supposiez.** Votre précision est juste : le 1 vient de la recommandation
Supabase pour le pooler en mode transaction en *serverless*, où chaque
instance ouvre ses propres connexions. Sur un Node permanent, la
recommandation s'inverse : un pool par processus, dimensionné.

- Prisma 6 : par défaut `connection_limit` vaut *nombre de cœurs physiques × 2
  + 1*. **Le fixer explicitement**, par exemple à 5 ou 10 par processus.
- Plafond : `max_connections` du plan Clever Cloud, à diviser entre les
  instances, les migrations, le MCP, les scripts, avec une marge. **Ce chiffre
  n'est pas publié dans la documentation de Clever Cloud** : le lire dans la
  console ou le demander au support.
- Retirer `pgbouncer=true` si la base n'est plus derrière un PgBouncer en mode
  transaction. C'est déjà dans la recette de bascule
  (`audit-nextjs-2026-10-14.md`).
- Si Prisma 7 est adopté un jour, le pool appartient au pilote (`pg`, 10 par
  défaut, réglé par `max`) et `connection_limit` ne s'applique plus.

## 3. Options classées

Gain estimé sous les hypothèses du § 1.1 ; à confirmer par le § 5.

| # | Option | Coût | Risque | Gain attendu | Verdict |
|---|---|---|---|---|---|
| 1 | **À la bascule : pool > 1, base dans la même région que l'application, pas de `pgbouncer=true`** | S (configuration) | Faible : dépasser `max_connections` si mal dimensionné | **Le plus gros** : la série passe d'environ 73 à environ 8 allers-retours, et chaque aller-retour de 10–20 ms à environ 1 ms | **Faire** |
| 2 | **Banc local avec latence injectée** (§ 5.1) | S | Nul (local) | Donne les chiffres du § 1.1 sans attendre la production : tranche `relationJoins` et le lot 2 | **Faire d'abord** |
| 3 | Garde CI de budget de requêtes (#116) | Déjà fait | Faible | Empêche le retour du N+1 (la fiche contrôle faisait 564 requêtes) | **Garder** |
| 4 | Règle « une table lue une fois par rendu côté page » (H1, au fil de l'eau) | S par écran | Moyen sur la tenancy : gardes `tenancy-*` à relancer | Cohérence des compteurs ; quelques ms | **Au fil de l'eau** (`duerp-9e`) |
| 5 | Lot 7 : traces OpenTelemetry et Web Vitals | S–M | Faible | La seule vérité sur la production | **Faire avant ou à la bascule** |
| 6 | `relationJoins` | S (un drapeau) | Moyen : **toujours en préversion dans Prisma 7**, + 10 à 25 ms de calcul mesurés | Négatif ou nul si l'aller-retour vaut ≈ 1 ms ; utile seulement s'il reste ≥ 5 ms | **Écarter**, revoir sur chiffres |
| 7 | Monter à Prisma 7 | M–L (adaptateur de pilote, `prisma.config.ts`, tests) | Moyen | Pas un levier de performance démontré ici ; `relationJoins` n'y est pas stabilisé | **Pas pour la performance** ; à planifier pour la maintenance |
| 8 | `staleTimes` (cache de navigation du navigateur) | S | Faible ; option expérimentale ; un tiers voit avec ≤ 30 s de retard | Retours au tableau de bord gratuits | **Option**, après la bascule |
| 9 | Résumé dérivé en cache serveur (H2) : `use cache` + `cacheTag` | M, puis L avec un cache partagé | **Élevé** : compteurs faux (temps, réparation au rendu, écrivains tiers, multi-instance) | Faible après la bascule | **Écarter** |
| 10 | Colonne dérivée ou table de compteurs en base | M | **Élevé** : contraire à l'ADR-036 | Faible | **Écarter** |

## 4. Ce qui dépend de l'hébergement (signalé, non traité)

- Le pool et sa taille (H3), et `max_connections` du plan.
- La région : application et base dans le même centre de données.
- Le **proxy de Clever Cloud** devant les bases dédiées : la documentation dit
  qu'il « peut ajouter de la latence » et propose un nom d'hôte direct pour le
  contourner. À mesurer avec et sans.
- Le nombre d'instances. Au-delà d'une seule : clé de chiffrement des actions
  serveur commune, `deploymentId`, et tout cache serveur à partager. Raison de
  plus pour ne pas en introduire.
- Le passage dans un `nginx` ou un équilibreur : la mise en mémoire tampon doit
  être coupée, sinon le streaming du lot 3 ne sert à rien (doc Next,
  auto-hébergement).
- L'appel HTTP au serveur Auth à chaque rendu (`getUser`) : remplacé par Better
  Auth. Sa session se lit en base ou dans un cookie signé, à choisir à la
  migration ; le cookie évite une requête par rendu.

## 5. Ce qu'il faut mesurer avant de trancher

### 5.1 Tout de suite, en local (sans attendre la production)

**Injecter une latence entre l'application et la base de mesure**, par exemple
avec Toxiproxy dans un conteneur à côté de `duerp-db`. Puis rejouer
`scripts/perf/mesurer.mjs` sur le gros dossier, en croisant :

- latence 0, 1, 5, 15 ms par aller-retour ;
- `connection_limit` 1, 5, 10 ;
- `relationJoins` actif ou non.

Ce banc répond à la question qui bloque le lot 2 (« que vaut un aller-retour
retiré ? ») pour chaque scénario d'hébergement, sans toucher à la production.
Il dit aussi la **profondeur** réelle de chaque page : à latence 15 ms, un
pool de 10 donne directement temps ÷ 15.

### 5.2 En production, en lecture seule, avant la bascule

- La durée d'un aller-retour application → base, vue de l'application : un
  `SELECT 1` chronométré, par les traces du lot 7.
- La région réelle de la base Supabase, lue dans le tableau de bord Supabase,
  sans requête.
- Si *Fluid compute* est actif sur le projet Vercel (requêtes simultanées par
  instance, donc file sur la connexion unique).

### 5.3 Sur Clever Cloud, à la recette de la bascule

- `max_connections` du plan, et la latence avec et sans le proxy de Clever
  Cloud.
- Le temps serveur au 95ᵉ centile par page (lot 7) et le débit tenu (lot 8,
  rejoué sur la machine cible). C'est là que se lit le plafond de calcul
  (§ 1.3).
- **Critère pour rouvrir le chantier « moins de requêtes »** : temps serveur
  au 95ᵉ centile du tableau de bord du gros dossier, dont plus d'un tiers
  passé à attendre la base. En dessous, on s'arrête.

## 6. Recommandation : le minimum suffisant

1. **Ne rien construire de nouveau côté cache.** Écarter H2. Le calcul depuis
   les faits reste la seule source (ADR-036), à chaque rendu.
2. **Faire le banc local à latence injectée** (§ 5.1). Une demi-journée. Il
   chiffre tout le reste.
3. **À la bascule** : pool explicite (5 à 10 par processus, sous
   `max_connections`), base et application dans la même région, sans
   `pgbouncer=true`, latence du proxy de Clever Cloud mesurée. Traces du lot 7
   en place pour lire le résultat.
4. **Garder** la garde de budget (#116), et la règle « une table lue une fois
   par rendu côté page », appliquée quand on touche un écran.
5. **Ne pas** adopter `relationJoins` ni Prisma 7 pour la performance. On
   revoit `relationJoins` seulement si l'aller-retour mesuré chez Clever Cloud
   dépasse ≈ 5 ms.
6. **Après la bascule**, le prochain levier est le **calcul serveur** (profil
   CPU, comme au lot 1b), pas la base.

## Sources

- Next.js — [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache) :
  cache en mémoire LRU par défaut ; « Self-hosted: cache entries persist across
  requests » ; `cookies()`/`headers()` interdits dans la portée mise en cache.
- Next.js — [`updateTag`](https://nextjs.org/docs/app/api-reference/functions/updateTag) :
  « can only be called from within Server Actions ».
- Next.js — [Auto-hébergement](https://nextjs.org/docs/app/guides/self-hosting) :
  « By default, calling `revalidateTag()` on one instance only invalidates the
  cache on that instance » ; `refreshTags()` ; mise en tampon des proxys et
  streaming.
- Prisma — [Relation queries (v7)](https://www.prisma.io/docs/orm/v7/prisma-client/queries/relation-queries) :
  « The `relationLoadStrategy` option is currently in Preview ».
- Prisma — [Connection pool](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool) :
  défaut v6 `num_physical_cpus × 2 + 1` ; en v7, le pool vient du pilote (`pg` : 10).
- Prisma — [Query optimization](https://www.prisma.io/docs/orm/prisma-client/queries/advanced/query-optimization-performance) :
  le *dataloader* regroupe les `findUnique` du même tour, « does not currently
  batch `findMany()` ».
- Supabase — [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) :
  connexion directe pour les serveurs persistants, pooler en mode transaction
  pour le *serverless* ; [Prisma](https://supabase.com/docs/guides/database/prisma).
- Supabase — [Clés asymétriques et `getClaims`](https://supabase.com/changelog/29289-supabase-auth-asymmetric-keys-support-in-2025).
- Clever Cloud — [PostgreSQL](https://www.clever.cloud/developers/doc/deploy/databases/postgresql/) :
  proxy devant les bases dédiées, nom d'hôte direct possible ; limites de
  connexions non publiées.
- Dépôt : `docs/plan-performance.md`, `docs/revues/audit-nextjs-2026-10-14.md`,
  `src/lib/navigation/sidebar-counts.ts`, `src/lib/calendrier/regeneration-sure.ts`,
  `src/lib/auth/scope.ts`, `src/lib/auth/require-user.ts`, `vercel.json`,
  `.env.example`, ADR-003, ADR-011, ADR-036, ADR-040.
