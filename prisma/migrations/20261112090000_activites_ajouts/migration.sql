-- ADR-060 : un « oui » à une activité hors référentiel ajoute une unité et
-- des risques à évaluer ; `activiteId` en garde l'origine (idempotence,
-- affichage, retrait). Colonnes nullables sans défaut : aucune réécriture de
-- table. PostgreSQL tient les NULL pour distincts : les lignes saisies à la
-- main ne sont pas contraintes par ces index.
ALTER TABLE "UniteTravail" ADD COLUMN "activiteId" TEXT;
ALTER TABLE "Risque" ADD COLUMN "activiteId" TEXT;

-- Les deux index uniques suivent, chacun CONCURRENTLY et seul dans son
-- fichier (règle de `migrations-index.test.ts`) : 20261112090100 et 20261112090200.
