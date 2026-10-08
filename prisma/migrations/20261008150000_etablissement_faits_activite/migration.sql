-- ADR-041 : les faits d'activité qui rendent dues des formations vivent sur
-- l'établissement. Colonnes additives, nullables, sans défaut : `NULL` = pas
-- encore répondu, jamais « non ».
ALTER TABLE "Etablissement" ADD COLUMN "manutentionManuelle" BOOLEAN;
ALTER TABLE "Etablissement" ADD COLUMN "travailSurEcran" BOOLEAN;
ALTER TABLE "Etablissement" ADD COLUMN "operationsElectriques" BOOLEAN;
ALTER TABLE "Etablissement" ADD COLUMN "conduiteEngins" BOOLEAN;
ALTER TABLE "Etablissement" ADD COLUMN "expositionCMR" BOOLEAN;

-- REPRISE DES RÉPONSES DÉJÀ DONNÉES AU DUERP. Aucune ne se perd, aucune ne
-- s'invente :
--   « oui » = un risque de l'unité transverse porte le `referentielId` de la
--             question (la seule vérité du « oui » jusqu'ici, ADR-038) ;
--   « non » = `Duerp.reponsesTransverses` porte la clé de la question à false ;
--   rien    = la colonne reste NULL.
-- Le « oui » prime, comme dans `transverses/etat.ts`.
UPDATE "Etablissement" e SET
  "manutentionManuelle" = CASE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d JOIN "UniteTravail" u ON u."duerpId" = d.id
                 JOIN "Risque" r ON r."uniteId" = u.id
                 WHERE d."etablissementId" = e.id AND u."estTransverse" AND r."referentielId" = 'trv-charges') THEN TRUE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d WHERE d."etablissementId" = e.id
                 AND jsonb_typeof(d."reponsesTransverses") = 'object'
                 AND d."reponsesTransverses"->'q-charges' = 'false'::jsonb) THEN FALSE
    ELSE NULL END,
  "travailSurEcran" = CASE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d JOIN "UniteTravail" u ON u."duerpId" = d.id
                 JOIN "Risque" r ON r."uniteId" = u.id
                 WHERE d."etablissementId" = e.id AND u."estTransverse" AND r."referentielId" = 'trv-tms-ecran') THEN TRUE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d WHERE d."etablissementId" = e.id
                 AND jsonb_typeof(d."reponsesTransverses") = 'object'
                 AND d."reponsesTransverses"->'q-ecran' = 'false'::jsonb) THEN FALSE
    ELSE NULL END,
  "operationsElectriques" = CASE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d JOIN "UniteTravail" u ON u."duerpId" = d.id
                 JOIN "Risque" r ON r."uniteId" = u.id
                 WHERE d."etablissementId" = e.id AND u."estTransverse" AND r."referentielId" = 'trv-operations-electriques') THEN TRUE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d WHERE d."etablissementId" = e.id
                 AND jsonb_typeof(d."reponsesTransverses") = 'object'
                 AND d."reponsesTransverses"->'q-operations-electriques' = 'false'::jsonb) THEN FALSE
    ELSE NULL END,
  "conduiteEngins" = CASE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d JOIN "UniteTravail" u ON u."duerpId" = d.id
                 JOIN "Risque" r ON r."uniteId" = u.id
                 WHERE d."etablissementId" = e.id AND u."estTransverse" AND r."referentielId" = 'trv-conduite-engins') THEN TRUE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d WHERE d."etablissementId" = e.id
                 AND jsonb_typeof(d."reponsesTransverses") = 'object'
                 AND d."reponsesTransverses"->'q-conduite-engins' = 'false'::jsonb) THEN FALSE
    ELSE NULL END,
  -- L'exposition CMR cochée sur un risque, quel qu'il soit, vaut « oui » pour
  -- l'établissement. Rien ne vaut « non » : la case non cochée n'a jamais été
  -- une réponse.
  "expositionCMR" = CASE
    WHEN EXISTS (SELECT 1 FROM "Duerp" d JOIN "UniteTravail" u ON u."duerpId" = d.id
                 JOIN "Risque" r ON r."uniteId" = u.id
                 WHERE d."etablissementId" = e.id AND r."exposeCMR") THEN TRUE
    ELSE NULL END;
