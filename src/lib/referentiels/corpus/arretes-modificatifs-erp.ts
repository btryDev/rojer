// Corpus : textes modificateurs du règlement de sécurité ERP.
//
// Un arrêté modificatif n'est pas un article du règlement : il le réécrit. Le
// ranger dans le corpus du Livre III faussait le compte de ses articles — 59
// au lieu de 58 — et un test l'a refusé. Il a donc son corpus.
//
// Ces textes sont cités par le référentiel pour dater une rédaction ; ils
// n'établissent aucune obligation en propre.

import type { Corpus } from "./types";

export const ARRETES_MODIFICATIFS_ERP: Corpus = {
  id: "arretes-modificatifs-erp",
  intitule: "Arrêtés modificatifs du règlement de sécurité ERP",
  url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053020948",
  etendue: "articles_cites",
  portee:
    "Textes qui réécrivent le règlement de sécurité. Cités pour dater une rédaction, jamais comme fondement d'une obligation.",
  articles: [
    {
      ref: "Arrêté 2025-12-01",
      intitule:
        "Arrêté du 1er décembre 2025 modifiant le règlement de sécurité ERP",
      url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053020948",
      versionEnVigueur: "2026-07-01",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        // Les deux fragments qui le citaient ont été retirés le 2026-08-27
        // (ADR-022) ; l'obligation qui porte PE 4 § 2 entier le cite à leur
        // place. C'est bien lui qui donne son rythme à l'article : sans cet
        // arrêté, PE 4 § 2 n'imposait aucune périodicité en exploitation.
        "incendie-erp-pe4-entretien-installations-techniques",
      ],
      prescrit:
        "Texte modificateur. Il réécrit PE 4 § 2 — « En cours d'exploitation » devient « Tous les trois ans au plus », et « installations de gaz » est ajouté à la liste — et PE 10. Entrée en vigueur différée au 1er juillet 2026, donc en vigueur à ce jour. [2026-11-06, relu sur Légifrance : son art. 12 réécrit aussi la première phrase de PE 27 § 6 — « A l'entrée de chaque établissement, un plan schématique doit être apposé pour faciliter l'intervention des sapeurs-pompiers » ; son art. 13 fait entrer l'arrêté en vigueur le 1er janvier 2026, PE 4 et PE 10 B au 1er juillet 2026, sans disposition propre aux établissements existants.]",
    },
  ],
};
