// L'instant de référence d'un rendu RSC.
//
// Le layout d'établissement et la page sont rendus EN PARALLÈLE, et chacun
// prenait son `new Date()`. Deux instants à quelques millisecondes d'écart
// suffisaient à rendre impossible tout partage des lectures qui dépendent de
// l'horloge : `cache()` de React compare ses arguments, et deux instants
// différents sont deux clés (audit Next.js du 2026-10-14, H2).
//
// `cache()` le fige pour la requête HTTP : tous ceux qui l'appellent dans le
// même rendu lisent la même milliseconde. Hors rendu (actions, routes, tests),
// React n'a pas de dispatcher de cache et chaque appel lit l'horloge, comme un
// `new Date()`.
//
// On rend un `Date` NEUF à chaque appel, construit sur la milliseconde
// mémoïsée : un appelant qui le modifierait (`setHours`) ne toucherait pas
// celui des autres.

import { cache } from "react";

const msDuRendu = cache(function msDuRendu(): number {
  return Date.now();
});

export function instantDuRendu(): Date {
  return new Date(msDuRendu());
}
