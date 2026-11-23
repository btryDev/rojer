-- ADR-062 § 12 (2026-11-23, décision de la propriétaire) : le connecteur
-- s'ouvre aux outils non vérifiés seulement si le propriétaire du compte l'a
-- décidé. Une colonne, fausse par défaut : aucun compte existant ne s'ouvre.
-- Migration ADDITIVE, écrite à la main dans la forme de `prisma migrate dev`.

-- AlterTable
ALTER TABLE "Compte" ADD COLUMN "outilsNonVerifiesAutorises" BOOLEAN NOT NULL DEFAULT false;
