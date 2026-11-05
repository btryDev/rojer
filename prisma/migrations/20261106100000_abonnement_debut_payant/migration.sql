-- L'ancre des plafonds annuels (ADR-053 § 14) : début du premier abonnement
-- payant du compte, recopié de Stripe, jamais écrasé.
ALTER TABLE "Abonnement" ADD COLUMN "debutPayantLe" TIMESTAMP(3);
