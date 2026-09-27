-- ============================================================================
-- C45 — trois obligations encodées depuis l'évaluation des manques — 2026-09-27
--
-- TROIS COLONNES NULLABLES, SANS DÉFAUT, SANS RÉTRO-REMPLISSAGE.
--
--  1. `Etablissement.chiffonsImpregnes` — R. 4227-26 CT. Question à trois
--     états : `NULL` veut dire « je ne sais pas » ou « pas encore répondu »,
--     et l'état permanent s'affiche alors (règle du non-renseigné). Un défaut
--     `false` aurait répondu à la place du dirigeant et retiré la ligne.
--  2. `DuerpVersion.transmiseSpstLe` — L. 4121-3-1, VI, CT. Date de
--     transmission au service de prévention et de santé au travail, déclarée
--     par l'employeur. Aucune date existante ne la dit : remplir serait
--     inventer.
--  3. `PlanPrevention.inspectionTravailInformeeLe` — R. 4512-12, 2°, CT. Date
--     à laquelle l'inspection du travail a été informée de l'ouverture des
--     travaux, déclarée.
--
-- ADDITIVE, ET INERTE POUR LE CODE EN LIGNE : `prisma migrate deploy` la joue
-- au build Vercel avant que le code qui lit les colonnes n'y soit ; le code
-- déployé les ignore, ses insertions les laissent à NULL.
--
-- FORME : `BOOLEAN` nullable pour `Boolean?` (comme `manipuleMatieresR422722`),
-- `TIMESTAMP(3)` nullable pour `DateTime?` (comme
-- `20260927130000_prestataire_dates_attestation_vigilance`).
-- ============================================================================

ALTER TABLE "Etablissement" ADD COLUMN "chiffonsImpregnes" BOOLEAN;
ALTER TABLE "DuerpVersion" ADD COLUMN "transmiseSpstLe" TIMESTAMP(3);
ALTER TABLE "PlanPrevention" ADD COLUMN "inspectionTravailInformeeLe" TIMESTAMP(3);
