-- ============================================================================
-- Catégorie « Scène / installations scéniques » — 2026-10-17
--
-- Sous-lot G de la mise à jour du référentiel (chapitre L du règlement de
-- sécurité ERP, arrêté du 25 juin 1980, livre II, titre II). Décisions de la
-- propriétaire et de c6 du 2026-10-17 : l'espace scénique d'une salle de type L
-- (ou d'une salle de danse de type P pour ses aménagements de spectacle, L 1 § 3)
-- des catégories 1 à 4 se déclare au parc. Il fait naître le dépoussiérage
-- annuel (L 57 § 3), une ligne par scène, et trois lignes d'établissement dues
-- dès qu'une scène est déclarée (L 57 § 1 a, L 13 § 5, L 57 § 7).
--
-- Ajout pur, inséré avant 'AUTRE' (l'ordre affiché vient de
-- `CATEGORIES_EQUIPEMENT`, pas de l'enum). Aucune ligne existante n'est touchée.
-- ============================================================================

ALTER TYPE "CategorieEquipement" ADD VALUE IF NOT EXISTS 'SCENE' BEFORE 'AUTRE';
