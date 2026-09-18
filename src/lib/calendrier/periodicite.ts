// La prochaine échéance d'un rythme — calculée en CALENDRIER, jamais en jours.
//
// CE QUE CE MODULE REMPLACE. `generateur.ts` portait ses propres `ajouterJours`
// et `prochaineDate`, qui ajoutaient `PERIODICITE_EN_JOURS[p]` jours à la
// dernière réalisation. `annuelle = 365` dérivait d'un jour une fois sur quatre,
// `triennale = 1095` trois fois sur quatre, `quadriennale` et `quinquennale`
// TOUJOURS — tout intervalle de quatre ou cinq ans contient un 29 février. Un
// contrôle quinquennal fait le 1er juin 2025 tombait le 31 mai 2030 ; le texte
// dit cinq ans, donc le 1er juin. Constat n°3 de l'audit du 2026-09-09, lot 4
// du § 11.
//
// La règle 1 de l'ADR-011 — un seul module de dates, aucune arithmétique
// locale — existait déjà, et `lib/dates` portait déjà `ajouterMois` avec
// l'écrêtage de fin de mois. Le calendrier ne s'en servait pas. Ce fichier ne
// CORRIGE pas les fonctions locales : il les supprime, et compose les primitives
// partagées avec la table calendaire du référentiel.
//
// POURQUOI ICI ET PAS DANS `lib/dates`. `lib/dates/index.ts` n'a aucun import :
// c'est une feuille, testée sous trois fuseaux, qui ne connaît ni `Periodicite`
// ni le référentiel. Lui faire connaître une périodicité inverserait la
// dépendance. Ce module est la seule composition des deux, et il n'ajoute rien
// aux dates lui-même.

import { ajouterJours, ajouterMois } from "@/lib/dates";
import { estPeriodicitePlusStricte } from "@/lib/matching/prescriptions";
import {
  PERIODICITE_CALENDAIRE,
  type Periodicite,
} from "@/lib/referentiels/types-communs";

/**
 * La périodicité produit-elle un rendez-vous suivant ?
 *
 * `false` pour `mise_en_service_uniquement` et `autre` : une obligation
 * ponctuelle ou un état permanent (ADR-026) n'a pas de cycle. Remplace le test
 * `PERIODICITE_EN_JOURS[p] != null` que deux lecteurs faisaient à la main.
 */
export function estCyclique(periodicite: Periodicite): boolean {
  // `?? null` et non `!== null` seul : une clé inconnue rend `undefined`, que
  // `!== null` tient pour vraie — le code inventerait alors un rendez-vous
  // suivant sur une périodicité qu'il ne connaît pas. L'ancienne écriture,
  // `!= null`, écartait les deux ; celle-ci fait pareil sans le double égal.
  // Les deux appelants d'`etats.ts` arrivent ici par un `as Periodicite` sur
  // une chaîne venue de la base : c'est ce transtypage qui rend le cas
  // atteignable, et le sens prudent est de traiter l'inconnu comme ponctuel.
  return (PERIODICITE_CALENDAIRE[periodicite] ?? null) !== null;
}

/**
 * Les rythmes qui ne produisent AUCUN rendez-vous suivant — le complément
 * d'`estCyclique`, sous forme de liste, pour les clauses SQL qui doivent dire
 * la même chose que lui (`portee.ts`). DÉRIVÉE de la table, jamais écrite à la
 * main : une périodicité ajoutée au référentiel entre ici toute seule, du bon
 * côté. Deux valeurs aujourd'hui, `mise_en_service_uniquement` et `autre`.
 */
export const PERIODICITES_SANS_SUITE: readonly Periodicite[] = (
  Object.keys(PERIODICITE_CALENDAIRE) as Periodicite[]
).filter((p) => !estCyclique(p));

/**
 * La prochaine échéance après `derniere`, ou `null` si le rythme n'en produit
 * pas.
 *
 * En MOIS pour les rythmes que les textes écrivent en mois ou en ans : le même
 * jour, n mois plus tard, écrêté en fin de mois quand il n'existe pas — 31 août
 * + 6 mois = 28 février, 29 février 2028 + 1 an = 28 février 2029. En JOURS pour
 * ceux que les textes écrivent en jours ou en semaines, où la conversion est
 * exacte. L'heure civile de `derniere` est conservée (`lib/dates`), donc une
 * réalisation à minuit reste à minuit et ne glisse pas d'un jour au changement
 * d'heure.
 */
