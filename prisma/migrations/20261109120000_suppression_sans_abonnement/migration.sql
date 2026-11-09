-- Suppression du compte sans abonnement depuis douze mois (ADR-058).
ALTER TABLE "Abonnement" ADD COLUMN "sansAbonnementDepuis" TIMESTAMP(3),
ADD COLUMN "suppressionPrevueLe" TIMESTAMP(3),
ADD COLUMN "avertiSuppression30Le" TIMESTAMP(3),
ADD COLUMN "avertiSuppression7Le" TIMESTAMP(3);
