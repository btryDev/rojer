-- ADR-053 : les abonnements (Stripe). Deux tables neuves, vides : leurs index
-- et leur clé étrangère se créent sans rien parcourir ni valider.
--
-- "Abonnement" : une ligne par compte, copie de l'état Stripe, écrite depuis
-- un webhook signé après relecture de l'abonnement. RESTRICT vers "User" :
-- supprimer un compte devra d'abord résilier chez Stripe.
-- "EvenementStripe" : les événements reçus, dédoublonnés par leur identifiant.

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "statut" TEXT,
    "formule" TEXT,
    "finPeriode" TIMESTAMP(3),
    "finEssai" TIMESTAMP(3),
    "resilieEnFinDePeriode" BOOLEAN NOT NULL DEFAULT false,
    "essaiUtiliseLe" TIMESTAMP(3),
    "relueLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementStripe" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteLe" TIMESTAMP(3),

    CONSTRAINT "EvenementStripe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_userId_key" ON "Abonnement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_stripeCustomerId_key" ON "Abonnement"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_stripeSubscriptionId_key" ON "Abonnement"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Comme toutes les tables de `public` (migrations-rls.test.ts).
ALTER TABLE "Abonnement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvenementStripe" ENABLE ROW LEVEL SECURITY;
