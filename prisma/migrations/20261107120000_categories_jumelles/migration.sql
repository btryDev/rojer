-- ============================================================================
-- Catégories jumelles réunies — ADR-057 § 5, lot C (2026-11-07), 1/2
--
-- VMC et CTA → VENTILATION ; PORTE_AUTO et PORTAIL_AUTO →
-- PORTE_PORTAIL_MOTORISE. (EPI existe déjà ; les trois EPI vérifiables y
-- reviennent avec un type déclaré.)
--
-- Ce fichier ne contient QUE l'ajout des valeurs : PostgreSQL refuse
-- d'utiliser une valeur ajoutée par ALTER TYPE ... ADD VALUE dans la même
-- transaction, et `prisma migrate deploy` exécute chaque migration dans la
-- sienne. La reprise des rangées est la migration suivante,
-- 20261107120100_categories_jumelles_reprise.
-- ============================================================================

ALTER TYPE "CategorieEquipement" ADD VALUE IF NOT EXISTS 'VENTILATION' BEFORE 'AUTRE';
ALTER TYPE "CategorieEquipement" ADD VALUE IF NOT EXISTS 'PORTE_PORTAIL_MOTORISE' BEFORE 'AUTRE';
