-- ============================================================================
-- Catégorie « But ou panier de sport de 10 kg ou plus » — 2026-10-17
--
-- Décision de la propriétaire du 2026-10-17 (sous-lot E, salles de sport) :
-- les cages de buts de football, de handball, de hockey et les buts de
-- basket-ball de 10 kg ou plus (code du sport, art. R. 322-19 à R. 322-26)
-- font naître, une fois déclarés, la ligne d'établissement « plan de
-- vérification et d'entretien, et registre » de l'art. R. 322-25.
--
-- Ajout pur, inséré avant 'AUTRE' (l'ordre affiché vient de
-- `CATEGORIES_EQUIPEMENT`, pas de l'enum). Aucune ligne existante n'est touchée.
-- ============================================================================

ALTER TYPE "CategorieEquipement" ADD VALUE IF NOT EXISTS 'BUT_PANIER_SPORTIF' BEFORE 'AUTRE';
