-- Les liens émis par un compte : plafond d'émission (`access-tokens/emission.ts`)
-- et contrôle `Restrict` de la clé vers "User". Seule dans son fichier
-- (`CONCURRENTLY`, règle de `migrations-index.test.ts`).
CREATE INDEX CONCURRENTLY "AccessToken_createdByUserId_createdAt_idx" ON "AccessToken"("createdByUserId", "createdAt");
