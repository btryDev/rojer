// Corpus : code de la santé publique — l'interdiction de fumer dans les lieux
// affectés à un usage collectif, et sa signalisation (L. 3512-8, R. 3512-2,
// R. 3512-3, R. 3512-7).
//
// ENTRÉ LE 2026-10-17 (sous-lot D du plan « mise à jour du référentiel ») :
// la propriétaire a validé une ligne d'établissement, « Signalisation de
// l'interdiction de fumer », fondée sur R. 3512-7 et R. 3512-2 1°
// (`signalisation-interdiction-fumer-csp`). « On n'alourdit pas » : une seule
// ligne, aucune question à l'accueil.
//
// Relu par l'API Légifrance le 2026-10-17, en BAC À SABLE (LEGIFRANCE_ENV =
// sandbox ; égalité avec la production non vérifiée). L'ARRÊTÉ du ministre
// chargé de la santé qui fixe le modèle de signalisation (R. 3512-7, 2e
// phrase) N'EST PAS LU : la recherche par titre en bac à sable ne l'a pas
// trouvé. Il n'est ni cité ni daté ici.

import type { Corpus } from "./types";

const ART = (id: string) => `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CSP_TABAC: Corpus = {
  id: "csp-tabac",
  intitule:
    "Code de la santé publique — interdiction de fumer dans les lieux affectés à un usage collectif, et sa signalisation (L. 3512-8, R. 3512-2, R. 3512-3, R. 3512-7)",
  url: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006072665/",
  etendue: "articles_cites",
  portee:
    "Les quatre articles cités, lus le 2026-10-17. Non ouverts : les autres articles de la section (R. 3512-4 à R. 3512-6, R. 3512-8 et suivants : normes des emplacements fumeurs, sanctions), et l'arrêté qui fixe le modèle de signalisation, introuvable par la recherche par titre en bac à sable.",
  articles: [
    {
      ref: "L. 3512-8",
      intitule: "Interdiction de fumer dans les lieux affectés à un usage collectif",
      url: ART("LEGIARTI000032548839"),
      versionEnVigueur: "2016-05-21",
      modifiePar: { texte: "Ordonnance n° 2016-623 du 19 mai 2016, art. 1" },
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Il est interdit de fumer dans les lieux affectés à un usage collectif, notamment scolaire, et dans les moyens de transport collectif, sauf dans les emplacements expressément réservés aux fumeurs.",
      statut: "sans_objet",
      motif:
        "Le principe, une interdiction faite à chacun : « Il est interdit de fumer dans les lieux affectés à un usage collectif ». Une règle d'usage, sans acte de l'exploitant à constituer (ligne de partage 3) ; l'acte que le texte demande à l'exploitant est la signalisation de R. 3512-7, portée par `signalisation-interdiction-fumer-csp`.",
    },
    {
      ref: "R. 3512-2",
      intitule: "Lieux où s'applique l'interdiction de fumer",
      url: ART("LEGIARTI000051820547"),
      versionEnVigueur: "2025-06-29",
      modifiePar: { texte: "Décret n° 2025-582 du 27 juin 2025, art. 1" },
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "L'interdiction de fumer dans les lieux affectés à un usage collectif mentionnée à l'article L. 3512-8 s'applique : 1° Dans tous les lieux fermés et couverts qui accueillent du public ou qui constituent des lieux de travail ;",
      statut: "retenu",
      obligations: ["signalisation-interdiction-fumer-csp"],
    },
    {
      ref: "R. 3512-3",
      intitule: "Emplacements mis à la disposition des fumeurs",
      url: ART("LEGIARTI000051820541"),
      versionEnVigueur: "2025-06-29",
      modifiePar: { texte: "Décret n° 2025-582 du 27 juin 2025, art. 1" },
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "L'interdiction de fumer ne s'applique pas dans les emplacements mis à la disposition des fumeurs au sein des lieux mentionnés à l'article R. 3512-2 et créés, le cas échéant, par la personne ou l'organisme responsable des lieux.",
      statut: "sans_objet",
      motif:
        "Une faculté de l'exploitant, pas une obligation : des emplacements fumeurs « créés, le cas échéant, par la personne ou l'organisme responsable des lieux ». Rojer n'en fait pas de ligne (décision de la propriétaire du 2026-10-17 : « on n'alourdit pas ») ; l'avertissement sanitaire à leur entrée, dont R. 3512-7 renvoie le modèle à un arrêté, est nommé dans les notes de `signalisation-interdiction-fumer-csp`.",
    },
    {
      ref: "R. 3512-7",
      intitule: "Signalisation de l'interdiction de fumer",
      url: ART("LEGIARTI000033045289"),
      versionEnVigueur: "2016-08-15",
      modifiePar: { texte: "Décret n° 2016-1117 du 11 août 2016, art. 1" },
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Dans les lieux mentionnés à l'article R. 3512-2, une signalisation apparente rappelle le principe de l'interdiction de fumer. Un modèle de signalisation accompagné d'un message sanitaire de prévention est déterminé par arrêté du ministre chargé de la santé.",
      statut: "retenu",
      obligations: ["signalisation-interdiction-fumer-csp"],
    },
  ],
};
