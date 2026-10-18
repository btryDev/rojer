// Entrées de la grille de relecture (`scripts/generer-grille-equipements.tsx`)
// qui ne viennent PAS du référentiel : les lignes que nous proposons de passer
// au niveau audit, et la réponse aux remarques du relecteur.
//
// Ce sont des données de relecture, lues dans des fichiers JSON tenus hors du
// dépôt. Une proposition n'entre jamais au référentiel. ~~Elle s'imprime à côté
// de la ligne, pour avis. Seul un `niveau: "audit"` posé au référentiel, après
// décision, fait une ligne « Audit » (ADR-042).~~ [2026-10-09, C67 : depuis la
// décision de la propriétaire du 2026-10-08, la grille imprime UNE seule
// mention, `MENTION_NIVEAU_AUDIT` (« Audit »), en couleur, sur les lignes au
// niveau audit (ADR-042) ET sur les lignes proposées — sans distinguer les
// deux, sans motif ni statut.] Le `motif` reste exigé ici et n'est plus
// imprimé : il garde dans le fichier de relecture la raison de la proposition,
// pour qui reprendra la décision ; le rendre facultatif ferait des
// propositions sans raison.
//
// Les lecteurs ci-dessous refusent ce qu'ils ne comprennent pas plutôt que de
// l'ignorer : une proposition sur un id inconnu imprimerait une grille où la
// ligne proposée n'apparaît nulle part, sans que rien ne le signale.

export type PropositionAudit = { id: string; motif: string };

export const STATUTS_REMARQUE = [
  "Appliqué",
  "Niveau audit",
  "Question en retour",
] as const;
export type StatutRemarque = (typeof STATUTS_REMARQUE)[number];

export type RemarqueRelecture = {
  /** Où la remarque a été écrite, ex. « Grille p. 4 ». */
  page: string;
  /** La ligne annotée, en clair. */
  objet?: string;
  /** Le texte du relecteur. */
  remarque: string;
  /** Ce qui en a été fait, en une phrase. */
  fait: string;
  statut: StatutRemarque;
};

export type AnnexeRelecture = {
  /** Sous-titre de la section (dates des relectures). */
  intro?: string;
  remarques: RemarqueRelecture[];
  /** Les questions qui restent posées au relecteur, dans l'ordre. */
  questions: string[];
};

function texteNonVide(v: unknown, ou: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`${ou} : texte attendu, non vide`);
  }
  return v.trim();
}

/**
 * Lit les propositions de passage au niveau audit.
 *
 * `idsReferentiel` : les ids du référentiel de la version imprimée.
 * ~~`idsDejaAudit` : ceux qui y portent déjà le niveau audit — une proposition
 * sur l'un d'eux n'a pas de sens, la ligne s'imprime déjà « Audit ».~~
 * [2026-10-17 : le refus faisait échouer tout le document dès qu'une
 * proposition était DÉCIDÉE — les huit de `relecture-jc-2026-10` le sont
 * depuis la PR #56. Une proposition décidée n'est pas une erreur du fichier :
 * elle est lue, puis écartée des propositions par `propositionsADecider`.]
 */
export function lirePropositionsAudit(
  brut: unknown,
  idsReferentiel: ReadonlySet<string>,
): Map<string, PropositionAudit> {
  if (!Array.isArray(brut)) {
    throw new Error("Propositions audit : un tableau [{ id, motif }] est attendu");
  }
  const m = new Map<string, PropositionAudit>();
  brut.forEach((e, i) => {
    const ou = `Proposition n° ${i + 1}`;
    if (typeof e !== "object" || e === null) throw new Error(`${ou} : objet attendu`);
    const { id, motif } = e as Record<string, unknown>;
    const idLu = texteNonVide(id, `${ou}, id`);
    if (!idsReferentiel.has(idLu)) {
      throw new Error(`${ou} : « ${idLu} » n'est pas au référentiel`);
    }
    // ~~Refus d'une ligne déjà au niveau audit~~ — 2026-10-17 : voir
    // `propositionsADecider`.
    if (m.has(idLu)) throw new Error(`${ou} : « ${idLu} » proposé deux fois`);
    m.set(idLu, { id: idLu, motif: texteNonVide(motif, `${ou}, motif`) });
  });
  return m;
}

/**
 * Les propositions qui restent À DÉCIDER (2026-10-17).
 *
 * Une proposition dont la ligne porte déjà le niveau audit au référentiel est
 * décidée : elle sort d'elle-même des propositions, et ne se lit plus que
 * dans le rappel « Déjà au niveau audit » de la page des propositions, qui
 * lit le référentiel. Sans ce tri, la même ligne s'imprimait sous « Ce sont
 * des propositions, rien n'est décidé » ET sous « Déjà au niveau audit » : la
 * page se contredisait.
 */
export function propositionsADecider(
  propositions: ReadonlyMap<string, PropositionAudit>,
  idsDejaAudit: ReadonlySet<string>,
): Map<string, PropositionAudit> {
  return new Map([...propositions].filter(([id]) => !idsDejaAudit.has(id)));
}

