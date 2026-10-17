// Corpus : arrêté du 1er juillet 2004 fixant les règles techniques et de
// sécurité applicables au stockage de produits pétroliers dans les lieux non
// visés par la législation des installations classées ni la réglementation des
// établissements recevant du public.
//
// ENTRÉ LE 2026-10-17 (sous-lot B, `lot/ref-b-hors-cadre`). La liste des
// matériels que Rojer ne suit pas nomme la cuve de fioul et cite ces articles ;
// la garde exige que tout article cité soit au corpus. Rien n'est encodé.
//
// LE CHAMP, À LIRE AVANT TOUT LE RESTE. Le titre de l'arrêté ne parle pas de
// « bâtiments d'habitation » : il vise les « lieux non visés » par la
// réglementation des ICPE ni par celle des ERP, et l'article 2 le répète. Un
// RESTAURANT, UN COMMERCE OU UN HÔTEL — des ERP — SONT DONC HORS DE SON CHAMP.
// Un lieu de travail qui ne reçoit pas de public (un bureau non ERP, un
// entrepôt) et n'est pas une ICPE y reste, si le réservoir ne contient que
// gazole, fioul domestique, fiouls lourds ou combustible pour appareil mobile de
// chauffage, sert à une utilisation finale (pas à la vente) et ne dépasse pas
// 0,5 bar au-dessus du liquide. Pour un ERP, la cuve relève d'un autre texte
// (le règlement de sécurité ERP), non ouvert ici.
//
// Relu par l'API Légifrance le 2026-10-17, en BAC À SABLE (LEGIFRANCE_ENV =
// sandbox).

import type { Corpus } from "./types";
import { ADRESSE_MATERIELS_NON_COUVERTS } from "./adresses";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/loda/article_lc/${id}`;

const CHAMP =
  "L'arrêté ne s'applique qu'aux réservoirs implantés dans des lieux qui ne relèvent ni des ICPE ni des ERP (art. 2) : hors de son champ pour un restaurant, un commerce ou un hôtel ; dans son champ pour un lieu de travail sans public qui n'est pas une ICPE.";

export const ARRETE_2004_07_01_PRODUITS_PETROLIERS: Corpus = {
  id: "arrete-2004-07-01-produits-petroliers",
  intitule:
    "Arrêté du 1er juillet 2004 — stockage de produits pétroliers dans les lieux non visés par la législation des ICPE ni la réglementation des ERP",
  url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000020342690/",
  etendue: "articles_cites",
  portee:
    "Les articles 2 (champ), 27 (entretien par l'utilisateur), 28 (abandon d'un réservoir, l'événement auquel l'article 29 renvoie) et 29 (opérations avant remise en service). L'article 1er (objet) a été lu sans être classé. N'ont pas été ouverts : les règles de construction, d'implantation et d'approvisionnement (art. 3 à 26, dont l'art. 25, certificat de conformité, que l'art. 29 cite), l'article 31 (installations existantes) et les arrêtés de caractéristiques des produits que l'article 2 vise.",
  articles: [
    {
      ref: "Arrêté 2004-07-01 art. 2",
      intitule: "Champ : réservoirs hors ICPE et hors ERP",
      url: ART("LEGIARTI000020342706"),
      versionEnVigueur: "2004-07-26",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Sont visés par le présent arrêté les réservoirs implantés dans des lieux non visés par la réglementation des installations classés pour la protection de l'environnement (ICPE) ni par celle des établissements recevant du public (ERP)",
      prescrit:
        "Définit le champ : réservoirs implantés hors ICPE et hors ERP, ne contenant que gazole, fioul domestique, fiouls lourds ou combustible liquide pour appareil mobile de chauffage, stockés en vue d'une utilisation finale (pas de la vente), à une pression de gaz au-dessus du liquide d'au plus 0,5 bar. Applicable aux installations nouvelles ; aux existantes dans les conditions de l'article 31.",
      statut: "sans_objet",
      motif:
        "Article de champ, qui ne prescrit rien : « Sont visés par le présent arrêté les réservoirs implantés dans des lieux non visés par la réglementation des installations classés pour la protection de l'environnement (ICPE) ni par celle des établissements recevant du public (ERP) ». Il est ici parce qu'il décide, pour chaque dossier, si les articles 27 et 29 s'appliquent : jamais à un ERP, possiblement à un lieu de travail sans public.",
    },
    {
      ref: "Arrêté 2004-07-01 art. 27",
      intitule: "Entretien de l'installation par l'utilisateur",
      url: ART("LEGIARTI000020342732"),
      versionEnVigueur: "2004-07-26",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Il appartient à l'utilisateur de l'installation d'entretenir celle-ci de manière à éviter tout épandage de produit.",
      prescrit:
        "L'utilisateur entretient l'installation pour éviter tout épandage, maintient la cuvette de rétention étanche et à sa contenance initiale, fait réparer ou remplacer sans délai tout réservoir ou canalisation non étanche. Aucun rythme n'est écrit.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: `${CHAMP} Rojer ne suit pas la cuve de fioul : aucune catégorie d'équipement ne la désigne, et rien n'est encodé. La liste des matériels que Rojer ne suit pas la nomme et cite l'article.`,
    },
    {
      ref: "Arrêté 2004-07-01 art. 28",
      intitule: "Abandon définitif ou provisoire d'un réservoir",
      url: ART("LEGIARTI000020342730"),
      versionEnVigueur: "2004-07-26",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Tout abandon (définitif ou provisoire) d'un réservoir doit faire l'objet de dispositions conduisant à éviter tout risque de formation de vapeurs",
      prescrit:
        "Tout abandon d'un réservoir passe par vidange, dégazage et nettoyage, puis comblement ou retrait ; l'entreprise intervenante remet un certificat d'inertage à l'utilisateur.",
      statut: "sans_objet",
      motif:
        "Lu pour comprendre l'événement auquel l'article 29 renvoie (« la procédure citée à l'article 28 ») : c'est l'abandon du réservoir. Obligation ponctuelle liée à un fait que Rojer n'observe pas, dans le même champ restreint que l'article 2 ; elle n'est pas citée par la liste des matériels et n'a pas d'échéance à porter. « Tout abandon (définitif ou provisoire) d'un réservoir doit faire l'objet de dispositions conduisant à éviter tout risque de formation de vapeurs ».",
    },
    {
      ref: "Arrêté 2004-07-01 art. 29",
      intitule: "Contrôle d'étanchéité avant remise en service après abandon",
      url: ART("LEGIARTI000020342728"),
      versionEnVigueur: "2004-07-26",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Avant la remise en service d'un réservoir qui a fait l'objet de la procédure citée à l'article 28 ci-dessus, les opérations suivantes doivent être effectuées : - nettoyage des parois intérieures si nécessaire ; - contrôle d'étanchéité ;",
      prescrit:
        "Avant de remettre en service un réservoir abandonné (art. 28) : nettoyage des parois si nécessaire, contrôle d'étanchéité, vérification de conformité à l'arrêté et certificat de conformité à défaut de celui de l'article 25.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: `${CHAMP} Le contrôle d'étanchéité n'est dû qu'à la remise en service d'un réservoir abandonné (art. 28), un événement que Rojer n'observe pas ; aucune catégorie d'équipement ne désigne la cuve de fioul et rien n'est encodé. La liste des matériels que Rojer ne suit pas la nomme et cite l'article.`,
    },
  ],
};
