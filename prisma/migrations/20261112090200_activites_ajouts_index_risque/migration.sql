-- ADR-060 : un « oui » ne crée pas deux fois le même ajout. CONCURRENTLY et
-- seule instruction du fichier (règle de `migrations-index.test.ts`).
CREATE UNIQUE INDEX CONCURRENTLY "Risque_uniteId_activiteId_libelle_key" ON "Risque"("uniteId", "activiteId", "libelle");