/** Lit la réponse aux remarques du relecteur. */
export function lireAnnexeRelecture(brut: unknown): AnnexeRelecture {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) {
    throw new Error("Annexe de relecture : objet { remarques, questions } attendu");
  }
  const { intro, remarques, questions } = brut as Record<string, unknown>;
  if (!Array.isArray(remarques) || remarques.length === 0) {
    throw new Error("Annexe de relecture : « remarques » doit être un tableau non vide");
  }
  const lues = remarques.map((r, i): RemarqueRelecture => {
    const ou = `Remarque n° ${i + 1}`;
    if (typeof r !== "object" || r === null) throw new Error(`${ou} : objet attendu`);
    const o = r as Record<string, unknown>;
    if (!STATUTS_REMARQUE.includes(o.statut as StatutRemarque)) {
      throw new Error(
        `${ou} : statut « ${String(o.statut)} » inconnu (${STATUTS_REMARQUE.join(", ")})`,
      );
    }
    return {
      page: texteNonVide(o.page, `${ou}, page`),
      objet: o.objet === undefined ? undefined : texteNonVide(o.objet, `${ou}, objet`),
      remarque: texteNonVide(o.remarque, `${ou}, remarque`),
      fait: texteNonVide(o.fait, `${ou}, fait`),
      statut: o.statut as StatutRemarque,
    };
  });
  const qs = questions === undefined ? [] : questions;
  if (!Array.isArray(qs)) throw new Error("Annexe de relecture : « questions » doit être un tableau");
  return {
    intro: intro === undefined ? undefined : texteNonVide(intro, "intro"),
    remarques: lues,
    questions: qs.map((q, i) => texteNonVide(q, `Question n° ${i + 1}`)),
  };
}

/** Le décompte par statut, dans l'ordre de `STATUTS_REMARQUE`. */
export function decompteStatuts(
  remarques: readonly RemarqueRelecture[],
): [StatutRemarque, number][] {
  return STATUTS_REMARQUE.map((s) => [
    s,
    remarques.filter((r) => r.statut === s).length,
  ]);
}

/**
 * Lit la valeur d'une option `--nom <valeur>` ou `--nom=<valeur>`.
 * Renvoie aussi les arguments positionnels, débarrassés des options et de
 * leurs valeurs — sans quoi le chemin d'un JSON passé en option serait pris
 * pour le chemin du PDF de sortie.
 */
export function lireArguments(
  argv: readonly string[],
  optionsAValeur: readonly string[],
): { options: Map<string, string>; drapeaux: Set<string>; positionnels: string[] } {
  const options = new Map<string, string>();
  const drapeaux = new Set<string>();
  const positionnels: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positionnels.push(a);
      continue;
    }
    const corps = a.slice(2);
    const egal = corps.indexOf("=");
    const nom = egal === -1 ? corps : corps.slice(0, egal);
    const valeurEgal = egal === -1 ? undefined : corps.slice(egal + 1);
    if (optionsAValeur.includes(nom)) {
      const valeur = valeurEgal ?? argv[++i];
      if (valeur === undefined || valeur.startsWith("--")) {
        throw new Error(`--${nom} attend une valeur`);
      }
      options.set(nom, valeur);
    } else {
      drapeaux.add(nom);
    }
  }
  return { options, drapeaux, positionnels };
}

/**
 * La légende de la colonne « Audit » de la grille (2026-10-18).
 *
 * La colonne marque d'une même mention les lignes au niveau audit ET les
 * lignes proposées (C67). Tant qu'il reste des propositions, la légende les
 * soumet : « que nous proposons […] Votre avis ? ». Quand il n'en reste
 * aucune — toutes décidées, comme le 2026-10-17 —, ce texte demandait un avis
 * sur des choses tranchées : le relecteur lisait une question qui n'en était
 * plus une. Une seule lecture, ici, pour que la légende suive l'état des
 * propositions au lieu d'être écrite une fois pour toutes.
 */
export function legendeColonneAudit(resteDesPropositions: boolean): string {
  return resteDesPropositions
    ? "obligation légale que nous proposons de garder au référentiel sans que Rojer la suive au quotidien — ni calendrier, ni alertes —, listée sur la page « Ce que Rojer ne couvre pas ». Votre avis ?"
    : "obligation légale gardée au référentiel sans que Rojer la suive au quotidien — ni calendrier, ni alertes —, listée sur la page « Ce que Rojer ne couvre pas ».";
}

/**
 * La page qui ouvre la grille (2026-10-18).
 *
 * Avec des propositions à décider, c'est la page des propositions, qui
 * rappelle en dessous ce qui est déjà au niveau audit. Sans proposition, la
 * page des propositions ne s'imprimait pas — et le rappel disparaissait avec
 * elle : le relecteur ne voyait plus nulle part la liste de ce qui est
 * tranché. Il a désormais sa page. Rien à rappeler, rien à proposer : pas de
 * page.
 */
export function pageDeTeteGrille(
  nbPropositions: number,
  nbDejaAudit: number,
): "propositions" | "niveau_audit" | null {
  if (nbPropositions > 0) return "propositions";
  return nbDejaAudit > 0 ? "niveau_audit" : null;
}

