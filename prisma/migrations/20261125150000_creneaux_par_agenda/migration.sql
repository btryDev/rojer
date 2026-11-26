-- Les créneaux du rendez-vous annuel ouverts par l'agenda du préventeur
-- (ADR-064). Additive : une colonne et une table ; l'index unique suit.
-- Écrite à la main, dans la forme que produit `prisma migrate dev`.

-- AlterTable
ALTER TABLE "CreneauAssistance" ADD COLUMN "evenementAgendaId" TEXT;

-- L'index unique de `evenementAgendaId` est posé seul, sans verrou, dans
-- la migration suivante (`migrations-index.test.ts`).

-- CreateTable : le journal des passages de la synchronisation, hors compte.
CREATE TABLE "ImportAgenda" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepte" BOOLEAN NOT NULL,
    "motif" TEXT,
    "ouverts" INTEGER NOT NULL DEFAULT 0,
    "deplaces" INTEGER NOT NULL DEFAULT 0,
    "fermes" INTEGER NOT NULL DEFAULT 0,
    "rattaches" INTEGER NOT NULL DEFAULT 0,
    "conflits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportAgenda_recuLe_idx" ON "ImportAgenda"("recuLe");

ALTER TABLE "ImportAgenda" ADD CONSTRAINT "ImportAgenda_motif_borne"
  CHECK ("motif" IS NULL OR char_length("motif") <= 40);

-- Comme toute table de public (audit OWASP 2026-10-13, S1).
ALTER TABLE "ImportAgenda" ENABLE ROW LEVEL SECURITY;
