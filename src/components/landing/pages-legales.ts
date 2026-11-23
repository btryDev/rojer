/**
 * Les pages d'information de la page publique, servies par
 * `app/legal/[page]` : mentions légales, confidentialité, cookies.
 *
 * Les conditions générales n'en sont pas : elles ont leur page, versionnée
 * (`/conditions`, ADR-053 § 8).
 *
 * [2026-11-19 : textes rédigés — ils disaient « en cours de rédaction ».
 * Faits relus dans le code et `docs/rgpd.md` le même jour. À faire relire
 * par l'avocat avec les conditions générales ; les points à compléter sont
 * dans `editeur.ts` et marqués « À VALIDER » ci-dessous.]
 */
import type { Section } from "@/lib/abonnements/conditions";
import { EDITEUR, HEBERGEUR } from "./editeur";

export type PageLegale = {
  slug: string;
  titre: string;
  /** La date de la dernière modification du texte, affichée en tête. */
  misAJour: string;
  sections: Section[];
};

const MENTIONS_LEGALES: PageLegale = {
  slug: "mentions-legales",
  titre: "Mentions légales",
  misAJour: "19 novembre 2026",
  sections: [
    {
      titre: "Éditeur",
      paragraphes: [
        `Rojer est un service édité par ${EDITEUR.denomination}, ${EDITEUR.forme} au capital de ${EDITEUR.capital}.`,
        `Siège social : ${EDITEUR.siege}.`,
        `${EDITEUR.rcs} — SIRET ${EDITEUR.siret} — TVA intracommunautaire ${EDITEUR.tva} — code APE ${EDITEUR.ape}.`,
        `Représentant légal : ${EDITEUR.gerant}, gérant.`,
        `Contact : ${EDITEUR.email} — téléphone : ${EDITEUR.telephone}.`,
      ],
    },
    {
      titre: "Directeur de la publication",
      paragraphes: [`${EDITEUR.gerant}, gérant de ${EDITEUR.denomination}.`],
    },
    {
      titre: "Hébergement",
      // À VALIDER : la zone d'hébergement de l'application Rojer chez Clever
      // Cloud (Paris ?), à confirmer avant d'écrire « en France ».
      paragraphes: [
        `Le site et l'application sont hébergés par ${HEBERGEUR.nom}, ${HEBERGEUR.adresse} — ${HEBERGEUR.site} — téléphone : ${HEBERGEUR.telephone}.`,
        "Les données sont hébergées dans l'Union européenne.",
      ],
    },
    {
      titre: "Propriété intellectuelle",
      paragraphes: [
        `Le site et l'application Rojer — textes, interfaces, logiciels, référentiel d'obligations, documents types, illustrations, logos et marque — sont la propriété de ${EDITEUR.denomination} ou de ses concédants. Toute reproduction, représentation, extraction ou adaptation, totale ou partielle, sans autorisation écrite préalable est interdite.`,
        "Les textes réglementaires cités restent des documents publics ; leur source officielle est indiquée à chaque obligation.",
      ],
    },
    {
      titre: "Informations publiées sur le site",
      paragraphes: [
        `Les informations du site sont fournies à titre d'information générale. Elles ne constituent ni un conseil juridique ni une attestation de conformité, et ne remplacent pas la lecture des textes officiels. ${EDITEUR.denomination} s'efforce de les tenir exactes et à jour, et peut les modifier à tout moment.`,
      ],
    },
    {
      titre: "Données personnelles et cookies",
      paragraphes: [
        "Le traitement des données personnelles est décrit dans la politique de confidentialité, et l'usage des cookies dans la page « Cookies ».",
      ],
    },
    {
      titre: "Droit applicable",
      paragraphes: ["Les présentes mentions sont régies par le droit français."],
    },
  ],
};

