-- Demande d'assistance (« Besoin d'aide ? »), décision de la propriétaire du
-- 2026-10-24. Additive : un type et une table neufs.

-- CreateEnum
CREATE TYPE "CategorieAssistance" AS ENUM ('diagnostic', 'commission_securite', 'duerp', 'prestataire', 'rapport', 'hors_couverture', 'autre');

-- CreateTable
CREATE TABLE "DemandeAssistance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "etablissementId" TEXT,
    "categorie" "CategorieAssistance" NOT NULL,
    "message" TEXT NOT NULL,
    "telephone" TEXT,
    "page" TEXT NOT NULL,
    "contexte" TEXT,
    "traiteeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeAssistance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeAssistance_userId_createdAt_idx" ON "DemandeAssistance"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DemandeAssistance_etablissementId_idx" ON "DemandeAssistance"("etablissementId");

-- AddForeignKey
ALTER TABLE "DemandeAssistance" ADD CONSTRAINT "DemandeAssistance_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bornes de saisie, comme à l'action serveur.
ALTER TABLE "DemandeAssistance" ADD CONSTRAINT "DemandeAssistance_bornes"
  CHECK (
    char_length("message") BETWEEN 1 AND 2000
    AND ("telephone" IS NULL OR char_length("telephone") <= 30)
    AND char_length("page") <= 512
    AND ("contexte" IS NULL OR char_length("contexte") <= 300)
  );

-- Exposée par l'API Data de Supabase sinon (`migrations-rls.test.ts`).
ALTER TABLE "DemandeAssistance" ENABLE ROW LEVEL SECURITY;
