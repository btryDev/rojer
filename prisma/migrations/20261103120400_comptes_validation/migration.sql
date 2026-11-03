-- ADR-054 : validation des clés posées NOT VALID par
-- `20261103120000_comptes_et_membres`, puis retrait de l'ancienne racine.

-- Rien ne se retire si une ligne a échappé à la reprise : une entreprise ou un
-- abonnement écrit par l'ancien code entre deux migrations porterait un
-- `userId` sans `compteId`, et deviendrait orphelin sans bruit au retrait de
-- la colonne. On s'arrête AVANT toute modification, avec un message qui le dit
-- (même règle que `20261030130000_comptes_cles_etrangeres`).
DO $$
DECLARE
  sans_compte bigint;
BEGIN
  SELECT
      (SELECT count(*) FROM "Entreprise" WHERE "userId" IS NOT NULL AND "compteId" IS NULL)
    + (SELECT count(*) FROM "Abonnement" WHERE "compteId" IS NULL)
    + (SELECT count(*) FROM "DemandeAssistance" WHERE "compteId" IS NULL)
  INTO sans_compte;
  IF sans_compte > 0 THEN
    RAISE EXCEPTION
      'Lignes sans compte après la reprise : %. Rejouer la reprise de `20261103120000_comptes_et_membres` sur ces lignes avant de retirer userId (ADR-054 § 10).',
      sans_compte;
  END IF;
END $$;
ALTER TABLE "Entreprise" VALIDATE CONSTRAINT "Entreprise_compteId_fkey";
ALTER TABLE "Abonnement" VALIDATE CONSTRAINT "Abonnement_compteId_fkey";
ALTER TABLE "DemandeAssistance" VALIDATE CONSTRAINT "DemandeAssistance_compteId_fkey";

-- Toute ligne a reçu son compte à la reprise. `SET NOT NULL` relit la table
-- sous un verrou exclusif : sans enjeu ici (`cc` n'a pas servi de production,
-- tables à quelques lignes). Sur une table vivante et grosse, la forme sans
-- verrou serait `CHECK (… IS NOT NULL) NOT VALID`, `VALIDATE`, puis `SET NOT
-- NULL` (que PostgreSQL appuie alors sur la contrainte validée).
ALTER TABLE "Abonnement" ALTER COLUMN "compteId" SET NOT NULL;
ALTER TABLE "DemandeAssistance" ALTER COLUMN "compteId" SET NOT NULL;

-- L'ancienne racine. Retirée dans le même déploiement : `cc` n'a pas encore
-- servi de production (ADR-054 § 10). Si la bascule avait lieu avant cette
-- migration, la scinder : retirer d'abord la lecture, puis les colonnes au
-- déploiement suivant. `DemandeAssistance.userId` reste : c'est l'auteur.
ALTER TABLE "Entreprise" DROP CONSTRAINT "Entreprise_userId_fkey";
ALTER TABLE "Abonnement" DROP CONSTRAINT "Abonnement_userId_fkey";
ALTER TABLE "Entreprise" DROP COLUMN "userId";
ALTER TABLE "Abonnement" DROP COLUMN "userId";
