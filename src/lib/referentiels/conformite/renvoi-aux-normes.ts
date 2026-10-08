/**
 * Un rythme que le Code RENVOIE aux normes sans l'écrire (revue de fidélité du
 * 2026-10-07, correction 13).
 *
 * L'habilitation électrique s'affichait « sans rythme écrit » / « Sans terme
 * écrit ». C'est vrai du Code, mais incomplet dans le sens qui égare : un
 * dirigeant lit « aucun rythme », alors que `R. 4544-10` fait délivrer,
 * maintenir ou renouveler l'habilitation « selon les modalités contenues dans
 * les normes mentionnées à l'article R. 4544-3 ». Le rythme existe ; il est
 * dans une norme que Rojer n'a pas lue (NF C 18-510, lecture `indirect` au
 * corpus `normes` : elle ne fonde aucun rythme retenu, ADR-039 § 2 (a)).
 *
 * [2026-10-08, C66 — ADR-039 § 8 : l'habilitation reçoit le rythme de la
 * NF C 18-510 relevé par le préventeur (triennal), et la mention du rythme
 * retenu prend la place de celle-ci — « Rythme de la norme NF C 18-510 (tous
 * les 3 ans), relevé par le préventeur … — norme non relue par Rojer ». La
 * règle ci-dessous s'efface d'elle-même devant un `rythmeRetenu` : AUCUNE
 * obligation livrée ne la porte plus (borne haute à zéro, test). Le module
 * reste pour un prochain renvoi aux normes que personne n'aurait relevé.]
 *
 * Ce module ne pose donc AUCUNE échéance. Il dit d'où le rythme est absent :
 * renvoyé, pas inexistant. Il ne modifie aucune obligation ; il lit ce
 * qu'elles portent déjà — `periodicite: "autre"`, pas de rythme retenu, un
 * porteur salarié (le titre que la personne détient, dont c'est le
 * renouvellement), et un fondement (`referencesLegales[0]`) dont la clé est
 * dans la table ci-dessous. La table recopie mot pour mot la citation du
 * corpus, et un test l'y retrouve.
 *
 * ~~Module feuille : types seulement, et la table des libellés.~~
 * [2026-10-07, C62 : inexact — le module importe aussi deux valeurs,
 * `LABEL_PERIODICITE` (`calendrier/labels`) et `periodiciteEffective`
 * (`rythme-retenu`), toutes deux sans dépendance au corpus ni à la base. Il
 * reste importable d'un composant ou d'une requête sans tirer le référentiel.]
 */

import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import type { Obligation } from "./types";
import { periodiciteEffective } from "./rythme-retenu";

/** Les articles qui renvoient le rythme à des normes, et les mots du renvoi. */
export const RENVOIS_AUX_NORMES: Readonly<Record<string, string>> = {
  "R. 4544-10":
    "selon les modalités contenues dans les normes mentionnées à l'article R. 4544-3",
};

export type RenvoiAuxNormes = {
  article: string;
  /** Pastille ou colonne : « Rythme renvoyé aux normes (R. 4544-10) ». */
  court: string;
  /** Phrase entière, avec les mots du texte. */
  long: string;
};

// Dérivé d'`Obligation` (garde des lectures brutes, `periodicite-brute.test.ts`).
type Lue = Pick<Obligation, "periodicite" | "rythmeRetenu" | "porteur" | "referencesLegales">;

export function renvoiAuxNormes(o: Lue): RenvoiAuxNormes | null {
  if (o.periodicite !== "autre" || o.rythmeRetenu || o.porteur !== "salarie") {
    return null;
  }
  const article = o.referencesLegales[0]?.article;
  const mots = article ? RENVOIS_AUX_NORMES[article] : undefined;
  if (!article || !mots) return null;
  return {
    article,
    court: `Rythme renvoyé aux normes (${article})`,
    long: `Le Code n'écrit pas de durée : ${article} renvoie le renouvellement « ${mots} ». Rojer n'a pas lu ces normes et ne date pas d'échéance ; une date de fin portée sur le titre prime.`,
  };
}

/**
 * Le rythme d'une obligation tel qu'une colonne l'imprime : le libellé de la
 * périodicité effective, sauf quand le Code renvoie le rythme aux normes.
 */
export function libelleRythme(o: Lue): string {
  const renvoi = renvoiAuxNormes(o);
  return renvoi
    ? `renvoyé aux normes (${renvoi.article})`
    : LABEL_PERIODICITE[periodiciteEffective(o)];
}
