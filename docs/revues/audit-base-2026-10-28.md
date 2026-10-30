# Audit de la base de données — 2026-10-28

Sur `main` 2f837b49, avant la bascule de Supabase vers Clever Cloud (base) et
Better Auth (authentification). Complète, sans les répéter, les listes de
bascule déjà écrites : `audit-owasp-2026-10-13.md` (B1-B16),
`audit-nextjs-2026-10-14.md` (« Critères de recette ») et
`../verification-asvs-L2-2026-10.md` (« Critères de recette »).

**Méthode.** Les 90 migrations rejouées sur un PostgreSQL 17 vierge, puis le
catalogue interrogé (clés, index, contraintes, types, RLS). Comportements
vérifiés en SQL réel : fuseau horaire, suppressions en cascade. Relecture de
l'isolation entre comptes (écritures, lectures, routes, jetons, MCP,
onboarding). **La base de production n'a pas été lue** : c'est l'objet de
`scripts/sante-base.sql`.

Légende : ✅ en place · ⚠️ à reprendre · ❌ risque · ~~rayé~~ corrigé par le lot
`lot/db-avant-bascule`.

## Isolation entre comptes

- ✅ Aucun chemin trouvé par lequel un compte lit, modifie, supprime ou sonde
  la donnée d'un autre. Chaque écriture et chaque lecture borne au compte, y
  compris les identifiants étrangers reçus du client (prestataire, équipement,
  zone, rapport d'origine, rapport de levée). Aucun `connect:` dans `src/lib`.
- ✅ Les 17 `route.ts` passent par un garde de `scope.ts` ; aucune page n'appelle
  Prisma. Jetons d'accès bornés à leur objet ; MCP borné aux établissements du
  compte ; rattachement par SIREN borné à `userId`. Tests `tenancy-*` : 25/25.
- ⚠️ La base ne garantit pas qu'un enfant et son parent sont du même
  établissement (18 relations, ex. `Verification.equipementId`). Seul le code
  l'assure. `sante-base.sql` § D vérifie les données ; une clé composite
  `(etablissementId, id)` le rendrait structurel.
- ⚠️ `objetEstSignable` répond « signable » sans rien lire pour le rapport, le
  registre et la version de DUERP. Sans fuite : chaque appelant borne l'objet
  ensuite. Laissé tel quel et documenté dans le fichier : la faire lire
  affichait « clos ou annulé » pour un rapport absent, ce qui est faux (revue
  du lot).

## Intégrité

- ✅ Migrations ↔ `schema.prisma` : aucun écart. Toutes les tables ont une clé
  primaire ; les 49 clés étrangères sont indexées en tête.
- ✅ 14 CHECK métier présentes en base ; unicité `NULLS NOT DISTINCT` des lignes
  de suivi ; versions de DUERP en `RESTRICT`.
- ~~❌ Rapports et actions correctives supprimés en cascade avec leur ligne de
  suivi ; `supprimerEquipement` comptait puis supprimait hors transaction.~~
  Corrigé : `NO ACTION` sur `RapportVerification.verificationId`,
  `Action.verificationId` et `Action.equipementId` — le point à corriger
  désigné sur un appareil (ADR-048) — par la migration `20261030100000`.
  Supprimer un appareil ou une ligne qui porte une preuve est refusé par la
  base ; supprimer un établissement ou une entreprise entière passe toujours
  (vérifié en SQL). `supprimerEquipement` désactive l'appareil si la base
  refuse. `effacerSalarie` verrouille les lignes du salarié, efface les
  preuves nommément et vide les `leveeRapportId` qui pointaient ses rapports.
  Une régénération du calendrier qui croise un dépôt échoue désormais (P2003)
  au lieu d'emporter le rapport : le calendrier est marqué périmé et refait.
- ⚠️ **À trancher** : supprimer un établissement sans DUERP figé efface ses
  rapports du registre de sécurité et ses signatures (D. 4711-3 : cinq ans).
- ⚠️ Colonnes de référence sans clé étrangère : `Action.leveeRapportId`,
  `Signature.objetId` et `AccessToken.objetId` (polymorphes), les quatre
  `userId` (Supabase, hors schéma). `AccessToken.objetType` est un texte libre
  là où `Signature` a un enum. Les 11 autres (`obligationId`…) pointent le
  référentiel TypeScript : voulu.
- ⚠️ Cinq colonnes JSON lues par simple typage, sans validation. Le snapshot du
  DUERP (40 ans) n'a pas de numéro de format (`version` est le numéro du DUERP).
- ~~⚠️ 4 index redondants.~~ Corrigé : 3 retirés (migrations `20261030100200` à `20261030100400`) ;
  le quatrième relevé était un doublon de lecture.

## Sécurité

- ✅ RLS activée partout sauf `_prisma_migrations` ; aucun droit pour `anon` ni
  `authenticated`. SQL brut paramétré ; `Prisma.raw` sur liste fermée. Aucune
  fonction ni trigger dans `public`. `.env*` ignoré ; les seeds refusent la prod.
- ⚠️ L'application se connecte avec le rôle propriétaire (contourne la RLS,
  peut supprimer des tables).
