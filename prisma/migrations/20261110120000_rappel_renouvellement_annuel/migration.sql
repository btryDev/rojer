-- Le rappel du renouvellement d'un abonnement annuel, 30 jours avant
-- (décision du 2026-11-10) : l'échéance déjà rappelée. Colonne nullable, sans
-- défaut : aucune réécriture de table.
ALTER TABLE "Abonnement" ADD COLUMN "rappelRenouvellementPour" TIMESTAMP(3);
