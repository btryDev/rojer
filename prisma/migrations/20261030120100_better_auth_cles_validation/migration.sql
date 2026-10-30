-- Validation des clés posées NOT VALID par `20261030120000_better_auth_tables`
-- (règle de `migrations-index.test.ts`). Échoue sur une base qui porte encore
-- des comptes Supabase : voir la migration précédente.
ALTER TABLE "Entreprise" VALIDATE CONSTRAINT "Entreprise_userId_fkey";
ALTER TABLE "Signature" VALIDATE CONSTRAINT "Signature_userId_fkey";
ALTER TABLE "AccessToken" VALIDATE CONSTRAINT "AccessToken_createdByUserId_fkey";
ALTER TABLE "DemandeAssistance" VALIDATE CONSTRAINT "DemandeAssistance_userId_fkey";
