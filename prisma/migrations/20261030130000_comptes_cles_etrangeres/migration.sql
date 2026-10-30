-- ADR-052, lot 2 : les tables métier désignent un compte Better Auth.
--
-- Ces clés supposent que chaque `userId` existant désigne un "User". C'est le
-- cas d'une base neuve (Clever Cloud : aucune donnée migrée, décision du
-- 2026-10-30). Une base qui porte encore des dossiers Supabase (développement
-- local, prod Vercel) s'arrête ICI, avant toute modification, avec un message
-- qui le dit — et non à moitié appliquée, sur la validation suivante.
DO $$
DECLARE
  orphelins bigint;
BEGIN
  SELECT
      (SELECT count(*) FROM "Entreprise" e
         WHERE e."userId" IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."userId"))
    + (SELECT count(*) FROM "Signature" s
         WHERE s."userId" IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."userId"))
    + (SELECT count(*) FROM "AccessToken" a
         WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = a."createdByUserId"))
    + (SELECT count(*) FROM "DemandeAssistance" d
         WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id::text = d."userId"::text))
  INTO orphelins;
  IF orphelins > 0 THEN
    RAISE EXCEPTION
      'Comptes inconnus de "User" : % ligne(s). Cette base porte des comptes Supabase ; la remettre à zéro avant de jouer la branche cc (plan de bascule, § 7.1).',
      orphelins;
  END IF;
END $$;

-- Le texte devient UUID sur place (la base est vide, ou ses valeurs sont
-- toutes des comptes existants, vérifié ci-dessus).
ALTER TABLE "DemandeAssistance" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- Règle de `migrations-index.test.ts` : sur une table existante, la clé est
-- posée NOT VALID, et validée dans la migration suivante.
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "DemandeAssistance" ADD CONSTRAINT "DemandeAssistance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