export function prochaineEcheance(
  derniere: Date,
  periodicite: Periodicite,
): Date | null {
  const pas = PERIODICITE_CALENDAIRE[periodicite] ?? null;
  if (pas === null) return null;
  return "mois" in pas
    ? ajouterMois(derniere, pas.mois)
    : ajouterJours(derniere, pas.jours);
}

/**
 * Le pas du PREMIER cycle d'une ligne jamais contrôlée (ADR-036, D1).
 *
 * Sans prescription, c'est le comportement d'avant : `premierDelai` quand le
 * texte fixe un plafond de premier cycle distinct du rythme (`esp-inspection-
 * periodique` : trois ans, puis quatre), le rythme sinon.
 *
 * Sous prescription, DEUX PLAFONDS pèsent sur le même premier cycle — celui du
 * texte et celui de la prescription — et c'est le plus bas qui lie. « Première
 * inspection à trois ans, puis chaque année » serait absurde ; c'est pourtant
 * ce que le générateur rendait (S7 de l'audit du 2026-09-17 : il lisait le
 * rythme du référentiel, et une ligne étiquetée « semestrielle » naissait avec
 * une première échéance à un an).
 *
 * LA SURCHARGE EST UN PARAMÈTRE, PAS UNE DÉDUCTION. Le minimum se prend entre
 * le premier délai et LA SURCHARGE, jamais entre le premier délai et le rythme
 * du référentiel : les deux viennent du même texte, qui a voulu les deux. Un
 * texte « première vérification à deux ans, puis annuelle » serait faussé d'un
 * an. La formule du plan prenait le rythme EFFECTIF en troisième argument ; or
 * sans prescription l'effectif EST le rythme du référentiel, et la comparaison
 * nue le faisait primer sur un premier délai plus long. Aucune obligation
 * livrée n'est dans ce cas aujourd'hui ; la première l'aurait été en silence.
 *
 * La première rédaction fermait le cas par une garde d'ÉGALITÉ — « effectif
 * égal au référentiel, donc pas de surcharge ». Elle déduisait ce fait d'une
 * règle d'un AUTRE module (`appliquerPrescriptions` écarte une surcharge qui
 * n'est pas strictement plus stricte), qu'aucun test ne gardait ici, alors que
 * l'appelant le SAIT : il tient la surcharge, ou son absence, à l'endroit même
 * où il calcule le rythme effectif. Et trois `Periodicite` voisins se
 * permutaient sans bruit. `null` dit « pas de prescription », et rien d'autre
 * ne le dit (relecture du 2026-09-17).
 *
 * ICI ET NON DANS `echeance-de-ligne.ts`, où le lot 1 l'avait posée (déplacée
 * au lot 2b, 2026-09-18) : le générateur doit la renseigner dans
 * `VerificationGenere.sources` dès la couture, et un test lui interdit
 * d'importer `echeance-de-ligne.ts` avant la bascule. `echeance-de-ligne.ts` la
 * réexporte, si bien que sa table de vérité ne bouge pas. C'est sa place de
 * toute façon : ce module compose déjà la table calendaire du référentiel, et
 * `premierPas` n'est qu'une règle de choix entre deux pas.
 */
export function premierPas(
  premierDelai: Periodicite | undefined,
  periodiciteReferentiel: Periodicite,
  surcharge: Periodicite | null,
): Periodicite {
  const base = premierDelai ?? periodiciteReferentiel;
  if (surcharge === null) return base;
  // `candidate` d'abord, `reference` ensuite : « la surcharge est-elle
  // strictement plus stricte que la base ? ». À égalité la base reste — même
  // valeur. Une surcharge ne DESSERRE jamais : moins stricte que la base, elle
  // est sans effet sur le premier cycle.
  return estPeriodicitePlusStricte(surcharge, base) ? surcharge : base;
}
