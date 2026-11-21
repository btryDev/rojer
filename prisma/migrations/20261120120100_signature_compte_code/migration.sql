-- Fiche du plan de prévention (2026-11-19). Additive : aucune ligne
-- existante n'est réécrite, aucun statut ne change.

-- 1. Le consentement exprimé avant une signature depuis le compte ----------

ALTER TABLE "Signature" ADD COLUMN "consentementTexte" TEXT,
ADD COLUMN "consentementLe" TIMESTAMP(3);

-- 2. « Corriger » une proposition : appliquée, correction non terminée -----

ALTER TABLE "PropositionModificationPlan" ADD COLUMN "corrigeeLe" TIMESTAMP(3),
ADD COLUMN "finaliseeLe" TIMESTAMP(3);

-- 3. Le code qui confirme une signature depuis le compte -------------------

CREATE TABLE "CodeSignatureCompte" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "objetType" "ObjetSignable" NOT NULL,
    "objetId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "otpExpireLe" TIMESTAMP(3) NOT NULL,
    "essaisRestants" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSignatureCompte_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CodeSignatureCompte_userId_objetType_objetId_key" ON "CodeSignatureCompte"("userId", "objetType", "objetId");
CREATE INDEX "CodeSignatureCompte_etablissementId_idx" ON "CodeSignatureCompte"("etablissementId");

ALTER TABLE "CodeSignatureCompte" ADD CONSTRAINT "CodeSignatureCompte_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodeSignatureCompte" ADD CONSTRAINT "CodeSignatureCompte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comme toute table de `public` (`migrations-rls.test.ts`).
ALTER TABLE "CodeSignatureCompte" ENABLE ROW LEVEL SECURITY;
