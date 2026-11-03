-- ADR-054 : validation des clés posées NOT VALID par
-- `20261103120000_comptes_et_membres`, puis retrait de l'ancienne racine.
ALTER TABLE "Entreprise" VALIDATE CONSTRAINT "Entreprise_compteId_fkey";
ALTER TABLE "Abonnement" VALIDATE CONSTRAINT "Abonnement_compteId_fkey";
ALTER TABLE "DemandeAssistance" VALIDATE CONSTRAINT "DemandeAssistance_compteId_fkey";

-- Toute ligne a reçu son compte à la reprise.
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
