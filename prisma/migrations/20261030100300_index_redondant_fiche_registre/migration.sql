-- Index redondant retiré (2026-10-28, audit de la base avant la bascule Clever
-- Cloud) : sa seule colonne est portée EN TÊTE par `FicheRegistre_etablissementId_sectionId_key` ;
-- PostgreSQL sert les mêmes lectures par celui-là, et l'index simple ne
-- coûtait qu'à l'écriture.
--
-- CONCURRENTLY et SEULE instruction du fichier (règle de
-- `migrations-index.test.ts`) : ne pas verrouiller la table au déploiement.
-- Les trois retraits formaient `20261028130000_index_redondants`, scindée le
-- 2026-10-30 pour suivre la règle.
DROP INDEX CONCURRENTLY "FicheRegistre_etablissementId_idx";
