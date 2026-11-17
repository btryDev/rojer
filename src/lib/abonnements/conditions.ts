// Les conditions générales d'utilisation et de vente (ADR-053 § 8). Une
// version = un texte figé : la preuve d'acceptation enregistre la version et
// l'empreinte du texte accepté (`conditions-empreinte.ts`, serveur seul). Ce
// module n'a que les données : un écran client peut l'importer. Changer le
// texte, c'est changer de version.
//
// TEXTE PROVISOIRE (décision de la propriétaire du 2026-11-03) : à faire
// relire par un juriste avant le lancement de l'offre (notes du chantier, § 6).

export type Section = { titre: string; paragraphes: string[] };

// [2026-11-17 : « 2026-11-provisoire-ttc » remplacée — l'essai est en
// Essentiel, l'export demande un abonnement payé, et un compte sans
// abonnement depuis douze mois est supprimé (ADR-058) ; l'ancien texte
// promettait l'inverse.]
export const VERSION_CONDITIONS = "2026-11-17-provisoire";

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
      "Rojer est un outil d'aide à l'organisation de la prévention des risques professionnels et de la sécurité des bâtiments. Il présente les obligations qui s'appliquent et aide à les tenir ; il ne délivre aucun avis juridique et n'atteste jamais la conformité d'un établissement.",
    ],
  },
  {
    titre: "Essai gratuit",
    paragraphes: [
      "L'essai dure 30 jours, sans carte bancaire, une fois par compte, dans la formule Essentiel.",
      "Rien n'est prélevé pendant l'essai. Pendant l'essai, les gestes qui produisent un document officiel ou engagent un tiers (valider une version du document unique, exporter le dossier ou le registre, publier le registre d'accessibilité, signer pour un tiers) demandent un abonnement payé.",
      "Sans abonnement au terme de l'essai, la saisie est fermée et le dossier reste consultable.",
    ],
  },
  {
    titre: "Abonnement et paiement",
    paragraphes: [
      "L'abonnement est mensuel ou annuel, payable d'avance. Les prix sont indiqués toutes taxes comprises (TVA de 20 % incluse). Le paiement et les factures sont gérés par Stripe.",
      "En cas d'impayé, le paiement est relancé et la saisie reste ouverte pendant les relances. Sans règlement à leur terme, l'abonnement prend fin.",
    ],
  },
  {
    titre: "Résiliation",
    paragraphes: [
      "L'abonnement se résilie en ligne à tout moment, depuis l'espace de gestion de l'abonnement accessible dans Rojer.",
      "Après la fin de l'abonnement, la saisie est fermée ; le dossier reste consultable et exportable.",
    ],
  },
  {
    titre: "Compte sans abonnement",
    paragraphes: [
      "Un compte sans abonnement depuis douze mois (après l'essai, une résiliation ou un impayé) est supprimé avec toutes ses données. Deux e-mails le préviennent, trente jours puis sept jours avant, avec la date.",
      "La conservation du document unique d'évaluation des risques pendant quarante ans incombe à l'employeur (article L. 4121-3-1 du Code du travail) : téléchargez vos versions validées avant cette date. Rojer ne les conserve pas au-delà.",
    ],
  },
  {
    titre: "Données",
    paragraphes: [
      "Les données sont hébergées dans l'Union européenne.",
    ],
  },
];