- ⚠️ TLS sans vérification du certificat.
- ⚠️ Sans durée de conservation ni purge : IP et navigateur des signatures et
  jetons, jetons expirés, `QuotaEnvoiOtp`.

## Exploitation

- ❌ Aucune procédure de sauvegarde ni restauration d'essai dans le dépôt.
- ⚠️ Fuseau : colonnes `timestamp` sans fuseau, instants UTC (ADR-011). Mesuré
  sur une base en `Europe/Paris` : Prisma écrit `createdAt` lui-même (écart
  nul), mais une valeur par défaut posée par SQL brut se décale d'une heure
  (deux en été).
- ~~⚠️ PostgreSQL 17 en prod et en local, 16 dans la CI de dérive.~~ Corrigé :
  CI en 17.
- ⚠️ Aucun relevé des requêtes (`pg_stat_statements`).

## Performance

- ✅ Index par établissement, transactions courtes, verrous `FOR UPDATE` où il
  faut. Le reste relève de `docs/plan-performance.md` (allers-retours par écran).

## Maintenabilité

- ⚠️ 998 des 2 203 lignes de `schema.prisma` sont des commentaires, en bonne
  partie d'historique : la structure ne se lit plus. Garder l'invariant actuel
  et un renvoi d'ADR ; l'histoire vit dans les ADR et les migrations.
- ⚠️ Données mortes : `Intervention`, `CommentaireIntervention`,
  `chiffonsImpregnes`, `classeIgh` (et `GHW`), `familleHabitation`,
  `DuerpVersion.pdfUrl`. `classeIgh` et `familleHabitation` sont encore lues par
  le moteur : leur retrait est un lot à part.
- ⚠️ Contraintes écrites à la main invisibles pour Prisma ; un `@@unique`
  modifié recréerait l'index sans `NULLS NOT DISTINCT`. Couvert en partie par
  `migrations-contraintes.test.ts`.
- ⚠️ Prisma 6 → 7 à planifier, jamais en même temps que la bascule.

## Bascule Clever Cloud — en plus des listes existantes

Déjà prévu ailleurs : rôle séparé, TLS vérifié, migrations hors du build, UUID
conservés, pool dimensionné, sauvegardes, PITR et restauration d'essai,
dérive en prod, réseau restreint, Cellar.

**Avant**

1. **Collision de noms avec Better Auth** : sa table s'appelle `verification`,
   comme notre modèle `Verification`. La renommer dans sa configuration
   (ex. `AuthVerification`) avant de générer son schéma.
2. Retirer les données mortes (deux déploiements) : on ne copie pas ce qu'on
   va jeter. Lancer d'abord `sante-base.sql` § G sur la prod.
3. Répétition générale sur un add-on Clever de test avec un dump de la prod :
   restauration, application, `sante-base.sql`, durée totale = fenêtre de
   coupure.

**Pendant**

4. PostgreSQL 17 ; `ALTER DATABASE … SET timezone = 'UTC'` à la création.
5. `pg_dump -n public --no-owner --no-privileges` (avec `_prisma_migrations`) ;
   `auth.users` part à part vers Better Auth.
6. **Piège du rôle séparé** : la RLS est activée sans politique. Un rôle non
   propriétaire n'y voit AUCUNE ligne, sans erreur. Désactiver la RLS chez
   Clever (elle ne protégeait que de l'API Data Supabase) ou `BYPASSRLS`.
7. Gel des écritures, puis `sante-base.sql` avant et après : mêmes comptes,
   zéro incohérence, mêmes clés de fichiers présentes dans Cellar.

**Juste après**

8. Clé étrangère `Entreprise.userId → user.id` (`RESTRICT`), possible dès que
   les comptes sont dans la même base ; `DemandeAssistance.userId` en UUID.
9. Tâches planifiées Clever : purge des jetons expirés, quotas d'OTP, limites de
   débit ; IP effacées au-delà de la durée décidée.
10. `pg_stat_statements`.
11. Un dump chiffré mensuel hors de Clever, en plus du PITR ; versioning du
    bucket Cellar, pour que fichiers et base se restaurent à la même date.
12. Supabase gardé en lecture seule une durée fixée (retour arrière), puis
    dernier dump chiffré et suppression du projet (sous-traitant RGPD).
13. Prisma 7 ensuite seulement.
