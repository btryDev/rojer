-- Les écrits annexés au registre, déposés sur leur ligne de « Ce qui doit
-- être en place » (ADR-056, décisions de la propriétaire du 2026-11-05).
-- Additive : une table neuve, vide.

-- CreateTable
CREATE TABLE "PieceEtatPermanent" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "fichierCle" TEXT NOT NULL,
    "fichierNom" TEXT NOT NULL,
    "fichierMime" TEXT NOT NULL,
    "fichierTaille" INTEGER NOT NULL,
    "deposeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remplaceeLe" TIMESTAMP(3),

    CONSTRAINT "PieceEtatPermanent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PieceEtatPermanent_etablissementId_obligationId_idx" ON "PieceEtatPermanent"("etablissementId", "obligationId");

-- Un seul fichier EN COURS par ligne (ADR-056 § 4). Index partiel : Prisma
-- ne sait pas l'écrire dans le schéma, il ne vit qu'ici.
CREATE UNIQUE INDEX "PieceEtatPermanent_en_cours_unique" ON "PieceEtatPermanent"("etablissementId", "obligationId") WHERE "remplaceeLe" IS NULL;

-- AddForeignKey
ALTER TABLE "PieceEtatPermanent" ADD CONSTRAINT "PieceEtatPermanent_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bornes, comme à l'action serveur : un fichier non vide, un nom borné.
ALTER TABLE "PieceEtatPermanent" ADD CONSTRAINT "PieceEtatPermanent_bornes"
  CHECK (
    "fichierTaille" > 0
    AND char_length("fichierNom") BETWEEN 1 AND 255
    AND char_length("obligationId") BETWEEN 1 AND 200
  );

-- Exposée par l'API Data de Supabase sinon (`migrations-rls.test.ts`).
ALTER TABLE "PieceEtatPermanent" ENABLE ROW LEVEL SECURITY;
