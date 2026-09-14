-- ============================================================================
-- Une ligne « à planifier » qui porte un contrôle réel a une échéance connue
-- Relecture du lot C (date de génération) — 2026-09-14
--
-- LA RÈGLE. Le statut dit ce que la date EST : `a_planifier` — aucune échéance
-- connue ; `planifiee` — une échéance connue, passée ou non. Une ligne
-- PÉRIODIQUE, ouverte, qui porte un rapport réalisé a vu sa date posée par le
-- roulement du dépôt : c'est une échéance connue.
--
-- D'OÙ VIENNENT LES LIGNES REPRISES. Avant la phase A du retrait de
-- `depassee`, un rapport « non vérifiable » déposé sur une ligne déjà
-- contrôlée la requalifiait « à planifier » sans toucher sa date. La phase B
-- n'a repris que les lignes tamponnées `depassee` : celles-ci sont restées, et
-- s'affichaient « aucune vérification enregistrée » au-dessus d'un rapport
-- conforme, leur vraie échéance masquée.
--
-- NE SONT PAS TOUCHÉES : les lignes archivées (elles ne réclament rien), les
-- obligations sans rendez-vous suivant (`mise_en_service_uniquement`,
-- `autre` — un contrôle unique réalisé porte un statut réalisé, pas celui-ci),
-- les titres de salariés (leur date vient de la pièce déclarée, la
-- régénération la réécrit). La régénération applique la même règle
-- (`statutCycleOuvert`) : une seule passe, puis plus rien ne bouge.
--
-- Rejouable : le second passage ne trouve plus de ligne.
-- ============================================================================

UPDATE "Verification" v
SET "statut" = 'planifiee'
WHERE v."statut" = 'a_planifier'
  AND v."archiveLe" IS NULL
  AND v."salarieId" IS NULL
  AND v."periodicite" NOT IN ('mise_en_service_uniquement', 'autre')
  AND EXISTS (
    SELECT 1 FROM "RapportVerification" r
    WHERE r."verificationId" = v."id"
      AND r."resultat" IN ('conforme', 'observations_mineures', 'ecart_majeur')
  );
