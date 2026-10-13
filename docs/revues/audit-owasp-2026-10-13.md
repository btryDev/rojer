# Audit OWASP Top 10 — 2026-10-13

Version auditée : `origin/main` `8f48889e` (merge de la PR #23), celle qui est
déployée. L'audit s'est fait en lecture seule, par trois passes parallèles
(contrôle d'accès et sessions ; données, injections et SSRF ; conception,
intégrité, journalisation, SSDLC et RGPD), puis une contre-vérification dans le
code, dans le lockfile et dans `node_modules`. Le seul accès à la production a
été la lecture des en-têtes HTTP de `test-duerp-hazel.vercel.app`.

Il complète l'audit infra et middleware du même jour (constats C1 à C7, branches
`lot/audit-1013-auth` et `lot/audit-1013-robustesse`). Les constats qui s'y
trouvent déjà sont renvoyés à ces branches, pas réécrits ici.

**Contexte de lecture.** L'authentification passera de Supabase Auth à
**Better Auth**, et l'hébergement, de l'application comme de la base, ira chez
**Clever Cloud**. Chaque constat est donc classé de trois façons : *maintenant*,
*disparaît avec la bascule*, ou *à exiger de la bascule*.

## Verdict

**Il n'y a pas de fuite entre clients dans le code.** Environ 75 Server Actions
et les 17 routes API ont été tracées jusqu'à `entreprise.userId`. Les jetons
publics font 256 bits et sont stockés hachés. L'OTP est comparé à temps
constant. On ne trouve ni SQL non sûr, ni `dangerouslySetInnerHTML`, ni secret
commité. Les fichiers déposés sont servis en `sandbox` avec `nosniff`.

Les risques réels tiennent à ce qui *entoure* le code. Douze tables sont
peut-être lisibles avec la clé publique. La version de Next.js est en retard.
Le dépôt est public et `main` n'est pas protégée. Côté conformité, il manque les
mentions légales et la procédure de notification d'une violation.

## Ce qui est sain, vérifié

- **Contrôle d'accès.** Les gardes centrales (`src/lib/auth/scope.ts`) filtrent
  jusqu'au propriétaire et répondent `notFound()` en cas d'échec. Les
  identifiants enfants et étrangers reçus d'un formulaire sont rebornés à
  l'établissement. Les tests de classe `tenancy-ecritures` et `tenancy-lectures`
  tiennent la règle, avec 9 fichiers `*isolation*.test.ts`.
- **Identifiants.** Tous les identifiants sont des `cuid()` ou des
  `prefix_${randomUUID()}`. Le seul compteur séquentiel est
  `DuerpVersion.numero`, toujours lu sous un `duerpId` déjà vérifié.
- **Jetons publics.** Ils sont tirés par `randomBytes(32)`, stockés en SHA-256,
  expirent et ne servent qu'une fois quand l'usage l'exige. Leur consommation est
  atomique. L'OTP est limité à 3 essais pendant 10 minutes, et chaque essai est
  réservé avant la comparaison.
- **Injections.** Tous les `$queryRaw` sont des gabarits paramétrés. Le seul
  `Prisma.raw` porte un nom de colonne pris dans une liste fermée. Il n'y a aucun
  `child_process` à l'exécution.
- **Fichiers.** Le bucket est privé, sans URL signée ni publique. Les fichiers
  passent par des routes qui vérifient la propriété. Au service, une liste
  blanche de 4 types s'applique ; tout autre type part en `octet-stream`
  `attachment`, avec `CSP: sandbox`. Les noms sont assainis dans
  `Content-Disposition` et dans les archives ZIP.
- **SSRF.** Aucun `fetch` serveur ne vise une URL fournie par un utilisateur.
  Les adresses Légifrance sont fixes.
