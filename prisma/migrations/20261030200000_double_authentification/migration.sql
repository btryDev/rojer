-- ADR-052 § 7, lot 3b : la double authentification (plugin `twoFactor`),
-- proposée, non imposée. Application d'authentification et codes de secours ;
-- pas de code par e-mail (décision du 2026-10-30 : qui tient la boîte tient
-- déjà la réinitialisation du mot de passe).
--
-- La colonne de "User" a un défaut constant : PostgreSQL l'ajoute sans
-- réécrire la table. "TwoFactor" naît ici : sa clé étrangère n'a rien à
-- valider.


-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TwoFactor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactor_userId_key" ON "TwoFactor"("userId");

-- AddForeignKey
ALTER TABLE "TwoFactor" ADD CONSTRAINT "TwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Comme toutes les tables de `public` (migrations-rls.test.ts).
ALTER TABLE "TwoFactor" ENABLE ROW LEVEL SECURITY;
