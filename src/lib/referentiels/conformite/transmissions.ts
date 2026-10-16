/**
 * Ce qu'une obligation dit de son « double » nominatif : la même obligation,
 * vue par personne (`Transmission.memeObligation`, 2026-10-16).
 *
 * Une seule lecture de `memeObligation`, `titreDuDouble`, et deux usages :
 * l'état « en place » de la ligne s'établit d'après les titres déclarés
 * (`etats-permanents/par-les-titres.ts`), et `suiviParPersonne` imprime le
 * renvoi vers le titre qui porte le rythme — grille de relecture, fiche
 * équipement.
 *
 * VOLONTAIREMENT MAIGRE. Ce module ne lit que `transmet`, `porteurDe` et
 * `libelleRythme` : la fiche équipement l'importe, et le loger dans
 * `pdf/textes-grille-relecture.ts` lui faisait embarquer tout le corpus
 * (revue du 2026-10-16 ; `fiche-equipement-sans-corpus.test.ts` le garde).
 */
import { libelleRythme } from "./renvoi-aux-normes";
import { porteurDe, type Obligation } from "./types";

/** Le titre qui est la même obligation que `o`, vue par personne, ou `null`. */
export function titreDuDouble(o: Obligation): string | null {
  for (const t of o.transmet ?? []) {
    if (t.vers === "salarie_designe" && t.titre && t.memeObligation) return t.titre;
  }
  return null;
}

/**
 * Où se suit, personne par personne, ce qu'une ligne d'équipement ou
 * d'établissement suppose (remarque du préventeur, grille du 13/10 p. 8) : la
 * ligne « Habilitation électrique du personnel » s'imprimait « sans rythme
 * écrit », et rien ne disait que les 3 ans de la NF C 18-510 se suivent sur le
 * titre de chaque personne.
 *
 * Seulement les DOUBLES — une transmission ordinaire dit qui est concerné, pas
 * où se suit le rythme : imprimée partout le 2026-10-15, elle faisait dire
 * « suivi par personne, tous les 3 ans » au carnet de prescriptions, remis une
 * fois, et à la VGP semestrielle d'un chariot.
 */
export function suiviParPersonne(
  o: Obligation,
  catalogue: readonly Obligation[],
): string[] {
  if (porteurDe(o) === "salarie") return [];
  const id = titreDuDouble(o);
  if (!id) return [];
  const titre = catalogue.find((c) => c.id === id);
  if (!titre) throw new Error(`${o.id} transmet vers un titre inconnu : ${id}`);
  return [`Suivi par personne : « ${titre.libelle} » — ${libelleRythme(titre)}`];
}
