-- Second temps du retrait (2026-10-27) : le SIRET et le NAF appartiennent à
-- l'établissement depuis la migration `20261026120000_entreprise_par_siren`,
-- déployée le 2026-10-26 (PR #93). Plus aucun code servi ne lit ni n'écrit
-- ces deux colonnes de l'entreprise ; leurs valeurs utiles ont été recopiées
-- (SIRET vers l'établissement le plus ancien, SIREN déduit, NAF complété).

ALTER TABLE "Entreprise" DROP COLUMN "siret",
DROP COLUMN "codeNaf";
