-- ADR-064 : un événement de l'agenda porte au plus un créneau. Sur une table
-- existante, l'index se construit sans bloquer les écritures, seul dans son
-- fichier (`migrations-index.test.ts`).
CREATE UNIQUE INDEX CONCURRENTLY "CreneauAssistance_evenementAgendaId_key" ON "CreneauAssistance"("evenementAgendaId");
