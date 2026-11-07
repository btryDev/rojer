-- ADR-053 § 8 : un essai par entreprise. Table neuve, vide, ADDITIVE : rien
-- n'est modifié ailleurs. Le SIREN d'une entreprise créée pendant un essai,
-- et le compte qui l'a créée ; pas de clé étrangère, la ligne survit au
-- compte (sinon supprimer puis recréer rouvrirait un essai).

-- CreateTable
CREATE TABLE "EssaiEntreprise" (
    "siren" TEXT NOT NULL,
    "compteId" UUID NOT NULL,
    "noteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EssaiEntreprise_pkey" PRIMARY KEY ("siren")
);

-- RLS sans politique = refus par défaut, comme toutes les tables de `public`.
ALTER TABLE "EssaiEntreprise" ENABLE ROW LEVEL SECURITY;
