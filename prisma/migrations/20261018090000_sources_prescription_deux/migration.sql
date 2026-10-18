-- Deux sources de prescription particulière : « demande de l'assureur » et
-- « autre » (décision de la propriétaire du 2026-10-18, ADR-035 amendée).
--
-- Un arrêté, un PV de commission ou une demande de l'inspection du travail
-- reçus se saisissent désormais en « Autre ». Les saisies anciennes y passent,
-- sans rien perdre : l'ancien libellé de source est préfixé à la référence,
-- puis la colonne bascule sur un type à deux valeurs. Postgres ne retire pas
-- une valeur d'un enum : le type est recréé.

-- 1. Les saisies anciennes passent en `autre`, leur ancienne source écrite
--    devant la référence.
UPDATE "PrescriptionParticuliere"
SET "reference" = CASE "source"::text
      WHEN 'arrete_prefectoral' THEN 'Arrêté préfectoral — '
      WHEN 'arrete_municipal' THEN 'Arrêté du maire — '
      WHEN 'pv_commission_securite' THEN 'Procès-verbal de la commission de sécurité — '
      WHEN 'arrete_icpe' THEN 'Arrêté préfectoral ICPE — '
      WHEN 'inspection_travail' THEN 'Demande ou mise en demeure de l''inspection du travail — '
    END || "reference",
    "source" = 'autre'
WHERE "source"::text IN ('arrete_prefectoral', 'arrete_municipal', 'pv_commission_securite', 'arrete_icpe', 'inspection_travail');

-- 2. Le type à deux valeurs, dans l'ordre du sélecteur.
ALTER TYPE "SourcePrescription" RENAME TO "SourcePrescription_ancien";
CREATE TYPE "SourcePrescription" AS ENUM ('demande_assureur', 'autre');
ALTER TABLE "PrescriptionParticuliere"
  ALTER COLUMN "source" TYPE "SourcePrescription" USING ("source"::text::"SourcePrescription");
DROP TYPE "SourcePrescription_ancien";
