/**
 * Obligations réglementaires — Équipements de levage (P3).
 *
 * Sources primaires :
 *   - Code du travail, articles R. 4323-22 à R. 4323-28 (vérifications
 *     générales périodiques des équipements de travail).
 *   - Arrêté du 1er mars 2004 relatif aux vérifications des appareils et
 *     accessoires de levage (modalités de réalisation des vérifications
 *     et contenu du rapport).
 *   - Arrêté du 2 mars 2004 relatif au carnet de maintenance des appareils
 *     de levage (il ne fixe aucune périodicité : la VGP semestrielle du
 *     levage de personnes est à l'art. 23 de l'arrêté du 1er mars 2004).
 *
 * Audit des sources 2026-08-25 : R. 4323-22 = vérification initiale,
 * R. 4323-23/24 = VGP, R. 4323-25 à 27 = registre, R. 4323-28 = remise en
 * service.
 *
 * Scope MVP : équipements courants en TPE/PME — hayons élévateurs, gerbeurs,
 * chariots élévateurs, petits palans. Les grues mobiles, portiques et appareils
 * soumis à régime ICPE sortent du périmètre V2.
 *
 * Les MONTE-CHARGES en ont été retirés le 2026-08-26 : l'annexe de l'arrêté
 * exclut expressément « les ascenseurs et les monte-charges ainsi que les
 * élévateurs de personnes n'excédant pas une vitesse de 0,15 m/s, installés à
 * demeure ». Ils relevaient donc d'un texte que cet arrêté ne régit pas — les
 * ascenseurs ont leur propre domaine.
 *
 * Ce qui entre dans le champ ne se déduit ni de la motorisation ni du nom de
 * l'engin, mais du **changement de niveau significatif** de la charge
 * (arrêté du 1er mars 2004, art. 2 a) : « N'est pas considéré comme
 * significatif un changement de niveau correspondant à ce qui est juste
 * nécessaire pour déplacer la charge en la décollant du sol et n'est pas susceptible d'engendrer de risques en cas de défaillance du support de charge ». L'annexe du
 * même arrêté (version du 9 janvier 2011) exclut d'ailleurs nommément « les
 * transpalettes levant la charge juste de la hauteur nécessaire pour la
 * déplacer en la décollant du sol et n'est pas susceptible d'engendrer de risques en cas de défaillance du support de charge » — un transpalette, même électrique, reste
 * donc hors champ, tandis qu'un gerbeur manuel y entre. Cette même annexe
 * range « chariots automoteurs élévateurs à conducteur porté ou non,
 * gerbeurs » dans une seule famille : c'est par elle que le gerbeur rejoint
 * les « chariots élévateurs » du II de l'article 20.
 */

import type { Obligation } from "./types";

