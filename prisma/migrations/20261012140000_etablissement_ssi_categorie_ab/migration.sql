-- DF 10 § 3 (arrêté du 25 juin 1980) : la présence d'un système de sécurité
-- incendie de catégorie A ou B est un fait de l'ÉTABLISSEMENT, posé une fois
-- sur sa fiche (décision de la propriétaire du 2026-10-08, « ok pour tes
-- recos », point 9). Colonne additive, nullable, sans défaut : `NULL` = pas
-- encore répondu, jamais « non » (ADR-022).
ALTER TABLE "Etablissement" ADD COLUMN "ssiCategorieAouB" BOOLEAN;

-- REPRISE DE LA MÊME QUESTION, posée jusqu'ici sur chaque désenfumage
-- (`caracteristiques.etablissementASsiCategorieAouB`, lot 4 du 2026-10-07) :
--   « oui » = un désenfumage actif de l'établissement a répondu oui ;
--   « non » = un désenfumage actif a répondu non, et aucun oui ;
--   rien    = la colonne reste NULL.
-- Le « oui » prime, comme à la reprise de l'ADR-041. La réponse donnée sur
-- l'alarme (`estSsiCategorieAouB`, « Ce SSI est-il de catégorie A ou B ? »)
-- n'est PAS reprise : c'est une autre question, par appareil, que la
-- triennale de MS 73 § 2 continue de lire.
UPDATE "Etablissement" e SET "ssiCategorieAouB" = CASE
  WHEN EXISTS (SELECT 1 FROM "Equipement" q
               WHERE q."etablissementId" = e.id AND q.actif
                 AND q.categorie = 'DESENFUMAGE'
                 AND jsonb_typeof(q.caracteristiques) = 'object'
                 AND q.caracteristiques->'etablissementASsiCategorieAouB' = 'true'::jsonb) THEN TRUE
  WHEN EXISTS (SELECT 1 FROM "Equipement" q
               WHERE q."etablissementId" = e.id AND q.actif
                 AND q.categorie = 'DESENFUMAGE'
                 AND jsonb_typeof(q.caracteristiques) = 'object'
                 AND q.caracteristiques->'etablissementASsiCategorieAouB' = 'false'::jsonb) THEN FALSE
  ELSE NULL END;
