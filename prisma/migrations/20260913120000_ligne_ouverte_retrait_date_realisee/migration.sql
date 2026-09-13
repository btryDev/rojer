-- ============================================================================
-- La ligne ne porte que l'échéance ouverte : retrait de `dateRealisee`
-- ADR-034, lot N5 — 2026-09-13
--
-- CE QUI CHANGE. `Verification.dateRealisee` dupliquait un fait qui vit sur
-- `RapportVerification.dateRapport` — le seul chemin qui l'écrivait était le
-- dépôt d'un rapport, et il n'écrit plus la colonne depuis le lot N2. Deux
-- copies d'un même fait divergent ; celle-ci a divergé (trois relectures y ont
-- trouvé des lignes lues sur le mauvais champ). Il n'en reste qu'une.
--
-- LES LIGNES ENCORE AU VIEUX MODÈLE. Avant N2, une ligne PÉRIODIQUE contrôlée
-- gardait un statut réalisé, avec le rendez-vous suivant dans `datePrevue`.
-- Depuis l'ADR-034 une telle ligne est « planifiée » sur son échéance ouverte,
-- et son fait se lit sur ses rapports. Le premier UPDATE les y remet. Il ne
-- recalcule PAS `datePrevue` : l'ancien réconciliateur l'avançait déjà au
-- rendez-vous suivant, et les données en production sont fictives (décision
-- de la propriétaire, 2026-09-13) — une ligne dont la date n'aurait pas été
-- avancée se lira en retard, ce qui est la lecture juste d'une échéance passée.
--
-- Une obligation SANS rendez-vous suivant (`mise_en_service_uniquement`,
-- `autre`) garde son statut réalisé : c'est le seul cas où il en subsiste un
-- sur une ligne, et c'est tout ce qui témoigne qu'elle a été faite.
--
-- Le second ordre retire la colonne. Rejouable : le premier UPDATE ne touche
-- plus rien à la seconde passe, et `DROP COLUMN IF EXISTS` non plus.
-- ============================================================================

UPDATE "Verification"
SET "statut" = 'planifiee'
WHERE "statut" IN ('realisee_conforme', 'realisee_observations', 'realisee_ecart_majeur')
  AND "periodicite" NOT IN ('mise_en_service_uniquement', 'autre');

ALTER TABLE "Verification" DROP COLUMN IF EXISTS "dateRealisee";
