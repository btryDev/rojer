// Corpus : arrêté du 20 mai 2025 relatif aux obligations d'affichage dans tout
// établissement où est pratiquée une activité physique ou sportive en
// application de l'article R. 322-5 du code du sport (NOR SPOV2514735A).
//
// Sous-lot E de la mise à jour du référentiel, décision de la propriétaire du
// 2026-10-17. LECTURE : `api_legifrance`, le 2026-10-17, client PISTE en bac à
// sable (`/consult/jorf`, JORFTEXT000051685319), trois articles. L'ANNEXE (les
// deux modèles d'affiche) est publiée en image : l'API ne la restitue pas, elle
// n'est pas lue et rien n'en est décrit.

import type { Corpus } from "./types";

const JORF = "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051685319";
const LU = { luLe: "2026-10-17", lecture: "api_legifrance" } as const;

export const ARRETE_2025_05_20_SIGNAL_SPORTS: Corpus = {
  id: "arrete-2025-05-20-signal-sports",
  intitule:
    "Arrêté du 20 mai 2025 relatif aux obligations d'affichage dans tout établissement où est pratiquée une activité physique ou sportive en application de l'article R. 322-5 du code du sport",
  url: JORF,
  etendue: "articles_cites",
  portee:
    "Les trois articles de l'arrêté, lus le 2026-10-17 dans leur version publiée au Journal officiel. L'annexe — les deux modèles d'affiche — est une image que l'API Légifrance ne restitue pas : non lue.",
  articles: [
    {
      ref: "Arrêté 2025-05-20 art. 1",
      intitule: "Contenu de l'affiche : Signal-sports et dispositifs d'accompagnement",
      url: JORF,
      versionEnVigueur: "2025-06-05",
      ...LU,
      prescrit:
        "L'information de R. 322-5 est une affiche qui indique obligatoirement les coordonnées de la cellule nationale « Signal-sports » et de dispositifs d'accompagnement des victimes ou des témoins.",
      citationCle:
        "est une affiche indiquant obligatoirement les coordonnées de la cellule nationale de traitement des signalements de violences dans le sport, « Signal-sports », ainsi que de dispositifs d'accompagnement des victimes ou des témoins de violences physiques, psychiques ou psychologiques.",
      statut: "non_couvert",
      motif:
        "~~retenu (`sport-etablissement-affiche-signal-sports`)~~. Décision de la propriétaire du 2026-10-17 (seconde du jour, « on n'est pas un outil de gestion de salle de sport, on n'alourdit pas ») : lu, non encodé, annoncé en une phrase dans l'aide du type X (`AIDE_TYPE_ERP.X`, surface créée par le sous-lot D ; la phrase y entre au rebase de celui qui merge en second).",
      declareA:
        "Formulaire de l'établissement, aide du type d'ERP sous le choix du type (`src/lib/etablissements/aide-type-erp.ts`, `AIDE_TYPE_ERP.X`) : « les affichages propres aux établissements sportifs (diplômes et cartes des éducateurs, textes de sécurité, attestation d'assurance, affiche Signal-sports) »",
    },
    {
      ref: "Arrêté 2025-05-20 art. 2",
      intitule: "Support papier, modèles annexés, format A3",
      url: JORF,
      versionEnVigueur: "2025-06-05",
      ...LU,
      prescrit:
        "L'affichage se fait sur support papier, à partir de l'un des deux modèles annexés, au format A3 au moins.",
      citationCle: "L'affiche mesure au moins 297 × 420 mm (format A3).",
      statut: "non_couvert",
      motif:
        "~~retenu (`sport-etablissement-affiche-signal-sports`)~~. Décision de la propriétaire du 2026-10-17 (seconde du jour, « on n'est pas un outil de gestion de salle de sport, on n'alourdit pas ») : lu, non encodé, annoncé en une phrase dans l'aide du type X (`AIDE_TYPE_ERP.X`, surface créée par le sous-lot D ; la phrase y entre au rebase de celui qui merge en second).",
      declareA:
        "Formulaire de l'établissement, aide du type d'ERP sous le choix du type (`src/lib/etablissements/aide-type-erp.ts`, `AIDE_TYPE_ERP.X`) : « les affichages propres aux établissements sportifs (diplômes et cartes des éducateurs, textes de sécurité, attestation d'assurance, affiche Signal-sports) »",
    },
    {
      ref: "Arrêté 2025-05-20 art. 3",
      intitule: "Publication",
      url: JORF,
      versionEnVigueur: "2025-06-05",
      ...LU,
      prescrit: "Prévoit la publication au Journal officiel.",
      citationCle: "Le présent arrêté sera publié au Journal officiel de la République française.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
    },
  ],
};
