/**
 * Obligations réglementaires — Équipements sous pression (P3).
 *
 * Sources primaires :
 *   - Code de l'environnement, articles L. 557-1 et s. (surveillance des
 *     équipements sous pression).
 *   - Décret n° 2015-799 du 1er juillet 2015 relatif aux produits et
 *     équipements à risques.
 *   - Arrêté du 20 novembre 2017 relatif au suivi en service des
 *     équipements sous pression et des récipients à pression simples.
 *
 * Scope MVP : équipements courants en TPE/PME (compresseurs, réservoirs
 * d'air comprimé). Les chaudières à haute pression, cisternes et autres
 * équipements complexes sortent du périmètre V2 (cf. CLAUDE.md).
 *
 * PÉRIMÈTRE RÉDUIT LE 2026-10-07 — relecture préventeur du 30/09 (« à exclure
 * sauf pour compresseur : requalification tous les 10 ans »), décision de la
 * propriétaire du 07/10. Seule `esp-requalification-decennale` reste. Sont
 * dans `OBLIGATIONS_RETIREES`, sans absorbant : `esp-declaration-mise-en-service`,
 * `esp-inspection-periodique`, `esp-inspection-periodique-generateur-vapeur`,
 * `esp-dossier-suivi`, `esp-intervention-reparation`, `esp-personnel-formation`.
 * La requalification n'est PAS bornée aux compresseurs (famille
 * `recipient_gaz_groupe2`) : un équipement dont la famille n'est pas saisie la
 * perdrait en silence. Décision ouverte.
 */

import type { ConditionApplication, Obligation } from "./types";

/**
 * Garde-fou de périmètre (amendement 2026-08).
 *
 * ~~Les cinq obligations~~ L'obligation (une seule depuis le 2026-10-07) issue de l'arrêté du 20 novembre 2017 ne vise que les
 * équipements effectivement soumis au suivi en service : l'arrêté fixe des
 * seuils de pression maximale admissible (PS) et de volume (produit PS × V) en
 * dessous desquels un récipient n'est pas concerné. Ces seuils ne sont **pas**
 * encodés ici : ils forment un tableau par catégorie de fluide et de récipient
 * qu'on ne recopie pas sans l'avoir relu article par article sur Légifrance
 * (CLAUDE.md — ne jamais inventer une référence ni un seuil).
 *
 * En attendant, la portée est portée par une réponse explicite du dirigeant.
 * Sans elle, un petit compresseur d'atelier héritait d'une requalification
 * décennale par organisme habilité. La forme `non_infirmee` garantit qu'aucun
 * équipement déjà déclaré ne perd ces obligations en silence : elles restent
 * affichées tant que la réponse « non » n'a pas été donnée.
 *
 * ~~`esp-personnel-formation` n'est volontairement pas conditionnée : elle
 * découle du Code du travail (R. 4323-1 à R. 4323-5), qui s'applique à tout
 * équipement de travail indépendamment des seuils de l'arrêté.~~ Retirée le
 * 2026-10-07 (voir l'en-tête).
 */
const CONDITION_SUIVI_EN_SERVICE: ConditionApplication[] = [
  {
    type: "equipement_propriete_non_infirmee",
    categorie: "EQUIPEMENT_SOUS_PRESSION",
    propriete: "estSoumisSuiviEnService",
  },
];

// ~~`GENERATEUR_VAPEUR` / `HORS_GENERATEUR_VAPEUR`~~ — le couple qui scindait
// l'inspection périodique de l'article 15 (2026-09-01) est retiré le 2026-10-07
// avec les deux inspections qu'il bornait (voir l'en-tête du domaine).

