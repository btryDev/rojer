/**
 * Ce que la confirmation de « Supprimer ce salarié » dit — sans qualification
 * juridique, sans conseil : ce qui part, que c'est définitif, et ce que l'export
 * de la fiche (« Éditer ses données », art. 15) garde, pour qui veut une trace.
 *
 * Les nombres viennent de `perimetreSuppressionSalarie`, qui lit le même
 * périmètre que l'effacement : la phrase ne peut pas annoncer moins que ce
 * qui part. Rapports et signatures ne sont nommés que s'il y en a : aucun
 * dépôt n'est possible sur une ligne de salarié depuis le 2026-08-27, ils ne
 * peuvent venir que de données antérieures (contre-lecture du 2026-09-27).
 *
 * L'EXPORT NE GARDE PAS DE PIÈCE, et la phrase le dit : il contient
 * l'identité et les titres avec leurs dates (`exporterDonneesSalarie`) — il
 * n'existe pas de document de titre dans Rojer. Le laisser croire ferait
 * supprimer quelqu'un en pensant avoir mis ses pièces de côté.
 */

import type { PerimetreSuppressionSalarie } from "./suppression";

const n = (k: number, un: string, plusieurs: string) =>
  `${k} ${k > 1 ? plusieurs : un}`;

export function detailSuppressionSalarie(
  nom: string,
  p: PerimetreSuppressionSalarie,
): string {
  const avec = [
    p.titres > 0 ? (p.titres === 1 ? "son titre" : `ses ${p.titres} titres`) : null,
    p.echeances > 0
      ? p.echeances === 1
        ? "son échéance au calendrier"
        : `ses ${p.echeances} échéances au calendrier`
      : null,
  ].filter((x): x is string => x !== null);

  const tete =
    avec.length === 0
      ? `La fiche de ${nom} est supprimée définitivement.`
      : avec.length === 1
        ? `La fiche de ${nom} et ${avec[0]} sont supprimés définitivement.`
        : `La fiche de ${nom}, ${enumerer(avec)} sont supprimés définitivement.`;

  const lies = [
    p.actions > 0 ? n(p.actions, "action", "actions") : null,
    p.rapports > 0 ? n(p.rapports, "rapport déposé", "rapports déposés") : null,
    p.signatures > 0 ? n(p.signatures, "signature", "signatures") : null,
  ].filter((x): x is string => x !== null);

  const suite =
    lies.length === 0
      ? ""
      : ` Sont aussi supprimés définitivement, parce que liés à ses échéances : ${enumerer(lies)}.`;

  return (
    `${tete}${suite} Rien ne se récupère ensuite. ` +
    "« Éditer ses données », sur cette fiche, exporte d'abord son identité et " +
    "ses titres avec leurs dates, si vous voulez en garder une trace."
  );
}

function enumerer(l: string[]): string {
  if (l.length === 1) return l[0];
  return `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
}
