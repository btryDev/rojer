# À faire

La liste de ce qui reste à faire sur Rojer en production (Clever Cloud,
`rojer.fr`, ouverte le 2026-11-26). À lire avant toute session. Une tâche
faite se raye et se date dans le commit qui la fait ; une tâche reportée
s'écrit ici le jour où elle l'est, pas plus tard.

Elle remplace `docs/etat-bascule-clever-cloud.md`, retiré le 2026-11-27 : la
bascule est faite, son historique reste dans git.

## Par priorité (proposée le 2026-11-27)

Le détail de chaque point est dans les sections qui suivent. Critère : la
production est ouverte au public ; d'abord ce qui casserait sans qu'on le
voie, ou mettrait Rojer en défaut sur le plan légal.

**1 — Cette semaine**
1. Propriétaire : témoin des tâches (`TEMOIN_TACHES_URL`) — une crontab arrêtée ne se voit pas.
2. Claude puis propriétaire : route `/api/health`, puis sonde externe sur `rojer.fr`.
3. Claude : alerte sur les erreurs serveur (aujourd'hui sur stderr seulement).
4. Propriétaire : restauration de sauvegarde éprouvée ; questions au support (restauration à un instant donné, conservation).
5. Propriétaire : double authentification de `contact@btry.fr` sur le téléphone d'un collègue.
6. Claude : mentions légales, téléphones de BTRY et de Clever Cloud (LCEN).
7. Claude : page des tarifs, annuel payé d'avance et non remboursé (Data Act, art. 29.4).
8. À confirmer : les demandes Pro partent-elles vers l'expert depuis #378 (Assistance) ?
9. Propriétaire : DMARC, SPF, réglages Mailpace.

**2 — Ce mois-ci**
10. Claude : journaux de sécurité et sondes de scanners dans le proxy.
11. Claude : script et skill du point d'activité.
12. Claude : doublon de compte au premier onboarding.
13. Claude : plafond d'établissements, onboarding quand même ouvert.
14. Claude : Dependabot (19 élevées au 2026-11-27).
15. Claude : `build-cc` obligatoire sur `main`.
16. Claude : version des conditions acceptée au clic « S'abonner ».
17. Claude : erreurs du navigateur et violations de la CSP.
18. Claude : purge des passages de l'agenda (patch prêt).
19. Propriétaire : date de départ des douze mois (ADR-058).
20. Propriétaire : utilisateur de base en lecture seule ; organisation Clever Cloud propre à Rojer.

**3 — Plus tard**
21. Export complet des données d'un compte (Data Act).
22. ASVS V6/V7 sur Better Auth ; décision sur la double authentification.
23. MCP : journal des appels, limite de débit par adresse.
24. Webhook Stripe : alerte sur une rafale de signatures refusées.
25. 25 Mo admis par toutes les actions serveur (URL pré-signées).
26. Ménage : pages d'erreur en anglais, erreur de build Better Auth, tables `Intervention`, comptes de test et dépendances mortes, outillage et section préprod du `CLAUDE.md`.

## Après l'ouverture (2026-11-26)

Relevés le jour de l'ouverture ; décision de la propriétaire : à faire plus
tard, après le lancement.

- **Témoin des tâches** (`TEMOIN_TACHES_URL`, propriétaire) : créer un témoin
  par battement (healthchecks.io ou équivalent, période 1 jour, grâce 2 h) et
  poser son adresse sur l'application de production. La tâche du jour l'appelle
  une fois finie ; sans lui, une crontab arrêtée (file Stripe, rappels,
  suppressions, synchro de l'agenda) ne se signale nulle part — les alertes de
  Rojer partent de cette même crontab. Le démarrage le rappelle à chaque
  déploiement (`avertissement_environnement`).
- **Doublon de compte au premier onboarding** (Claude) : `compteDOnboarding`
  (`src/lib/auth/membres.ts`) crée un compte, relit le plus ancien de la
  personne et supprime le sien s'il n'est pas retenu. Deux validations dans la
  même milliseconde (deux onglets) donnent le même `createdAt` : rien ne les
  départage, et chaque onglet peut garder le sien — deux comptes vides, sans
  fuite ni facturation. Correction : départager par l'identifiant quand les
  dates sont égales. C'est ce que révèle le test d'intégration « deux premiers
  onboardings simultanés… » (`creer-compte.integration.test.ts`), en échec trois
  fois le 2026-11-26 sur la CI de `main` — un vrai défaut, pas un test
  instable.

## Ce que les conditions générales promettent (2026-11-19)

Relevé par l'inspection juridique et la comparaison aux usages des textes
légaux (branche `lot/textes-legaux`) ; décision de la propriétaire du
2026-11-19 : « on va le faire ».

- **Export complet structuré** de toutes les données d'un compte (JSON ou
  CSV), et une page publique qui liste les données exportables et leurs
  formats — règlement (UE) 2023/2854 « Data Act », art. 25 et 26 ; RGPD,
  art. 28.3 g (restitution). D'ici là, les conditions (art. 17) promettent
  une restitution sans frais **sur demande écrite**, faite à la main.
- **Page des tarifs** : écrire que l'abonnement annuel est payé d'avance et
  n'est pas remboursé en cas de résiliation par le client — Data Act,
  art. 29.4 (à annoncer avant la souscription).
- **Expert de l'offre Pro** : les demandes d'assistance doivent partir vers
  l'expert (ADR-050, « rien ne part » aujourd'hui) avant de vendre Pro ; les
  conditions (art. 8) le promettent.
