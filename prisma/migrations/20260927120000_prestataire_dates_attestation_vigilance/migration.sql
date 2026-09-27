-- ============================================================================
-- Les deux dates de l'attestation de vigilance — décision B2 — 2026-09-27
--
-- D. 8222-5 (Légifrance, en vigueur depuis le 01/01/2023, relu le 2026-09-27)
-- fait compter deux dates : la REMISE, « lors de la conclusion et tous les six
-- mois jusqu'à la fin de son exécution », et l'ÉMISSION de l'attestation,
-- « datant de moins de six mois ». Le produit comptait les six mois depuis
-- `Prestataire.updatedAt`, que toute écriture sur la fiche repoussait.
--
-- DEUX COLONNES NULLABLES, SANS DÉFAUT, SANS RÉTRO-REMPLISSAGE. Aucune date
-- existante ne dit quand une attestation a été remise ni émise : `createdAt`
-- et `updatedAt` datent la fiche, pas la pièce. Remplir serait inventer ; le
-- vide s'affiche « date non renseignée », jamais « à jour ».
--
-- ADDITIVE, ET INERTE POUR LE CODE EN LIGNE : `prisma migrate deploy` la joue
-- au build Vercel avant que le code qui lit les colonnes n'y soit ; le code
-- déployé les ignore, ses insertions les laissent à NULL.
--
-- FORME : celle de `attestationUrssafValableJusquA`, posée par
-- `20260423150000_prestataires` — `TIMESTAMP(3)` nullable, ce que Prisma
-- attend pour `DateTime?`.
-- ============================================================================

ALTER TABLE "Prestataire" ADD COLUMN "attestationUrssafRemiseLe" TIMESTAMP(3);
ALTER TABLE "Prestataire" ADD COLUMN "attestationUrssafEmiseLe" TIMESTAMP(3);
