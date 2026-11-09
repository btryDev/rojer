-- Suppression du compte sans abonnement (ADR-058) : la trace gardée cinq ans,
-- et la file des fichiers à retirer du stockage.
CREATE TABLE "CompteSupprime" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ancienCompteId" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "proprietaires" TEXT[],
    "acceptations" JSONB NOT NULL,
    "sansAbonnementDepuis" TIMESTAMP(3),
    "avertiSuppression30Le" TIMESTAMP(3),
    "avertiSuppression7Le" TIMESTAMP(3),
    "supprimeLe" TIMESTAMP(3) NOT NULL,
    "conserverJusquAu" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompteSupprime_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompteSupprime_conserverJusquAu_idx" ON "CompteSupprime"("conserverJusquAu");

CREATE TABLE "FichierALiberer" (
    "cle" TEXT NOT NULL,
    "contexte" TEXT NOT NULL,
    "noteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tentatives" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FichierALiberer_pkey" PRIMARY KEY ("cle")
);

CREATE INDEX "FichierALiberer_tentatives_noteLe_idx" ON "FichierALiberer"("tentatives", "noteLe");
