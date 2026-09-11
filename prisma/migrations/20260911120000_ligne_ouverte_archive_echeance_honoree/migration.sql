-- ============================================================================
-- La ligne ne porte que l'échéance ouverte — ADR-034, lot N1 — 2026-09-11
--
-- DEUX COLONNES, AUCUNE TABLE. L'ADR-034 retient l'option 2 : une ligne
-- `Verification` par obligation et porteur, qui ne porte plus que l'échéance
-- ouverte ; l'historique, ce sont les rapports. Ce lot pose le schéma. Le
-- roulement au dépôt (N2), les prédicats (N3) et les lecteurs (N4) suivent.
--
-- `Verification.archiveLe` remplace le préfixe « Ne s'applique plus — » que
-- la réconciliation posait dans `libelleObligation` quand une ligne portant
-- une preuve cessait de s'appliquer. Un fait daté lu par `startsWith` sur un
-- libellé : c'est ce que la relecture du 2026-09-10 a trouvé mal lu à huit
-- endroits. Les deux sont écrits ensemble dès ce lot ; le préfixe part au N3.
--
-- `RapportVerification.echeanceHonoree` garde la date prévue qu'un rapport
-- honorait, que la ligne ne garde plus une fois roulée. Écrite à partir du N2.
--
-- RÉTRO-REMPLISSAGE. Les lignes déjà marquées reçoivent `archiveLe =
-- updatedAt` : c'est la meilleure date disponible, et elle est au plus tard
-- — une écriture postérieure à l'archivage l'aurait repoussée, jamais
-- avancée. Le libellé est comparé au préfixe EXACT de
-- `MARQUEUR_NON_APPLICABLE` (`src/lib/calendrier/marqueur.ts`), tiret
-- cadratin compris ; `migrations-contraintes.test.ts` garde l'égalité.
-- `echeanceHonoree` reste nulle pour l'existant : la date prévue d'un rapport
-- déjà déposé n'a été gardée nulle part, et l'inventer serait pire que la
-- laisser vide.
--
-- NULLABLES, SANS DÉFAUT, ADDITIVES : aucune ligne n'est détruite, aucun
-- lecteur actuel ne voit la différence.
-- ============================================================================

ALTER TABLE "Verification" ADD COLUMN IF NOT EXISTS "archiveLe" TIMESTAMP(3);

ALTER TABLE "RapportVerification" ADD COLUMN IF NOT EXISTS "echeanceHonoree" TIMESTAMP(3);

UPDATE "Verification"
SET "archiveLe" = "updatedAt"
WHERE "archiveLe" IS NULL
  AND starts_with("libelleObligation", 'Ne s''applique plus — ');
