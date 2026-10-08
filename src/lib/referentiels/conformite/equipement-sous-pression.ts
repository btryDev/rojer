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
 * PÉRIMÈTRE RÉDUIT LE 2026-10-07 — relecture préventeur du 30/09 (le préventeur
 * demande d'exclure ces lignes, sauf la requalification décennale des
 * compresseurs), décision de la
 * propriétaire du 07/10. Seule `esp-requalification-decennale` reste. Sont
 * dans `OBLIGATIONS_RETIREES`, sans absorbant : `esp-declaration-mise-en-service`,
 * `esp-inspection-periodique`, `esp-inspection-periodique-generateur-vapeur`,
 * `esp-dossier-suivi`, `esp-intervention-reparation`, `esp-personnel-formation`.
 * ~~La requalification n'est PAS bornée aux compresseurs (famille
 * `recipient_gaz_groupe2`) : un équipement dont la famille n'est pas saisie la
 * perdrait en silence. Décision ouverte.~~
 *
 * [2026-10-08, C64 — DÉCISION PRISE : « on respecte les décisions de Julien ».
 * La requalification est BORNÉE AUX COMPRESSEURS, sans rien faire perdre au
 * silence : quatre conditions `equipement_propriete_enum_differente` sur
 * `familleEsp` écartent les familles déclarées autres que le compresseur
 * (`recipient_gaz_groupe1`, `recipient_vapeur`, `generateur_vapeur`,
 * `tuyauterie`). Restent servis : la famille `recipient_gaz_groupe2` (air
 * comprimé, azote — le compresseur d'air et son réservoir), la famille non
 * saisie, et « Autre / je ne sais pas » — une réponse qui ne dit pas que
 * l'appareil n'est pas un compresseur. Le modèle n'est pas étendu : la forme
 * `enum_differente` est satisfaite à l'absence, et leur conjonction exprime
 * « tout sauf ces quatre familles ».]
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
 * équipement déjà déclaré ne perd ~~ces obligations~~ cette obligation en
 * silence : ~~elles restent affichées~~ elle reste affichée tant que la réponse
 * « non » n'a pas été donnée. [2026-10-07, C60 : accord au singulier, une
 * seule obligation depuis le lot 5.]
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

/**
 * Les familles d'équipement sous pression DÉCLARÉES qui ne sont pas un
 * compresseur (2026-10-08, C64 ; le préventeur demande d'exclure les ESP,
 * sauf la requalification décennale des compresseurs). Une famille déclarée
 * parmi elles écarte la requalification ; `recipient_gaz_groupe2` (air
 * comprimé), `autre` (« je ne sais pas ») et le silence la gardent — le sens
 * de l'erreur est la sur-application visible, corrigeable par une réponse.
 *
 * Écrite en dur plutôt que dérivée de `FAMILLES_ESP` (`equipements/esp.ts`) :
 * le référentiel n'importe pas les modules d'équipement, et une famille neuve
 * ajoutée à l'énumération doit être classée par quelqu'un — la laisser servir
 * la ligne par défaut est le sens prudent. `esp-compresseurs.test.ts` tient la
 * partition contre l'énumération.
 */
export const FAMILLES_ESP_NON_COMPRESSEUR = [
  "recipient_gaz_groupe1",
  "recipient_vapeur",
  "generateur_vapeur",
  "tuyauterie",
] as const;

