-- Les EPI constatés font la réponse (décision de la propriétaire,
-- 2026-10-22, `lib/etablissements/epi-constate.ts`) : une mesure de type
-- `protection_individuelle` EN PLACE (`levee`), ou un équipement actif d'une
-- catégorie EPI, vaut « oui » à « Fournissez-vous des équipements de
-- protection individuelle à vos salariés ? », et l'emporte sur un « non » ou
-- un silence.
--
-- Les écritures d'action et d'équipement appliquent la règle depuis ce jour ;
-- cette migration l'applique une fois à ce qui est déjà en base.
--
-- LE CALENDRIER SUIT (revue du 2026-10-22). Un « non » levé fait naître la
-- consigne d'utilisation (R. 4323-105) : le sceau du calendrier des dossiers
-- touchés est effacé, si bien que `assurerCalendrierAJour` le régénère à la
-- prochaine ouverture du dossier (`calendrierDesynchronise`).
--
-- Les catégories EPI sont celles de `CATEGORIES_EPI`
-- (`referentiels/types-communs.ts`) au jour de la migration.
--
-- Aucune autre donnée n'est modifiée.

UPDATE "Etablissement" e
   SET "epiPresents" = true,
       "referentielVersionCalendrier" = NULL,
       "updatedAt" = NOW() AT TIME ZONE 'UTC'
 WHERE (e."epiPresents" IS NULL OR e."epiPresents" = false)
   AND (
     EXISTS (
       SELECT 1 FROM "Action" a
        WHERE a."etablissementId" = e."id"
          AND a."type" = 'protection_individuelle'
          AND a."statut" = 'levee'
     )
     OR EXISTS (
       SELECT 1 FROM "Equipement" q
        WHERE q."etablissementId" = e."id"
          AND q."actif" = true
          AND q."categorie"::text IN ('EPI', 'EPI_ANTICHUTE', 'EPI_RESPIRATOIRE', 'EPI_GILET_SAUVETAGE')
     )
   );
