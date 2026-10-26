-- Une entreprise par SIREN, plusieurs par compte (2026-10-26, ADR-028 amendée).
--
-- Une Entreprise devient l'unité légale (SIREN) et un compte en porte autant que
-- de sociétés suivies. Le SIRET et le NAF passent au site (Etablissement), où ils
-- ont toujours appartenu : le SIRET d'une entreprise à deux sites était faux pour
-- l'un des deux.
--
-- Premier temps d'un retrait en deux : `Entreprise.siret` et `Entreprise.codeNaf`
-- restent en colonne (le second devient nullable) parce que l'ancien code, servi
-- pendant le build Vercel, les lit encore. La migration suivante les supprime.
--
-- Une seule transaction : une recopie à moitié faite laisserait des sites sans
-- NAF devant une contrainte NOT NULL.

BEGIN;

-- 1. Le SIRET va au site. Il ne désignait qu'un site, et rien ne dit lequel :
--    on le donne au plus ancien, celui que l'onboarding a créé avec lui. Les
--    autres restent sans SIRET plutôt que d'en recevoir un faux ; la fiche le
--    demande au prochain enregistrement. Un SIRET ancien mal formé n'est pas
--    recopié : la colonne ne porte que des numéros à 14 chiffres.
ALTER TABLE "Etablissement" ADD COLUMN "siret" TEXT;

UPDATE "Etablissement" e
SET "siret" = en."siret"
FROM "Entreprise" en
WHERE e."entrepriseId" = en."id"
  AND en."siret" ~ '^[0-9]{14}$'
  AND e."id" = (
    SELECT e2."id" FROM "Etablissement" e2
    WHERE e2."entrepriseId" = en."id"
    ORDER BY e2."createdAt" ASC, e2."id" ASC
    LIMIT 1
  );

-- 2. Le SIREN de l'entreprise : les neuf premiers chiffres de son SIRET.
ALTER TABLE "Entreprise" ADD COLUMN "siren" TEXT;

UPDATE "Entreprise"
SET "siren" = substring("siret" FROM 1 FOR 9)
WHERE "siret" ~ '^[0-9]{14}$';

-- 3. Le NAF du site devient obligatoire. Il n'était renseigné que s'il différait
--    de celui de l'entreprise : le vide recevait donc celui de l'entreprise.
UPDATE "Etablissement" e
SET "codeNaf" = en."codeNaf"
FROM "Entreprise" en
WHERE e."entrepriseId" = en."id"
  AND (e."codeNaf" IS NULL OR btrim(e."codeNaf") = '');

ALTER TABLE "Etablissement" ALTER COLUMN "codeNaf" SET NOT NULL;
ALTER TABLE "Entreprise" ALTER COLUMN "codeNaf" DROP NOT NULL;

-- 4. Plusieurs entreprises par compte, une seule par SIREN. L'index simple
--    remplace l'unique : chaque lecture cloisonnée remonte à `userId`.
DROP INDEX "Entreprise_userId_key";
CREATE INDEX "Entreprise_userId_idx" ON "Entreprise"("userId");
CREATE UNIQUE INDEX "Entreprise_userId_siren_key" ON "Entreprise"("userId", "siren");

COMMIT;
