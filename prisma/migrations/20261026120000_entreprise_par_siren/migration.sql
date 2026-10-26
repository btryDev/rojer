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
--
-- CE QUE LE RETRAIT EN DEUX TEMPS NE COUVRE PAS : le `NOT NULL` du NAF du site
-- est posé dès ce premier temps. Pendant le build, l'ancien code peut encore
-- créer un second établissement sans NAF (« si vide, le NAF de l'entreprise ») :
-- l'insertion échouerait. Risque accepté, fenêtre de quelques minutes sur une
-- production sans clients (2026-10-26) ; le reporter au second temps laisserait
-- le schéma Prisma et la base en désaccord pendant tout l'intervalle.

BEGIN;

-- Un SIRET valide : 14 chiffres et la clé de Luhn, ou, pour La Poste (SIREN
-- 356000000), une somme des chiffres multiple de 5. La même règle que
-- `src/lib/etablissements/siret.ts`. L'ancien schéma ne vérifiait que les 14
-- chiffres : un SIRET mal saisi donnerait un SIREN faux, que plus aucun écran
-- ne corrige, et ferait refuser le vrai SIRET au premier enregistrement.
CREATE FUNCTION pg_temp.siret_valide(s TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT s ~ '^[0-9]{14}$' AND (
    (SELECT sum(
       CASE WHEN (14 - i) % 2 = 1
         THEN (substr(s, i, 1)::int * 2) - CASE WHEN substr(s, i, 1)::int * 2 > 9 THEN 9 ELSE 0 END
         ELSE substr(s, i, 1)::int
       END) % 10 = 0
     FROM generate_series(1, 14) AS i)
    OR (left(s, 9) = '356000000'
        AND (SELECT sum(substr(s, i, 1)::int) % 5 = 0 FROM generate_series(1, 14) AS i))
  )
$$;

-- 1. Le SIRET va au site. Il ne désignait qu'un site, et rien ne dit lequel :
--    on le donne au plus ancien, celui que l'onboarding a créé avec lui. Les
--    autres restent sans SIRET plutôt que d'en recevoir un faux ; la fiche le
--    demande au prochain enregistrement. Un SIRET ancien invalide n'est pas
--    recopié : la colonne ne porte que des numéros valides.
ALTER TABLE "Etablissement" ADD COLUMN "siret" TEXT;

UPDATE "Etablissement" e
SET "siret" = en."siret"
FROM "Entreprise" en
WHERE e."entrepriseId" = en."id"
  AND pg_temp.siret_valide(en."siret")
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
WHERE pg_temp.siret_valide("siret");

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
