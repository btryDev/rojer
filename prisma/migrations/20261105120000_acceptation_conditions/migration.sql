-- La preuve d'acceptation des conditions générales (ADR-053 § 8).

-- CreateTable
CREATE TABLE "AcceptationConditions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "compteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "contexte" TEXT NOT NULL,
    "accepteeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcceptationConditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcceptationConditions_compteId_accepteeLe_idx" ON "AcceptationConditions"("compteId", "accepteeLe");

-- AddForeignKey
ALTER TABLE "AcceptationConditions" ADD CONSTRAINT "AcceptationConditions_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcceptationConditions" ADD CONSTRAINT "AcceptationConditions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Comme toutes les tables de `public` (migrations-rls.test.ts).
ALTER TABLE "AcceptationConditions" ENABLE ROW LEVEL SECURITY;
