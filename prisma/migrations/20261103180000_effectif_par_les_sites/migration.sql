-- L'effectif de l'entreprise devient la somme de ses sites (2026-11-03,
-- décision de la propriétaire ; ADR-028 et ADR-031 amendées).
--   Entreprise.effectif = Σ (effectifSurSite − apprentisSurSite) + effectifHorsRojer
-- Purement additive : deux colonnes à défaut, aucune colonne existante réécrite.

ALTER TABLE "Etablissement" ADD COLUMN "apprentisSurSite" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Entreprise" ADD COLUMN "effectifHorsRojer" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Etablissement" ADD CONSTRAINT "Etablissement_apprentis_bornes"
  CHECK ("apprentisSurSite" >= 0 AND "apprentisSurSite" <= "effectifSurSite");
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_effectif_hors_rojer_positif"
  CHECK ("effectifHorsRojer" >= 0);

-- Remplissage des seules colonnes neuves, pour que le premier recalcul
-- retombe sur l'effectif déclaré jusqu'ici, jamais en dessous :
--  1. une entreprise à un seul site déclarée sous ce site : l'écart est fait
--     d'apprentis (c'est la seule lecture que le produit en donnait) ;
--  2. une entreprise déclarée au-dessus de la somme de ses sites : l'écart
--     travaille dans des établissements que Rojer ne suit pas.
-- Ensuite, Σ (site − apprentis) + hors Rojer = l'effectif déclaré pour un
-- site, max(déclaré, Σ sites) pour plusieurs. Sur une base neuve : sans effet.
UPDATE "Etablissement" AS et
SET "apprentisSurSite" = GREATEST(0, et."effectifSurSite" - en."effectif")
FROM "Entreprise" AS en
WHERE en."id" = et."entrepriseId"
  AND (SELECT count(*) FROM "Etablissement" AS x WHERE x."entrepriseId" = en."id") = 1;

UPDATE "Entreprise" AS en
SET "effectifHorsRojer" = GREATEST(
  0,
  en."effectif" - (
    SELECT COALESCE(SUM(et."effectifSurSite" - et."apprentisSurSite"), 0)
    FROM "Etablissement" AS et
    WHERE et."entrepriseId" = en."id"
  )
);
