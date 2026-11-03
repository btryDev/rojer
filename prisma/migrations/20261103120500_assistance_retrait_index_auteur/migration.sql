-- ADR-054 : le plafond du jour des demandes d'assistance se compte par compte
-- (`DemandeAssistance_compteId_createdAt_idx`) ; l'index de l'auteur ne sert
-- plus. CONCURRENTLY et seule instruction du fichier (règle de
-- `migrations-index.test.ts`).
DROP INDEX CONCURRENTLY "DemandeAssistance_userId_createdAt_idx";