export const obligationsLevage: Obligation[] = [
  {
    id: "levage-examen-adequation-mise-en-service",
    domaine: "levage",
    libelle: "Examen d'adéquation à la mise en service (équipement de levage)",
    description:
      "Avant première mise en service, l'employeur procède à un examen d'adéquation : l'appareil est adapté aux travaux à réaliser et aux charges prévues, compte tenu de l'environnement et des conditions d'utilisation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er mars 2004, art. 14-I a) (vérification à la mise en service : examen d'adéquation)",
        article: "Arrêté 2004-03-01 art. 14",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680458",
        note: "« I. - Les appareils de levage neufs ou considérés comme neufs […] dont l'aptitude à l'emploi n'a pas été vérifiée dans les configurations d'utilisation prévues doivent, avant leur mise en service, faire l'objet : a) De l'examen d'adéquation prévu à l'article 5-I […] » C'est cet article qui EXIGE l'examen ; l'article 5 se borne à le définir.",
        versionConstatee: "2005-03-31",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er mars 2004, art. 5-I (définition de l'examen d'adéquation)",
        article: "Arrêté 2004-03-01 art. 5",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000439029",
        note: "Article de définition, cité pour le contenu de l'examen : « l'examen qui consiste à vérifier qu'il est approprié aux travaux que l'utilisateur prévoit d'effectuer ainsi qu'aux risques auxquels les travailleurs sont exposés ». Il n'impose l'examen à personne et ne porte aucune échéance.",
        versionConstatee: "2005-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-22",
        article: "R. 4323-22",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531483/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    notesInternes:
      "NATURE : PONCTUELLE (ADR-026). « Avant première mise en service » : un seul titre. La remise en service après réparation est portée par `levage-remise-en-service-apres-reparation`.\n\nFONDEMENT RECALÉ LE 2026-09-01 (lot A). Le fondement cité était « art. 5 […] et art. 12 à 15 » — or l'article 5 DÉFINIT l'examen d'adéquation, il ne l'impose pas, et « art. 12 à 15 » est un intervalle qui noie l'article porteur. Le seul article qui EXIGE l'examen avant mise en service est le 14-I a). C'est le même défaut « définir n'est pas prescrire » que celui corrigé le 2026-08-26 sur `levage-epreuve-initiale-fonctionnement`, où les articles 6, 10 et 11 avaient été mis pour l'article 14. L'article 5 reste cité, en contexte, parce que c'est lui qui dit ce que l'examen contient.",
  },
  {
    id: "levage-epreuve-initiale-fonctionnement",
    domaine: "levage",
    libelle: "Épreuve de fonctionnement à la première mise en service",
    description:
      "Un appareil de levage neuf ou d'occasion dont l'aptitude à l'emploi n'a pas été vérifiée dans sa configuration d'utilisation subit, avant mise en service, l'examen d'adéquation, l'examen de montage et d'installation s'il est installé à demeure, l'épreuve statique et l'épreuve dynamique. L'épreuve dynamique n'est pas exigée pour les appareils mus par la force humaine employée directement, SAUF s'ils sont conçus pour lever des personnes. L'appareil et ses supports doivent subir les deux épreuves sans défaillance.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er mars 2004, art. 14 (vérification à la mise en service), renvoyant aux art. 5, 10 et 11",
        article: "Arrêté 2004-03-01 art. 14",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000439029",
        note: "« d) De l'épreuve dynamique prévue par l'article 11. Cette épreuve n'est pas exigée pour les appareils de levage mus par la force humaine employée directement sauf s'ils sont conçus pour lever des personnes. » Verbatim relevé en première main le 2026-08-26.",
        versionConstatee: "2005-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-22",
        article: "R. 4323-22",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531483/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait R. 4323-25, qui traite de la consignation au registre.\n\nCORRIGÉ LE 2026-08-26 : la description INVERSAIT l'exception de l'article 14 d). Elle réservait l'épreuve aux appareils « non spécifiquement conçus pour le levage de personnes », alors que le texte dit l'inverse : l'épreuve dynamique n'est pas exigée pour les appareils mus par la force humaine employée directement, SAUF s'ils sont conçus pour lever des personnes. L'obligation excluait donc précisément les appareils pour lesquels le texte l'impose le plus nettement — ceux sous lesquels quelqu'un se tient.\n\nLa référence a aussi été recalée : elle citait les articles 6, 10 et 11, qui DÉFINISSENT les épreuves, sans citer l'article 14, qui seul les EXIGE à la mise en service. Définir n'est pas prescrire.\n\nReste non porté : l'article 13 dispense des épreuves les appareils neufs dont l'aptitude à l'emploi A été vérifiée dans leurs configurations d'utilisation. Le modèle ne sait pas conditionner une obligation à cette vérification amont, qui figure sur la déclaration du fabricant : l'obligation reste en sur-application pour ces appareils.\n\nNATURE : PONCTUELLE (ADR-026). « Avant mise en service », un seul titre.",
  },
  {
    id: "levage-vgp-annuelle-charges",
    domaine: "levage",
    libelle: "Vérification générale périodique annuelle (levage de charges)",
    description:
      "Les appareils servant au levage de charges font l'objet d'une vérification générale périodique (VGP) au moins annuelle par une personne qualifiée. Elle comporte l'examen de l'état de conservation prévu à l'article 9 — dispositifs de calage, amarrage et freinage, freins, dispositifs contrôlant la descente des charges, poulies de mouflage, limiteurs de charge et de moment de renversement, dispositifs limitant les mouvements, crochets et appareils de préhension, câbles et chaînes de charge — et les essais des b et c de l'article 6.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-23 (vérification générale périodique des équipements de travail)",
        article: "R. 4323-23",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479/",
        versionConstatee: "2008-05-01",
      },
      {
        // SCINDÉ LE 2026-09-04. Cette référence disait « R. 4323-23 et
        // R. 4323-24 » sous la clé `article: "R. 4323-23"` — donc elle nommait
        // deux articles et n'en rattachait qu'un. Le corpus l'avait relevé le
        // 2026-09-02 en inscrivant R. 4323-24 : « une référence lisible qui
        // nomme deux articles sous une seule clé est invisible à
        // `articlesCitesNonDepouilles()` : le second passe pour lu. » Il l'est
        // désormais pour de bon, et le lien retour du corpus tient.
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-24 (les vérifications sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement)",
        article: "R. 4323-24",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531477",
        note: "« Les vérifications générales périodiques sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement, dont la liste est tenue à la disposition de l'inspection du travail. » C'est cet article qui fonde `realisateurs: [\"personne_qualifiee\"]` — et non un organisme extérieur, qu'il n'exige pas. La LISTE qu'il vise dans la même phrase est portée à part, par `prevention-etablissement-liste-personnes-qualifiees`.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 1er mars 2004, art. 23 (périodicité de 12 mois)",
        article: "Arrêté 2004-03-01 art. 23",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680469",
        versionConstatee: "2005-03-31",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    conditions: [
      {
        type: "equipement_propriete_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estChariotOuGerbeur",
      },
      {
        // UN SEUL RYTHME PAR APPAREIL (D7, option (a), 2026-09-28). Les douze
        // mois ne valent que pour l'appareil dont on SAIT qu'il ne sert pas au
        // levage de personnes : au silence, c'est la semestrielle « personnes »
        // (`non_infirmee`) qui reste — la plus exigeante des deux lignes que le
        // silence faisait naître ensemble. `booleenne` et non `infirmee` :
        // `infirmee` est satisfaite au silence, et laissait les deux lignes.
        type: "equipement_propriete_booleenne",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "sertAuLevageDePersonnes",
        valeur: false,
      },
    ],
    notesInternes:
      "UN SEUL RYTHME PAR APPAREIL DEPUIS LE 2026-09-28 (D7, option (a)) : l'art. 23 (API, LEGIARTI000006680469, en vigueur depuis le 2005-03-31) pose douze mois « toutefois » six ou trois — un rythme, pas deux. Priorité : chariot ou gerbeur (`booleenne`) ; sinon levage de personnes non infirmé, trois mois si mû par la force humaine, six sinon ; sinon — levage de personnes répondu « non » — douze mois. `estMuParForceHumaine` N'EST PAS une condition de cette ligne, contrairement à la lettre de l'option (a) : un appareil manuel qui ne sert pas au levage de personnes ne relève pas du b) (« utilisés pour déplacer en élévation un poste de travail »), et la condition l'aurait laissé sans aucune VGP.\n\nLes douze mois sont le principe de l'article 23 de l'arrêté du 1er mars 2004, pas une règle universelle : le même article ramène la périodicité à six mois pour les appareils listés au II de son article 20, dont les chariots élévateurs. La condition `infirmee` écarte donc cette obligation au profit de `levage-vgp-semestrielle-chariot-gerbeur` dès que le dirigeant répond « oui » — et seulement alors. ~~Tant que la question n'a pas été posée, c'est la périodicité annuelle qui reste affichée : une périodicité trop longue est un écart visible et corrigeable, l'absence totale d'échéance sur une obligation de criticité 5 ne le serait pas.~~ [2026-09-28, D7 option (a) : au silence sur le levage de personnes, ce n'est plus l'annuelle qui reste mais la semestrielle « personnes », la plus exigeante des deux lignes que le silence faisait naître ensemble. L'argument tient toujours — aucun appareil n'est laissé sans échéance.]",
  },
  {
    id: "levage-vgp-semestrielle-chariot-gerbeur",
    domaine: "levage",
    libelle:
      "Vérification générale périodique semestrielle (chariot élévateur, gerbeur)",
    description:
      "Les chariots élévateurs et les gerbeurs font l'objet d'une vérification générale périodique tous les six mois, et non tous les douze. La vérification porte sur l'état de conservation de l'appareil et sur les essais de fonctionnement des dispositifs de sécurité (freins, limiteurs, organes de suspension).",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 1er mars 2004, art. 23 a)",
        article: "Arrêté 2004-03-01 art. 23",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680469",
        note: "« Toutefois, cette périodicité est de : a) Six mois pour les appareils de levage ci-après : - appareils de levage listés aux II et III de l'article 20 […] ».",
        versionConstatee: "2005-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-23",
        article: "R. 4323-23",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 1er mars 2004, art. 20-II",
        article: "Arrêté 2004-03-01 art. 20",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680466",
        note: "Liste où figurent les « chariots élévateurs » et les « hayons élévateurs ».",
        versionConstatee: "2005-03-31",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 1er mars 2004, annexe",
        article: "Arrêté 2004-03-01 annexe",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000023453892",
        note: "Version du 9 janvier 2011. Range « chariots automoteurs élévateurs à conducteur porté ou non, gerbeurs » dans une même famille — c'est par elle que le gerbeur rejoint les « chariots élévateurs » de l'article 20-II, le mot n'y figurant pas. La même annexe exclut les transpalettes à simple décollement de charge.",
        versionConstatee: "2011-01-09",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [
      {
        vers: "salarie_designe",
        titre: "conduite-salarie-formation",
        motif:
          "R. 4323-55 : « La conduite des équipements de travail mobiles automoteurs et des équipements de travail servant au levage est réservée aux travailleurs qui ont reçu une formation adéquate. » L'équipement est déclaré, la vérification est suivie — mais rien ne disait que la personne qui le conduit doit être formée. Selon la catégorie d'équipement, une autorisation de conduite délivrée par l'employeur peut s'y ajouter (R. 4323-56) ; le référentiel ne peut pas dire laquelle, la liste étant fixée par arrêté et non par le Code.",
      },
    ],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    conditions: [
      {
        type: "equipement_propriete_booleenne",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estChariotOuGerbeur",
        valeur: true,
      },
    ],
    notesInternes:
      "Obligation créée en 2026-08 : le référentiel ne connaissait que la VGP annuelle et une VGP semestrielle réservée au levage de personnes, si bien qu'un gerbeur ou un chariot élévateur — l'appareil de levage le plus courant en commerce et en réserve — héritait d'une périodicité annuelle contraire à l'article 23. Condition stricte (`booleenne`) assumée bien que la criticité soit de 5 : l'obligation est nouvelle, aucun équipement déjà en base ne peut la perdre, et la couverture par défaut reste assurée ~~par `levage-vgp-annuelle-charges`, qui s'applique tant que la question n'a pas reçu « oui »~~ [2026-09-28, D7 : par la semestrielle « personnes » tant que le levage de personnes n'a pas reçu « non », par l'annuelle ensuite]. Le critère de champ n'est ni la motorisation ni le nom de l'engin mais le changement de niveau significatif de la charge (art. 2 a) — voir l'en-tête du fichier.\n\nAmendement 2026-08-26 : R. 4323-23 était en refs[0] ici, alors que les trois autres obligations de VGP du fichier mettent l'arrêté du 1er mars 2004 en premier. Même rôle juridique, deux traitements — et le test anti-doublon compare sur refs[0], donc l'incohérence le rendait aveugle entre ces obligations. L'arrêté passe fondateur partout : R. 4323-23 renvoie la périodicité à un arrêté, c'est l'arrêté qui la fixe.",
  },
    {
    id: "levage-vgp-trimestrielle-force-humaine",
    domaine: "levage",
    libelle:
      "Vérification générale trimestrielle (appareil manuel élevant un poste de travail)",
    description:
      "Les appareils de levage mus par la force humaine employée directement, utilisés pour déplacer en élévation un poste de travail, font l'objet d'une vérification générale périodique tous les trois mois par une personne qualifiée. Elle comporte l'examen de l'état de conservation prévu à l'article 9 et les essais des b et c de l'article 6.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er mars 2004, art. 23 b) (périodicité de 3 mois)",
        article: "Arrêté 2004-03-01 art. 23",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680469",
        note: "« Toutefois, cette périodicité est de : […] b) Trois mois pour les appareils de levage, mus par la force humaine employée directement, utilisés pour déplacer en élévation un poste de travail. » Verbatim relevé le 2026-08-26.",
        versionConstatee: "2005-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-23",
        article: "R. 4323-23",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "trimestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    conditions: [
      {
        type: "equipement_propriete_booleenne",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estMuParForceHumaine",
        valeur: true,
      },
      {
        type: "equipement_propriete_non_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "sertAuLevageDePersonnes",
      },
      {
        // D7 (2026-09-28) : un chariot ou gerbeur garde SA ligne, la
        // semestrielle de l'art. 20-II — un seul rythme par appareil.
        type: "equipement_propriete_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estChariotOuGerbeur",
      },
    ],
    notesInternes:
      "Créée le 2026-08-26. Le référentiel ne connaissait aucune périodicité trimestrielle : l'article 23 distingue six mois pour les appareils mus par une énergie AUTRE que la force humaine (a) et trois mois pour ceux mus par la force humaine employée directement (b), et seule la première branche était encodée. Un treuil à manivelle ou un palan à chaîne servant à élever un poste de travail recevait donc six mois au lieu de trois.\n\nLa propriété `estMuParForceHumaine` a été créée pour cela — elle n'existait pas, ce qui m'avait fait présenter à tort le manque comme non corrigeable. Condition stricte (`booleenne`) bien que la criticité soit de 5 : l'obligation est nouvelle, aucun équipement déjà en base ne peut la perdre, et la couverture par défaut reste assurée par la semestrielle, qui s'applique tant que la question n'a pas reçu « oui ».",
  },
{
    id: "levage-vgp-semestrielle-personnes",
    domaine: "levage",
    libelle: "Vérification générale semestrielle (levage de personnes)",
    description:
      "Les appareils de levage mus par une énergie autre que la force humaine employée directement, utilisés pour le transport des personnes ou pour déplacer en élévation un poste de travail, font l'objet d'une VGP tous les six mois par une personne qualifiée. Les plates-formes élévatrices mobiles de personnes y sont visées directement par la liste de l'article 20-II. Lorsque l'appareil est mû par la force humaine employée directement et utilisé pour déplacer en élévation un poste de travail, l'article 23 b) ramène la périodicité à trois mois.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 1er mars 2004, art. 23 (périodicité de 6 mois pour les appareils servant au transport de personnes ou à l'élévation d'un poste de travail)",
        article: "Arrêté 2004-03-01 art. 23",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680469",
        versionConstatee: "2005-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-23",
        article: "R. 4323-23",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [
      {
        vers: "salarie_designe",
        titre: "conduite-salarie-formation",
        motif:
          "R. 4323-55 : « La conduite des équipements de travail mobiles automoteurs et des équipements de travail servant au levage est réservée aux travailleurs qui ont reçu une formation adéquate. » L'équipement est déclaré, la vérification est suivie — mais rien ne disait que la personne qui le conduit doit être formée. Selon la catégorie d'équipement, une autorisation de conduite délivrée par l'employeur peut s'y ajouter (R. 4323-56) ; le référentiel ne peut pas dire laquelle, la liste étant fixée par arrêté et non par le Code.",
      },
    ],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    conditions: [
      {
        type: "equipement_propriete_non_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "sertAuLevageDePersonnes",
      },
      {
        // Forme `infirmee` : satisfaite tant que le dirigeant n'a pas répondu
        // « oui ». Un appareil mû à la force humaine bascule alors sur la
        // trimestrielle de l'article 23 b), et seulement à ce moment-là. Le
        // silence ne fait perdre aucune échéance — il en laisse une plus
        // longue, visible et corrigeable.
        type: "equipement_propriete_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estMuParForceHumaine",
      },
      {
        // D7 (2026-09-28) : chariot ou gerbeur « oui » → sa propre
        // semestrielle ; les deux lignes à six mois ne coexistent plus.
        type: "equipement_propriete_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estChariotOuGerbeur",
      },
    ],
    notesInternes:
      "EQUIPEMENT_LEVAGE est une catégorie fourre-tout : sans condition, un simple transpalette héritait d'une VGP semestrielle « levage de personnes » juridiquement inapplicable. Forme `non_infirmee` (criticité 5). Corrigé à l'audit 2026-08 : l'ancienne version attribuait la périodicité de 6 mois à « l'arrêté du 2 mars 2004 », qui ne traite que du carnet de maintenance ; elle est à l'art. 23 de l'arrêté du 1er mars 2004.\n\nTRANSMISSION AJOUTÉE LE 2026-08-31, avec celle de la VGP chariot/gerbeur, et sur ces deux obligations SEULEMENT parmi les dix du domaine. R. 4323-55 vise « les équipements de travail servant au levage » sans distinguer, donc les dix pourraient la porter — mais dix signaux identiques sur un même parc seraient du bruit, et le bruit fait ignorer le signal. Ces deux-ci portent sur des machines qu'on CONDUIT, au sens ordinaire du mot : un chariot, un gerbeur, une plateforme élévatrice de personnes. Un dirigeant y reconnaît son cariste. Sur un palan ou un accessoire d'élingage, la même phrase l'aurait laissé perplexe.\n\nCE QUE CET ARBITRAGE LAISSE DEHORS, et qui doit être nommé plutôt qu'expliqué — c'est tout l'objet d'un mécanisme qui existe pour nommer les trous. Un équipement de levage pour lequel le dirigeant a répondu NON aux deux questions — `sertAuLevageDePersonnes` et `estChariotOuGerbeur` — ne tombe plus que sur `levage-vgp-annuelle-charges`, qui porte `transmet: []`. Un palan motorisé déclaré ainsi ne reçoit AUCUNE transmission, alors que R. 4323-55 vise « les équipements de travail servant au levage » sans distinguer : son conducteur doit une formation adéquate comme les autres. Le trou est assumé pour ne pas noyer le signal, il n'est pas ignoré ; le combler suppose de savoir quels équipements de levage se conduisent, ce que le parc ne dit pas.",
  },
  {
    id: "levage-vgp-accessoires-annuelle",
    domaine: "levage",
    libelle: "Vérification périodique des accessoires de levage (élingues, crochets, anneaux)",
    description:
      "Les accessoires de levage (élingues, chaînes, câbles, crochets, anneaux, manilles, palonniers) sont soumis tous les douze mois à une vérification portant sur leur bon état de conservation, et notamment sur toute détérioration — déformation, hernie, étranglement, toron cassé, nombre de fils cassés supérieur à celui admissible, linguet détérioré — ou toute autre limite d'emploi précisée par la notice du fabricant.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 1er mars 2004, art. 24 (vérification périodique des accessoires)",
        article: "Arrêté 2004-03-01 art. 24",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000439029",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-23",
        article: "R. 4323-23",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    conditions: [
      {
        type: "equipement_propriete_non_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "aAccessoiresDeLevage",
      },
    ],
    notesInternes:
      "Vérification des ACCESSOIRES (élingues, chaînes, câbles, crochets, anneaux, manilles, palonniers), pas de l'appareil lui-même : elle n'a pas d'objet pour un appareil utilisé sans accessoire, typiquement un transpalette. Forme `non_infirmee` (criticité 4) : l'obligation reste affichée tant que le dirigeant n'a pas répondu « non ».",
  },
  {
    id: "levage-examen-etat-conservation",
    domaine: "levage",
    libelle: "Examen de l'état de conservation (équipement de levage en service)",
    description:
      "Lors de chaque VGP, l'examen de l'état de conservation a pour objet de déceler toute détérioration susceptible d'être à l'origine de situations dangereuses, sur les éléments essentiels que l'article 9 énumère. Il comprend un examen visuel détaillé, complété en tant que de besoin d'essais de fonctionnement.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er mars 2004, art. 22-II (contenu de la vérification générale périodique)",
        article: "Arrêté 2004-03-01 art. 22",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680468",
        note: "« I. - Les appareils de levage visés au a de l'article 2 du présent arrêté, utilisés dans un établissement visé à l'article L. 4221-1 du code du travail, doivent […] faire l'objet d'une vérification générale effectuée selon la périodicité définie à l'article 23 ci-après. II. - Cette vérification comporte l'examen de l'état de conservation prévu à l'article 9 et les essais prévus aux b et c de l'article 6. » C'est cet article qui EXIGE l'examen de l'état de conservation.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er mars 2004, art. 23 (périodicité : tous les douze mois)",
        article: "Arrêté 2004-03-01 art. 23",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006680469",
        note: "« La vérification générale périodique des appareils de levage soumis à l'article 22 doit avoir lieu tous les douze mois. » C'est cet article qui CADENCE l'examen ; les dérogations à six et trois mois sont portées par `levage-vgp-semestrielle-chariot-gerbeur` et `levage-vgp-semestrielle-personnes`.",
        versionConstatee: "2005-03-31",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er mars 2004, art. 9 (définition de l'examen de l'état de conservation)",
        article: "Arrêté 2004-03-01 art. 9",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000439029",
        note: "Article de définition, cité pour le contenu de l'examen — les huit familles d'éléments essentiels et la méthode (« examen visuel détaillé, complété en tant que de besoin d'essais de fonctionnement »). Il n'impose l'examen à personne et ne porte aucune périodicité.",
        versionConstatee: "2005-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-23",
        article: "R. 4323-23",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait R. 4323-27, qui traite du support du registre de sécurité.\n\nFONDEMENT RECALÉ LE 2026-09-01 (lot A). Le fondement était l'article 9, qui DÉFINIT l'examen de l'état de conservation sans l'imposer ni le cadencer ; l'article 22 était mentionné en queue de la citation littérale, donc invisible à la clé `article` et hors du corpus. Les trois articles sont maintenant cités pour ce que chacun fait : le 22 exige, le 23 cadence, le 9 définit. L'article 22 est entré au corpus à cette occasion (verbatim lu sur Légifrance le 2026-09-01, version du 1er mai 2008).",
  },
  {
    id: "levage-remise-en-service-apres-reparation",
    domaine: "levage",
    libelle: "Examen approfondi à la remise en service (après réparation notable)",
    description:
      "La vérification lors de la remise en service comprend l'examen d'adéquation, le cas échéant l'examen de montage et d'installation, l'examen de l'état de conservation, l'épreuve statique et l'épreuve dynamique. Elle est due après démontage et remontage ou modification (R. 4323-28), et l'article 20-I y ajoute le changement de site d'utilisation, le changement de configuration ou des conditions d'utilisation sur un même site, et la suite de tout accident provoqué par la défaillance d'un organe essentiel.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-28",
        article: "R. 4323-28",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531467/",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 1er mars 2004, art. 18 à 21 (remise en service)",
        article: "Arrêté 2004-03-01 art. 19",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000439029",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "evenementielle",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    notesInternes:
      "Événementiel — une occurrence par remise en service. Traité comme mise_en_service_uniquement par le générateur MVP.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). Comme pour l'ESP, la valeur `mise_en_service_uniquement` est un tenant-lieu : R. 4323-28 et l'article 20-I visent le démontage et remontage, la modification, le changement de site ou de configuration, et la suite d'un accident. Cinq faits, aucun observé par le produit.",
  },
  {
    id: "levage-registre-securite-consignation",
    domaine: "levage",
    libelle: "Tenue du registre de sécurité (vérifications levage)",
    description:
      "Le résultat des vérifications générales périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5. Lorsque la vérification est faite par un tiers, son rapport est annexé au registre ; à défaut, la date de la vérification, celle de la remise du rapport et son lieu d'archivage y sont portées.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-25",
        article: "R. 4323-25",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531475",
        note: "Fonde la consignation : « Le résultat des vérifications générales périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5. »",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-26",
        article: "R. 4323-26",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531473",
        note: "Annexion au registre des rapports établis par un vérificateur extérieur à l'établissement.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-27",
        article: "R. 4323-27",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531471",
        note: "Autorise la tenue et la conservation du registre sur tout support, dans les conditions de l'article L. 8113-6 — c'est cet article qui fonde le registre numérique, et non L. 4711-5.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "registre de sécurité",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_LEVAGE"],
    notesInternes: "NATURE : ÉTAT PERMANENT, `pieceAttendue: \"registre de sécurité\"` (ADR-026). Même configuration que R. 4226-19 côté électricité : R. 4323-25 impose la consignation, pas la vérification — celle-ci a ses propres lignes récurrentes.",
  },
];