export const obligationsEquipementSousPression: Obligation[] = [
  {
    id: "esp-requalification-decennale",
    domaine: "equipement_sous_pression",
    libelle: "Requalification périodique (équipement sous pression)",
    description:
      "L'échéance MAXIMALE de la requalification périodique est de dix ans pour les récipients, tuyauteries et générateurs de vapeur, comptée depuis la mise en service ou la dernière requalification : c'est la date à ne pas dépasser, pas un rendez-vous à date fixe. L'arrêté raccourcit cette échéance à deux, trois ou six ans pour des équipements que l'on ne rencontre pas dans un restaurant, un commerce ou un bureau — bouteilles de plongée, récipients mobiles non métalliques, et récipients ou tuyauteries contenant un fluide toxique ou corrosif (art. 18). La requalification est faite par un organisme habilité et comprend, dans cet ordre, la vérification des documents du dossier d'exploitation, une inspection, une épreuve hydraulique et la vérification des accessoires de sécurité (art. 19).",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 18 et 19",
        article: "Arrêté 2017-11-20 art. 18-19",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "decennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EQUIPEMENT_SOUS_PRESSION"],
    conditions: CONDITION_SUIVI_EN_SERVICE,
    notesInternes:
      "PLAFOND, PAS RYTHME — ET `decennale` EST POURTANT LE BON BARREAU. Lot B, 2026-09-01 : article 18 rouvert sur Légifrance, les six tirets du I recopiés un par un. Le cadrage rangeait cette ligne parmi « quatre plafonds encodés comme des rythmes » ; la lecture confirme le défaut de LECTURE et infirme le défaut de VALEUR.\n\nCE QUE L'ÉCHELLE VISE, ET POURQUOI ELLE NE MORD PAS ICI. Deux ans : bouteilles pour appareils respiratoires de plongée subaquatique, récipients mobiles en matériaux autres que métalliques. Trois ans : récipients ou tuyauteries contenant fluor, fluorure de bore, fluorure d'hydrogène, trichlorure de bore, chlorure d'hydrogène, bromure d'hydrogène, dioxyde d'azote, phosgène ou sulfure d'hydrogène, lorsqu'ils ne peuvent être exempts d'impuretés corrosives. Six ans : récipients ou tuyauteries à fluide toxique au sens du CLP ou corrosif vis-à-vis des parois, récipients mobiles non métalliques ayant subi les essais de vieillissement, bouteilles de plongée à inspection au moins annuelle. Aucun de ces objets n'entre dans un restaurant, un commerce de détail ou un bureau. Le compresseur d'atelier est un récipient de gaz du GROUPE 2 (air) : il relève des « autres récipients », donc de dix ans. Et le générateur de vapeur est NOMMÉMENT à dix ans dans cet article — c'est à l'inspection périodique de l'article 15, et là seulement, qu'il relève de deux ans. Pour la cible du produit, le cas résiduel EST le cas.\n\nLE SENS DE L'ERREUR RÉSIDUELLE : aucun. `decennale` ne sur-applique ni ne sous-applique sur cette cible, puisqu'il n'existe pas d'autre barreau à lui opposer. Ce qui restait faux était la DESCRIPTION, qui annonçait « tous les dix ans » — un rythme — là où le texte écrit « l'échéance maximale ». Corrigé ci-dessus. La valeur, elle, est laissée telle quelle, et cette immobilité est un résultat, pas une omission.\n\nDEUX CHOSES QUE CETTE LIGNE NE PORTE PAS, nommées et délibérément non encodées.\n\n(1) LES EXTINCTEURS DE PLUS DE 30 BAR. « Pour les extincteurs soumis à une pression maximale admissible de plus de 30 bar, la requalification périodique est réalisée à l'occasion du premier rechargement effectué plus de six ans après la requalification précédente, sans que le délai entre deux requalifications périodiques ne puisse excéder dix ans. Les autres extincteurs ne sont pas soumis à requalification périodique. » Ce n'est pas une périodicité : c'est une échéance conditionnée à un ÉVÉNEMENT — le rechargement — sous un plafond de dix ans. Aucune erreur n'en résulte aujourd'hui : cette obligation est bornée à la catégorie `EQUIPEMENT_SOUS_PRESSION`, et `EXTINCTEUR` est une catégorie d'équipement distincte qu'elle n'atteint pas. Le manque est donc un silence, jamais une sur-application. À NE PAS CONFONDRE avec la révision décennale de `MS 38 § 4`, qui est une obligation ERP distincte, relevée par ailleurs : les encoder l'une pour l'autre créerait un doublon sur un fondement faux.\n\n(2) LE FAIT GÉNÉRATEUR DU II. « La requalification périodique d'un équipement sous pression fixe est renouvelée lorsque celui-ci fait l'objet à la fois d'une installation dans un autre établissement ET d'un changement d'exploitant. » Les deux conditions sont cumulatives. Le produit n'observe ni le déplacement d'un équipement entre établissements ni le changement d'exploitant : c'est le même trou que celui déjà nommé sur `esp-intervention-reparation` — une obligation événementielle sans fait observable. Un dirigeant qui rachète un compresseur avec le fonds et le réinstalle chez lui doit une requalification que le produit ne réclamera pas. Le déblocage n'est pas au référentiel : il suppose que le modèle sache qu'un équipement a changé de main.",
  },
];
