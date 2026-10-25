-- La photo du lieu dans le hero du tableau de bord (2026-10-25, décision de la
-- propriétaire). Additive : trois colonnes facultatives, aucune donnée touchée.

-- AlterTable
ALTER TABLE "Etablissement" ADD COLUMN "photoCle" TEXT,
ADD COLUMN "photoDeposeeLe" TIMESTAMP(3),
ADD COLUMN "photoMime" TEXT;
