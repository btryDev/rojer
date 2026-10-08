// Entrées de la grille de relecture (`scripts/generer-grille-equipements.tsx`)
// qui ne viennent PAS du référentiel : les lignes que nous proposons de passer
// au niveau audit, et la réponse aux remarques du relecteur.
//
// Ce sont des données de relecture, lues dans des fichiers JSON tenus hors du
// dépôt. Une proposition n'entre jamais au référentiel : elle s'imprime à côté
// de la ligne, pour avis. Seul un `niveau: "audit"` posé au référentiel, après
// décision, fait une ligne « Audit » (ADR-042).
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
 * `idsDejaAudit` : ceux qui y portent déjà le niveau audit — une proposition
 * sur l'un d'eux n'a pas de sens, la ligne s'imprime déjà « Audit ».
 */
export function lirePropositionsAudit(
  brut: unknown,
  idsReferentiel: ReadonlySet<string>,
  idsDejaAudit: ReadonlySet<string>,
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
    if (idsDejaAudit.has(idLu)) {
      throw new Error(`${ou} : « ${idLu} » est déjà au niveau audit`);
    }
    if (m.has(idLu)) throw new Error(`${ou} : « ${idLu} » proposé deux fois`);
    m.set(idLu, { id: idLu, motif: texteNonVide(motif, `${ou}, motif`) });
  });
  return m;
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
