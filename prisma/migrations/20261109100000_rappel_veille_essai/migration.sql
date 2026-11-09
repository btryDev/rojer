-- Rappel de la veille de la fin de l'essai (ADR-053, notes du chantier § 13).
ALTER TABLE "Abonnement" ADD COLUMN "rappelVeilleEssaiLe" TIMESTAMP(3);
