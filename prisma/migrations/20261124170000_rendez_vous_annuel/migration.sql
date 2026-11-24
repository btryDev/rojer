-- Le rendez-vous annuel de la formule Pro (ADR-063, décisions de la
-- propriétaire du 2026-11-24). Additive : un type et deux tables neufs.
-- Écrite à la main, dans la forme que produit `prisma migrate dev`.

-- CreateEnum
CREATE TYPE "ModeRendezVous" AS ENUM ('telephone', 'visio');

-- CreateTable : les créneaux, ouverts hors de l'application (scripts, puis un
-- agent qui lit un agenda). Hors compte.
CREATE TABLE "CreneauAssistance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "reserveLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreneauAssistance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreneauAssistance_debut_key" ON "CreneauAssistance"("debut");

ALTER TABLE "CreneauAssistance" ADD CONSTRAINT "CreneauAssistance_bornes" CHECK ("fin" > "debut");

-- Comme toute table de public (audit OWASP 2026-10-13, S1).
ALTER TABLE "CreneauAssistance" ENABLE ROW LEVEL SECURITY;

-- CreateTable : le rendez-vous d'un compte, un par année d'abonnement.
CREATE TABLE "RendezVousAssistance" (
    "id" TEXT NOT NULL,
    "compteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "creneauId" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "mode" "ModeRendezVous" NOT NULL,
    "telephone" TEXT,
    "sujet" TEXT,
    "annuleLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RendezVousAssistance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RendezVousAssistance_compteId_debut_idx" ON "RendezVousAssistance"("compteId", "debut");

-- CreateIndex
CREATE INDEX "RendezVousAssistance_userId_idx" ON "RendezVousAssistance"("userId");

-- AddForeignKey
ALTER TABLE "RendezVousAssistance" ADD CONSTRAINT "RendezVousAssistance_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVousAssistance" ADD CONSTRAINT "RendezVousAssistance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bornes de saisie, comme à l'action serveur.
ALTER TABLE "RendezVousAssistance" ADD CONSTRAINT "RendezVousAssistance_bornes"
  CHECK (
    "fin" > "debut"
    AND ("telephone" IS NULL OR char_length("telephone") <= 30)
    AND ("sujet" IS NULL OR char_length("sujet") <= 2000)
  );

ALTER TABLE "RendezVousAssistance" ENABLE ROW LEVEL SECURITY;
