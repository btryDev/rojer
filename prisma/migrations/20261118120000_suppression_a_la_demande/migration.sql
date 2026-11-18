-- ADR-058 § 8 : la suppression du compte à la demande d'un propriétaire.
-- Colonnes ajoutées seulement (nullables, ou avec un défaut constant) :
-- aucune ligne réécrite, aucun verrou long. L'index suit, à part
-- (`20261118120100`), construit en CONCURRENTLY.
ALTER TABLE "Compte" ADD COLUMN "suppressionDemandeeLe" TIMESTAMP(3);
ALTER TABLE "Compte" ADD COLUMN "suppressionDemandeePar" TEXT;
ALTER TABLE "Compte" ADD COLUMN "suppressionFinPosee" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CompteSupprime" ADD COLUMN "motif" TEXT NOT NULL DEFAULT 'sans_abonnement';
ALTER TABLE "CompteSupprime" ADD COLUMN "demandeePar" TEXT;
