/**
 * Ce que la confirmation de « Supprimer ce salarié » dit — sans qualification
 * juridique, sans conseil : ce qui part, que c'est définitif, et l'export qui
 * existe pour qui veut en garder une trace (« Éditer ses données », art. 15).
 *
 * Les nombres viennent de `perimetreSuppressionSalarie`, qui lit le même
 * périmètre que l'effacement : la phrase ne peut pas annoncer moins que ce
 * qui part.
 */

import type { PerimetreSuppressionSalarie } from "./suppression";

const n = (k: number, un: string, plusieurs: string) =>
  `${k} ${k > 1 ? plusieurs : un}`;

export function detailSuppressionSalarie(
  nom: string,
  p: PerimetreSuppressionSalarie,
): string {
  const lies = [
    p.rapports > 0 ? n(p.rapports, "rapport déposé", "rapports déposés") : null,
    p.actions > 0 ? n(p.actions, "action", "actions") : null,
    p.signatures > 0 ? n(p.signatures, "signature", "signatures") : null,
  ].filter((x): x is string => x !== null);

  const titres =
    p.titres === 0
      ? `La fiche de ${nom} est supprimée définitivement.`
      : `La fiche de ${nom} et ${p.titres === 1 ? "son titre" : `ses ${p.titres} titres`} sont supprimés définitivement.`;

  const suite =
    lies.length === 0
      ? ""
      : ` Sont aussi supprimés définitivement, parce que liés à ses titres : ${enumerer(lies)}.`;

  return (
    `${titres}${suite} Rien ne se récupère ensuite. ` +
    "Pour en garder une trace, utilisez d'abord « Éditer ses données » sur cette fiche."
  );
}

function enumerer(l: string[]): string {
  if (l.length === 1) return l[0];
  return `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}
