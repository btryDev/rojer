-- Le dernier rapport d'une ligne en une descente d'index (plan performance,
-- 2026-10-28) : la « dernière réalisation », lue sur chaque écran, coûte le
-- nombre de lignes et non plus la longueur de l'historique.
-- L'index sur `verificationId` seul en est le préfixe : il est remplacé.

-- CreateIndex
CREATE INDEX "RapportVerification_verificationId_dateRapport_createdAt_idx" ON "RapportVerification"("verificationId", "dateRapport" DESC, "createdAt" DESC);

-- DropIndex
DROP INDEX "RapportVerification_verificationId_idx";
