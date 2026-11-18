-- ADR-058 § 8 : les demandes de suppression, lues par la tâche quotidienne.
-- Seule instruction du fichier : `CONCURRENTLY` est refusé dans une
-- transaction, et Prisma n'en ouvre pas pour une instruction unique. Il
-- n'arrête aucune écriture sur `Compte`. `IF NOT EXISTS` : une base où la
-- première version de la migration précédente l'avait déjà créé.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Compte_suppressionDemandeeLe_idx" ON "Compte"("suppressionDemandeeLe");
