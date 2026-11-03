-- ADR-054 : l'unicité du SIREN par compte. CONCURRENTLY et seule instruction
-- du fichier (règle de `migrations-index.test.ts`).
CREATE UNIQUE INDEX CONCURRENTLY "Entreprise_compteId_siren_key" ON "Entreprise"("compteId", "siren");