- **Acceptation au paiement** : enregistrer dans Rojer la version des
  conditions acceptée au clic « S'abonner » (Stripe Checkout coche la case
  sans version) — preuve du contrat, conditions art. 2.
- **Mentions légales** : téléphones de BTRY et de Clever Cloud
  (`components/landing/editeur.ts`) — LCEN, art. 1-1 ; à poser avant toute
  publication sur rojer.fr.

## Reporté à plus tard (relevé du 2026-11-27)

Ce qui a été dit « plus tard » en séance et ne figurait dans aucun document.
Une partie vient de la liste « Ce qui reste avant la bascule », retirée le
2026-11-27 parce que la production tourne : seuls les points encore ouverts
sont repris ici.

Claude (code, chacun en PR séparée, plan d'abord) :
- **Purge des passages de l'agenda** (2026-11-26, « on verra ça après ») :
  la synchro tourne chaque minute (#389) et garde chaque passage, soit
  1 440 lignes par jour. Garder les passages vides 7 jours, les autres un an.
  Le patch est prêt, tests verts en local, hors dépôt :
  `~/.config/rojer/patchs/agenda-purge-passages-vides-2026-11-26.patch`
  (ADR-064, `agenda-preventeur/base.ts`).
- **Plafond d'établissements atteint, onboarding quand même ouvert**
  (2026-11-26, « c'est mal fait, faudra corriger plus tard ») : avec
  l'essai ou Essentiel (1 établissement), « Ajouter un établissement » mène
  au parcours. La fenêtre d'accueil (`AccueilParcours`, `WizardShell.tsx`)
  recouvre le bandeau du plafond (`motifDuPlafond`,
  `app/onboarding/page.tsx`). Vérifier d'abord où le refus tombe ; piste :
  dire le plafond dès le bouton et ne pas ouvrir le parcours.
- **Faire taire l'erreur de build Better Auth « could not seed resources »**
  (sans effet, relevée le 2026-11-26).
- **Tables `Intervention` et `CommentaireIntervention`** (ADR-018, sans
  code) : migration de suppression.
- **`build-cc` obligatoire sur `main`** : la condition `if:` du job couvre
  déjà `main`, mais la protection de `main` n'exige encore que `vitest` et
  `derive` (relevé le 2026-11-27).
- **Trier les alertes Dependabot** (52 au 2026-11-27 : 19 élevées, 27 moyennes, 6 faibles ; 104 au 2026-11-10) : mettre à
  jour ce qui est exploitable en production, écrire le motif pour le reste.
- **Vérification ASVS V6/V7 sur Better Auth**, arrêtée le 2026-11-11 pour
  économiser (`docs/verification-asvs-L2-2026-10.md` décrit encore Supabase
  Auth). À y écrire : l'écart V11.4.2 (scrypt de Better Auth, N=2^14, gardé
  par décision : pas de hachage fait main) et V6.3.3 (double
  authentification proposée, non imposée : décision produit, la proposer ou
  l'imposer aux propriétaires).
- En queue de liste (décisions du 2026-11-17 et du 2026-11-23) : alerter
  sur une rafale de signatures refusées au webhook Stripe ; 25 Mo admis par
  toutes les actions serveur (déposer les fichiers par URL pré-signée, puis
  abaisser `bodySizeLimit`) ; une ligne de journal par appel du connecteur
  MCP ; limite de débit MCP par adresse IP (ne compter que les refus,
  limiter par personne et par compte ; même défaut au guichet des jetons).

Propriétaire :
- **Double authentification de `contact@btry.fr`** (Google Workspace,
  administratrice des règles depuis le 2026-11-26) : ses validations
  arrivent sur le téléphone d'un collègue.
- **Utilisateur de base en lecture seule** sur l'add-on de production, pour
  lire la prod sans pouvoir écrire (accord requis) ; et ne plus laisser
  `scripts/` (hors `demarrer-cc.sh`) ni `.claude/` sur l'instance.
- **À confirmer, sinon à faire** : questions au support Clever Cloud
  (chiffrement au repos, restauration à un instant donné, conservation des
  sauvegardes) ; organisation Clever Cloud propre à Rojer ; date de départ
  des douze mois pour les comptes créés avant l'offre (ADR-058).

## Sécurité et surveillance de la production (relevé du 2026-11-27)

État au 2026-11-27, comparé à RiskBoard (`GestBAT/scripts/health-monitor.ts`,
`health-db-stats.ts`, `.claude/skills/health-check/SKILL.md`,
`src/app/api/health/route.ts`, lus sans rien copier). Les journaux de
sécurité eux-mêmes (format unique, événements, sondes du proxy, seuils) sont
décrits en fin de section (« Journaux de sécurité »).

Claude :
1. **Remonter les erreurs serveur.** `onRequestError`
   (`src/instrumentation.ts`) écrit une ligne JSON
   `evenement: "erreur_requete"` sur stderr, sans chemin réel ni en-têtes.
   Personne ne la lit et rien n'alerte : une page qui plante pour tous les
   clients ne se voit qu'en ouvrant les journaux. À faire : les compter
   dans le point d'activité (point 4), par route et par `digest` ; et une
   alerte (`alerterUneFoisParJour`, `lib/alertes.ts`) au-delà d'un seuil, ou
   dès la première erreur sur une route de paiement ou de signature.
2. **Remonter les erreurs du navigateur.** `app/error.tsx` et
   `app/global-error.tsx` affichent un écran d'incident, mais rien ne
   part vers le serveur : une erreur qui ne naît que côté client est
   invisible. À faire : une route de remontée bornée (limite de débit,
   `digest`, motif de route, message tronqué ; jamais l'URL réelle ni les
   données de la page). Même chose pour les violations de la CSP
   (`report-to`), qui ne remontent nulle part aujourd'hui.
3. **Route de santé `/api/health`.** Elle n'existe pas. Modèle RiskBoard :
   `SELECT 1`, 200 si la base répond, 503 sinon, sans rien révéler
   d'autre. Elle sert le contrôle de santé de Clever Cloud et une sonde
   externe de disponibilité sur `rojer.fr` (propriétaire, point 7). Elle ne
   remplace pas `TEMOIN_TACHES_URL`, qui surveille la crontab.
4. **Script et skill du point d'activité.** `scripts/point-activite.ts` et
   un skill qui l'exploite, sur le modèle de `health-monitor` : CPU et RAM
   de l'instance (`clever metrics`), temps de réponse p50/p95/p99, part des
   5xx et 4xx, état de `/api/health`, erreurs de requête (point 1),
   sécurité (sondes, connexions refusées, limites de débit : « Journaux de sécurité »),
   derniers déploiements, volumes des tables (le pendant de
   `health-db-stats.ts`, et de la section « D bis » de
   `scripts/sante-base.sql`). Un rapport court : statut vert / orange /
   rouge, anomalies seulement, actions. Collecte bornée dans le temps
   (`perl -e 'alarm 15; exec @ARGV' clever logs …`). La lecture de la base
   passe par l'utilisateur en lecture seule (section « Reporté à plus tard »).
5. **Retirer l'outillage de la préprod**, qui n'existe plus : skills
   `deployer-preprod` et `lire-preprod`, `scripts/lire-preprod.ts`,
   commandes `deployer:preprod` et `lire-preprod` de `package.json`. Le
   point d'activité les remplace pour la lecture.
6. **Pages d'erreur statiques en anglais** (limite relevée le 2026-10-13,
   en tête de `app/global-error.tsx`) : `_global-error.html` et `500.html`
   sortent du composant de Next (« 500: This page couldn't load »).

Propriétaire :
7. **Sonde externe de disponibilité** (healthchecks.io, UptimeRobot ou
   équivalent) sur `https://rojer.fr/api/health`, alerte par e-mail ; à
   poser une fois le point 3 déployé.
8. **Récupération après incident.** Jamais éprouvée. Restaurer une
   sauvegarde de l'add-on PostgreSQL (`do-backup`, actif par défaut) sur
   une base locale, noter le temps et la procédure, ici. Les fichiers
   (Cellar) ne sont pas versionnés, par décision (2026-10-30, RGPD) : un
   fichier effacé ou écrasé ne se rattrape pas ; l'écrire dans la
   procédure. Les questions au support (restauration à un instant donné,
   conservation des sauvegardes) en font partie (section « Reporté à plus tard »).

- **Journaux de sécurité** (Claude, demande de la propriétaire du
  2026-11-26) : prérequis du volet « sécurité » du point d'activité
  (`point-activite`, inspiré du `health-monitor` de RiskBoard,
  `GestBAT/scripts/health-monitor.ts`). Aujourd'hui Rojer n'écrit presque rien
  de lisible pour ça : quelques lignes JSON éparses (`{ type: … }` :
  `ecriture_gelee_refusee`, `envoi_mail_compte_plafonne`, refus du webhook
  Stripe…), `alerter` (`lib/alertes.ts`) pour ce qui demande un geste humain,
  et rien sur les connexions, les refus de limite de débit ni les sondes. À
  faire :
  1. **Un format, un seul point d'écriture** : une ligne JSON par événement,
     `{ type, tag: "securite" | "auth", … }`, par une fonction unique (ex.
     `journalSecurite`) — `clever logs --search "<tag>"` les retrouve.
     **Jamais d'adresse IP ni d'e-mail en clair** : l'IP réduite à son
     empreinte, comme la limite de débit (`ip-client.ts`, `cleLimite`) — la
     politique de confidentialité le promet (« adresse IP réduite à une
     empreinte ») ; l'utilisateur désigné par son identifiant.
  2. **Les événements à écrire** :
     - connexion réussie / refusée (mot de passe, code de double
       authentification, code de secours), compte inconnu compris ;
     - refus par la limite de débit (`refusParLimite`, `consommer` dans
       `limite-debit.ts`), avec la clé de limite et non l'IP ;
     - demande de réinitialisation du mot de passe, changement de mot de
       passe, activation / retrait de la double authentification ;
     - gestion du compte : invitation, changement de rôle, retrait d'un
       membre, demande et annulation de suppression du compte (ADR-054,
       ADR-058) ;
     - accès sans session refusé : jeton `/acces` invalide, expiré ou hors
       portée, code OTP refusé (ADR-007) ;
     - connecteur MCP : jeton refusé, autorisation accordée / retirée
       (ADR-062) ;
     - webhook Stripe refusé (existe, `console.warn`) : le passer au même
       format ;
     - sondes de scanners (point 3).
  3. **Sondes dans le proxy** (`src/proxy.ts`) : reconnaître les chemins de
     scanners (`wp-*`, `phpmyadmin`, `.git`, `/.env`, `actuator`, `cgi-bin`,
     extensions `.php` `.asp` `.aspx` `.jsp` `.cgi`), répondre 404 tout de
     suite sans passer par la connexion ni la base, et journaliser. Modèle :
     `GestBAT/src/proxy.ts` (`SCANNER_PATHS`, `SCANNER_EXTENSIONS`, l.10-45 et
     l.235-248). Sans ce point, le compteur de sondes du point d'activité
     reste à zéro.
  4. **Origine des requêtes** : les actions serveur de Next vérifient déjà
     l'origine ; relire les route handlers `POST` (hors webhook Stripe et
     tâches, gardés par signature et secret) et journaliser un refus
     d'origine s'il y en a un à poser.
  5. **La lecture** : `point-activite` collecte par `clever logs --search`
     borné (`perl -e 'alarm 15; exec @ARGV' clever logs --after 24h …`) et
     classe comme RiskBoard — seuils de départ : plus de 10 connexions
     refusées depuis une même empreinte = force brute (menace haute) ; plus
     de 20 refus de connexion sur 24 h = menace moyenne ; sondes normales
     sous 100 par jour. Chez RiskBoard ces seuils vivent dans les consignes
     du skill, pas dans le code (`.claude/skills/health-check/SKILL.md`,
     `.claude/agents/health-monitor.md`) ; les paliers propres à Rojer
     restent à fixer.
  6. **Conservation** : vérifier que les journaux de Clever Cloud ne
     dépassent pas les trente jours promis par la politique de
     confidentialité (« journaux techniques de l'hébergeur ») ; sinon,
     ajuster le texte ou la rétention.

## E-mails : DNS de `rojer.fr` (audit du 2026-11-21)

[2026-11-27 : DKIM réparé sur Mailpace le 2026-11-26 ; le reste à
confirmer.]

Constats de l'audit de sécurité du 2026-11-21 (dig sur le DNS public de
`rojer.fr`) :

1. **DMARC absent** sur `rojer.fr` : publier
   `_dmarc.rojer.fr TXT "v=DMARC1; p=none; rua=mailto:<adresse de suivi>"`,
   puis passer à `p=quarantine` après quelques semaines sans rejet légitime.
2. **SPF** actuel : `v=spf1 include:mx.ovh.com -all`. Vérifier dans Mailpace
   s'il faut y ajouter leur `include:` (selon l'expéditeur d'enveloppe).
3. **DKIM** : relever dans Mailpace le sélecteur et l'enregistrement, le
   publier chez OVH, attendre l'état « vérifié » du domaine.
4. **Tableau de bord Mailpace** : durée de conservation des messages au
   minimum (les liens de signature y passent en clair), suivi des clics et
   des ouvertures désactivé.
5. Vérifier que la boîte `no-reply@` existe, ou que les réponses ne
   rebondissent pas mal.
6. Variables à poser : `MAILPACE_API_KEY`, `EMAIL_DRIVER=mailpace`, et la
   clé des codes de signature `SIGNATURE_CODE_SECRET`.

## Nettoyage du dépôt

Les comptes de test servaient la préprod, supprimée le 2026-11-25 : plus rien n'attend.

- Retirer `scripts/comptes-test.ts`, `scripts/situations-test/` et la commande
  `comptes-test` de `package.json` (décision de la propriétaire, 2026-11-12).
  `src/lib/onboarding/creation.ts` reste : c'est l'écriture de l'onboarding.
- Retirer deux dépendances de développement mortes, relevées le même jour :
  `@testing-library/jest-dom` (aucun matcher, absent de `vitest.setup.ts`) et
  `@vitejs/plugin-react` (absent de `vitest.config.ts`) ; passer
  `@types/qrcode` des `dependencies` aux `devDependencies`.

## Règles de travail

- Fusion : revue de code, simplification et sécurité faites et corrigées,
  **puis** CI verte. Jamais avant.
- Prouver une garantie en la cassant (mutation) avant de la dire tenue.
- Tests locaux ciblés ; la suite complète tourne en CI.
- Arrêtée par une limite d'usage, une session s'arrête et ne reprend pas
  d'elle-même : la propriétaire relance.

## Local

- Pile locale : `docker-compose.cc.yml`, `.env.cc-local.example`,
  `scripts/demarrer-cc.sh`.
- Tests d'intégration : `ISOLATION_INTEGRATION_URL` vers une base **locale**
  migrée, qu'ils vident (voir `.github/workflows/integration.yml`).
- Un `vitest` qui se fige en worktree : `perl -e 'alarm 300; exec @ARGV' pnpm exec vitest run … < /dev/null`, et rejouer (sortie 142).
