-- L'essai se compte chez Rojer (ADR-053 § 9, amendé le 2026-11-16) : la ligne
-- d'abonnement naît au démarrage de l'essai, sans client Stripe ; le client
-- est créé au moment de s'abonner. L'unicité reste (plusieurs NULL admis).
ALTER TABLE "Abonnement" ALTER COLUMN "stripeCustomerId" DROP NOT NULL;

-- Le rappel d'une semaine avant la fin de l'essai, envoyé par Rojer (celui de
-- Stripe disparaît avec l'abonnement d'essai). Même garde que celui de la
-- veille. Colonne nullable, sans défaut : aucune réécriture de table.
ALTER TABLE "Abonnement" ADD COLUMN "rappelSemaineEssaiLe" TIMESTAMP(3);
