-- ============================================================================
-- Catégories jumelles réunies — ADR-057 § 5, lot C (2026-11-07), 2/2
--
-- Chaque appareil change de catégorie et garde son identifiant : ses lignes de
-- calendrier (clé obligation × appareil) et ses rapports restent les siens.
-- Ce qui distinguait l'ancienne catégorie au regard d'un texte est posé dans
-- `caracteristiques`, DEPUIS l'ancienne catégorie — c'est une traduction de ce
-- que le dirigeant avait déclaré, pas une réponse inventée :
--
--   PORTE_AUTO          → PORTE_PORTAIL_MOTORISE, typePorte = "porte"
--   PORTAIL_AUTO        → PORTE_PORTAIL_MOTORISE, typePorte = "portail"
--   EPI                 → EPI,                    typeEpi   = "autre"
--   EPI_ANTICHUTE       → EPI,                    typeEpi   = "antichute"
--   EPI_RESPIRATOIRE    → EPI,                    typeEpi   = "respiratoire"
--   EPI_GILET_SAUVETAGE → EPI,                    typeEpi   = "gilet_sauvetage"
--   VMC                 → VENTILATION
--   CTA                 → VENTILATION,            estVmcGaz = false
--
-- `estVmcGaz = false` sur une ancienne CTA : les deux lignes de la VMC-gaz en
-- habitation (arrêté du 25 avril 1985) ne visaient que la catégorie VMC et
-- restent servies au silence (`non_infirmee`) ; sans cette clé, une centrale
-- de traitement d'air d'immeuble d'habitation les recevrait. Une réponse déjà
-- donnée n'est jamais écrasée.
--
-- Les prescriptions sur mesure (PrescriptionParticuliere) suivent la même
-- table, sans caractéristique : elles n'en portent pas. Une prescription
-- active qui visait TOUTE une catégorie jumelle (sans appareil désigné)
-- viserait après la reprise toute la catégorie réunie — celle d'un harnais
-- tomberait sur chaque paire de gants. La migration S'ARRÊTE dans ce cas,
-- avant toute écriture : un tel cas se règle à la main (désigner l'appareil),
-- pas par une reprise qui élargit en silence ce qu'un acte d'autorité ou un
-- assureur a prescrit.
--
-- La table de la reprise est `CATEGORIES_REPRISES_ADR_057`
-- (src/lib/referentiels/types-communs.ts).
--
-- UN SEUL DÉPLOIEMENT, et non deux comme le prévoyait le plan : l'enum est
-- recréé sans les sept anciennes valeurs à la fin de ce fichier.
-- CE QUE LA BASCULE COÛTE, dans les deux schémas : entre `migrate deploy` et
-- la promotion du nouveau déploiement (quelques secondes), le code encore en
-- service ne sait pas lire une rangée reprise — son client Prisma refuse
-- « VENTILATION » —, et les pages qui lisent ces appareils échouent. Le plan
-- en deux temps reprenait les rangées au premier déploiement : il avait la
-- même fenêtre. Seul un déploiement en trois temps, avec un code-pont qui lit
-- les deux jeux de valeurs sur une quarantaine de lectures, l'aurait évitée ;
-- écarté pour quelques secondes d'erreurs. À fusionner à une heure creuse.
-- Ce que le second déploiement aurait changé : une ÉCRITURE d'ancienne valeur
-- pendant la fenêtre, qui échoue ici au lieu de laisser une rangée que le
-- nouveau code ne sait pas lire.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "PrescriptionParticuliere"
    WHERE "actif" AND "equipementId" IS NULL
      AND "categorieEquipement" IN ('VMC', 'CTA', 'PORTE_AUTO', 'PORTAIL_AUTO',
        'EPI', 'EPI_ANTICHUTE', 'EPI_RESPIRATOIRE', 'EPI_GILET_SAUVETAGE')
  ) THEN
    RAISE EXCEPTION 'ADR-057 : une prescription sur mesure vise toute une catégorie réunie (VMC, CTA, porte, portail ou EPI) sans appareil désigné ; la désigner avant de reprendre les catégories.';
  END IF;
END $$;

-- Le JSON peut être NULL ou un `null` JSON : on repart d'un objet vide.
UPDATE "Equipement"
SET "categorie" = 'PORTE_PORTAIL_MOTORISE',
    "caracteristiques" =
      (CASE WHEN jsonb_typeof("caracteristiques") = 'object' THEN "caracteristiques" ELSE '{}'::jsonb END)
      || jsonb_build_object('typePorte', CASE "categorie" WHEN 'PORTE_AUTO' THEN 'porte' WHEN 'PORTAIL_AUTO' THEN 'portail' END)
