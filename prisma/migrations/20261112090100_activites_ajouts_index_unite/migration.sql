-- ADR-060 : un « oui » ne crée pas deux fois le même ajout. CONCURRENTLY et
-- seule instruction du fichier (règle de `migrations-index.test.ts`).
CREATE UNIQUE INDEX CONCURRENTLY "UniteTravail_duerpId_activiteId_key" ON "UniteTravail"("duerpId", "activiteId");
