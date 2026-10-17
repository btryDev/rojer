-- ============================================================================
-- Catégorie « Eau chaude collective alimentant des douches ou des bains à remous ouverts au public »
-- — 2026-10-17
--
-- Décision de la propriétaire du 2026-10-17 : la surveillance des légionelles
-- (arrêté du 1er février 2010, art. 1er, 2, 3, 5 et annexe 2) se porte sur
-- l'INSTALLATION déclarée au parc, sans question à l'accueil. Deux lignes par
-- installation : la température de l'eau une fois par mois, l'analyse de
-- légionelles une fois par an par un laboratoire accrédité.
--
-- Ajout pur, inséré avant 'AUTRE' (l'ordre affiché vient de
-- `CATEGORIES_EQUIPEMENT`, pas de l'enum). Aucune ligne existante n'est touchée.
-- ============================================================================

ALTER TYPE "CategorieEquipement" ADD VALUE IF NOT EXISTS 'EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC' BEFORE 'AUTRE';
