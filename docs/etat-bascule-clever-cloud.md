# État de la bascule vers Clever Cloud — passation du 2026-11-01

À lire avant toute session sur `main` ou sur `cc`. Ce fichier remplace la
mémoire locale des sessions, qui ne suit pas d'une machine à l'autre. Le
mettre à jour (rayer, dater) à chaque étape franchie.

## Deux branches, deux productions

| | `main` | `cc` |
|---|---|---|
| Rôle | Production actuelle (un testeur) | Future production |
| Hébergement | Vercel, déploie `main` à chaque fusion | Clever Cloud, déployé **par commande** (`scripts/deployer-cc.sh`) ; Vercel ne déploie jamais `cc` |
| Authentification | Supabase Auth (ADR-005) | Better Auth (ADR-052) : tables `User`, `Session`, `Account`, `AuthVerification`, `TwoFactor` dans notre base |
| Base | Supabase | PostgreSQL de Clever Cloud, **neuve** à la bascule (pas de reprise de données : la prod ne porte que des données factices) |

**Le flux va de `main` vers `cc`, jamais l'inverse.** Tout ce qui est fusionné
dans `main` se reporte dans `cc` par une PR de fusion (`main` → branche de
travail → PR vers `cc`). Conflits habituels au report : sur `cc`, le
connecteur MCP OAuth de Supabase n'existe plus — garder la suppression de
`src/lib/mcp/acces-oauth*.ts` et `route-oauth.test.ts`, ne pas réintroduire
`clientDuCompteVerifie` ni `ScopeMcp.userId`.

## Ce qui est sur `cc` (au 2026-11-03, df9dbff6 ; ~~au 2026-11-02, 4f4e63e4~~ ; ~~au 2026-11-01, e65ba81c~~)

