-- ============================================================================
-- Escaliers mécaniques déjà déclarés — 2026-11-13, 2/2
--
-- Un escalier mécanique ou un trottoir roulant déclaré avant ce jour l'a été
-- comme matériel non couvert : catégorie 'AUTRE', clé `escalier_mecanique`
-- dans `materielNonCouvert` (migration `20261014130000`). La clé quitte la
-- liste des matériels non couverts (`src/lib/equipements/materiels-non-couverts.ts`) :
-- laissée en base, elle serait refusée par `equipementSchema` à la prochaine
-- modification de l'appareil, et l'appareil ne recevrait pas ses vérifications.
--
-- Chaque appareil change de catégorie et garde son identifiant ; la clé est
-- effacée (elle n'est admise qu'en catégorie 'AUTRE'). Ce n'est pas une
-- réponse inventée : le dirigeant avait choisi lui-même « Escalier mécanique
-- ou trottoir roulant » dans la recherche du formulaire. Un appareil de
-- catégorie 'AUTRE' ne porte aucune ligne de calendrier : il n'y a rien à
-- reprendre de ce côté ; ses lignes naissent à la réconciliation qui suit la
-- montée de version du référentiel.
--
-- Les prescriptions sur mesure qui désignent l'un de ces appareils et
-- portaient sa catégorie d'alors ('AUTRE') suivent l'appareil, d'abord, tant
-- que la clé permet encore de le reconnaître.
-- ============================================================================

UPDATE "PrescriptionParticuliere" p
SET "categorieEquipement" = 'ESCALIER_MECANIQUE'
FROM "Equipement" e
WHERE p."equipementId" = e."id"
  AND e."materielNonCouvert" = 'escalier_mecanique'
  AND p."categorieEquipement" = 'AUTRE';

UPDATE "Equipement"
SET "categorie" = 'ESCALIER_MECANIQUE',
    "materielNonCouvert" = NULL
WHERE "materielNonCouvert" = 'escalier_mecanique';
