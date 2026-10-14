// Corpus : code de l'environnement, entretien annuel des chaudières de 4 à
// 400 kW (art. R. 224-41-4 et suivants).
//
// ENTRÉ LE 2026-10-14 (revue de `lot/materiels-non-couverts-1014`, point 4).
// L'aide de la catégorie « Installation de gaz » et la liste des matériels non
// couverts citent cet article au dirigeant ; la garde `citations-ecran` exige
// que tout article cité à l'écran soit au corpus. Il y entre NON COUVERT :
// l'entretien des chaudières est hors cadre par décision de la propriétaire du
// 2026-09-20 (texte sur la pollution atmosphérique et l'énergie), décision
// confirmée le 2026-10-14. Rien n'est encodé ; l'aide le dit.
//
// Relu par l'API Légifrance le 2026-10-14, en BAC À SABLE (LEGIFRANCE_ENV =
// sandbox) : seul l'article R. 224-41-4 a été ouvert, pas les suivants.

import type { Corpus } from "./types";

export const CODE_ENVIRONNEMENT_CHAUDIERES: Corpus = {
  id: "code-environnement-chaudieres",
  intitule:
    "Code de l'environnement — entretien annuel des chaudières de 4 à 400 kW (art. R. 224-41-4 et s.)",
  url: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006074220/",
  etendue: "articles_cites",
  portee:
    "Le seul article R. 224-41-4, qui pose le principe de l'entretien annuel. Les articles suivants (R. 224-41-5 et s. : qui fait l'entretien, l'attestation, sa conservation) n'ont pas été ouverts.",
  articles: [
    {
      ref: "C. env. R. 224-41-4",
      intitule: "Entretien annuel des chaudières de 4 à 400 kW",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020726538",
      luLe: "2026-10-14",
      lecture: "api_legifrance",
      citationCle:
        "Les chaudières alimentées par des combustibles gazeux, liquides ou solides dont la puissance nominale est supérieure ou égale à 4 kW et inférieure ou égale à 400 kW font l'objet d'un entretien annuel dans les conditions fixées par le présent paragraphe.",
      prescrit:
        "Un entretien ANNUEL de toute chaudière à combustible gazeux, liquide ou solide de 4 à 400 kW de puissance nominale. Le débiteur et les modalités sont aux articles suivants, non ouverts.",
      statut: "non_couvert",
      declareA:
        "Formulaire de déclaration d'un équipement, aide de la catégorie « Installation de gaz » (`src/lib/equipements/labels.ts`, `DESCRIPTION_CATEGORIE.INSTALLATION_GAZ`) : « ni l'entretien annuel de la chaudière (code de l'environnement, art. R. 224-41-4 et suivants) »",
      motif:
        "HORS CADRE par décision de la propriétaire du 2026-09-20 (« hors cadre » : un texte sur la pollution atmosphérique et l'énergie, non sur la sécurité des installations ou des personnes), confirmée le 2026-10-14. Le dépôt ne l'encode pas et le dit : l'aide de la catégorie « Installation de gaz » nomme l'article parmi ce que Rojer ne suit pas, et la liste des matériels non couverts le cite pour la chaudière.",
    },
  ],
};
