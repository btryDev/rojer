-- Validation des clés posées NOT VALID par `20261030130000_comptes_cles_etrangeres`
-- (règle de `migrations-index.test.ts`).
ALTER TABLE "Entreprise" VALIDATE CONSTRAINT "Entreprise_userId_fkey";
ALTER TABLE "Signature" VALIDATE CONSTRAINT "Signature_userId_fkey";
ALTER TABLE "AccessToken" VALIDATE CONSTRAINT "AccessToken_createdByUserId_fkey";
ALTER TABLE "DemandeAssistance" VALIDATE CONSTRAINT "DemandeAssistance_userId_fkey";
