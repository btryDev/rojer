import type { Prisma } from "@prisma/client";

/**
 * Le filtre par bâtiment d'une liste de vérifications (ADR-019, ADR-022).
 *
 * Pourquoi une fonction plutôt qu'un objet écrit sur place : depuis que
 * `Verification.equipementId` peut être `null`, un `where` de la forme
 *
 *     { equipement: { batimentId } }
 *
 * est une **jointure interne**. Prisma la traduit par un `INNER JOIN`, et une
 * ligne portée par l'établissement — qui n'a pas d'équipement, donc pas de
 * bâtiment — en disparaît **sans erreur de compilation et sans trace**. C'est
 * exactement ce que l'ADR-010 et l'ADR-019 interdisent : « les masquer ferait
 * mentir le calendrier par omission ».
 *
 * Une échéance sans lieu concerne tout l'établissement, donc aussi le bâtiment
 * qu'on regarde. Elle passe le filtre. C'est la même règle que
 * `filtrerParBatiment` applique aux échéances déjà chargées ; celle-ci
 * l'applique en SQL.
 *
 * Rend `{}` quand aucun bâtiment n'est demandé, pour s'étaler dans un `where`
 * sans condition à l'appel.
 */
export function porteeBatiment(
  batimentId: string | undefined,
): Prisma.VerificationWhereInput {
  if (!batimentId) return {};
  return {
    OR: [{ equipementId: null }, { equipement: { batimentId } }],
  };
}

/**
 * Compose plusieurs conditions **indépendantes** en un seul `where`.
 *
 * Pourquoi une fonction plutôt qu'une suite de diffusions dans un littéral :
 * deux conditions écrites séparément peuvent poser la **même clé**, et la
 * dernière écrase silencieusement la première.
 *
 *     { ...porteeBatiment(b), ...(urgent ? urgenceSeule(d) : {}) }
 *
 * Les deux posent `OR`. Sous « en retard seulement », le filtre par bâtiment
 * disparaissait donc du `where` — sans erreur de compilation, sans trace, et
 * l'écran affichait un en-tête compté sur un bâtiment au-dessus d'une liste
 * comptée sur l'établissement entier. C'est le défaut que l'ADR-019 nomme, et
 * il n'était atteignable que par la **composition** : aucun des deux morceaux
 * n'est fautif isolément, ce qui le met hors de portée d'un balayage de forme.
 *
 * `AND` rend la composition additive : chaque condition garde ses propres
 * clés, quelles qu'elles soient. Les conditions vides sont écartées, et une
 * condition seule est rendue telle quelle — un `AND` d'un élément serait
 * correct mais illisible dans les journaux de requêtes.
 */
export function toutesLesConditions(
  ...conditions: Prisma.VerificationWhereInput[]
): Prisma.VerificationWhereInput {
  const posees = conditions.filter((c) => Object.keys(c).length > 0);
  if (posees.length === 0) return {};
  if (posees.length === 1) return posees[0];
  return { AND: posees };
}

/**
 * « En retard seulement » : ce qui n'est pas fait et dont la date est passée.
 *
 * Extraite de `listerVerifications` pour deux raisons. La condition porte un
 * `OR`, donc elle ne peut pas être écrite en diffusion à côté d'une autre qui
 * en porte un — elle passe par `toutesLesConditions`. Et sa définition est le
 * pendant SQL de `repartirVerifications` : les deux doivent dire la même
 * chose, et une seule des deux était lisible.
 *
 * `debut` est le début du jour civil, capturé au bord (ADR-011).
 */
/**
 * Les échéances qu'un écran peut ANNONCER : ouvertes, et non éteintes.
 *
 * Extraite de la page d'un établissement, où elle alimente le compte à rebours
 * des cinq prochaines. Elle y était écrite sur place, et deux relectures l'ont
 * signalée pour la même raison : aucun test ne pouvait la tenir, une page
 * serveur n'en ayant pas. Ici, elle en a un.
 *
 * `archiveLe: null` est la moitié qui compte. Le statut d'une ligne éteinte
 * reste GELÉ dans son dernier état connu (ADR-012) : elle passe donc le filtre
 * de statut, et comme sa date est la plus ancienne, le tri croissant la place
 * EN TÊTE. Le widget annonçait « Prochaine échéance » sur une obligation qui ne
 * s'applique plus, et elle consommait une des cinq places.
 */
export function echeancesAnnoncables(): Prisma.VerificationWhereInput {
  return {
    statut: { in: ["a_planifier" as const, "planifiee" as const, "depassee" as const] },
    archiveLe: null,
  };
}

export function urgenceSeule(debut: Date): Prisma.VerificationWhereInput {
  return {
    dateRealisee: null,
    OR: [
      { statut: "depassee" as const },
      {
        statut: { in: ["planifiee" as const, "a_planifier" as const] },
        datePrevue: { lt: debut },
      },
    ],
  };
}
