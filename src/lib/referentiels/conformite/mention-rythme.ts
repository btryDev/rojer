/**
 * La mention d'un rythme retenu (ADR-039), séparée de `rythme-retenu.ts` pour
 * que le générateur, qui ne lit que `periodiciteEffective`, n'embarque pas ce
 * qui s'affiche (`passage-a-blanc.test.ts` tient cette fermeture). Elle ne lit
 * plus `LABEL_PERIODICITE` depuis le 2026-10-07 : ses tables de phrases sont
 * ci-dessous.
 */

import type { Periodicite } from "../types-communs";
import type {
  MotifRythmeRetenu,
  Obligation,
  PeriodiciteRetenue,
} from "./types";

// Dérivé d'`Obligation` (garde des lectures brutes, `periodicite-brute.test.ts`).
// `premierDelai` : le premier pas, quand il diffère du rythme (« à 5 et 15 ans »).
// [2026-10-08, C66 : plus aucune obligation vivante ne le porte — la
// maintenance approfondie est retirée ; la branche reste, éprouvée en test.]
type AvecRythme = Pick<Obligation, "periodicite" | "rythmeRetenu" | "premierDelai">;

/**
 * Le rythme d'une norme, en phrase. Pas `LABEL_PERIODICITE` : ses valeurs sont
 * faites pour une colonne (« annuelle », « tous les 10 ans ») et donnaient
 * « périodicité tous les 10 ans » (revue du 2026-10-07).
 */
const RYTHME_EN_PHRASE: Record<PeriodiciteRetenue, string> = {
  hebdomadaire: "toutes les semaines",
  bimensuelle: "tous les 15 jours",
  mensuelle: "tous les mois",
  six_semaines: "toutes les 6 semaines",
  trimestrielle: "tous les 3 mois",
  semestrielle: "tous les 6 mois",
  annuelle: "tous les ans",
  biennale: "tous les 2 ans",
  triennale: "tous les 3 ans",
  quadriennale: "tous les 4 ans",
  quinquennale: "tous les 5 ans",
  decennale: "tous les 10 ans",
};

/** Le premier pas, en durée : « première échéance à 5 ans ». */
const DELAI_EN_PHRASE: Record<PeriodiciteRetenue, string> = {
  hebdomadaire: "une semaine",
  bimensuelle: "15 jours",
  mensuelle: "un mois",
  six_semaines: "6 semaines",
  trimestrielle: "3 mois",
  semestrielle: "6 mois",
  annuelle: "un an",
  biennale: "2 ans",
  triennale: "3 ans",
  quadriennale: "4 ans",
  quinquennale: "5 ans",
  decennale: "10 ans",
};

function estRetenue(p: Periodicite | undefined): p is PeriodiciteRetenue {
  return p !== undefined && p !== "autre" && p !== "mise_en_service_uniquement";
}

/**
 * « tous les 10 ans », ou « première échéance à 5 ans, puis tous les 10 ans »
 * quand un premier délai existe : la maintenance approfondie des extincteurs
 * tombe à 5 puis à 15 ans, et dire « tous les 10 ans » seul annonçait la
 * première à 10 (revue du 2026-10-07).
 */
function rythmeEnPhrase(p: PeriodiciteRetenue, premierDelai?: Periodicite): string {
  return estRetenue(premierDelai) && premierDelai !== p
    ? `première échéance à ${DELAI_EN_PHRASE[premierDelai]}, puis ${RYTHME_EN_PHRASE[p]}`
    : RYTHME_EN_PHRASE[p];
}

/** « 2026-10-05 » → « 05/10/2026 », sans horloge ni fuseau : une clé de jour. */
function dateFr(cle: string): string {
  const [a, m, j] = cle.split("-");
  return `${j}/${m}/${a}`;
}

// -----------------------------------------------------------------------------
// La mention
// -----------------------------------------------------------------------------

/**
 * Ce qui s'affiche sous un rythme retenu. Écrit une fois, ici : le composant
 * `MentionRythmeRetenu`, le registre et le dossier PDF, le README du ZIP, la
 * grille, l'export de relecture et le MCP lisent tous ces deux chaînes.
 *
 * Elle ne qualifie rien — ni « opposable », ni « valeur légale »
 * (`sans-qualification.test.ts`). Elle dit d'où vient le rythme.
 */
export type MentionRythme = {
  motif: MotifRythmeRetenu;
  /** Pastille, colonne étroite : « Rythme de la norme NF S 61-919 ». */
  court: string;
  /** Phrase entière : la référence de la norme, ou le mot du texte. */
  long: string;
};

/** Libellé court du défaut, pour les pastilles. */
export const PASTILLE_DEFAUT_ANNUEL = "Rythme retenu par défaut";

/** Le libellé court d'une norme : « Rythme de la norme NF S 61-919 ». */
export function pastilleNorme(norme: string): string {
  return `Rythme de la norme ${norme}`;
}

export function mentionRythmeRetenu(o: AvecRythme): MentionRythme | null {
  const r = o.rythmeRetenu;
  if (!r) return null;
  if (r.motif === "norme") {
    const vague = r.texteVague ? `Le texte dit « ${r.texteVague} » ; ` : "";
    // ADR-039 § 8 (2026-10-08, C66) : une norme que Rojer n'a pas lue, dont
    // le préventeur a relevé le rythme. La mention le dit, et cite ses mots.
    const releve = r.releveParPreventeur;
    if (releve) {
      return {
        motif: "norme",
        court: `${pastilleNorme(r.norme)}, relevé par le préventeur`,
        long: `${vague}Rythme de la norme ${r.norme} (${rythmeEnPhrase(r.periodicite, o.premierDelai)}), relevé par le préventeur le ${dateFr(releve.date)} : « ${releve.citation.replace(/\s*\n\s*/g, " ")} » — norme non relue par Rojer. C'est une norme, citée comme norme, pas un article de loi.`,
      };
    }
    return {
      motif: "norme",
      court: pastilleNorme(r.norme),
      long: `${vague}Rythme de la norme ${r.reference.reference} : ${rythmeEnPhrase(r.periodicite, o.premierDelai)}. C'est une norme, citée comme norme, pas un article de loi.`,
    };
  }
  return {
    motif: "defaut_annuel",
    court: PASTILLE_DEFAUT_ANNUEL,
    long: `Le texte dit « ${r.texteVague} » ; rythme retenu par défaut : annuel.`,
  };
}

/**
 * La mention d'une LIGNE de calendrier, ou `null`.
 *
 * Une ligne née d'une prescription particulière ne la porte pas — surchargée
 * (son rythme est celui de la prescription, qui a son propre marquage :
 * ADR-032, ADR-039 § 3, préséance) ou sur mesure (`prescription:…`, aucune
 * obligation au référentiel). `surchargee` le dit en un booléen : l'appelant
 * sait d'où vient sa ligne, la règle n'a pas à le deviner d'un identifiant.
 */
export function mentionRythmeDeLigne(
  o: AvecRythme | undefined,
  surchargee: boolean,
): MentionRythme | null {
  if (!o || surchargee) return null;
  return mentionRythmeRetenu(o);
}
