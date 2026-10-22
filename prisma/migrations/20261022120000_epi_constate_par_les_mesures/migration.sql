-- La présence d'EPI se constate par les mesures (décision de la propriétaire,
-- 2026-10-22, `lib/etablissements/epi-constate.ts`) : une mesure de type
-- `protection_individuelle` non abandonnée vaut « oui » à « Fournissez-vous
-- des EPI à vos salariés ? », et l'emporte sur un « non » ou un silence —
-- même règle que l'EPI déclaré au parc.
--
-- Les écritures d'action appellent la règle depuis ce jour ; cette migration
-- l'applique une fois aux mesures déjà en base. Le calendrier suit à la
-- prochaine régénération (passe de reprise ou première mutation du dossier) :
-- la consigne d'utilisation, retenue « à confirmer » sur un silence, existe
-- déjà en ligne ; seule une réponse « non » levée la fait naître.
--
-- Aucune autre donnée n'est modifiée.

UPDATE "Etablissement" e
   SET "epiPresents" = true,
       "updatedAt" = NOW() AT TIME ZONE 'UTC'
 WHERE (e."epiPresents" IS NULL OR e."epiPresents" = false)
   AND EXISTS (
     SELECT 1 FROM "Action" a
      WHERE a."etablissementId" = e."id"
        AND a."type" = 'protection_individuelle'
        AND a."statut" <> 'abandonnee'
   );
