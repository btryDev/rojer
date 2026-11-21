-- Le formulaire du plan de prévention reprend le contenu de celui de
-- RiskBoard (2026-11-21, décision de la propriétaire), une seule entreprise
-- extérieure.
--
-- ADDITIVE SEULEMENT : des colonnes nullables, sans défaut, sans backfill.
-- Aucune ligne existante n'est réécrite. Les plans déjà signés gardent leur
-- empreinte : un champ NULL n'entre pas dans le canonique (`hash-objet.ts`,
-- `hash-plan-stable.test.ts`).

ALTER TABLE "PlanPrevention"
  ADD COLUMN "entrepriseExterieureAdresse" TEXT,
  ADD COLUMN "efChefTelephone" TEXT,
  ADD COLUMN "euChefTelephone" TEXT,
  ADD COLUMN "horaires" TEXT,
  ADD COLUMN "cseAssocie" BOOLEAN,
  ADD COLUMN "qualificationsRequises" TEXT,
  ADD COLUMN "moyensFournis" TEXT,
  ADD COLUMN "autresObservations" TEXT;

ALTER TABLE "LignePlanPrevention"
  ADD COLUMN "famille" TEXT,
  ADD COLUMN "lieu" TEXT,
  ADD COLUMN "frequence" TEXT;