WHERE "categorie" IN ('PORTE_AUTO', 'PORTAIL_AUTO');

UPDATE "Equipement"
SET "categorie" = 'EPI',
    "caracteristiques" =
      (CASE WHEN jsonb_typeof("caracteristiques") = 'object' THEN "caracteristiques" ELSE '{}'::jsonb END)
      || jsonb_build_object('typeEpi', CASE "categorie"
           WHEN 'EPI_ANTICHUTE' THEN 'antichute'
           WHEN 'EPI_RESPIRATOIRE' THEN 'respiratoire'
           WHEN 'EPI_GILET_SAUVETAGE' THEN 'gilet_sauvetage'
           WHEN 'EPI' THEN 'autre' END)
WHERE "categorie" IN ('EPI', 'EPI_ANTICHUTE', 'EPI_RESPIRATOIRE', 'EPI_GILET_SAUVETAGE');

UPDATE "Equipement"
SET "categorie" = 'VENTILATION',
    "caracteristiques" =
      (CASE WHEN jsonb_typeof("caracteristiques") = 'object' THEN "caracteristiques" ELSE '{}'::jsonb END)
      || '{"estVmcGaz": false}'::jsonb
WHERE "categorie" = 'CTA'
  -- COALESCE : un JSON NULL rend le test NULL, et la ligne serait sautée.
  AND NOT COALESCE(jsonb_typeof("caracteristiques") = 'object' AND "caracteristiques" ? 'estVmcGaz', false);

UPDATE "Equipement"
SET "categorie" = 'VENTILATION'
WHERE "categorie" IN ('VMC', 'CTA');

UPDATE "PrescriptionParticuliere"
SET "categorieEquipement" = CASE "categorieEquipement"
      WHEN 'VMC' THEN 'VENTILATION'::"CategorieEquipement"
      WHEN 'CTA' THEN 'VENTILATION'::"CategorieEquipement"
      WHEN 'PORTE_AUTO' THEN 'PORTE_PORTAIL_MOTORISE'::"CategorieEquipement"
      WHEN 'PORTAIL_AUTO' THEN 'PORTE_PORTAIL_MOTORISE'::"CategorieEquipement"
      ELSE 'EPI'::"CategorieEquipement" END
WHERE "categorieEquipement" IN
  ('VMC', 'CTA', 'PORTE_AUTO', 'PORTAIL_AUTO', 'EPI_ANTICHUTE', 'EPI_RESPIRATOIRE', 'EPI_GILET_SAUVETAGE');

-- L'enum, recréé sans les anciennes valeurs. Les deux colonnes sont les
-- seules à le porter ; aucune politique ni contrainte ne les nomme.
ALTER TYPE "CategorieEquipement" RENAME TO "CategorieEquipement_avant_adr057";
CREATE TYPE "CategorieEquipement" AS ENUM (
  'INSTALLATION_ELECTRIQUE', 'EXTINCTEUR', 'RIA', 'BAES', 'ALARME_INCENDIE',
  'DESENFUMAGE', 'VENTILATION', 'HOTTE_PRO', 'APPAREIL_CUISSON_ERP', 'ASCENSEUR',
  'PORTE_PORTAIL_MOTORISE', 'EQUIPEMENT_SOUS_PRESSION', 'STOCKAGE_MATIERE_DANGEREUSE',
  'EQUIPEMENT_LEVAGE', 'INSTALLATION_FRIGORIFIQUE', 'COMPACTEUR_PRESSE_DECHETS_MOTORISE',
  'EPI', 'INSTALLATION_GAZ', 'DEFIBRILLATEUR', 'EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC',
  'BUT_PANIER_SPORTIF', 'SCENE', 'AUTRE'
);
ALTER TABLE "Equipement"
  ALTER COLUMN "categorie" TYPE "CategorieEquipement"
  USING ("categorie"::text::"CategorieEquipement");
ALTER TABLE "PrescriptionParticuliere"
  ALTER COLUMN "categorieEquipement" TYPE "CategorieEquipement"
  USING ("categorieEquipement"::text::"CategorieEquipement");
DROP TYPE "CategorieEquipement_avant_adr057";
