-- Le registre d'accessibilité se crée vierge : `handicapsAccueillis` reprend
-- un DEFAULT, liste vide (c6, 2026-10-18).
--
-- La migration 20260812000000_verification_referentiel_version (l. 41) l'avait
-- retiré, au motif que « Prisma envoie toujours une valeur explicite pour un
-- champ liste ». C'est faux à la création quand le champ est omis : Prisma
-- n'envoie rien, la colonne NOT NULL reçoit NULL et la création échoue
-- (« Null constraint violation on the fields: (handicapsAccueillis) »). C'est
-- ce que faisait `obtenirOuCreer` (src/lib/accessibilite/actions.ts) à la
-- première saisie du registre. Le schéma porte désormais `@default([])` : le
-- DEFAULT de la base et celui du schéma disent la même chose, aucune dérive.
--
-- Les deux autres colonnes de la même migration (`PermisFeu.naturesTravaux`,
-- `Prestataire.domaines`) ne sont pas touchées : leurs seules créations
-- applicatives passent toujours la valeur (schémas Zod : `min(1)` pour l'une,
-- `default([])` pour l'autre).
--
-- Aucune donnée n'est modifiée.

ALTER TABLE "RegistreAccessibilite" ALTER COLUMN "handicapsAccueillis" SET DEFAULT ARRAY[]::"HandicapAccessible"[];
