/**
 * Équipements sous pression — aide au verdict d'assujettissement au suivi en
 * service (arrêté du 20 novembre 2017, art. 1 I, par renvoi au I de
 * l'article R. 557-14-1 du Code de l'environnement).
 *
 * Sources relues sur Légifrance le 2026-08-25 :
 *   - R. 557-14-1 C. env. (version en vigueur depuis le 31/12/2016)
 *     https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033741441
 *   - Arrêté du 20 novembre 2017 (NOR TREP1723392A)
 *     https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632
 *
 * Ce module ne DÉCIDE pas : il calcule un verdict indicatif à partir de la
 * famille, de PS (pression maximale admissible, bar) et de V (volume,
 * litres) lus sur la plaque constructeur, que l'interface propose au
 * dirigeant pour pré-remplir la question à trois états
 * `estSoumisSuiviEnService`. ~~Les cinq obligations ESP restent bornées~~
 * [2026-10-07, C60 : une seule depuis le lot 5 de la relecture du préventeur,
 * `esp-requalification-decennale` ; les six autres `esp-*` sont dans
 * `OBLIGATIONS_RETIREES`.] L'obligation ESP reste bornée par
 * cette réponse explicite (forme opt-out, criticité élevée) : aucune
 * échéance ne s'éteint sur la seule foi d'un chiffre saisi.
 *
 * Familles encodées — uniquement celles dont le seuil a été lu mot pour mot :
 *   1° récipient de gaz du groupe 1 : PS × V > 50 bar·L, sauf (V ≤ 1 L et
 *      PS ≤ 200 bar) ;
 *   2° récipient de gaz du groupe 2 (dont air comprimé) : PS × V > 200 bar·L,
 *      sauf (V ≤ 1 L et PS ≤ 1 000 bar), et sauf PS ≤ 4 bar (2,5 bar pour
 *      les appareils à couvercle amovible à fermeture rapide) ;
 *   3° récipient de vapeur d'eau ou d'eau surchauffée : PS × V > 200 bar·L,
 *      sauf V ≤ 1 L ;
 *   4° générateur de vapeur : V > 25 L.
 * Les tuyauteries (5°, 6° : seuils en DN) ne sont pas encodées.
 *
 * Le groupe de fluide (R. 557-9-3 : classes de danger du règlement CLP) est
 * une qualification que le dirigeant fait à partir de la FDS ; l'air, l'azote
 * et l'eau sont du groupe 2.
 */

export const FAMILLES_ESP = [
  "recipient_gaz_groupe1",
  "recipient_gaz_groupe2",
  "recipient_vapeur",
  "generateur_vapeur",
  "tuyauterie",
  "autre",
] as const;
export type FamilleEsp = (typeof FAMILLES_ESP)[number];

export const LABEL_FAMILLE_ESP: Record<FamilleEsp, string> = {
  recipient_gaz_groupe1:
    "Récipient de gaz dangereux (groupe 1 : inflammable, toxique, comburant…)",
  recipient_gaz_groupe2:
    "Récipient de gaz non dangereux (groupe 2 : air comprimé, azote…)",
  recipient_vapeur: "Récipient de vapeur d'eau ou d'eau surchauffée",
  generateur_vapeur: "Générateur de vapeur (chaudière vapeur)",
  tuyauterie: "Tuyauterie",
  autre: "Autre / je ne sais pas",
};

export type VerdictEsp =
  | { verdict: "soumis"; motif: string }
  | { verdict: "non_soumis"; motif: string }
  | { verdict: "indetermine"; motif: string };

const SRC = "C. env., art. R. 557-14-1, I";

/**
 * Verdict indicatif d'assujettissement au suivi en service.
 * `couvercleAmovible` : appareil à couvercle amovible à fermeture rapide
 * (seuil PS abaissé à 2,5 bar pour le groupe 2).
 */
export function verdictSuiviEnService(input: {
  famille: FamilleEsp | undefined;
  pressionMaxAdmissibleBar: number | undefined;
  volumeLitres: number | undefined;
  couvercleAmovible?: boolean;
}): VerdictEsp {
  const { famille, pressionMaxAdmissibleBar: ps, volumeLitres: v } = input;
  if (!famille || famille === "autre") {
    return {
      verdict: "indetermine",
      motif: "Famille d'équipement non renseignée : le seuil dépend de la nature du fluide et de l'équipement.",
    };
  }
  if (famille === "tuyauterie") {
    return {
      verdict: "indetermine",
      motif: `Les seuils des tuyauteries s'expriment en DN et PS × DN (${SRC}, 5° et 6°), non encodés.`,
    };
  }
  if (famille === "generateur_vapeur") {
    if (v === undefined) {
      return { verdict: "indetermine", motif: "Volume non renseigné." };
    }
    return v > 25
      ? { verdict: "soumis", motif: `Générateur de vapeur de ${v} L > 25 L (${SRC}, 4°).` }
      : { verdict: "non_soumis", motif: `Générateur de vapeur de ${v} L ≤ 25 L (${SRC}, 4°).` };
  }
  if (ps === undefined || v === undefined) {
    return {
      verdict: "indetermine",
      motif: "Pression maximale admissible (PS) et volume (V) sont nécessaires : ils figurent sur la plaque constructeur.",
    };
  }
  const psv = ps * v;
  if (famille === "recipient_gaz_groupe1") {
    if (v <= 1 && ps <= 200) {
      return { verdict: "non_soumis", motif: `Récipient de gaz du groupe 1 de V ≤ 1 L et PS ≤ 200 bar : exclu (${SRC}, 1°).` };
    }
    return psv > 50
      ? { verdict: "soumis", motif: `Récipient de gaz du groupe 1 : PS × V = ${psv} bar·L > 50 (${SRC}, 1°).` }
      : { verdict: "non_soumis", motif: `Récipient de gaz du groupe 1 : PS × V = ${psv} bar·L ≤ 50 (${SRC}, 1°).` };
  }
  if (famille === "recipient_gaz_groupe2") {
    const seuilPs = input.couvercleAmovible ? 2.5 : 4;
    if (ps <= seuilPs) {
      return { verdict: "non_soumis", motif: `Récipient de gaz du groupe 2 de PS ≤ ${seuilPs} bar : exclu (${SRC}, 2°).` };
    }
    if (v <= 1 && ps <= 1000) {
      return { verdict: "non_soumis", motif: `Récipient de gaz du groupe 2 de V ≤ 1 L et PS ≤ 1 000 bar : exclu (${SRC}, 2°).` };
    }
    return psv > 200
      ? { verdict: "soumis", motif: `Récipient de gaz du groupe 2 : PS × V = ${psv} bar·L > 200 (${SRC}, 2°).` }
      : { verdict: "non_soumis", motif: `Récipient de gaz du groupe 2 : PS × V = ${psv} bar·L ≤ 200 (${SRC}, 2°).` };
  }
  // recipient_vapeur
  if (v <= 1) {
    return { verdict: "non_soumis", motif: `Récipient de vapeur de V ≤ 1 L : exclu (${SRC}, 3°).` };
  }
  return psv > 200
    ? { verdict: "soumis", motif: `Récipient de vapeur : PS × V = ${psv} bar·L > 200 (${SRC}, 3°).` }
    : { verdict: "non_soumis", motif: `Récipient de vapeur : PS × V = ${psv} bar·L ≤ 200 (${SRC}, 3°).` };
}
