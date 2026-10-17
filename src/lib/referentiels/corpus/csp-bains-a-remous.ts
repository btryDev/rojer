// Corpus : code de la santé publique — règles sanitaires des piscines
// (art. D. 1332-1 et D. 1332-2), lues pour le bain à remous (spa).
//
// ENTRÉ LE 2026-10-17 (sous-lot B, `lot/ref-b-hors-cadre`). La liste des
// matériels que Rojer ne suit pas nomme le bain à remous et cite ces articles ;
// la garde exige que tout article cité soit au corpus. Ils y entrent NON
// COUVERTS : les piscines sont hors du périmètre de Rojer (risque spécialisé).
// Rien n'est encodé.
//
// CE QUE LE TEXTE DIT, ET CE QU'IL NE DIT PAS. Dans sa rédaction issue du
// décret n° 2025-1285 (en vigueur au 2025-12-25), D. 1332-1 ne nomme PAS les
// bains à remous : il vise « les piscines publiques et privées à usage
// collectif mentionnées à l'article L. 1332-1 » et les piscines d'accès payant
// du code du sport, et définit la piscine par ses bassins (II). Un spa n'entre
// donc dans le champ que s'il répond à cette définition ET est d'usage public
// ou collectif ; la notion d'usage collectif est renvoyée à un arrêté du
// ministre chargé de la santé, NON OUVERT ici. Un spa privé d'usage non
// collectif n'est pas visé par le I. Rien n'a été supposé de l'arrêté.
//
// Relu par l'API Légifrance le 2026-10-17, en BAC À SABLE (LEGIFRANCE_ENV =
// sandbox). L. 1332-1 (déclaration en mairie) a été lu pour comprendre le
// renvoi du I, sans être classé.

import type { Corpus } from "./types";
import { ADRESSE_MATERIELS_NON_COUVERTS } from "./adresses";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CSP_BAINS_A_REMOUS: Corpus = {
  id: "csp-bains-a-remous",
  intitule:
    "Code de la santé publique — règles sanitaires des piscines à usage collectif (art. D. 1332-1 et D. 1332-2), lues pour le bain à remous",
  url: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006072665/",
  etendue: "articles_cites",
  portee:
    "Les seuls articles D. 1332-1 (champ et définition de la piscine) et D. 1332-2 (qualité de l'eau des bassins). L. 1332-1 a été lu pour le renvoi, sans être classé ; D. 1332-3 et D. 1332-4 ont été entrouverts, sans être classés. N'ont pas été ouverts : le reste de la section (traitement et alimentation de l'eau, surveillance, carnet sanitaire de la piscine), l'arrêté qui définit l'« usage collectif », les arrêtés des limites et références de qualité, et toute norme technique.",
  articles: [
    {
      ref: "CSP D. 1332-1",
      intitule: "Champ des règles sanitaires : piscines publiques et privées à usage collectif",
      url: ART("LEGIARTI000053190391"),
      versionEnVigueur: "2025-12-25",
      modifiePar: { texte: "Décret n° 2025-1285 du 19 décembre 2025, art. 1" },
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Les dispositions de la présente section s'appliquent aux piscines publiques et privées à usage collectif mentionnées à l'article L. 1332-1 et aux piscines d'accès payant mentionnées à l'article L. 322-7 du code du sport. Un arrêté du ministre chargé de la santé définit la notion d'usage collectif de ces installations.",
      prescrit:
        "Définit le champ de la section : piscines publiques et privées à usage collectif, et piscines d'accès payant ; une piscine est un ensemble comportant « un ou plusieurs bassins artificiels étanches dans lesquels des activités aquatiques sont régulièrement pratiquées » et dont l'eau est filtrée, désinfectée, renouvelée et recyclée. Les bains à remous n'y sont pas nommés ; un bassin privé d'usage non collectif n'est pas visé.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif:
        "Hors du périmètre de Rojer : les piscines relèvent d'un régime sanitaire spécialisé, que Rojer ne porte pas. Un bain à remous n'y entre que s'il est un bassin au sens du II et d'usage public ou collectif — notion que l'article renvoie à un arrêté non lu ici ; un spa privé d'usage non collectif n'est pas visé par le I. Rien n'est encodé : la liste des matériels que Rojer ne suit pas nomme le bain à remous et cite l'article, sans dire si l'établissement est dans le champ.",
    },
    {
      ref: "CSP D. 1332-2",
      intitule: "Qualité de l'eau des bassins",
      url: ART("LEGIARTI000043539390"),
      versionEnVigueur: "2022-01-01",
      modifiePar: { texte: "Décret n° 2021-656 du 26 mai 2021, art. 1" },
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "Les eaux de piscines relevant de la présente section doivent répondre aux conditions suivantes",
      prescrit:
        "L'eau des piscines du champ de D. 1332-1 ne doit présenter aucun danger microbiologique ou chimique, ne pas être irritante, et respecter des limites et références de qualité fixées par arrêté (non ouvert).",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif:
        "Même régime que D. 1332-1, dont il reprend le champ (« relevant de la présente section ») : hors du périmètre de Rojer, rien n'est encodé. L'article fixe un résultat sur l'eau et renvoie les seuils à un arrêté non lu ; aucune périodicité n'y est écrite.",
    },
  ],
};
