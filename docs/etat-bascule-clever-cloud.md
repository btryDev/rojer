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

- **Recette à rejouer AVANT la bascule** : [2026-11-09 : la liste est
  écrite, section « Recette « pages × comptes à plusieurs membres » »
  plus bas.]
- ~~**Décision à confirmer par la propriétaire** : supprimer une entreprise ou
  un établissement est réservé au propriétaire du compte
  (`verifierProprietaire`), choix de réalisation (ADR-054, « Ce que la
  réalisation a précisé, lots 3 et 4 »). Pour l'ouvrir aux membres :
  `verifierRole` à la place, dans `entreprises/actions.ts` et
  `etablissements/actions.ts`.~~ [2026-11-09, décision de la propriétaire :
  la suppression reste réservée au propriétaire. Rien à changer.]
- ~~**Lot à part, lecture seule** : masquer les boutons de saisie pour un
  membre en lecture seule (environ 80 écrans de formulaires). D'ici là, tout
  geste tenté aboutit à `/compte/lecture-seule`, et le client borné refuse
  l'écriture.~~ [2026-11-09 : livré par #262.]
- ~~**Plafond de membres par formule** : à poser quand la gamme est arrêtée
  (`membershipLimit` du plugin, lu depuis la formule, invitations en attente
  comprises ; ADR-054 § 8). Le plugin garde aujourd'hui son défaut de 100.~~
  [2026-11-09 : posé, 5a7ca218.]
- ~~**Choix du compte dans la gélule** : il n'existe que sur l'écran « Membres »
  (ADR-054 § 7).~~ [2026-11-09 : livré par #262.]
- ~~**Bases locales** qui ont joué `20261103120000_comptes_et_membres` avant
  son CHECK et son déclencheur : à remettre à zéro (aucune n'est en
  production).~~ [2026-11-09, vérifié sur les bases du conteneur
  `duerp-verif-db` : seules `duerp_cc_visuel` et `duerp_quota_navig` portent la
  migration, avec l'empreinte du fichier actuel (appliquée le 2026-11-05,
  après le CHECK et le déclencheur) ; les quatre autres ne l'ont pas. Rien à
  remettre à zéro.]

