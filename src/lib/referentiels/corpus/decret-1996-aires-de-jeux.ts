// Corpus : décret n° 96-1136 du 18 décembre 1996 fixant les prescriptions de
// sécurité relatives aux aires collectives de jeux.
//
// ENTRÉ LE 2026-10-17 (sous-lot B, `lot/ref-b-hors-cadre`). L'aire de jeux est
// ANNONCÉE, pas encodée : la liste des matériels que Rojer ne suit pas la nomme
// et cite ces articles ; la garde exige que tout article cité soit au corpus.
// C'est un texte de sécurité des personnes, dans l'esprit du cadre, mais aucune
// obligation n'est créée dans ce lot.
//
// Relu par l'API Légifrance le 2026-10-17, en BAC À SABLE (LEGIFRANCE_ENV =
// sandbox). L'article 1er (champ : aires collectives de jeux, y compris dans
// l'enceinte d'établissements accueillant des enfants) a été lu sans être
// classé.

import type { Corpus } from "./types";
import { ADRESSE_MATERIELS_NON_COUVERTS } from "./adresses";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/loda/article_lc/${id}`;

const MOTIF_AIRE =
  "Texte de sécurité des personnes, annoncé et non encodé : aucune catégorie d'équipement ni aucune obligation de Rojer ne porte l'aire collective de jeux dans ce lot. La liste des matériels que Rojer ne suit pas nomme l'aire de jeux et cite l'article, pour que l'exploitant sache que ce suivi reste à sa charge hors de l'outil.";

export const DECRET_1996_AIRES_DE_JEUX: Corpus = {
  id: "decret-1996-aires-de-jeux",
  intitule:
    "Décret n° 96-1136 du 18 décembre 1996 — prescriptions de sécurité relatives aux aires collectives de jeux",
  url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000005622386/",
  etendue: "articles_cites",
  portee:
    "Les articles 3 (dossier tenu à la disposition des agents de contrôle), 4 (affichage de l'exploitant) et l'annexe (exigences de sécurité, dont le II.4 : entretien, maintenance, inspection, registre). L'article 1er (champ) a été lu sans être classé. N'ont pas été ouverts : l'article 2 et les articles suivants (sanctions, dispositions transitoires), ni le décret du 10 août 1994 que l'article 3, 7°, vise, ni les normes d'équipements.",
  articles: [
    {
      ref: "Décret 96-1136 art. 3",
      intitule: "Dossier tenu à la disposition des agents chargés du contrôle",
      url: ART("LEGIARTI000006574272"),
      versionEnVigueur: "1997-06-26",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "L'exploitant ou le gestionnaire de l'aire collective de jeux tient à la disposition des agents chargés du contrôle un dossier comprenant",
      prescrit:
        "L'exploitant ou le gestionnaire tient un dossier : plan de l'aire, plans d'entretien et de maintenance, preuves des interventions d'entretien et d'inspection régulière, fournisseurs, notices, dossier de base et documents de conformité des équipements.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: MOTIF_AIRE,
    },
    {
      ref: "Décret 96-1136 art. 4",
      intitule: "Affichage du nom et de l'adresse de l'exploitant",
      url: ART("LEGIARTI000006574281"),
      versionEnVigueur: "1997-06-26",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "doivent être affichés de façon visible, lisible et indélébile à chaque entrée de l'aire collective de jeux, ou à proximité de chaque équipement, ou sur chaque équipement.",
      prescrit:
        "Le nom ou la raison sociale et l'adresse de l'exploitant ou du gestionnaire sont affichés à chaque entrée de l'aire, à proximité de chaque équipement ou sur chacun.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: MOTIF_AIRE,
    },
    {
      ref: "Décret 96-1136 annexe",
      intitule: "Exigences de sécurité — dont entretien, maintenance, inspection et registre (II.4)",
      url: ART("LEGIARTI000006574320"),
      versionEnVigueur: "1997-06-26",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Les exploitants ou gestionnaires doivent organiser l'inspection régulière de l'aire de jeux et de ses équipements, pour en vérifier l'état et pour déterminer les actions de réparation et d'entretien qui doivent être entreprises. La nature et la fréquence des inspections doivent être fonction, notamment, des instructions du fabricant, du degré de fréquentation de l'aire de jeux et des conditions climatiques",
      prescrit:
        "II.4 : a) un plan d'entretien de l'aire et un plan de maintenance des équipements, élaborés et respectés, mentionnant les organismes chargés de les exécuter et la nature et la périodicité des contrôles ; b) une inspection régulière, de nature et de fréquence fonction des instructions du fabricant, de la fréquentation et du climat ; c) interdiction d'accès aux équipements qui ne répondent plus aux exigences ; d) les plans et un registre portant, par site, la date et le résultat des contrôles, tenus à la disposition des agents. Le texte ne chiffre aucun rythme : il le renvoie au plan de l'exploitant. Le reste de l'annexe (I, II.1 à II.3) porte sur l'affichage, le site, l'aménagement et les revêtements.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: MOTIF_AIRE,
    },
  ],
};
