-- ============================================================================
-- Le retard est une fonction de la date : retrait de `StatutVerification.depassee`
-- Retrait de `depassee`, phase B — 2026-09-14
--
-- CE QUI CHANGE. `depassee` était un tampon posé par la génération le jour où
-- une échéance passait. Deux sources pour un fait, et elles divergeaient. Le
-- modèle de référence (GestBAT) ne stocke aucun statut de retard. Depuis la
-- phase A, déployée AVANT cette migration, plus aucun code ne l'écrit ni ne
-- s'en sert pour décider d'un retard : le retard se lit sur `datePrevue`.
--
-- LE STATUT DIT DÉSORMAIS UNE SEULE CHOSE : la date est-elle une VRAIE
-- échéance ? `a_planifier` — aucune échéance connue ; `planifiee` — une
-- échéance connue, passée ou non. Le premier UPDATE réécrit les lignes encore
-- tamponnées selon la règle que la régénération applique depuis la phase A
-- (`statutCycleOuvert`) : un rapport réalisé derrière la ligne, son échéance
-- a été calculée depuis un contrôle réel — « planifiée » ; sinon on ne sait
-- pas — « à planifier ». La date ne bouge pas : une ligne passée reste en
-- retard.
--
-- Puis la valeur quitte l'enum. PostgreSQL ne sait pas retirer une valeur d'un
-- type énuméré : on crée le nouveau type, on y convertit la colonne, on
-- supprime l'ancien. `Verification.statut` est la seule colonne de ce type.
--
-- Rejouable : le bloc ne s'exécute que tant que la valeur existe.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'StatutVerification' AND e.enumlabel = 'depassee'
  ) THEN
    UPDATE "Verification" v
    SET "statut" = CASE
      WHEN EXISTS (
        SELECT 1 FROM "RapportVerification" r
        WHERE r."verificationId" = v."id"
          AND r."resultat" IN ('conforme', 'observations_mineures', 'ecart_majeur')
      ) THEN 'planifiee'::"StatutVerification"
      ELSE 'a_planifier'::"StatutVerification"
    END
    WHERE v."statut" = 'depassee';

    ALTER TYPE "StatutVerification" RENAME TO "StatutVerification_avant_retrait";
    CREATE TYPE "StatutVerification" AS ENUM (
      'a_planifier',
      'planifiee',
      'realisee_conforme',
      'realisee_observations',
      'realisee_ecart_majeur'
    );
    ALTER TABLE "Verification" ALTER COLUMN "statut" DROP DEFAULT;
    ALTER TABLE "Verification"
      ALTER COLUMN "statut" TYPE "StatutVerification"
      USING ("statut"::text::"StatutVerification");
    ALTER TABLE "Verification" ALTER COLUMN "statut" SET DEFAULT 'a_planifier';
    DROP TYPE "StatutVerification_avant_retrait";
  END IF;
END $$;
