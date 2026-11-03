-- ADR-054 : un abonnement par compte. CONCURRENTLY et seule instruction du
-- fichier (règle de `migrations-index.test.ts`).
CREATE UNIQUE INDEX CONCURRENTLY "Abonnement_compteId_key" ON "Abonnement"("compteId");
