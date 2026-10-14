-- ============================================================================
-- Catégorie « Installation de gaz » — 2026-10-14
--
-- Décision de la propriétaire du 2026-10-14 : la vérification annuelle de
-- GZ 15 (arrêté du 25 juin 1980, ERP des quatre premières catégories) vise
-- TOUTES les installations de gaz combustible — stockage, distribution,
-- locaux d'utilisation, appareils —, pas seulement celles d'une cuisine.
-- Jusqu'ici, `cuisson-gaz-installations-annuelle` ne s'accrochait qu'à
-- `APPAREIL_CUISSON_ERP` : un commerce chauffé au gaz sans cuisine ne la
-- recevait pas (`docs/chantiers-ouverts.md`, § 0, défaut n° 1).
--
-- Le nom n'est PAS « chaudière » : la catégorie nomme l'installation que
-- GZ 15 vérifie, et une chaudière n'en est qu'un appareil possible.
--
-- Ajout pur, inséré avant 'AUTRE' (l'ordre affiché vient de
-- `CATEGORIES_EQUIPEMENT`, pas de l'enum : voir `equipements/labels.ts`,
-- `ordreCategorie`). Aucune ligne existante n'est touchée.
-- ============================================================================

ALTER TYPE "CategorieEquipement" ADD VALUE IF NOT EXISTS 'INSTALLATION_GAZ' BEFORE 'AUTRE';
