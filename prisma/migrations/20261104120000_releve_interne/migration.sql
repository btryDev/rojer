-- Une vérification faite en interne s'enregistre sans fichier (2026-11-04,
-- décision de la propriétaire). Additive : une colonne à défaut, quatre
-- colonnes qui acceptent l'absence. Aucune donnée existante n'est réécrite :
-- tous les rapports déjà déposés ont un fichier et restent `false`.

ALTER TABLE "RapportVerification" ADD COLUMN "realiseEnInterne" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RapportVerification" ALTER COLUMN "fichierCle" DROP NOT NULL;
ALTER TABLE "RapportVerification" ALTER COLUMN "fichierNomOriginal" DROP NOT NULL;
ALTER TABLE "RapportVerification" ALTER COLUMN "fichierMime" DROP NOT NULL;
ALTER TABLE "RapportVerification" ALTER COLUMN "fichierTaille" DROP NOT NULL;

-- Le fichier est complet ou absent : jamais une clé sans nom, ni l'inverse.
ALTER TABLE "RapportVerification" ADD CONSTRAINT "RapportVerification_fichier_complet"
  CHECK (
    ("fichierCle" IS NULL AND "fichierNomOriginal" IS NULL AND "fichierMime" IS NULL AND "fichierTaille" IS NULL)
    OR
    ("fichierCle" IS NOT NULL AND "fichierNomOriginal" IS NOT NULL AND "fichierMime" IS NOT NULL AND "fichierTaille" IS NOT NULL)
  );

-- Sans fichier, seulement en interne : le rapport d'un prestataire s'annexe
-- (R. 4323-26).
ALTER TABLE "RapportVerification" ADD CONSTRAINT "RapportVerification_fichier_hors_interne"
  CHECK ("realiseEnInterne" OR "fichierCle" IS NOT NULL);
