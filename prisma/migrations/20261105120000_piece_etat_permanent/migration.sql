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
    "enCours" BOOLEAN DEFAULT true,
    "remplaceeLe" TIMESTAMP(3),

    CONSTRAINT "PieceEtatPermanent_pkey" PRIMARY KEY ("id")
);

-- Un seul fichier EN COURS par ligne (ADR-056 § 4) : `enCours` vaut `true`
-- ou NULL, et PostgreSQL ne compare pas les NULL — seul le fichier en cours
-- est unique. Écrit dans le schéma (`@@unique`), donc à l'abri d'un
-- `migrate dev` suivant, à la différence d'un index partiel.
-- CreateIndex
CREATE UNIQUE INDEX "PieceEtatPermanent_etablissementId_obligationId_enCours_key" ON "PieceEtatPermanent"("etablissementId", "obligationId", "enCours");

-- AddForeignKey
ALTER TABLE "PieceEtatPermanent" ADD CONSTRAINT "PieceEtatPermanent_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bornes, comme à l'action serveur : un fichier non vide, un nom borné. Et
-- les deux colonnes d'état disent la même chose : en cours sans date de
-- remplacement, ou précédent avec la sienne — jamais `enCours = false`, qui
-- rendrait l'unicité à des précédents.
ALTER TABLE "PieceEtatPermanent" ADD CONSTRAINT "PieceEtatPermanent_bornes"
  CHECK (
    "fichierTaille" > 0
    AND char_length("fichierNom") BETWEEN 1 AND 255
    AND char_length("obligationId") BETWEEN 1 AND 200
    AND (
      ("enCours" IS TRUE AND "remplaceeLe" IS NULL)
      OR ("enCours" IS NULL AND "remplaceeLe" IS NOT NULL)
    )
  );

-- Exposée par l'API Data de Supabase sinon (`migrations-rls.test.ts`).
ALTER TABLE "PieceEtatPermanent" ENABLE ROW LEVEL SECURITY;
