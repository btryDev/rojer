-- Le dernier rapport d'une ligne en une descente d'index (plan performance,
-- 2026-10-28) : la « dernière réalisation », lue sur chaque écran, coûte le
-- nombre de lignes et non plus la longueur de l'historique.
-- L'index sur `verificationId` seul en est le préfixe : il est remplacé.
--
-- Sans `CONCURRENTLY` : la construction verrouille les écritures de la table
-- le temps de la construire (`migrate deploy` passe avant chaque build).
-- Sur le gros dossier de mesure (7 888 rapports) : 10 ms, mesuré. La taille de la table en production n'a pas été mesurée
-- pour ce lot : si elle se compte en centaines de milliers de lignes, poser
-- l'index en `CONCURRENTLY`, seul dans sa migration.

-- CreateIndex
CREATE INDEX "RapportVerification_verificationId_dateRapport_createdAt_idx" ON "RapportVerification"("verificationId", "dateRapport" DESC, "createdAt" DESC);

-- DropIndex
DROP INDEX "RapportVerification_verificationId_idx";