- **Better Auth**, lots 1 à 3b (#133 à #139) : inscription, connexion,
  vérification d'adresse, mot de passe oublié, page « Sécurité du compte »
  (sessions, mot de passe, mots de passe divulgués refusés), double
  authentification (application TOTP + codes de secours ; pas de code par
  e-mail, décision du 2026-10-30).
- **Isolation des comptes (ADR-051)**, terminée : toutes les lectures et
  écritures passent par le client borné au compte (`requireCompte()` →
  `{ user, db }`, `src/lib/auth/portee/`) ; 9 modules nommés seulement
  touchent le client brut ; SQL brut par `requireLectureSqlProprietaire`,
  éprouvé sur base réelle (`auth/sql-proprietaire.integration.test.ts`).
- **Validation du 2026-10-31** sur une base neuve et un build de production :
  migrations rejouées depuis zéro sans écart, RLS sur les 39 tables ;
  75 routes × 2 comptes (B reçoit 404 sur tout ce qui est à A) ;
  23 écritures croisées sans effet ; réponse identique pour « à un autre
  compte » et « inexistant » ; 17 des 18 protections de la borne retirées une
  à une font tomber un test (la 18ᵉ vise une relation qui n'existe pas) ;
  13 pages au budget de requêtes, toutes sous 130 ms.

- **Abonnements Stripe, socle** (2026-11-02, PR #153, `4f4e63e4`) : ADR-053,
  tables `Abonnement` (racine de compte) et `EvenementStripe` (hors compte),
  RLS, configuration et client Stripe. **Aucune route ni aucun écran** : sans
  clé Stripe, `cc` se comporte comme avant. Fusionné avant la bascule à la
  demande de la propriétaire (le plan était d'attendre) : deux tables vides
  de plus à rejouer, rien d'autre. Suite du chantier et constats des revues :
  `docs/notes-chantier-abonnements-stripe.md` (§ 5 les lots, § 7 ce que les
  revues renvoient au webhook, aux droits et au parcours).
- **Abonnements Stripe, suite** (2026-11-03) : webhook (#156) ; droits du
  compte et garde des écritures `verifierSaisie()` — un impayé ferme la
  saisie, jamais la lecture ni l'export (#158) ; lots 4-5, partie A (#164) :
  catalogue provisoire des formules, conditions générales provisoires
  (`/conditions`), appels Stripe du parcours **non branchés**. Reste la
  partie B (écran d'essai, choix de formule, Checkout, portail, quota
  d'établissements, preuve d'acceptation des CGU) : elle attendait #159,
  fusionnée ; plan et passation dans les notes du chantier, §§ 8 et 9 (#166).
- **Plusieurs utilisateurs par compte, lot 1** (2026-11-03, ADR-054, PR #159,
  fusionnée dans `cc` en 5e4c8378 avec l'ADR, #157) :
  tables `Compte`, `Membre`, `InvitationCompte` (plugin `organization` de
  Better Auth) ; la racine de l'isolation est `compteId`, plus `userId` ;
  l'appartenance est relue à chaque requête ; + 1 requête par page. Cinq
  migrations, avec reprise (un compte par utilisateur existant) et arrêt
  avant le retrait de `userId` si une ligne y échappe. **Si la bascule a lieu
  avant la fusion de ce lot**, scinder la dernière migration (§ 10 de
  l'ADR). [2026-11-03 : sans objet, fusionné avant la bascule.] ~~Pas encore d'écran : invitation, lecture seule et membres viennent
  aux lots suivants.~~ [2026-11-03 : lots 3 et 4 sur la même PR — lecture
  seule (client borné et `verifierSaisie`), écran « Membres », invitation par
  e-mail, choix du compte. ~~Reste : masquer les boutons de saisie pour la
  lecture seule, plafond de membres par formule.~~ [2026-11-09 : le plafond
  de membres est posé (5a7ca218, lot A des plafonds) ; le masquage en lecture
  seule et le choix du compte dans la gélule sont livrés par #262.]]

- **Reports de `main`** (2026-11-03) : borne d'effectif à 49 (#161, #163) ;
  effectif de la société = somme de ses sites, apprentis, effectif hors
  Rojer (#165 sur `main`, reporté par #168 avec `verifierSaisie()` en tête de
  `modifierEffectifs`). Migration `20261103180000_effectif_par_les_sites`,
  datée après celles des comptes.
- **Report de `main`** (2026-11-04) : vérification faite en interne,
  formulaire sans fichier (#180, ADR-055). Migration additive
  `20261104120000_releve_interne`, datée après celle de l'effectif ; sur
  `cc`, `uploadRapport` garde `verifierSaisie()` et la portée `compteId`.
- **Proxy** (2026-11-05, #184) : `proxyClientMaxBodySize` aligné sur les
  25 Mo des actions serveur (le proxy coupait le corps à 10 Mo), et un POST
  d'action serveur sans cookie passe au lieu d'être redirigé — l'action
  renvoie elle-même à `/login` par `requireUser()`. Report de `main` du même
  jour : #182, #185 (la même limite, sans conflit), #186. À vérifier au
  premier déploiement : « Ce qui reste avant la bascule ».
- **Report de `main`** (2026-11-06, #203) : écrits annexés au registre et à
  l'export contrôle (#193), puis le référentiel `2026-11-06.1` (#200) et
  `2026-11-06.2` (#201, plan d'intervention à l'entrée, PE 27 § 6). Sur `cc` :
  dépôt d'une pièce par `deposerFichier` (plafond de stockage, ADR-053 § 14)
  et `verifierSaisie()` en tête ; le registre et le ZIP se lisent avec le
  compte qui les bâtit (`AccesCompte`), sans relire la session. Les cinq
  points communs aux dépôts relevés à la relecture sont traités par #212.
- **Report de `main`** (2026-11-09, #248) : ADR-057 lots B (#205, les
  présences établies d'après le parc sur la page Équipements, DAE partagé
  déclaré d'une case) et C (#214, catégories jumelles réunies, type déclaré,
  référentiel `2026-11-07.1`), et #245 (relevé provisoire `?ecran` de la page
  d'accueil, **à retirer une fois le hero réglé**, sur `main` puis ici).
  Migrations `20261107120000_categories_jumelles` et
  `20261107120100_categories_jumelles_reprise`, datées après
  `20261107100000_essai_entreprise` et éprouvées sur une copie de base `cc` :
  reprise des appareils et des prescriptions, RLS d'`Equipement` et de
  `PrescriptionParticuliere` inchangée. Ce que `cc` garde et que `main` n'a
  pas, à ne pas perdre au prochain report : le plafond de l'essai sur le
  pré-remplissage des équipements (`creerSousPlafond`) ; `basculerDaePartage`
  appelle `verifierSaisie()` et `CasePartageDae` relance la redirection ;
  `declarationsDePresence` lit par `compteId`, avec l'accès de la page
  (`declarations-de-presence.test.ts`) ; l'empreinte du moteur de la fusion
  (`bd476b63f185b7ff`). Sur un site gelé, cocher « DAE partagé » est refusé
  (`upsert`), la décocher passe (`deleteMany`, que le gel ne bloque pas) :
  retirer une déclaration reste ouvert, comme le veut l'ADR-053 § 14.

### Multi-utilisateurs : ce qui reste (2026-11-03)

- **Recette à rejouer AVANT la bascule** : la matrice « 75 routes × 2 comptes »
  du 2026-10-31 n'a pas été rejouée depuis l'ADR-054 (son outil n'est pas
  versionné). La rejouer avec un compte A à **deux membres** (un membre, un
  lecture seule) et un compte B, plus un membre retiré (ADR-054 § 9). Les
  tests sur base réelle (`portee/client`, `auth/membres`,
  `membres/invitation` .integration) couvrent la borne, l'appartenance et le
  parcours d'invitation, pas chaque route.
- **Décision à confirmer par la propriétaire** : supprimer une entreprise ou
  un établissement est réservé au propriétaire du compte
  (`verifierProprietaire`), choix de réalisation (ADR-054, « Ce que la
  réalisation a précisé, lots 3 et 4 »). Pour l'ouvrir aux membres :
  `verifierRole` à la place, dans `entreprises/actions.ts` et
  `etablissements/actions.ts`.
- **Lot à part, lecture seule** : masquer les boutons de saisie pour un
  membre en lecture seule (environ 80 écrans de formulaires). D'ici là, tout
  geste tenté aboutit à `/compte/lecture-seule`, et le client borné refuse
  l'écriture.
- **Plafond de membres par formule** : à poser quand la gamme est arrêtée
  (`membershipLimit` du plugin, lu depuis la formule, invitations en attente
  comprises ; ADR-054 § 8). Le plugin garde aujourd'hui son défaut de 100.
- **Choix du compte dans la gélule** : il n'existe que sur l'écran « Membres »
  (ADR-054 § 7).
- **Bases locales** qui ont joué `20261103120000_comptes_et_membres` avant
  son CHECK et son déclencheur : à remettre à zéro (aucune n'est en
  production).

## Ce qui reste avant la bascule

Gestes de la propriétaire (Clever Cloud) :
1. Créer l'application et les add-ons : PostgreSQL, stockage Cellar (S3).
   [2026-11-07 : pas encore fait — le compte Clever Cloud ne porte que
   l'application « riskboard » ; `scripts/deployer-cc.sh` n'a donc rien à
   déployer.]
2. Poser les variables : `BETTER_AUTH_SECRET`, `PUBLIC_APP_URL`,
   `BASE_CA_PEM`, celles de Mailpace (nom exact à confirmer :
   `MAILPACE_API_TOKEN`), `STORAGE_DRIVER=s3` et celles du stockage. En
   production, `STORAGE_DRIVER=local` est refusé au démarrage, c'est voulu.
3. Questions au support : chiffrement au repos, restauration à un instant
   donné (PITR), durée de conservation des sauvegardes.

Documents à valider puis fusionner :
- PR #126 — `docs/plan-bascule-clever-cloud.md` : le plan et **l'ordre** de
  la bascule (couper Vercel avant de fusionner `cc`).
- PR #130 — ADR-052 (Better Auth).

Le jour J : suivre le plan de #126.

À vérifier au premier déploiement sur Clever Cloud (ajouté le 2026-11-05,
audit du proxy de `cc` ; le code est fusionné, il n'a jamais tourné là-bas) :
1. **Déposer un rapport de 15 Mo** (entre 10 et 20) : il doit arriver entier.
   Le proxy coupait le corps des requêtes à 10 Mo ; `proxyClientMaxBodySize`
   est aligné sur les 25 Mo des actions serveur (#184 sur `cc`, #185 sur
   `main`). Sur Vercel, le plafond de 4,5 Mo par requête masquait le défaut :
   un rapport de plus de 4,5 Mo n'y passe pas.
2. **Session expirée, onglet ouvert** : envoyer un formulaire doit ramener à
   `/login`, pas afficher une erreur. Depuis #184, le proxy laisse passer le
   POST d'une action serveur sans cookie, et `requireUser()` redirige.
3. **`X-Forwarded-For` forgé** : envoyer l'en-tête avec une fausse adresse en
   tête et vérifier que l'IP lue est la dernière entrée, celle du répartiteur
   (`src/lib/securite/ip-client.ts`, « À VÉRIFIER au premier déploiement
   CC ») — elle sert à la limitation de débit et à la preuve de signature.
4. **Le rôle de la base** (ajouté le 2026-11-09, ADR-051 : RLS écartée,
   décision de la propriétaire) : sur l'add-on de Rojer, lancer
   `SELECT rolname, rolsuper, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = current_user;`
   Attendu : propriétaire des tables, `false` partout (relevé sur un add-on
   XXS 15.17 le même jour). Autre chose : le dire, l'ADR-051 se relit.
5. **`scripts/sante-base.sql` avant et après la bascule** : la section
   « D bis » (clés croisées entre comptes, générée) doit rendre 0 partout.

Abonnements (ne bloquent pas la bascule ; rien à poser tant qu'ils ne
sont pas ouverts) :
- `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` vont par deux. En
  production, seule une clé **restreinte** de production (`rk_live_…`) est
  admise, et seulement si `APP_ENV=production` est posée : sans `APP_ENV`,
  aucune clé Stripe n'est acceptée. Une clé refusée ferme les abonnements,
  pas le serveur, et le démarrage le signale.
- Le contenu et les prix des formules ne sont pas arrêtés (brouillon de la
  session « pricing » : branche `docs/offres-abonnement`).

## Règles de travail qui valent ici

- Ce fichier est **le même sur `main` et sur `cc`** : le modifier sur `main`
  puis le reporter, pour que les sessions des deux branches lisent la même
  passation (2026-11-03 : il n'était à jour que sur `cc`).
- Previews Vercel : `vercel.json` les coupe par préfixe de branche
  (`git.deploymentEnabled`). `report/*` et `docs/*` y manquaient jusqu'au
  2026-11-03, et neuf previews ont été construites ce jour-là, dont plusieurs
  du code de `cc`. Un préfixe de branche neuf s'y ajoute. Vérifier dans le
  tableau de bord Vercel que l'environnement « Preview » ne porte aucune
  variable de la base de production.

- Fusion : revue de code, simplification et sécurité faites et corrigées,
  **puis** CI verte. Jamais avant.
- Prouver une garantie en la cassant (mutation) avant de la dire tenue.
- Tests locaux ciblés ; la suite complète tourne en CI.
- Arrêtée par une limite d'usage, une session s'arrête et ne reprend pas
  d'elle-même : la propriétaire relance.

## Local

- Pile `cc` : `docker-compose.cc.yml`, `.env.cc-local.example`,
  `scripts/demarrer-cc.sh`.
- Tests d'intégration : `ISOLATION_INTEGRATION_URL` vers une base **locale**
  migrée, qu'ils vident (voir `.github/workflows/integration.yml`).
- Un `vitest` qui se fige en worktree : `perl -e 'alarm 300; exec @ARGV' pnpm exec vitest run … < /dev/null`, et rejouer (sortie 142).
