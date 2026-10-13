-- Pièces de prestataire remplacées (2026-10-12). Additive : une table neuve,
-- aucune colonne existante touchée, aucune reprise — les pièces déjà
-- remplacées avant cette migration ne sont référencées par aucune ligne et ne
-- se retrouvent pas (leur clé n'a été gardée nulle part).
CREATE TABLE "PiecePrestataire" (
    "id" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fichierCle" TEXT NOT NULL,
    "fichierNom" TEXT,
    "deposeeLe" TIMESTAMP(3),
    "valableJusquA" TIMESTAMP(3),
    "remplaceeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PiecePrestataire_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PiecePrestataire_prestataireId_idx" ON "PiecePrestataire"("prestataireId");

ALTER TABLE "PiecePrestataire" ADD CONSTRAINT "PiecePrestataire_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "Prestataire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