const CONFIDENTIALITE: PageLegale = {
  slug: "confidentialite",
  titre: "Politique de confidentialité",
  misAJour: "19 novembre 2026",
  sections: [
    {
      titre: "Qui traite vos données",
      paragraphes: [
        `${EDITEUR.denomination} (${EDITEUR.siege}), éditeur de Rojer, est responsable des traitements décrits ci-dessous : les comptes, l'abonnement et la facturation, les messages reçus par le formulaire de contact, et la sécurité du service.`,
        `Pour les données que nos clients enregistrent eux-mêmes dans Rojer — leurs salariés, prestataires et intervenants —, le client est responsable du traitement et ${EDITEUR.denomination} agit pour son compte, comme sous-traitant (article 28 du RGPD). Une personne concernée exerce alors ses droits auprès de l'entreprise qui l'a enregistrée ; ${EDITEUR.denomination} aide cette entreprise à y répondre.`,
      ],
    },
    {
      titre: "Les données, pourquoi, et sur quel fondement",
      paragraphes: [
        "Compte et utilisation du service : adresse e-mail, nom, mot de passe (conservé sous une forme hachée, irréversible), rôle dans le compte, journaux de connexion (date, adresse IP). Fondement : l'exécution du contrat.",
        "Abonnement et facturation : formule, dates, statut du paiement, factures ; la carte bancaire est saisie chez Stripe, Rojer n'en connaît ni le numéro ni le cryptogramme. Fondement : l'exécution du contrat et nos obligations comptables.",
        "Acceptation des conditions générales : version acceptée, date, compte. Fondement : la preuve du contrat (intérêt légitime).",
        "Formulaire de contact : sujet, nom, adresse e-mail, structure, message. Le message nous parvient par e-mail ; il n'est pas enregistré dans Rojer. Fondement : les mesures précontractuelles prises à votre demande, ou notre intérêt légitime à vous répondre.",
        "Demandes d'assistance faites depuis l'application : catégorie, question, téléphone (facultatif), page d'origine. Fondement : l'exécution du contrat.",
        "Sécurité : adresse IP réduite à une empreinte pour limiter les tentatives répétées, journaux techniques. Fondement : notre intérêt légitime à protéger le service.",
        "Les champs marqués d'un astérisque sont nécessaires pour créer un compte, souscrire ou nous écrire ; sans eux, nous ne pouvons pas rendre le service demandé. Les autres sont facultatifs.",
        "Nous ne faisons ni publicité ciblée, ni revente de données, ni profilage, et aucune décision n'est prise à votre égard de façon entièrement automatisée. Rojer n'utilise aucune intelligence artificielle pour traiter vos données.",
      ],
    },
    {
      titre: "Durées de conservation",
      // À VALIDER : la durée des messages de contact et des demandes
      // d'assistance (3 ans proposés dans `docs/rgpd.md`).
      paragraphes: [
        "Compte et données du dossier : tant que le compte est actif. Un compte sans abonnement depuis douze mois est supprimé avec toutes ses données, après deux e-mails d'avertissement (trente jours puis sept jours avant). Le propriétaire peut aussi demander la suppression du compte depuis l'application : elle intervient le septième jour.",
        "Inscription jamais activée : trente jours, puis effacée.",
        "Factures : dix ans, la durée que la loi impose aux pièces comptables.",
        "Trace d'un compte supprimé (nom du compte, adresses des propriétaires, acceptations des conditions, dates) : cinq ans, pour la preuve en cas de litige.",
        "Messages de contact et demandes d'assistance : le temps de traiter la demande, puis trois ans au plus.",
        "Journaux techniques de l'hébergeur (dont l'adresse IP) : trente jours. Sessions de connexion : sept jours au plus.",
      ],
    },
    {
      titre: "Qui y a accès",
      // [2026-11-19 : Mailpace d'après son accord de traitement et son
      // journal (données en France, envoi par des serveurs SMTP au
      // Royaume-Uni). À relire avec l'avocat : la décision d'adéquation du
      // Royaume-Uni en vigueur, et les garanties de transfert de Stripe.]
      paragraphes: [
        `Seules les personnes de ${EDITEUR.denomination} qui en ont besoin pour le service, et, pour une demande faite à l'expert de l'offre Pro, cet expert. Nos prestataires techniques, qui traitent les données pour notre compte : Clever Cloud (hébergement de l'application, de la base de données et des fichiers, Union européenne), Mailpace (envoi des e-mails du service ; données hébergées en France, envoi par des serveurs situés au Royaume-Uni, pays reconnu par la Commission européenne comme assurant une protection adéquate), Stripe (paiement et factures).`,
        "Transferts hors de l'Union européenne : Stripe peut transférer les données de paiement et de facturation vers les États-Unis, avec les garanties prévues par le RGPD (décision d'adéquation « Data Privacy Framework » ou clauses contractuelles types de la Commission européenne). Les données de votre dossier — établissements, salariés, rapports — ne sont pas transmises à Stripe.",
        "Au moment de choisir ou changer un mot de passe, nous vérifions qu'il ne figure pas parmi des mots de passe divulgués (service « Pwned Passwords ») : seuls les cinq premiers caractères d'une empreinte du mot de passe quittent Rojer, jamais le mot de passe ni votre adresse.",
        "Si vous reliez Rojer à un assistant d'intelligence artificielle, les informations que cet assistant lit quittent Rojer selon les conditions de son fournisseur, que vous avez choisi.",
      ],
    },
    {
      titre: "Vos droits",
      paragraphes: [
        `Vous pouvez accéder à vos données, les rectifier, les effacer, en limiter le traitement, vous opposer à un traitement fondé sur notre intérêt légitime, et demander leur portabilité. Écrivez-nous à ${EDITEUR.email} ou par le formulaire de contact ; nous répondons dans un délai d'un mois.`,
        "Vous pouvez aussi introduire une réclamation auprès de la Commission nationale de l'informatique et des libertés (CNIL), www.cnil.fr.",
      ],
    },
    {
      titre: "Sécurité",
      paragraphes: [
        "Les échanges sont chiffrés (HTTPS). Les comptes sont cloisonnés : chaque client n'accède qu'à ses propres données. La double authentification est proposée. Les fichiers déposés sont stockés dans un espace privé.",
      ],
    },
  ],
};

