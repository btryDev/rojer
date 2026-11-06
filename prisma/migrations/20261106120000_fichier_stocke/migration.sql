-- La taille des fichiers déposés, pour le plafond de stockage (ADR-053 § 14).
-- Les fichiers déjà en stockage se reprennent par un script
-- (`scripts/reprendre-tailles-fichiers.ts`), qui lit leur taille au stockage.

-- CreateTable
CREATE TABLE "FichierStocke" (
    "cle" TEXT NOT NULL,
    "compteId" UUID NOT NULL,
    "octets" INTEGER NOT NULL,
    "deposeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FichierStocke_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE INDEX "FichierStocke_compteId_idx" ON "FichierStocke"("compteId");

-- AddForeignKey
ALTER TABLE "FichierStocke" ADD CONSTRAINT "FichierStocke_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comme toutes les tables de `public` (migrations-rls.test.ts).
ALTER TABLE "FichierStocke" ENABLE ROW LEVEL SECURITY;
