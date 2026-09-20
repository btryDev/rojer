// Corpus : arrêté du 23 février 2018 — installations de gaz des bâtiments d'habitation.
//
// Dépouillé en première main le 2026-08-26, après quatre tentatives de lecture
// automatique interrompues à l'article 11.2 — le texte a finalement été fourni
// intégralement. Les trois affirmations qui restaient suspendues sont tranchées :
// l'abrogation de l'arrêté du 25 avril 1985 est CONFIRMÉE (art. 32), la
// périodicité annuelle est CONFIRMÉE (art. 26 § 5°), et l'exigence d'un
// « contrat écrit » est INFIRMÉE — le § 5° impose un certificat, pas un contrat.
//
// La lecture a de plus révélé une seconde périodicité au même paragraphe, et
// une obligation décennale au § 3° que le référentiel ne porte pas.

import type { Corpus } from "./types";

export const ARRETE_2018_02_23_GAZ_HABITATION: Corpus = {
  id: "arrete-2018-02-23-gaz-habitation",
  intitule:
    "Arrêté du 23 février 2018 — installations de gaz combustible des bâtiments d'habitation",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036667631",
  etendue: "articles_cites",
  portee:
    "Titres Ier à VIII, articles 1 à 34. Seul le titre VIII (art. 20 à 34) porte des obligations récurrentes d'entretien et de contrôle ; les titres II à VII sont des prescriptions d'installation, hors du champ d'un calendrier d'échéances.",
  articles: [
    {
      ref: "Arrêté 23-02-2018 art. 26",
      intitule: "Entretien des installations",
      versionEnVigueur: "2023-01-01",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "aeration-habitation-vmc-gaz-annuelle",
        "aeration-habitation-vmc-gaz-quinquennale",
      ],
      citationCle:
        "« 5° Les installations collectives de ventilation mécanique contrôlée - gaz, auxquelles sont raccordés des appareils à gaz font l'objet d'opérations périodiques d'entretien et de vérification […] avec l'établissement d'un certificat remis au propriétaire ou au syndic et attestant de leur réalisation effective : Les opérations à une fréquence au moins égale à une fois par an portent sur : […] Les opérations à une fréquence au moins égale à une fois tous les cinq ans portent sur : […] »",
      prescrit:
        "DEUX périodicités minimales sur les VMC-gaz : annuelle (nettoyage des pales, pièces d'usure, caractéristiques de fonctionnement, détection de défaut) et quinquennale (réglage global du réseau aéraulique, vérification d'ensemble du dispositif de sécurité collective appareil par appareil). Exige un CERTIFICAT remis au propriétaire ou au syndic — et non un contrat écrit, qui relève du § 3° et porte sur un autre objet.",
    },
    {
      ref: "Arrêté 23-02-2018 art. 26 § 3",
      intitule:
        "Entretien décennal des installations collectives de gaz (OCG → compteurs)",
      versionEnVigueur: "2023-01-01",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: false,
      motif:
        "« Dans les bâtiments collectifs, les installations situées entre l'organe de coupure générale visé à l'article 9.1 et les compteurs individuels ou, à défaut de compteurs, les organes de coupure individuels (OCI) visés à l'article 9.2 inclus font l'objet d'actions d'entretien dont la périodicité n'excède pas 10 ans. » Le référentiel ne porte AUCUNE obligation sur ces installations collectives de gaz : il ne connaît que la VMC-gaz du § 5°. Le même paragraphe impose en outre un contrat d'entretien écrit passé avec le distributeur ou une entreprise compétente lorsque les installations ne sont pas sous la garde du distributeur — c'est ce contrat qui avait été porté à tort sur la VMC-gaz. Créer l'obligation suppose une catégorie d'équipement « installation collective de gaz » qui n'existe pas dans l'enum.",
    },
    {
      ref: "Arrêté 23-02-2018 art. 32",
      intitule: "Abrogations",
      versionEnVigueur: "2018-03-05",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "sans_objet",
      motif:
        "Article d'abrogation : ne prescrit rien par lui-même. Il est dépouillé parce qu'il FONDE une affirmation du référentiel — « A abrogé les dispositions suivantes : Arrêté du 25 avril 1985 relatif à la vérification et à l'entretien des installations collectives de ventilation mécanique contrôlée-gaz — Art. 1, Art. 2, Art. 3, Art. 4, Art. 5 ». L'arrêté de 1985 est bien abrogé, et ne peut plus fonder aucune obligation.",
    },
    {
      ref: "Arrêté 23-02-2018 art. 26 § 6 et § 7",
      intitule: "Fonte grise et durée d'exploitation des détendeurs",
      versionEnVigueur: "2023-01-01",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "non_couvert",
      motif:
        "Le § 6° impose de retirer et remplacer toute tuyauterie ou accessoire en fonte grise dans l'année suivant le signalement de sa découverte (trois mois pour le distributeur). Le § 7° plafonne la durée d'exploitation des détendeurs — 10, 20 ou 30 ans selon leur emplacement, avec des échéances calendaires échelonnées de 2024 à 2041. Aucune des deux ne se réduit à une périodicité : la première est un délai déclenché par un événement, la seconde une durée de vie maximale d'un composant. Le modèle ne porte ni l'un ni l'autre. Ces règles pèsent sur le distributeur et le propriétaire d'immeuble collectif, à la marge du périmètre.",
      declareA: "docs/veille-arbitrage-2026-08-26.md",
    },
  ],
};
