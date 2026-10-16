-- ============================================================================
-- Catégorie « Défibrillateur (DAE) » — 2026-10-15
--
-- Décision de la propriétaire du 2026-10-15 : la maintenance du défibrillateur
-- automatisé externe (CCH R. 157-4) et sa déclaration à la base de données
-- nationale Géo'DAE (CSP L. 5233-1, décret n° 2018-1259 art. 2) se portent sur
-- l'APPAREIL — une ligne par DAE déclaré. La détention (CCH R. 157-1 et
-- R. 157-2) reste portée par l'établissement : elle est due même sans appareil
-- déclaré.
--
-- Ajout pur, inséré avant 'AUTRE' (l'ordre affiché vient de
-- `CATEGORIES_EQUIPEMENT`, pas de l'enum). Aucune ligne existante n'est touchée.
-- ============================================================================

ALTER TYPE "CategorieEquipement" ADD VALUE IF NOT EXISTS 'DEFIBRILLATEUR' BEFORE 'AUTRE';
