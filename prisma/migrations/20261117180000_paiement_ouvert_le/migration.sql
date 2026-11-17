-- Quand une page de paiement Stripe a été ouverte pour le compte (ADR-058,
-- relecture du 2026-11-17) : la suppression d'un compte attend une heure
-- après, le temps que la page expire (Checkout, `expires_at`). Colonne
-- facultative, sans valeur par défaut : rien à réécrire.
ALTER TABLE "Abonnement" ADD COLUMN "paiementOuvertLe" TIMESTAMP(3);
