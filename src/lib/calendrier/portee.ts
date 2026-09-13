import type { Prisma } from "@prisma/client";
import { STATUTS_REALISES_PERSISTES } from "./generateur";
import { PERIODICITES_SANS_SUITE } from "./periodicite";

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
 * Une ligne qui PORTE UNE PREUVE — ce qui atteste qu'un contrôle a eu lieu, et
 * qu'aucune suppression ne doit emporter (ADR-012).
 *
 * Quatre témoins, et le quatrième est la raison d'être de cette fonction :
 *  · un rapport ;
 *  · une action corrective ;
 *  · la colonne gelée `dateRealisee` (lignes d'avant l'ADR-034) ;
 *  · un STATUT RÉALISÉ. Une obligation sans rendez-vous suivant, consommée, n'a
 *    parfois plus que lui : sa colonne éteinte, son rapport retiré.
 *
 * Trois gardes de suppression recopiaient les trois premiers à la main — la
 * suppression d'un équipement, celle d'une prescription et son compte affiché —
 * et aucune ne connaissait le quatrième. Surtout, N5 retire `dateRealisee` :
 * sans le statut, retirer la colonne aurait rendu supprimable un équipement
 * qui porte une preuve, exactement ce que l'ADR-012 existe pour empêcher.
 * C'est la même définition que `porteUneTrace` du réconciliateur.
 */
export function portantUnePreuve(): Prisma.VerificationWhereInput {
  return {
    OR: [
      { rapports: { some: {} } },
      { actions: { some: {} } },
      { dateRealisee: { not: null } },
      { statut: { in: [...STATUTS_REALISES_PERSISTES] } },
    ],
  };
}

export function urgenceSeule(debut: Date): Prisma.VerificationWhereInput {
  return {
    // Une ligne éteinte n'est jamais urgente, quel que soit son statut gelé.
    archiveLe: null,
    // COMPOSÉE d'`echeanceAttendue`, jamais recopiée : la relecture du
    // 2026-09-13 a réduit la troisième branche recopiée ici à un seul statut
    // réalisé, et rien n'a rougi. Ce qui attend, ET qui est passé.
    AND: [
      echeanceAttendue(),
      { OR: [{ statut: "depassee" as const }, { datePrevue: { lt: debut } }] },
    ],
  };
}
// CE QUE LE SQL NE SAIT PAS DIRE. Sur une rangée gelée jamais roulée
// (`datePrevue` ≤ `dateRealisee`), l'échéance ouverte se CALCULE
// (`echeanceOuverte`) et peut être à venir : la clause la retient alors à tort.
// C'est un sur-ensemble, jamais un sous-ensemble — aucun retard n'est perdu —,
// et `listerVerifications` repasse les lignes retenues au prédicat.

/**
 * Ce qu'une ligne ATTEND encore, côté SQL : le pendant exact de
 * `!estVerificationRealisee` (`lib/dates/retard`), et il doit le rester.
 *
 * Deux formes, parce que le statut n'a pas le même sens selon le rythme :
 *  · un statut ouvert — la ligne attend, quelle que soit sa périodicité ;
 *  · un statut réalisé SUR UNE OBLIGATION PÉRIODIQUE — la ligne attend aussi.
 *    « Réalisé » y dit qu'un contrôle a eu lieu, pas que le suivant n'est pas
 *    dû ; c'est la rangée d'avant l'ADR-034, gelée avec le rendez-vous suivant
 *    dans `datePrevue`. Un préfiltre SQL sur les seuls statuts ouverts la
 *    faisait disparaître du tableau de bord avant même que le classement TS
 *    ait pu la lire — le classement corrigé ne servait à rien sur elle.
 *
 * `PERIODICITES_SANS_SUITE` est dérivée de la table du référentiel : la
 * clause et le prédicat s'appuient sur la même définition de « cyclique ».
 * `portee.test.ts` garde l'accord entre les deux sur une table de cas.
 */
export function echeanceAttendue(): Prisma.VerificationWhereInput {
  return {
    OR: [
      { statut: { in: ["a_planifier" as const, "planifiee" as const, "depassee" as const] } },
      {
        statut: { in: [...STATUTS_REALISES_PERSISTES] },
        periodicite: { notIn: [...PERIODICITES_SANS_SUITE] },
      },
    ],
  };
}

/**
 * Les échéances qu'un écran peut ANNONCER : attendues, et non éteintes.
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
    AND: [echeanceAttendue(), { archiveLe: null }],
  };
}