- **Secrets.** La clé `service_role` n'est lue que dans des modules
  `server-only`, et les journaux n'en donnent que la forme. Rien n'est commité
  (vérifié par recherche de motifs sur tout l'arbre). Le secret scanning et la
  push protection de GitHub sont actifs.
- **Transport, mesuré en production.** HTTP est redirigé en 308 vers HTTPS. HSTS
  est fixé à 2 ans. TLS 1.1 est refusé. `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy` et `Permissions-Policy` sont présents.
- **CI.** Les actions sont épinglées par SHA, avec
  `pnpm install --frozen-lockfile` et `permissions: contents: read`.
- **Données de santé.** On ne trouve ni NIR, ni date de naissance, ni avis
  médical. La frontière est tenue par `pieceMedicale` et par
  `frontiere-medicale.test.ts`.

## Constats

### Maintenant, indépendants de la bascule

**S1 — RLS absente sur 12 tables de `public`. Critique si l'API Data de Supabase
est exposée.**
Le schéma compte 30 tables, dont 18 seulement reçoivent
`ENABLE ROW LEVEL SECURITY`. Les 12 restantes sont `Batiment`,
`DeclarationEtatPermanent`, `Duerp`, `DuerpVersion`, `Entreprise`,
`FicheRegistre`, `PiecePrestataire`, `PrescriptionParticuliere`, `Risque`,
`Salarie`, `TitreSalarie` et `UniteTravail`. Une 31ᵉ, `Mesure`, a été créée
sans RLS puis supprimée par une migration, et ne compte plus. Une première
contre-vérification l'avait comptée à tort, en comparant les `CREATE TABLE`
sans retrancher les `DROP TABLE`. L'ADR-005 (§ 7) affirme
qu'une migration `enable_rls_deny_all` est « déjà en place » ; elle n'existe pas
dans `prisma/migrations`. Si les rôles `anon` et `authenticated` gardent leurs
droits par défaut sur `public`, la clé publishable, présente dans le bundle JS,
suffit à lire ces tables, voire à y écrire, pour tous les comptes.
*Non vérifié en production* : la requête de contrôle a été refusée par le
garde-fou de session.
→ Vérifier dans le tableau de bord Supabase : le Security Advisor, les schémas
exposés et les GRANT de `anon`. → Écrire une migration additive qui active la
RLS sur les 12 tables, retire les droits de `anon` et `authenticated` sur
`public` là où ces rôles existent (ils n'existent ni en local ni chez Clever
Cloud), avec un test qui exige que chaque `CREATE TABLE` ait son
`ENABLE RLS`. Prisma n'est pas affecté, puisque le rôle propriétaire contourne
la RLS, comme pour les 18 autres tables. La bascule rendra la mesure caduque, et
le test restera inoffensif.

**S2 — `next` 16.3.5. Élevée.**
`pnpm audit --prod` relève 84 avis, dont 2 critiques, 32 élevés, 44 moyens et
6 faibles. Pour `next`, il y en a 7, tous corrigés en 16.3.8 :
- RCE via `next/og`, critique. Non atteignable : `next/og` n'est importé nulle
  part.
- SSRF dans l'optimisation d'images, élevée. Non exploitable aujourd'hui :
  aucun `remotePatterns` n'est configuré.
- Deux failles de cache poisoning SSG/ISR, une fuite par les routes d'images de
  métadonnées, une fuite du Draft Mode.

Sur Vercel, l'optimisation d'images et le cache ne passent pas par notre serveur.
**Chez Clever Cloud, en auto-hébergement, ils y passeront** : le cache poisoning
« self-hosted » et `sharp`/librsvg nous concerneront alors.
→ Monter `next` et `eslint-config-next` à 16.3.8 ou plus.

**S3 — `shadcn` déclaré en `dependencies`. Moyenne.**
La CLI `shadcn` tire `@modelcontextprotocol/sdk`, qui tire à son tour `express`,
`hono`, `proxy-addr` (l'autre avis critique), `ws`, `fast-uri` et `ip-address`.
Rien de tout cela ne s'exécute en production, mais tout est installé et compté.
`globals.css` ne lit que sa feuille Tailwind, au moment du build.
→ Passer `shadcn` en `devDependencies`.

**S4 — Dépôt public, `main` non protégée, Dependabot désactivé. Élevée.**
`gh api repos/btryDev/rojer` répond `visibility: public`. La protection de
branche répond `Branch not protected`, et il n'y a aucun ruleset. Les alertes
Dependabot sont désactivées. Comme Vercel déploie `main`, un push direct part en
production sans revue ni CI. Tout `docs/`, audits compris, est lisible par
n'importe qui.
→ Ajouter `.github/dependabot.yml`, qui ne propose que des PR et ne merge rien.
→ Gestes de la propriétaire sur GitHub :
- protéger `main` (PR obligatoire, check `tests` requis, pas de force-push) ;
- activer les alertes Dependabot ;
- décider si le dépôt doit rester public.

**S5 — Import xlsx sans borne de lignes ni capture d'erreur. Faible à moyenne.**
`XLSX.read(buffer, { type: "buffer" })` (`src/lib/duerps/import/parser.ts`) est
appelé sans `sheetRows`, et aucun `try/catch` ne l'entoure. Un classeur de 5 Mo
très compressé peut épuiser la mémoire de la fonction, et un fichier malformé
lève une exception non gérée. Seul un utilisateur connecté peut le faire.
→ Borner les lignes lues, et transformer l'échec d'analyse en erreur
d'utilisateur.

**S6 — `uploadRapport` lit le fichier avant de vérifier la propriété. Faible.**
La lecture du `FormData` et la validation du fichier (jusqu'à 25 Mo) ont lieu
avant `assertEtablissementOwnership` (`src/lib/rapports/actions.ts`). Un
anonyme peut donc faire traiter un gros corps de requête. Rien ne fuit, mais
c'est une porte au déni de service.
→ Contrôler la session dès l'entrée de l'action.

**S7 — CSP en Report-Only seulement. Moyenne.**
Seul `frame-ancestors 'none'` est appliqué. Le reste
(`script-src 'self' 'unsafe-inline'`) est en Report-Only, sans point de collecte
des violations : personne ne lit les rapports. Combiné à S9, une faille XSS
donnerait le vol de session.
→ Appliquer la CSP au moment de la bascule, quand l'en-tête et les cookies
seront repris ensemble. La passer en bloquant maintenant, sans nonce, ne
retirerait pas `'unsafe-inline'`.

### Couvert par l'audit infra du même jour, sur d'autres branches

- **Redirection ouverte** après connexion (`signInAction`, `?next=`) et dans
  `auth/callback` : C1 et C2, sur `lot/audit-1013-auth`.
- **Origine des liens d'e-mail** (inscription, réinitialisation) lue dans le
  formulaire : C3, même branche.
- **Liste blanche du middleware comparée par préfixe** : C7, même branche.
- **`x-powered-by: Next.js`**, **pages d'erreur** (`error.tsx`,
  `global-error.tsx`, `not-found.tsx`), **`tsc` et `lint` en CI** : sur
  `lot/audit-1013-robustesse`.

### Disparaît avec la bascule : ne pas corriger sur Supabase et Vercel

| # | Constat | Pourquoi ne pas y toucher |
|---|---|---|
| S8 | RLS et API Data Supabase (S1) | Pas d'API Data chez Clever Cloud. S1 ne vaut que jusqu'à la bascule. |
| S9 | Cookies `@supabase/ssr` avec `httpOnly: false` et 400 jours (valeurs par défaut lues dans `node_modules`, jamais surchargées) | Better Auth pose ses propres cookies : voir B1. |
| S10 | La limite par IP de Supabase voit les IP de Vercel, parce que la connexion est appelée côté serveur | La limitation de débit sera celle de Better Auth : voir B3. |
| S11 | Jeton MCP OAuth accepté sans contrôle de `aud` ni de `client_id` | Le MCP passera par le plugin OAuth de Better Auth : voir B5. |
| S12 | Message d'erreur brut de Supabase au signup | Formulaire réécrit. |
| S13 | Pas de pare-feu ni de rate limit Vercel, offre Hobby, région `dub1` différente de celle de la base | L'hébergeur change. |

### À exiger de la bascule Better Auth + Clever Cloud

Ce sont les défauts d'aujourd'hui qu'il ne faut pas reconduire. Chaque ligne est
un critère de recette.

- **B1 — Cookies.** `httpOnly`, `secure` et `sameSite=lax` au minimum. Une durée
  de session explicite, dont un rafraîchissement inférieur à 30 jours, au lieu
  de 400.
- **B2 — Origine.** `baseURL` et `trustedOrigins` sont fixés côté serveur, depuis
  `PUBLIC_APP_URL`. Aucune URL de lien envoyé par e-mail ne vient d'une requête.
  Le chemin de retour après connexion passe par le filtre de C1 et C2.
- **B3 — Limitation de débit.** Le rate limiter de Better Auth est activé sur la
  connexion, l'inscription et la réinitialisation, et adossé à la base, pas à la
  mémoire d'une instance. L'IP réelle est lue derrière le proxy Clever Cloud
  (`X-Forwarded-For` de confiance). Mettre aussi un plafond total de renvois
  d'OTP par jeton : aujourd'hui, seul le délai de 60 secondes s'applique.
- **B4 — Mots de passe et sessions.** Au moins 12 caractères, vérifiés côté
  serveur, y compris à la réinitialisation (aujourd'hui, seul l'attribut HTML
  `minLength=8` s'applique à ce moment-là). Les autres sessions sont révoquées
  après une réinitialisation. Proposer le plugin 2FA.
- **B5 — MCP.** Passer par le plugin OAuth provider de Better Auth, avec contrôle
  de l'audience. Supprimer ensuite `/api/mcp/[cle]` et la variable `MCP_CLE`, dont
  le secret circule dans l'URL et dans les journaux.
- **B6 — Base Clever Cloud.** Connexion TLS obligatoire (`sslmode=require`).
  Restreindre l'accès réseau de l'add-on : il est joignable depuis Internet par
  défaut. Vérifier que les sauvegardes existent, et le faire par une
  restauration d'essai. Un rôle applicatif distinct du rôle de migration, si
  l'offre le permet.
- **B7 — Migrations hors du build.** Aujourd'hui,
  `"build": "prisma generate && next build && prisma migrate deploy"` : tout
  build migre la base qu'il vise, y compris un build local ou de preview.
  Lancer `prisma migrate deploy` comme étape de déploiement distincte, sur la
  base de production seulement.
- **B8 — En-têtes.** Reprendre `entetesSecurite` avec une CSP appliquée et à
  nonce (cf. S7), et `poweredByHeader: false`. Revérifier HSTS et TLS sur le
  domaine Clever Cloud.
- **B9 — Stockage.** S'il passe sur Cellar (S3 Clever Cloud) : bucket privé,
  clés limitées au bucket, service des fichiers inchangé (par les routes, jamais
  d'URL publique).
- **B10 — Journaux.** Un drain de logs ou un service externe, avec une durée de
  conservation décidée. Les journaux du processus ne suffisent pas.

- **B11 — Taille des dépôts.** Sur Vercel, le corps d'une requête est plafonné
  à 4,5 Mo : les dépôts en Server Action au-delà de cette taille échouent, malgré
  `bodySizeLimit: 25mb`. Sur CC, vérifier ce plafond au reverse proxy, ou passer
  à un envoi direct vers le stockage par URL pré-signée.
- **B12 — Exécution.** App et base dans la même zone. Pool Prisma dimensionné
  pour un Node permanent : `connection_limit=1` et `pgbouncer=true` n'ont plus
  lieu d'être sans pooler en mode transaction (`FOR UPDATE` dans
  `rapports/actions.ts`). Version de Node fixée. RAM suffisante pour le ZIP de
  contrôle, qui charge tous les rapports en mémoire (ou le streamer).
- **B13 — Migrations, suite de B7.** Documenter la reprise d'une migration en
  échec (P3009, `prisma migrate resolve`). Appliquer la règle des deux
  déploiements pour retirer une colonne. Previews sur une base isolée, jamais
  l'URL de prod. Sauvegardes et PITR. Contrôle de dérive entre la base de prod
  et les migrations.
- **B14 — Comptes.** Correspondance de `Entreprise.userId` (UUID Supabase) vers
  l'identifiant Better Auth, et choix entre réinitialisation forcée et import des
  hachés bcrypt. Lire la session une seule fois par requête. Une route `/api/*`
  sans session répond 401, pas 307. La limite de débit couvre aussi `/signe/*`,
  `/verifier/*`, `/acces/*` et `verifierIntegriteSignature` (action publique qui
  hache jusqu'à 20 Mo).
- **B15 — Isolation sans RLS.** Après la bascule, l'isolation repose entièrement
  sur `scope`/`requireUser`. `tenancy-lectures.test.ts` ne couvre que les
  `*/queries.ts` : une action qui ne fait que lire n'est gardée par aucun test.
  Étendre la sonde, ou garder une RLS en défense en profondeur.
- **B16 — Variables.** Reporter `DATABASE_URL`, `DIRECT_URL`, `STORAGE_*`,
  `PUBLIC_APP_URL`, `MCP_*` et `EMAIL_DRIVER`. Les `NEXT_PUBLIC_*` sont figées au
  build. Builder avant tout `prune --prod` : `globals.css` importe
  `shadcn/tailwind.css`.

Les points B11 à B16 viennent de l'audit infra du même jour.

### Hors Top 10 vérifiés

- **CORS.** Seul `/.well-known/oauth-protected-resource/api/mcp` répond
  `access-control-allow-origin: *` : c'est un document de métadonnées public
  par nature. Aucune autre route n'émet d'en-tête CORS : même origine seulement.
- **Mass assignment.** `Object.fromEntries(formData)` passe toujours par un
  schéma zod, qui retire les clés inconnues avant le `data:` de Prisma.
- **Non couverts par cet audit** : test dynamique (DAST), ReDoS sur les
  expressions régulières, XXE dans le parseur xlsx.

### Conformité et suivi, sans urgence technique

- **R1 — Mentions légales et politique de confidentialité. Moyenne.** Aucune
  route ne les porte dans l'application. C'est une obligation (LCEN art. 6,
  RGPD art. 13). Le contenu est à arrêter par la propriétaire ; voir la mémoire
  « Mentions légales et cadre ».
- **R2 — Procédure de violation de données. Moyenne.** Rien dans
  `docs/rgpd.md` ne couvre la notification à la CNIL sous 72 h (art. 33) ni
  l'information des clients. À écrire : qui constate, qui décide, quels systèmes
  isoler, quel modèle de message.
- **R3 — Journal d'audit. Moyenne.** Ni les connexions, ni les accès aux données
  d'un salarié, ni les suppressions ne sont tracés. Le manque est assumé dans
  `docs/rgpd.md` § 8, mais il devient dû avec le multi-utilisateur. À concevoir
  avec Better Auth, qui journalise déjà les sessions.
- **R4 — DPA des sous-traitants.** Supabase et Vercel sont nommés dans
  `rgpd.md` § 6, sans mention des DPA signés. À refaire pour Clever Cloud. La
  phrase du § 3 qui dit encore que le stockage est « local » est périmée.
- **R5 — CI.** Elle ne lance ni `tsc`, ni `eslint`, ni `next build`, et n'a ni
  SAST ni SCA. Dependabot (S4) couvre la SCA. `tsc` et `lint` arrivent par
  `lot/audit-1013-robustesse`.
- **R6 — Pages d'erreur.** Couvertes par `lot/audit-1013-robustesse`.
- **R7 — Exposition publique mineure.** L'e-mail du signataire est affiché sur
  `/verifier/[id]` et `/signe/[id]`, pour qui a le lien (identifiant UUID).
  L'OTP part dans le même e-mail que le lien : il ne protège pas d'une boîte
  compromise. À trancher quand l'envoi d'e-mails sera réel ; aucun e-mail ne part
  aujourd'hui.

## Corrigé sur `lot/securite-owasp-1013`

Voir les commits de la branche : S1, S2, S3, la partie fichier de S4, S5 et S6.
Le reste n'est volontairement pas corrigé ici : S7 et B1 à B10 attendent la
bascule, R1 et R2 la propriétaire, et C1 à C7 relèvent d'une autre branche.
