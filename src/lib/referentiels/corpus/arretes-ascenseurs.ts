// Corpus : arrêtés du 18 novembre 2004 et du 7 août 2012 — entretien et contrôles techniques des ascenseurs.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const ARRETES_ASCENSEURS: Corpus = {
  id: "arretes-ascenseurs",
  intitule:
    "Arrêtés du 18 novembre 2004 et du 7 août 2012 — entretien et contrôles techniques des ascenseurs",
  // Adresse de l'arrêté du 18 novembre 2004. Ce corpus en couvre DEUX : celui
  // du 7 août 2012 porte son URL sur sa propre entrée, le champ `url` du corpus
  // ne pouvant en désigner qu'un.
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000254219",
  etendue: "articles_cites",
  portee:
    "ATTENTION : les deux arrêtés ont été modifiés par l'arrêté du 4 mars 2026, en vigueur les 1er avril et 15 mai 2026. L'annexe de l'arrêté de 2004, sur laquelle reposent deux obligations, a changé et n'a pas pu être relue de façon fiable.",
  articles: [
    {
      ref: "Arrêté 2004-11-18",
      intitule:
        "Entretien des installations d'ascenseurs — annexe : opérations minimales et fréquences",
      versionEnVigueur: "2026-04-01",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "ascenseur-entretien-contrat",
        "ascenseur-examen-annuel-securite",
        "ascenseur-examen-semestriel-secours",
        "ascenseur-visite-six-semaines",
      ],
      citationCle:
        "Annexe, trois colonnes : « INTERVALLE maximum de six semaines » / « FRÉQUENCE minimale semestrielle » / « FRÉQUENCE minimale annuelle ». « Nota. - Pour les lignes non cochées, la fréquence est laissée à l'appréciation des contractants. »",
      prescrit:
        "Dix-huit lignes cochées sur les trente-six du tableau. SEMESTRIEL (3) : frein ; câbles ou chaînes de suspension et leurs extrémités ; dispositif antidérive. ANNUEL (6) : cuvette, toit de cabine et local des machines (propreté, éclairage) ; poulie de traction ; limiteurs de vitesse et poulie de tension ; parachute et dispositifs antichute ; dispositifs hors course de sécurité ; pompe à main ou soupape de descente à commande manuelle. SIX SEMAINES (9) : cabine ; verrouillages et contacts de fermeture des baies palières ; dispositif anti-vandalisme des baies palières ; verrouillages et contacts de fermeture de la porte de cabine ; efficacité du dispositif de réouverture ; précision d'arrêt et de nivelage au palier ; moyens d'alerte et de communication avec le service d'intervention ; commandes et indicateurs aux paliers ; cuve hydraulique (niveau, fuites). Les trois colonnes sont désormais portées, la dernière depuis l'ajout de la valeur `six_semaines` (42 jours) à l'énumération et à l'enum Postgres le 2026-08-26. Le tableau a été relevé sur capture d'écran le 2026-08-26 : sa conversion en texte perd la position des croix et l'avait rendu illisible à quatre reprises.",
    },
    {
      ref: "Arrêté 2012-08-07",
      intitule:
        "Contrôles techniques à réaliser dans les installations d'ascenseurs",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000026286347",
      versionEnVigueur: "2026-05-15",
      // Le texte consolidé porte cette mention ; ses articles 1, 3, 4, 5 et son
      // annexe en relèvent, en vigueur au 15/05/2026.
      modifiePar: { texte: "Arrêté du 4 mars 2026 - art. 2" },
      luLe: "2026-09-27",
      lecture: "api_legifrance",
      statut: "retenu",
      obligations: ["ascenseur-controle-technique-quinquennal"],      prescrit:
        "NE PORTE AUCUNE PÉRIODICITÉ. Les cinq ans viennent de R. 134-11 ; cet arrêté ne fixe que les MODALITÉS du contrôle technique. Huit articles et une annexe. L'article 1er met à la charge du propriétaire la mise à disposition du contrôleur technique des informations et documents nécessaires ; l'article 2 l'oblige, quand le contrôleur l'a demandé, à mettre celui-ci en relation avec l'entreprise titulaire du contrat d'entretien pour être accompagné pendant le contrôle ; l'article 4 impose que le rapport soit remis au propriétaire dans les trente jours suivant la visite — délai à la charge du contrôleur, pas de l'exploitant. Versions successives : 1er octobre 2012, puis 15 mai 2026 (arrêté du 4 mars 2026, NOR VLOL2524719A) qui a réécrit les articles 1, 3, 4 et 5 ; les articles 2, 7 et 8 sont restés en version du 1er octobre 2012. Aucune version future programmée au-delà du 15 mai 2026.",
      historique:
        "C51 (2026-09-27), relu par l'API Légifrance (pnpm legifrance:verifier) : citationCle recopiée du texte de l'API — avant « nécessaire à la bonne exécution », après « nécessaires à la bonne exécution » ; accord du texte officiel.",
      citationCle:
        "(art. 1er) Le propriétaire de l'ascenseur met à la disposition du contrôleur technique les informations et documents suivants, en sa possession, nécessaires à la bonne exécution des contrôles : […] (art. 4) Ce rapport est remis au propriétaire dans un délai de trente jours suivant la visite de contrôle de l'ascenseur.",
    },
  ],
};
