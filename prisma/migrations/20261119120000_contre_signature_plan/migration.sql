-- Contre-signature du plan de prévention (ADR-061, décision de la
-- propriétaire du 2026-11-19). Additive pour les données existantes : toute
-- signature déjà posée devient « active » (DEFAULT true).

-- 1. Une signature peut être révoquée, jamais effacée (§ 1) ---------------

ALTER TABLE "Signature" ADD COLUMN "active" BOOLEAN DEFAULT true,
ADD COLUMN "revoqueLe" TIMESTAMP(3),
ADD COLUMN "revoqueMotif" TEXT;

-- L'unicité « une partie signe une fois » ne porte plus que sur les
-- signatures actives : `active` vaut true ou NULL, et PostgreSQL ne compare
-- pas les NULL. Écrite dans le schéma (`@@unique`), à l'abri d'un
-- `migrate dev` suivant, à la différence d'un index partiel.
DROP INDEX "Signature_objetType_objetId_partie_key";
CREATE UNIQUE INDEX "Signature_objetType_objetId_partie_active_key" ON "Signature"("objetType", "objetId", "partie", "active");

-- Les deux colonnes d'état disent la même chose : active sans date de
-- révocation, ou révoquée avec la sienne — jamais `active = false`, qui
-- rendrait l'unicité aux signatures révoquées.
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_revocation"
  CHECK (
    ("active" IS TRUE AND "revoqueLe" IS NULL)
    OR ("active" IS NULL AND "revoqueLe" IS NOT NULL)
  );

-- 2. La proposition de l'entreprise extérieure (§ 3) ------------------------

CREATE TYPE "StatutPropositionPlan" AS ENUM ('en_attente', 'acceptee', 'refusee');

CREATE TABLE "PropositionModificationPlan" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "planPreventionId" TEXT NOT NULL,
    "accessTokenId" TEXT NOT NULL,
    "hashVersion" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "statut" "StatutPropositionPlan" NOT NULL DEFAULT 'en_attente',
    "enAttente" BOOLEAN DEFAULT true,
    "traiteeLe" TIMESTAMP(3),
    "traiteeParEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropositionModificationPlan_pkey" PRIMARY KEY ("id")
);

-- Une seule proposition en attente par plan (même règle des NULL).
CREATE UNIQUE INDEX "PropositionModificationPlan_planPreventionId_enAttente_key" ON "PropositionModificationPlan"("planPreventionId", "enAttente");
CREATE INDEX "PropositionModificationPlan_etablissementId_idx" ON "PropositionModificationPlan"("etablissementId");

ALTER TABLE "PropositionModificationPlan" ADD CONSTRAINT "PropositionModificationPlan_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropositionModificationPlan" ADD CONSTRAINT "PropositionModificationPlan_planPreventionId_fkey" FOREIGN KEY ("planPreventionId") REFERENCES "PlanPrevention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- En attente sans traitement, ou traitée avec sa date — et le statut suit.
ALTER TABLE "PropositionModificationPlan" ADD CONSTRAINT "PropositionModificationPlan_etat"
  CHECK (
    ("enAttente" IS TRUE AND "statut" = 'en_attente' AND "traiteeLe" IS NULL)
    OR ("enAttente" IS NULL AND "statut" <> 'en_attente' AND "traiteeLe" IS NOT NULL)
  );

-- Exposée par l'API Data de Supabase sinon (`migrations-rls.test.ts`).
ALTER TABLE "PropositionModificationPlan" ENABLE ROW LEVEL SECURITY;
