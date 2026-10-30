-- Contrôle de santé de la base Rojer — LECTURE SEULE (audit du 2026-10-28,
-- docs/revues/audit-base-2026-10-28.md).
-- Toute la session est en transaction READ ONLY, close par ROLLBACK : une
-- écriture y échouerait. À lancer avant et après la bascule Clever Cloud.
-- Usage : psql "$URL_DIRECTE" -f scripts/sante-base.sql
-- Chaque contrôle d'intégrité doit rendre 0 ligne / 0. Tout autre résultat est un constat.

BEGIN TRANSACTION READ ONLY;
\pset footer off

\echo '=== A. Serveur'
SELECT version();
SELECT current_setting('TimeZone') AS fuseau_base, current_user AS role,
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser,
       (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass_rls;
SELECT pg_size_pretty(pg_database_size(current_database())) AS taille_base;
SELECT extname, extversion FROM pg_extension ORDER BY 1;

\echo '=== B. Migrations'
SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS appliquees,
       count(*) FILTER (WHERE finished_at IS NULL) AS en_echec_ou_en_cours,
       max(migration_name) AS derniere
FROM _prisma_migrations;

\echo '=== C. Volumes par table (estimation) et taille'
SELECT relname AS table_, n_live_tup AS lignes, pg_size_pretty(pg_total_relation_size(relid)) AS taille
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;

\echo '=== D. Cohérence de tenancy : enfant et parent dans le même établissement (attendu : 0 partout)'
SELECT 'Verification→Equipement' AS lien, count(*) FROM "Verification" v JOIN "Equipement" e ON e.id = v."equipementId" WHERE e."etablissementId" <> v."etablissementId"
UNION ALL SELECT 'Verification→Salarie', count(*) FROM "Verification" v JOIN "Salarie" s ON s.id = v."salarieId" WHERE s."etablissementId" <> v."etablissementId"
UNION ALL SELECT 'Verification→Prestataire', count(*) FROM "Verification" v JOIN "Prestataire" p ON p.id = v."prestataireId" WHERE p."etablissementId" <> v."etablissementId"
UNION ALL SELECT 'Verification→Prescription', count(*) FROM "Verification" v JOIN "PrescriptionParticuliere" p ON p.id = v."prescriptionId" WHERE p."etablissementId" <> v."etablissementId"
UNION ALL SELECT 'Rapport→Verification', count(*) FROM "RapportVerification" r JOIN "Verification" v ON v.id = r."verificationId" WHERE v."etablissementId" <> r."etablissementId"
UNION ALL SELECT 'Action→Verification', count(*) FROM "Action" a JOIN "Verification" v ON v.id = a."verificationId" WHERE v."etablissementId" <> a."etablissementId"
UNION ALL SELECT 'Action→Risque', count(*) FROM "Action" a JOIN "Risque" r ON r.id = a."risqueId" JOIN "UniteTravail" u ON u.id = r."uniteId" JOIN "Duerp" d ON d.id = u."duerpId" WHERE d."etablissementId" <> a."etablissementId"
UNION ALL SELECT 'Action→Equipement', count(*) FROM "Action" a JOIN "Equipement" e ON e.id = a."equipementId" WHERE e."etablissementId" <> a."etablissementId"
UNION ALL SELECT 'Action→RapportOrigine', count(*) FROM "Action" a JOIN "RapportVerification" r ON r.id = a."rapportOrigineId" WHERE r."etablissementId" <> a."etablissementId"
UNION ALL SELECT 'Action→leveeRapport (sans FK)', count(*) FROM "Action" a LEFT JOIN "RapportVerification" r ON r.id = a."leveeRapportId" WHERE a."leveeRapportId" IS NOT NULL AND (r.id IS NULL OR r."etablissementId" <> a."etablissementId")
UNION ALL SELECT 'Equipement→Batiment', count(*) FROM "Equipement" e JOIN "Batiment" b ON b.id = e."batimentId" WHERE b."etablissementId" <> e."etablissementId"
UNION ALL SELECT 'PermisFeu→Prestataire', count(*) FROM "PermisFeu" x JOIN "Prestataire" p ON p.id = x."prestataireId" WHERE p."etablissementId" <> x."etablissementId"
UNION ALL SELECT 'PermisFeu→Batiment', count(*) FROM "PermisFeu" x JOIN "Batiment" b ON b.id = x."batimentId" WHERE b."etablissementId" <> x."etablissementId"
UNION ALL SELECT 'PlanPrevention→Prestataire', count(*) FROM "PlanPrevention" x JOIN "Prestataire" p ON p.id = x."prestataireId" WHERE p."etablissementId" <> x."etablissementId"
UNION ALL SELECT 'PlanPrevention→Batiment', count(*) FROM "PlanPrevention" x JOIN "Batiment" b ON b.id = x."batimentId" WHERE b."etablissementId" <> x."etablissementId"
UNION ALL SELECT 'Prescription→Equipement', count(*) FROM "PrescriptionParticuliere" x JOIN "Equipement" e ON e.id = x."equipementId" WHERE e."etablissementId" <> x."etablissementId"
UNION ALL SELECT 'AccessToken→Prestataire', count(*) FROM "AccessToken" x JOIN "Prestataire" p ON p.id = x."prestataireId" WHERE p."etablissementId" <> x."etablissementId"
UNION ALL SELECT 'PointReleve→Batiment', count(*) FROM "PointReleve" x JOIN "CarnetSanitaire" c ON c.id = x."carnetId" JOIN "Batiment" b ON b.id = x."batimentId" WHERE b."etablissementId" <> c."etablissementId";

\echo '=== E. Références polymorphes orphelines (attendu : 0)'
SELECT s."objetType"::text AS type_, count(*) AS signatures_orphelines
FROM "Signature" s
WHERE (s."objetType" = 'permis_feu'             AND NOT EXISTS (SELECT 1 FROM "PermisFeu" x WHERE x.id = s."objetId" AND x."etablissementId" = s."etablissementId"))
   OR (s."objetType" = 'plan_prevention'        AND NOT EXISTS (SELECT 1 FROM "PlanPrevention" x WHERE x.id = s."objetId" AND x."etablissementId" = s."etablissementId"))
   OR (s."objetType" = 'rapport_verification'   AND NOT EXISTS (SELECT 1 FROM "RapportVerification" x WHERE x.id = s."objetId" AND x."etablissementId" = s."etablissementId"))
   OR (s."objetType" = 'duerp_version'          AND NOT EXISTS (SELECT 1 FROM "DuerpVersion" x JOIN "Duerp" d ON d.id = x."duerpId" WHERE x.id = s."objetId" AND d."etablissementId" = s."etablissementId"))
   OR (s."objetType" = 'registre_accessibilite' AND NOT EXISTS (SELECT 1 FROM "RegistreAccessibilite" x WHERE x.id = s."objetId" AND x."etablissementId" = s."etablissementId"))
GROUP BY 1;
SELECT "objetType", count(*) AS types_de_jetons FROM "AccessToken" GROUP BY 1;

\echo '=== F. Comptes : entreprises sans propriétaire ou orphelines'
SELECT count(*) AS entreprises_sans_userId FROM "Entreprise" WHERE "userId" IS NULL;
SELECT count(*) AS entreprises_sans_etablissement FROM "Entreprise" en WHERE NOT EXISTS (SELECT 1 FROM "Etablissement" e WHERE e."entrepriseId" = en.id);
\echo '  (si le schéma auth existe — Supabase) entreprises dont le compte n existe plus :'
SELECT to_regclass('auth.users') IS NOT NULL AS a_auth \gset
\if :a_auth
SELECT count(*) AS entreprises_compte_disparu FROM "Entreprise" en WHERE "userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = en."userId");
\else
\echo '  (pas de schéma auth : contrôle sauté)'
\endif

\echo '=== G. Données mortes (avant retrait)'
SELECT (SELECT count(*) FROM "Intervention") AS interventions,
       (SELECT count(*) FROM "CommentaireIntervention") AS commentaires_intervention,
       (SELECT count(*) FROM "Etablissement" WHERE "classeIgh" IS NOT NULL) AS classe_igh_renseignee,
       (SELECT count(*) FROM "Etablissement" WHERE "classeIgh" = 'GHW') AS classe_ghw,
       (SELECT count(*) FROM "Etablissement" WHERE "familleHabitation" IS NOT NULL) AS famille_habitation_renseignee,
       (SELECT count(*) FROM "Etablissement" WHERE "chiffonsImpregnes" IS NOT NULL) AS chiffons_renseignes,
       (SELECT count(*) FROM "DuerpVersion" WHERE "pdfUrl" IS NOT NULL) AS pdf_url_renseigne;

\echo '=== H. Rétention : ce qui s accumule sans purge'
SELECT (SELECT count(*) FROM "AccessToken" WHERE "expireLe" < now() - interval '90 days') AS jetons_expires_90j,
       (SELECT count(*) FROM "QuotaEnvoiOtp") AS quotas_otp,
       (SELECT count(*) FROM "LimiteDebit" WHERE "fenetreFin" < now() - interval '1 day') AS limites_perimees,
       (SELECT count(*) FROM "Signature" WHERE "ipAddress" IS NOT NULL) AS signatures_avec_ip;

\echo '=== I. Fichiers référencés (clés à confronter au stockage)'
SELECT 'RapportVerification' AS source, count(*) FROM "RapportVerification"
UNION ALL SELECT 'Action.levee', count(*) FROM "Action" WHERE "leveeFichierCle" IS NOT NULL
UNION ALL SELECT 'Prestataire (3 pièces)', count("attestationUrssafCle") + count("assuranceRcProCle") + count("kbisCle") FROM "Prestataire"
UNION ALL SELECT 'PiecePrestataire', count(*) FROM "PiecePrestataire"
UNION ALL SELECT 'AnalyseLegionelle', count("rapportCle") FROM "AnalyseLegionelle"
UNION ALL SELECT 'Etablissement.photo', count("photoCle") FROM "Etablissement"
UNION ALL SELECT 'RegistreAccessibilite', count("attestationCle") + count("agendaAdapCle") + count("attestationFormationCle") FROM "RegistreAccessibilite";

\echo '=== J. Sécurité : RLS, droits de anon/authenticated, tables publiques'
SELECT relname AS table_sans_rls FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity;
SELECT grantee, count(*) AS droits FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC') GROUP BY 1;

\echo '=== K. Index : jamais utilisés depuis le dernier reset des stats'
SELECT relname AS table_, indexrelname AS index_, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS taille
FROM pg_stat_user_indexes WHERE idx_scan = 0 ORDER BY pg_relation_size(indexrelid) DESC LIMIT 20;

\echo '=== L. Snapshots DUERP : taille et présence des champs attendus'
SELECT count(*) AS versions, pg_size_pretty(coalesce(sum(pg_column_size(snapshot)), 0)::bigint) AS taille_totale,
       pg_size_pretty(coalesce(max(pg_column_size(snapshot)), 0)::bigint) AS plus_gros,
       count(*) FILTER (WHERE NOT snapshot ? 'couverture') AS sans_couverture
FROM "DuerpVersion";

ROLLBACK;
