-- Trois index redondants retirés (2026-10-28, audit de la base avant la bascule
-- Clever Cloud). Chacun porte une seule colonne qu'un autre index de la même
-- table porte déjà EN TÊTE : PostgreSQL sert les mêmes lectures par celui-là,
-- et l'index simple ne coûtait qu'à l'écriture.
--
--   Entreprise_userId_idx              ← Entreprise_userId_siren_key
--   FicheRegistre_etablissementId_idx  ← FicheRegistre_etablissementId_sectionId_key
--   Prestataire_etablissementId_idx    ← Prestataire_etablissementId_siret_key,
--                                        Prestataire_etablissementId_raisonSociale_idx

-- DropIndex
DROP INDEX "Entreprise_userId_idx";

-- DropIndex
DROP INDEX "FicheRegistre_etablissementId_idx";

-- DropIndex
DROP INDEX "Prestataire_etablissementId_idx";
