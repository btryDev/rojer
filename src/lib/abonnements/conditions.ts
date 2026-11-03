// Les conditions générales d'utilisation et de vente (ADR-053 § 8). Une
// version = un texte figé : la preuve d'acceptation enregistre la version et
// l'empreinte du texte accepté (`conditions-empreinte.ts`, serveur seul). Ce
// module n'a que les données : un écran client peut l'importer. Changer le
// texte, c'est changer de version.
//
// TEXTE PROVISOIRE (décision de la propriétaire du 2026-11-03) : à faire
// relire par un juriste avant le lancement de l'offre (notes du chantier, § 6).

export type Section = { titre: string; paragraphes: string[] };

export const VERSION_CONDITIONS = "2026-11-provisoire";

export const CONDITIONS: Section[] = [
  {
    titre: "Version provisoire",
    paragraphes: [
      "Ce texte est provisoire. Il sera remplacé par des conditions relues par un juriste avant toute facturation.",
    ],
  },
  {
    titre: "Objet",
    paragraphes: [
      "Rojer est un outil d'aide à l'organisation de la prévention des risques professionnels et de la sécurité des bâtiments. Il rappelle des obligations et aide à les tenir ; il ne délivre aucun avis juridique et n'atteste jamais la conformité d'un établissement.",
    ],
  },
  {
    titre: "Essai gratuit",
    paragraphes: [
      "L'essai dure 30 jours, sans carte bancaire, une fois par compte, dans la formule choisie au démarrage.",
      "Rien n'est prélevé pendant l'essai. Sans abonnement à son terme, le dossier reste consultable et exportable ; la saisie est fermée jusqu'à la souscription.",
    ],
  },
  {
    titre: "Abonnement et paiement",
    paragraphes: [
      "L'abonnement est mensuel ou annuel, payable d'avance. Les prix sont indiqués hors taxes. Le paiement et les factures sont gérés par Stripe.",
      "En cas d'impayé, la saisie est fermée ; la consultation et l'export de vos données restent toujours ouverts.",
    ],
  },
  {
    titre: "Résiliation",
    paragraphes: [
      "L'abonnement se résilie en ligne à tout moment, depuis l'espace de gestion de l'abonnement accessible dans Rojer.",
    ],
  },
  {
    titre: "Données",
    paragraphes: [
      "Les données sont hébergées dans l'Union européenne.",
    ],
  },
];
