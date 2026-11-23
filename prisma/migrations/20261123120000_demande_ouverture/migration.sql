-- La page « Rojer ouvre bientôt » (2026-11-23, décision de la propriétaire :
-- inscriptions fermées tant que Stripe n'a pas validé le compte,
-- `src/lib/ouverture.ts`). Une table neuve, vide, hors compte : les adresses
-- laissées pour être prévenu de l'ouverture. Migration ADDITIVE, rien n'est
-- modifié ailleurs. Écrite à la main, dans la forme que produit
-- `prisma migrate dev`.

-- CreateTable
CREATE TABLE "DemandeOuverture" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeOuverture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeOuverture_email_key" ON "DemandeOuverture"("email");

-- Comme toute table de public (audit OWASP 2026-10-13, S1) : aucune politique,
-- donc rien n'est lisible hors du rôle propriétaire de l'application.
ALTER TABLE "DemandeOuverture" ENABLE ROW LEVEL SECURITY;
