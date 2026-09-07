-- ============================================================================
-- Le contenu minimal du plan de prévention — art. R. 4512-8 — 2026-09-07
--
-- CE QUE LE TEXTE IMPOSE, ET QUE LE PLAN ÉMIS NE PORTAIT PAS. L'article
-- R. 4512-8 du code du travail, en vigueur au 1er mai 2008 (décret n° 2008-244
-- du 7 mars 2008, LEGIARTI000018529781, relevé sur Légifrance le 2026-09-07),
-- écrit : « Les mesures prévues par le plan de prévention comportent AU MOINS
-- les dispositions suivantes : 1° La définition des phases d'activité
-- dangereuses et des moyens de prévention spécifiques correspondants ;
-- 2° L'adaptation des matériels, installations et dispositifs à la nature des
-- opérations à réaliser ainsi que la définition de leurs conditions
-- d'entretien ; 3° Les instructions à donner aux travailleurs ;
-- 4° L'organisation mise en place pour assurer les premiers secours en cas
-- d'urgence et la description du dispositif mis en place à cet effet par
-- l'entreprise utilisatrice ; 5° Les conditions de la participation des
-- travailleurs d'une entreprise aux travaux réalisés par une autre en vue
-- d'assurer la coordination nécessaire au maintien de la sécurité et,
-- notamment, de l'organisation du commandement. »
--
-- Le modèle n'en portait AUCUNE. Un balayage du 2026-09-02, confirmé à l'écran
-- le 2026-09-07 sur la fiche PP-001, ne rendait aucune occurrence de « premiers
-- secours », « instructions aux travailleurs », « organisation du
-- commandement » ni « conditions d'entretien » dans les surfaces du module.
--
-- CE QUI REND CE MANQUE PLUS GRAVE QU'UN AUTRE : Rojer ÉMET le document. Le
-- fichier `07_Plans_de_prevention.txt` du ZIP de contrôle — celui qu'on remet
-- à un inspecteur — porte en en-tête « Art. R. 4512-6 à R. 4512-12 du code du
-- travail », puis n'imprimait que l'entreprise, les chefs, la période, les
-- lieux, l'inspection et les lignes de risques. Le document citait l'article
-- dont il ne servait pas le contenu.
--
-- CINQ RUBRIQUES ET NON QUATRE, ET C'EST LA DÉCISION QUI COMMANDE CETTE
-- MIGRATION. On pouvait tenir les `LignePlanPrevention` existantes pour le 1°
-- et n'ouvrir que quatre champs. La lecture stricte a été retenue : ces lignes
-- transcrivent le SECOND ALINÉA DE R. 4512-6 — « les risques pouvant résulter
-- de l'INTERFÉRENCE entre les activités, installations et matériels » —, quand
-- le 1° de R. 4512-8 vise les « phases d'activité dangereuses » de l'opération
-- elle-même. Une couverture de toiture sans co-activité n'a aucun risque
-- d'interférence et garde ses phases dangereuses. Confondre les deux aurait
-- fait porter à une rubrique le contenu d'une autre.
--
-- POURQUOI LE 1° EST UNE TABLE ET NON UNE COLONNE. Le texte apparie : les
-- phases « ET les moyens de prévention spécifiques CORRESPONDANTS ». Un bloc
-- de prose aurait gardé les deux listes et perdu la correspondance, qui est
-- précisément ce que le texte demande d'écrire. Même forme que les lignes
-- risque ↔ mesures, pour la même raison.
--
-- NULLABLES ET SANS DÉFAUT, POUR LES QUATRE COLONNES. Le non-renseigné doit
-- rester distinguable du renseigné : un plan dont on ignore l'organisation des
-- secours n'est pas un plan sans organisation des secours. C'est cette
-- distinction qui permet aux surfaces — fiche et ZIP — de MONTRER au dirigeant
-- la rubrique qui manque à son propre document, au lieu de l'omettre en
-- silence. Aucune ligne existante n'est touchée, et aucun plan déjà signé ne
-- change de contenu : les plans antérieurs restent ce qu'ils étaient,
-- incomplets au regard de R. 4512-8, et le disent désormais.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS. Elle ne pose aucune garde de complétude :
-- rien n'empêche d'enregistrer ou de clore un plan dont les cinq rubriques sont
-- vides. C'est délibéré — le produit n'a aujourd'hui aucune porte de validation
-- sur les plans (toutes les écritures de statut de `plan-prevention/actions.ts`
-- écrivent sans lire l'état courant), et en installer une ici l'aurait fait
-- sans que la question des états morts soit tranchée. Le manque est rendu
-- VISIBLE, il n'est pas rendu bloquant.
-- ============================================================================

ALTER TABLE "PlanPrevention" ADD COLUMN IF NOT EXISTS "adaptationMateriels" TEXT;
ALTER TABLE "PlanPrevention" ADD COLUMN IF NOT EXISTS "instructionsTravailleurs" TEXT;
ALTER TABLE "PlanPrevention" ADD COLUMN IF NOT EXISTS "organisationSecours" TEXT;
ALTER TABLE "PlanPrevention" ADD COLUMN IF NOT EXISTS "participationCroisee" TEXT;

CREATE TABLE IF NOT EXISTS "PhaseDangereuse" (
    "id" TEXT NOT NULL,
    "planPreventionId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT NOT NULL,
    "moyensPrevention" TEXT,

    CONSTRAINT "PhaseDangereuse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PhaseDangereuse_planPreventionId_ordre_idx" ON "PhaseDangereuse"("planPreventionId", "ordre");

ALTER TABLE "PhaseDangereuse" ADD CONSTRAINT "PhaseDangereuse_planPreventionId_fkey" FOREIGN KEY ("planPreventionId") REFERENCES "PlanPrevention"("id") ON DELETE CASCADE ON UPDATE CASCADE;
