-- ADR-054 : les demandes d'un compte, par date. CONCURRENTLY et seule
-- instruction du fichier (règle de `migrations-index.test.ts`).
CREATE INDEX CONCURRENTLY "DemandeAssistance_compteId_createdAt_idx" ON "DemandeAssistance"("compteId", "createdAt");
