-- L'index sur `verificationId` seul est le préfixe de celui posé par la
-- migration précédente (`20261028200000_rapport_index_dernier_par_ligne`) :
-- il est retiré. Après elle, jamais avant — les lectures par ligne ne restent
-- pas une seule migration sans index.
--
-- `CONCURRENTLY`, et SEULE instruction du fichier, pour la même raison que la
-- création : ne pas verrouiller la table des rapports au déploiement
-- (`migrations-index.test.ts`).
DROP INDEX CONCURRENTLY "RapportVerification_verificationId_idx";
