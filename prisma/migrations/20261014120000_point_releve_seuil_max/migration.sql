-- Carnet sanitaire : un minimum ET un maximum par point de relevé, et le type
-- du point (2026-10-14, `docs/chantiers-ouverts.md` point 5, décision de la
-- propriétaire).
--
-- L'article 36 de l'arrêté du 23 juin 1978 fixe des MAXIMUMS contre la
-- brûlure (50 °C aux points de puisage des pièces de toilette, 60 °C
-- ailleurs) et des MINIMUMS contre les légionelles (50 °C en tout point du
-- réseau, tubes finaux exceptés ; 55 °C en sortie d'un stockage de 400 L et
-- plus). Un seul `seuilMinCelsius` ne savait pas dire le plafond d'un robinet.
--
-- Schéma : ADDITIF, sauf une contrainte relâchée.
--   - `typePoint` et `seuilMaxCelsius`, colonnes neuves, facultatives ;
--   - `seuilMinCelsius` devient facultatif : une douche n'a pas de minimum
--     (le texte exempte les tubes finaux). Son défaut de 50 est retiré —
--     l'application écrit toujours la valeur, et un défaut silencieux
--     poserait un minimum là où le type n'en veut pas.

-- CreateEnum
CREATE TYPE "TypePointReleve" AS ENUM ('SORTIE_STOCKAGE', 'RETOUR_BOUCLE', 'PUISAGE_TOILETTE', 'PUISAGE_AUTRE', 'EAU_FROIDE');

-- AlterTable
ALTER TABLE "PointReleve" ADD COLUMN "typePoint" "TypePointReleve",
ADD COLUMN "seuilMaxCelsius" DOUBLE PRECISION,
ALTER COLUMN "seuilMinCelsius" DROP NOT NULL,
ALTER COLUMN "seuilMinCelsius" DROP DEFAULT;

-- Données : l'eau froide passe au MAXIMUM explicite.
--
-- Jusqu'ici `estReleveConforme` lisait `seuilMinCelsius` comme un plafond
-- quand le réseau était `EFS`. Elle ne lit plus le réseau : un minimum est un
-- minimum, un maximum un maximum. Laisser la valeur où elle est retournerait
-- le sens de chaque point d'eau froide (« 20 °C au moins »). La valeur est
-- donc RECOPIÉE dans `seuilMaxCelsius` et le minimum vidé : la plage de
-- chaque point reste exactement celle qu'il avait, et la colonne `conforme`
-- des relevés déjà écrits reste juste sans être recalculée.
--
-- Le type `EAU_FROIDE` est posé sur ces points, et sur eux seuls : c'est le
-- seul type dont le réseau est `EFS`, ce n'est pas une supposition. Les points
-- d'eau chaude, eux, gardent leur minimum, n'ont pas de maximum, et leur type
-- reste NULL : où ils sont (robinet de toilette, sortie de ballon, retour de
-- boucle) ne se déduit de rien de stocké, et ne se devine pas.
UPDATE "PointReleve"
SET "seuilMaxCelsius" = "seuilMinCelsius",
    "seuilMinCelsius" = NULL,
    "typePoint" = 'EAU_FROIDE'
WHERE "typeReseau" = 'EFS';

-- Une plage a au moins une borne : sans aucune, tout relevé serait « dans la
-- plage ». Les données existantes la vérifient (chaque point avait un
-- minimum non nul, recopié en maximum pour l'eau froide).
ALTER TABLE "PointReleve" ADD CONSTRAINT "PointReleve_un_seuil_au_moins"
  CHECK ("seuilMinCelsius" IS NOT NULL OR "seuilMaxCelsius" IS NOT NULL);

-- Et ses deux bornes, quand il y en a deux, sont dans l'ordre.
ALTER TABLE "PointReleve" ADD CONSTRAINT "PointReleve_seuils_ordonnes"
  CHECK ("seuilMinCelsius" IS NULL OR "seuilMaxCelsius" IS NULL
         OR "seuilMinCelsius" <= "seuilMaxCelsius");