- **Abonnements et audit de sécurité** (2026-11-10) :
  - suppression d'un compte sans abonnement depuis douze mois, après deux
    e-mails (J-30, J-7), ADR-058 (#265) ;
  - le webhook Stripe a son propre client, aux appels courts (#274) ;
  - le webhook ne fait plus qu'enregistrer et répondre : une file en base
    traite, une relecture par client sous bail à jeton, relances sur trois
    jours puis alerte e-mail, rapprochement quotidien, litiges et
    remboursements signalés ; la crontab tourne **chaque minute**, les
    tâches du jour une fois par jour civil (ADR-053 § 5 amendé, #277) ;
  - la saisie fermée est refusée dans le client borné de la session, même
    si le compte actif change dans un autre onglet (ADR-053 § 3 amendé,
    #281).

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
   [2026-11-10] Et, même avant l'ouverture des abonnements :
   `TACHES_SECRET` (`openssl rand -base64 32`), que présente la crontab de
   chaque minute (ménage des fichiers, file Stripe, tâches du jour) — sans
   lui, la route répond 404 et rien ne tourne ; `ALERTES_EMAIL` =
   `paloma.sanchez@btry.fr` (échec durable de la file Stripe, litige,
   remboursement ; sans elle, les alertes ne vont qu'au journal).
3. Questions au support : chiffrement au repos, restauration à un instant
   donné (PITR), durée de conservation des sauvegardes.

Documents à valider puis fusionner :
- PR #126 — `docs/plan-bascule-clever-cloud.md` : le plan et **l'ordre** de
  la bascule (couper Vercel avant de fusionner `cc`).
- PR #130 — ADR-052 (Better Auth).

Avant d'y faire pointer le domaine : jouer la recette « pages × comptes
à plusieurs membres » (section suivante).

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

Ajoutés le 2026-11-10 (audit de sécurité de `cc`, rapport hors dépôt :
`~/security-audit-skill/duerp-cc/run-1/`) :
6. **IPv6** : le domaine de production a-t-il un enregistrement AAAA, et
   l'adresse IPv6 du client arrive-t-elle en dernière entrée de
   `X-Forwarded-For` ? Les limites de débit regroupent l'IPv6 par /64
   (#271) ; sans IPv6 servie, la question tombe. Sans `X-Forwarded-For`
   lisible, l'inscription n'a **aucune** limite par IP (`ipClient` rend
   `null`) : le point 3 le tranche.
7. **Instances et mémoire** : combien d'instances, quelle RAM, quel
   `EXPORTS_SIMULTANES`. La file d'export et les recalculs de `/verifier`
   sont bornés **par processus** (#273) : ces chiffres disent ce que tient
   l'instance sous charge.
8. **`PUBLIC_APP_URL` en `https://`** : `src/env.ts` accepte aussi `http://`
   en production, et Better Auth en déduit l'attribut `Secure` et le préfixe
   `__Secure-` des cookies de session.
9. **Le compartiment Cellar est privé** : ni lecture publique, ni listage.
   Le code ne sert les fichiers que par l'application (pas d'URL signée ni
   publique) ; la politique du compartiment ne se lit pas dans le dépôt.

Ajoutés le 2026-11-10 (file Stripe et tâches, #277) :
10. **La crontab** : journaux du démarrage, « Importing cronjobs » ; puis,
    chaque minute, `/api/taches/chaque-minute` répond 202 ; après 9 h, la
    ligne « tâches du AAAA-MM-JJ : … » apparaît une fois par jour, même
    avec plusieurs instances.
11. **Les migrations du 2026-11-10** : `prisma migrate status` sans échec ;
    l'index `EvenementStripe_traiteLe_prochainEssaiLe_idx` est posé en
    `CONCURRENTLY` par une migration seule — en cas d'échec, la procédure
    est écrite en tête de
    `prisma/migrations/20261110100100_evenement_stripe_index_file/migration.sql`.

Abonnements (ne bloquent pas la bascule ; rien à poser tant qu'ils ne
sont pas ouverts) — **la liste de lancement, dans l'ordre :
`docs/lancement-abonnements.md`** (2026-11-09) :
- `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` vont par deux. En
  production, seule une clé **restreinte** de production (`rk_live_…`) est
  admise, et seulement si `APP_ENV=production` est posée : sans `APP_ENV`,
  aucune clé Stripe n'est acceptée. Une clé refusée ferme les abonnements,
  pas le serveur, et le démarrage le signale.
- Le contenu et les prix des formules ne sont pas arrêtés (brouillon de la
  session « pricing » : branche `docs/offres-abonnement`).
- **TVA** (2026-11-09) : créer dans le tableau de bord de production un taux
  de TVA de 20 %, pays France, type TVA, « en sus du prix » (exclusif). Sans
  lui, aucun essai ni abonnement ne se crée (notes du chantier, § 12).
- **Tâche quotidienne** (2026-11-09) : poser `TACHES_SECRET`
  (`openssl rand -base64 32`) sur l'application. La crontab
  (`clevercloud/cron.json`, 9 h heure de Paris) appelle
  `/api/taches/quotidiennes` avec ce secret : rappel de la veille de la fin
  de l'essai. Sans lui, elle s'arrête en le disant dans les journaux, et la
  route répond 404. Le rappel des 7 jours est un réglage du tableau de bord
  Stripe (notes du chantier, § 13). [2026-11-10 : la crontab appelle désormais
  `/api/taches/chaque-minute` **chaque minute** (`clevercloud/taches.sh`) :
  la file Stripe, puis les tâches du jour dès 9 h, une fois par jour civil
  (`TacheQuotidienne`). Poser aussi `ALERTES_EMAIL` (ADR-053 § 5, amendé).]
- **Webhook, litiges, remboursements** (2026-11-10, #277) — tableau de bord
  Stripe de production :
  - abonner la destination du webhook, en plus de la liste d'origine, à
    `v1.charge.dispute.created` et `v1.charge.refunded` (liste complète :
    `EVENEMENTS_ECOUTES`, `src/lib/stripe/webhook.ts`) ;
  - [2026-11-10 : fait en environnement de test ; à refaire en production]
    Paramètres > Billing > Abonnements, « Gérer les paiements contestés » →
    **annuler l'abonnement immédiatement** : sans ce réglage, un abonnement
    contesté continue de prélever (doc Stripe) ;
  - un remboursement ne change pas l'abonnement : pour couper l'accès,
    rembourser **et** résilier dans Stripe ; Rojer ferme alors les droits ;
  - **ne pas activer** l'e-mail Stripe des renouvellements à venir (il
    partirait chaque mois aux mensuels) : Rojer rappelle le renouvellement
    des annuels, 30 jours avant (2026-11-10).
- **Décision à prendre au lancement** (ADR-058, point ouvert) : la date de
  départ des douze mois pour les comptes créés avant l'ouverture de l'offre
  — ils n'ont pas de ligne d'abonnement, et ne sont donc jamais avertis ni
  supprimés tant qu'elle n'est pas posée. Proposition : le jour du
  lancement.
- **Accès au tableau de bord Stripe** (2026-11-09) : il fait partie du
  périmètre de confiance — on y change le compte Rojer d'un client
  (`metadata.compteId`), on y offre une formule, on y rembourse. Double
  authentification obligatoire ; comptes nominatifs, jamais partagés, au
  rôle minimal ; l'application n'utilise que la clé restreinte ci-dessus.

Ajoutés le 2026-11-10 (état de la CI et du dépôt, relevé ce jour-là ; décision
de la propriétaire : à traiter avant la bascule, après le chantier en cours) :
- **Protéger `cc`** comme `main` : `cc` n'a aucune protection de branche
  (`gh api repos/btryDev/rojer/branches/cc/protection` → « Branch not
  protected »). Contrôles obligatoires `vitest`, `derive` **et `build-cc`**,
  aucun force-push, règle valable pour les administrateurs. Le script de
  déploiement refuse déjà un commit sans CI verte, mais la branche n'est pas
  gardée contre un push direct ni une réécriture.
- **`build-cc` obligatoire sur la branche déployée** : sur `main`, seuls
  `vitest` et `derive` sont requis ; à corriger le jour où `main` redevient la
  branche déployée (après la fusion de `cc`) : rendre le contrôle obligatoire
  **et** étendre à `main` la condition `if:` du job `build-cc`
  (`.github/workflows/tests.yml`), sinon le job est sauté, et un job sauté
  compte comme réussi.
- **Une organisation Clever Cloud propre à Rojer** (décision de la
  propriétaire, 2026-11-10) : la préproduction de test vit pour l'instant
  dans l'organisation « btry », à côté de RiskBoard (application « Rojer »,
  app_9bbac77c-af66-4562-81a7-0257a21401ad, add-ons `Rojer-db` et
  `rojer-files`). Avant de créer la production : créer l'organisation
  « Rojer », y créer la production, y recréer la préproduction (la
  documentation Clever Cloud ne décrit aucun déplacement d'application ou
  d'add-on d'une organisation à l'autre ; à confirmer au support si besoin),
  puis
  supprimer l'ancienne préproduction et ses add-ons.
- **Trier les alertes Dependabot** : 104 ouvertes le 2026-11-10 (34 élevées,
  57 moyennes, 13 faibles, aucune critique ; relevé avec `gh api --paginate`),
  calculées sur `main`. En dépendances d'exécution : `ws`, `browserslist`,
  `deepmerge-ts`, `source-map-js` (élevées), `fflate`,
  `baseline-browser-mapping` (moyennes), `@babel/core` (faible) ; le reste en
  développement (`undici`, `hono`, `fast-uri`, `vite`…). Un lot : mettre à jour ce qui
  est exploitable en production, écrire le motif pour le reste, refaire le
  relevé sur `cc`.

## Recette « pages × comptes à plusieurs membres » (avant la bascule)

Ajoutée le 2026-11-09. À jouer **sur l'application déployée chez Clever
Cloud, avant d'y faire pointer le domaine**, dans un vrai navigateur. Les
tests automatiques éprouvent déjà la borne au compte et à l'établissement
contre une vraie base (matrice d'isolation, portée d'établissement,
appartenance, invitation) ; la recette vérifie le reste : l'application
réelle, son proxy, ses réglages, et les pages qu'aucun test ne parcourt.
Elle remplace la matrice « 75 routes × 2 comptes » du 2026-10-31, jouée
avant l'ADR-054 (plusieurs membres par compte).

Un écart = noter la page, la personne, ce qui s'est affiché. Toute donnée
d'un autre compte visible, ou toute écriture qui passe là où elle devrait
être refusée, **bloque la bascule**.

### 1. Préparer

Les personnes (six adresses e-mail de test, sur un domaine qui accepte
tout — jamais `btry.fr`) :

| Qui | Rôle |
|---|---|
| **P** | propriétaire du compte A |
| **M** | membre du compte A |
| **L** | membre en lecture seule du compte A |
| **D** | membre du compte A **et** propriétaire du compte B |
| **X** | propriétaire du compte B seulement |
| **R** | membre du compte A, retiré pendant la recette (étape 5) |

Les données : dans **A** comme dans **B**, une entreprise et **deux**
établissements (A1, A2 ; B1, B2), et dans A1 et B1 au moins un élément de
chaque module, pour avoir des adresses à essayer :
un équipement avec un contrôle, un rapport déposé (PDF) et un point à
corriger avec sa pièce ; un prestataire avec une pièce ; un salarié avec un
titre ; un DUERP avec une unité, un risque, une mesure et **une version
validée** ; un permis de feu ; un plan de prévention ; une action ; une
analyse du carnet sanitaire ; une pièce d'un état permanent ; la photo de
l'établissement ; une demande de signature ; un lien d'accès prestataire
(jeton). Relever dans un fichier les **adresses** de B (identifiants dans
l'URL) : elles servent à l'étape 2.

### 2. Isolation : rien de B depuis A

Connecté en **P** (puis refaire les lignes marquées ★ en **L**), coller
chaque adresse de B relevée à l'étape 1. Attendu partout : **page 404**
(ou « introuvable »), jamais une donnée de B, jamais une erreur 500.

| Famille | Adresses à essayer avec un identifiant de B |
|---|---|
| Établissement ★ | `/etablissements/[B1]` et chaque sous-page : `accessibilite`, `actions`, `batiments`, `calendrier`, `carnet-sanitaire`, `connecter`, `controle`, `documents`, `duerp`, `equipe`, `equipements`, `etats-permanents`, `guide`, `modifier`, `perimetre`, `permis-feu`, `plan-prevention`, `prescriptions`, `prestataires`, `quand-ca-arrive`, `registre` |
| Éléments ★ | `/etablissements/[A1]/equipements/[équipement de B]` (l'établissement de A, l'élément de B : le cas le plus sournois), idem pour `actions/[…]`, `permis-feu/[…]`, `plan-prevention/[…]`, `prestataires/[…]`, `equipe/[…]`, `verifications/[…]`, `registre/[section]`, `equipements/[…]/controles/[…]`, `equipements/[…]/points/[…]` |
| Entreprise ★ | `/entreprises/[entreprise de B]`, `…/effectif`, `…/modifier` |
| DUERP ★ | `/duerp/[DUERP de B]` et `activites`, `risques`, `risques/[unité]`, `risques/[unité]/[risque]`, `…/mesures`, `secteur`, `synthese`, `transverses`, `unites` |
| Fichiers et PDF ★ | `/api/etablissements/[B1]/` + `controle-zip`, `dossier-conformite/pdf`, `plan-actions/pdf`, `registre/pdf`, `photo`, `pieces/[pièce]`, `equipe/[salarié]/donnees`, `equipements/[…]/points-a-corriger/pdf` ; `/api/rapports/[rapport de B]/fichier` ; `/api/points/[point de B]/piece` ; `/api/prestataires/[…]/pieces/[…]` et `pieces-precedentes/[…]` ; `/api/analyses-legionelles/[…]/rapport` ; `/duerp/[DUERP de B]/pdf/preview` ; `/duerp/[DUERP de B]/versions/1/pdf` |
| Listes | `/entreprises`, le sélecteur d'établissement de la gélule, la recherche s'il y en a une : seuls A1 et A2 apparaissent |

Et dans l'autre sens, une fois, en **X** : trois adresses de A prises au
hasard dans le tableau → 404.

### 3. Les rôles dans le compte A

Parcourir A1 en entier (chaque entrée de la barre latérale) avec chaque
personne :

| Geste | P | M | L |
|---|---|---|---|
| Voir toutes les pages et télécharger les PDF | oui | oui | oui |
| Boutons « Ajouter », « Modifier », « Supprimer », formulaires | visibles | visibles | **masqués** ; réponses Oui / Non affichées mais inertes, au clic **et au clavier** (Tab puis Entrée) |
| Créer, modifier un élément (équipement, salarié, risque…) | oui | oui | refusé : une adresse `…/nouveau` ou `…/modifier` tapée à la main mène à `/compte/lecture-seule`, rien n'est écrit |
| Supprimer une entreprise ou un établissement | oui | **refusé** | refusé |
| `/compte/membres` : inviter, changer un rôle, retirer | oui | lecture seule de la liste | lecture seule de la liste |
| `/compte/abonnement` : changer de formule, portail de paiement | oui | non | non |
| Lien d'accès prestataire : créer, révoquer | oui | oui | non |

En **L**, un lecteur d'écran (VoiceOver : Cmd + F5) sur une question Oui /
Non du DUERP doit annoncer le bouton « indisponible ».

### 4. Changer de compte

En **D** : la gélule propose A et B. Passer de A à B : les établissements
affichés sont B1 et B2, plus rien de A. Revenir à A. Puis, **avec deux
onglets** ouverts (un sur A1, l'autre après passage sur B) : recharger le
premier — il suit le compte choisi, ou renvoie à l'accueil, sans mélanger
une page de A et des données de B.

En **X** (un seul compte) : la gélule ne propose aucun choix.

### 5. Retirer un membre

**R** ouvre A1 dans un onglet et y laisse un formulaire ouvert. **P** le
retire depuis `/compte/membres`. Puis **R** :
- clique un lien dans l'onglet resté ouvert → plus aucune donnée de A
  (renvoyé à l'onboarding ou à l'accueil) ;
- envoie le formulaire resté ouvert → refusé, rien n'est écrit (le
  vérifier en **P**) ;
- tape une adresse de A1 relevée avant → 404.

Même chose en rétrogradant **M** en lecture seule : dès la page suivante,
ses boutons disparaissent.

### 6. Invitations

- **P** invite une nouvelle adresse en « membre » : l'e-mail arrive, le lien
  ouvre l'invitation, l'acceptation donne accès à A et à rien d'autre.
- Le même lien ouvert connecté avec **une autre adresse** (X) → 404, pas
  d'acceptation possible.
- **M** et **L** n'ont pas de bouton d'invitation ; l'action tentée est
  refusée.
- Une invitation annulée ou expirée → le lien ne mène plus nulle part.

### 7. Accès sans session

- **Lien prestataire** de A1 (`/acces/[jeton]`), ouvert dans une fenêtre
  privée : il montre A1 seulement — ni A2 (même compte, autre
  établissement), ni B. Révoqué par P : il ne s'ouvre plus.
- **`/verifier/[signature]`** d'une signature de A : la vérification
  s'affiche ; un identifiant inventé → introuvable.
- **`/signe/[signature]`** : ne s'ouvre que pour la personne invitée à
  signer.
- **Connecteur MCP** (`/etablissements/[A1]/connecter`) : branché depuis
  A1, il ne lit que A1.

### 8. Après la recette

- `scripts/sante-base.sql`, section « D bis » (clés croisées entre
  comptes) : 0 partout.
- Supprimer les comptes et les adresses de test.
- Noter ici la date, le commit déployé et le résultat (ou les écarts).

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
