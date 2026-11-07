-- Les obligations du même geste qu'une ligne d'appareil suit aussi (ADR-057,
-- décisions de la propriétaire du 2026-11-05). Additive : une colonne neuve,
-- vide par défaut ; la réconciliation la remplit à la passe de reprise
-- (moteur 8).

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN "fondeeAussiPar" TEXT[] DEFAULT ARRAY[]::TEXT[];