const COOKIES: PageLegale = {
  slug: "cookies",
  titre: "Cookies",
  misAJour: "19 novembre 2026",
  sections: [
    {
      titre: "Ce que Rojer dépose",
      paragraphes: [
        "Rojer ne dépose que des cookies nécessaires au fonctionnement du service : aucun cookie de mesure d'audience, de publicité ou de réseau social, et aucun outil de suivi tiers.",
        "Le cookie de session garde votre connexion ouverte ; il est supprimé à la déconnexion et expire sept jours après la connexion.",
        "Le cookie de l'établissement actif retient l'établissement sur lequel vous travaillez ; il dure un an.",
        "Le cookie de l'offre choisie retient la formule choisie sur la page des tarifs jusqu'à la création du compte ; il dure quarante-quatre jours au plus.",
        "L'application garde aussi dans votre navigateur (stockage local) quelques préférences d'affichage, comme la disposition du tableau de bord. Elles ne quittent pas votre appareil.",
      ],
    },
    {
      titre: "Consentement",
      paragraphes: [
        "Ces cookies étant strictement nécessaires au service que vous demandez, ils ne requièrent pas votre consentement (article 82 de la loi « Informatique et libertés »). Vous pouvez les bloquer dans les réglages de votre navigateur ; la connexion à Rojer ne fonctionnera plus.",
      ],
    },
  ],
};

export const PAGES_LEGALES: readonly PageLegale[] = [MENTIONS_LEGALES, CONFIDENTIALITE, COOKIES];

/** La colonne « Informations » du pied de page. */
export const LIENS_INFORMATIONS = [
  { href: "/legal/mentions-legales", label: "Mentions légales" },
  { href: "/conditions", label: "Conditions générales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/cookies", label: "Cookies" },
];
