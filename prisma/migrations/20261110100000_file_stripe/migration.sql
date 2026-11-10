-- La file des événements Stripe (ADR-053 § 5, amendé le 2026-11-10) : le
-- webhook enregistre et répond ; l'aiguillage et la relecture suivent, sous
-- bail. Colonnes neuves nullables ou à défaut constant : aucune réécriture
-- de table.
ALTER TABLE "EvenementStripe"
    ADD COLUMN "tentatives" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "prochainEssaiLe" TIMESTAMP(3),
    ADD COLUMN "echecDurableLe" TIMESTAMP(3),
    ADD COLUMN "objetId" TEXT,
    ADD COLUMN "clientStripe" TEXT,
    ADD COLUMN "dureeMs" INTEGER;

CREATE INDEX "EvenementStripe_traiteLe_prochainEssaiLe_idx" ON "EvenementStripe"("traiteLe", "prochainEssaiLe");

CREATE TABLE "SynchronisationStripe" (
    "customerId" TEXT NOT NULL,
    "demandes" INTEGER NOT NULL DEFAULT 0,
    "traitees" INTEGER NOT NULL DEFAULT 0,
    "bailJeton" INTEGER NOT NULL DEFAULT 0,
    "bailJusquAu" TIMESTAMP(3),
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "prochainEssaiLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniereErreur" TEXT,
    "echecDurableLe" TIMESTAMP(3),
    "abonnementId" TEXT,
    "synchroniseLe" TIMESTAMP(3),

    CONSTRAINT "SynchronisationStripe_pkey" PRIMARY KEY ("customerId")
);

CREATE INDEX "SynchronisationStripe_prochainEssaiLe_idx" ON "SynchronisationStripe"("prochainEssaiLe");

CREATE TABLE "TacheQuotidienne" (
    "jour" TEXT NOT NULL,
    "bailJeton" INTEGER NOT NULL DEFAULT 0,
    "bailJusquAu" TIMESTAMP(3),
    "termineeLe" TIMESTAMP(3),
    "bilan" JSONB,

    CONSTRAINT "TacheQuotidienne_pkey" PRIMARY KEY ("jour")
);

-- Comme toute table de public (audit OWASP 2026-10-13, S1) : aucune politique,
-- donc rien n'est lisible hors du rôle propriétaire de l'application.
ALTER TABLE "SynchronisationStripe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TacheQuotidienne" ENABLE ROW LEVEL SECURITY;
