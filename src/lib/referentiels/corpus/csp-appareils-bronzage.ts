// Corpus : appareils de bronzage (cabines UV) — décret n° 2013-1261 du
// 27 décembre 2013 et arrêté du 20 octobre 2014 (traçabilité et contrôle).
//
// ENTRÉ LE 2026-10-17 (sous-lot B, `lot/ref-b-hors-cadre`). La liste des
// matériels que Rojer ne suit pas nomme la « cabine UV » et cite ces articles ;
// la garde exige que tout article cité soit au corpus. Ils y entrent NON
// COUVERTS : les appareils émettant des rayonnements ultraviolets sur la peau
// sont un risque spécialisé que Rojer ne porte pas. Rien n'est encodé ; la
// liste le dit.
//
// Relu par l'API Légifrance le 2026-10-17, en BAC À SABLE (LEGIFRANCE_ENV =
// sandbox) : seuls les quatre articles ci-dessous ont été ouverts, plus
// l'article 1er du décret (catégories UV1 à UV4), lu pour comprendre le champ et
// non classé.

import type { Corpus } from "./types";
import { ADRESSE_MATERIELS_NON_COUVERTS } from "./adresses";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/loda/article_lc/${id}`;

const MOTIF_UV =
  "Hors du périmètre de Rojer : un appareil de bronzage mis à disposition du public relève d'un régime sanitaire spécialisé (déclaration au préfet, contrôles par un organisme accrédité COFRAC), que Rojer ne porte pas. Rien n'est encodé : la liste des matériels que Rojer ne suit pas nomme la « cabine UV » et dit ce que Rojer ne suit pas, sans rien en conclure sur la situation de l'établissement.";

export const CSP_APPAREILS_BRONZAGE: Corpus = {
  id: "csp-appareils-bronzage",
  intitule:
    "Appareils de bronzage — décret n° 2013-1261 du 27 décembre 2013 et arrêté du 20 octobre 2014 (déclaration et contrôles)",
  url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000028413206/",
  etendue: "articles_cites",
  portee:
    "Du décret n° 2013-1261, les seuls articles 15 (déclaration) et 17 (contrôles initial et périodique) ; de l'arrêté du 20 octobre 2014 (LEGITEXT000029648087), les seuls articles 2 (déclaration) et 9 (contenu et fréquence des contrôles). L'article 1er du décret (catégories UV1 à UV4) a été lu sans être classé. N'ont pas été ouverts : le reste du décret (vente, formation des professionnels, information du public, art. 16 sur la destruction ou la cession), le reste de l'arrêté et ses annexes (dont l'annexe 5, qui décrit le contrôle).",
  articles: [
    {
      ref: "Décret 2013-1261 art. 15",
      intitule: "Déclaration de l'appareil de bronzage au préfet",
      url: ART("LEGIARTI000033702134"),
      versionEnVigueur: "2016-12-28",
      modifiePar: { texte: "Décret n° 2016-1848 du 23 décembre 2016, art. 5" },
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "L'exploitant d'un appareil de bronzage est tenu d'en faire la déclaration auprès du préfet du département du lieu d'utilisation de l'appareil.",
      prescrit:
        "L'exploitant déclare l'appareil au préfet du département du lieu d'utilisation ; la déclaration comprend la description technique et les attestations de compétence des professionnels qui le mettent à disposition du public.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: MOTIF_UV,
    },
    {
      ref: "Décret 2013-1261 art. 17",
      intitule: "Contrôle technique initial et contrôle périodique tous les deux ans",
      url: ART("LEGIARTI000028413227"),
      versionEnVigueur: "2014-07-01",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "II. ― Tout établissement où un appareil de bronzage est mis à disposition du public fait l'objet d'un contrôle périodique tous les deux ans par un organisme accrédité.",
      prescrit:
        "Un contrôle technique initial de tout appareil mis à disposition du public avant son utilisation, puis un contrôle périodique de l'établissement tous les deux ans par un organisme accrédité ; les deux sont « à la charge de l'exploitant de l'appareil de bronzage ».",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: MOTIF_UV,
    },
    {
      ref: "Arrêté 2014-10-20 art. 2",
      intitule: "Déclaration d'exploitation adressée au préfet",
      url: ART("LEGIARTI000029648147"),
      versionEnVigueur: "2014-10-30",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "La déclaration d'exploitation de tout appareil de bronzage, définie aux dispositions de l'article 15 du décret du 27 décembre 2013 et la déclaration de destruction ou de cession, définie aux dispositions de l'article 16 du même décret, sont adressées par l'exploitant au préfet de département du lieu d'utilisation de l'appareil de bronzage.",
      prescrit:
        "Les déclarations d'exploitation, de destruction ou de cession sont adressées par l'exploitant au préfet ; un récépissé lui est adressé si la déclaration est complète.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: MOTIF_UV,
    },
    {
      ref: "Arrêté 2014-10-20 art. 9",
      intitule: "Contenu des contrôles et fréquence de deux ans",
      url: ART("LEGIARTI000029648154"),
      versionEnVigueur: "2014-10-30",
      modifiePar: null,
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle:
        "aux contrôles techniques initiaux prévus aux dispositions du premier alinéa de l'article 17 du décret du 27 décembre 2013 susvisé et aux contrôles périodiques d'une fréquence de deux ans",
      prescrit:
        "Pour chaque appareil, l'organisme accrédité contrôle l'état général, la sécurité mécanique et électrique, la minuterie, les messages d'avertissement et mesure les rayonnements émis ; ce contenu vaut pour le contrôle initial et pour les contrôles périodiques de deux ans.",
      statut: "non_couvert",
      declareA: ADRESSE_MATERIELS_NON_COUVERTS,
      motif: MOTIF_UV,
    },
  ],
};