// Écrites une à une, et non par un `.map` sur la liste ci-dessus : ce fichier
// est une DONNÉE du référentiel, exclue du sceau du moteur
// (`version-moteur.test.ts`, `DONNEES_REFERENTIEL`), et n'y porte aucune
// fonction. `esp-compresseurs.test.ts` tient l'accord entre les deux.
const CONDITION_COMPRESSEUR: ConditionApplication[] = [
  {
    type: "equipement_propriete_enum_differente",
    categorie: "EQUIPEMENT_SOUS_PRESSION",
    propriete: "familleEsp",
    valeur: "recipient_gaz_groupe1",
  },
  {
    type: "equipement_propriete_enum_differente",
    categorie: "EQUIPEMENT_SOUS_PRESSION",
    propriete: "familleEsp",
    valeur: "recipient_vapeur",
  },
  {
    type: "equipement_propriete_enum_differente",
    categorie: "EQUIPEMENT_SOUS_PRESSION",
    propriete: "familleEsp",
    valeur: "generateur_vapeur",
  },
  {
    type: "equipement_propriete_enum_differente",
    categorie: "EQUIPEMENT_SOUS_PRESSION",
    propriete: "familleEsp",
    valeur: "tuyauterie",
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
    conditions: [...CONDITION_SUIVI_EN_SERVICE, ...CONDITION_COMPRESSEUR],
    notesInternes:
      "BORNÉE AUX COMPRESSEURS LE 2026-10-08 (C64). Préventeur, grille de relecture du 30/09 : il demande d'exclure les équipements sous pression, sauf la requalification décennale des compresseurs ; décision de la propriétaire du 08/10 : « on respecte les décisions de Julien ». Le compresseur est la famille `recipient_gaz_groupe2` (« Récipient de gaz non dangereux (groupe 2 : air comprimé, azote…) », `equipements/esp.ts`). Quatre conditions `enum_differente` écartent les autres familles DÉCLARÉES (`FAMILLES_ESP_NON_COMPRESSEUR`) ; la famille non saisie et « Autre / je ne sais pas » gardent la ligne — un compresseur dont la famille n'est pas saisie ne perd pas sa requalification sans que personne ne le voie. Effet sur un calendrier : une ligne existante d'un appareil déclaré générateur de vapeur, récipient de vapeur, récipient de gaz du groupe 1 ou tuyauterie cesse d'être générée (archivée si elle porte une trace, ADR-034).\n\nPLAFOND, PAS RYTHME — ET `decennale` EST POURTANT LE BON BARREAU. Lot B, 2026-09-01 : article 18 rouvert sur Légifrance, les six tirets du I recopiés un par un. Le cadrage rangeait cette ligne parmi « quatre plafonds encodés comme des rythmes » ; la lecture confirme le défaut de LECTURE et infirme le défaut de VALEUR.\n\nCE QUE L'ÉCHELLE VISE, ET POURQUOI ELLE NE MORD PAS ICI. Deux ans : bouteilles pour appareils respiratoires de plongée subaquatique, récipients mobiles en matériaux autres que métalliques. Trois ans : récipients ou tuyauteries contenant fluor, fluorure de bore, fluorure d'hydrogène, trichlorure de bore, chlorure d'hydrogène, bromure d'hydrogène, dioxyde d'azote, phosgène ou sulfure d'hydrogène, lorsqu'ils ne peuvent être exempts d'impuretés corrosives. Six ans : récipients ou tuyauteries à fluide toxique au sens du CLP ou corrosif vis-à-vis des parois, récipients mobiles non métalliques ayant subi les essais de vieillissement, bouteilles de plongée à inspection au moins annuelle. Aucun de ces objets n'entre dans un restaurant, un commerce de détail ou un bureau. Le compresseur d'atelier est un récipient de gaz du GROUPE 2 (air) : il relève des « autres récipients », donc de dix ans. Et le générateur de vapeur est NOMMÉMENT à dix ans dans cet article — c'est à l'inspection périodique de l'article 15, et là seulement, qu'il relève de deux ans [2026-10-07, C60 : l'inspection périodique de l'article 15 n'est plus portée — ses lignes sont retirées au lot 5 de la relecture du préventeur]. Pour la cible du produit, le cas résiduel EST le cas.\n\nLE SENS DE L'ERREUR RÉSIDUELLE : aucun. `decennale` ne sur-applique ni ne sous-applique sur cette cible, puisqu'il n'existe pas d'autre barreau à lui opposer. Ce qui restait faux était la DESCRIPTION, qui annonçait « tous les dix ans » — un rythme — là où le texte écrit « l'échéance maximale ». Corrigé ci-dessus. La valeur, elle, est laissée telle quelle, et cette immobilité est un résultat, pas une omission.\n\nDEUX CHOSES QUE CETTE LIGNE NE PORTE PAS, nommées et délibérément non encodées.\n\n(1) LES EXTINCTEURS DE PLUS DE 30 BAR. « Pour les extincteurs soumis à une pression maximale admissible de plus de 30 bar, la requalification périodique est réalisée à l'occasion du premier rechargement effectué plus de six ans après la requalification précédente, sans que le délai entre deux requalifications périodiques ne puisse excéder dix ans. Les autres extincteurs ne sont pas soumis à requalification périodique. » Ce n'est pas une périodicité : c'est une échéance conditionnée à un ÉVÉNEMENT — le rechargement — sous un plafond de dix ans. Aucune erreur n'en résulte aujourd'hui : cette obligation est bornée à la catégorie `EQUIPEMENT_SOUS_PRESSION`, et `EXTINCTEUR` est une catégorie d'équipement distincte qu'elle n'atteint pas. Le manque est donc un silence, jamais une sur-application. À NE PAS CONFONDRE avec la révision décennale de `MS 38 § 4`, qui est une obligation ERP distincte, relevée par ailleurs : les encoder l'une pour l'autre créerait un doublon sur un fondement faux.\n\n(2) LE FAIT GÉNÉRATEUR DU II. « La requalification périodique d'un équipement sous pression fixe est renouvelée lorsque celui-ci fait l'objet à la fois d'une installation dans un autre établissement ET d'un changement d'exploitant. » Les deux conditions sont cumulatives. Le produit n'observe ni le déplacement d'un équipement entre établissements ni le changement d'exploitant : c'est le même trou que celui ~~déjà nommé sur `esp-intervention-reparation`~~ [2026-10-07, C60 : ligne retirée au lot 5 ; le renvoi garde sa valeur d'exemple] — une obligation événementielle sans fait observable. Un dirigeant qui rachète un compresseur avec le fonds et le réinstalle chez lui doit une requalification que le produit ne réclamera pas. Le déblocage n'est pas au référentiel : il suppose que le modèle sache qu'un équipement a changé de main.",
  },
];
