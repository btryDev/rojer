/**
 * Une obligation à l'INITIATIVE DE L'ADMINISTRATION, montrée « pour
 * information » (2026-10-08, C64 — décision 2 de la synthèse de revue,
 * option A, sans migration).
 *
 * Le cas : la visite périodique de la commission de sécurité d'un ERP (GE 4
 * § 1 pour les quatre premières catégories, PE 37 en 5ᵉ). Le texte la met à
 * la charge de la commission, que l'administration déclenche ; l'exploitant
 * la reçoit, il ne la commande pas. Le préventeur : « une information ».
 * Rojer la montrait comme une échéance de l'exploitant, réalisée par un
 * « organisme agréé » : un retard qu'il ne peut pas lever, un « à faire » qu'il
 * ne peut pas faire, un point d'indice qu'il ne peut pas regagner.
 *
 * Ce que le marqueur fait, partout où une ligne s'affiche ou se compte :
 *  · la ligne RESTE visible, avec son rythme et sa date ;
 *  · elle n'est NI en retard, NI « à planifier », NI « à venir », et n'entre
 *    pas dans l'indice — `repartirVerifications` la met à part, et les
 *    prédicats « qui comptent » (`calendrier/prudence.ts`) la sortent ;
 *  · elle se peint « Pour information » et son réalisateur affiché est la
 *    commission de sécurité ;
 *  · l'exploitant peut toujours y déposer le procès-verbal de visite, qui se
 *    trace au registre comme tout rapport.
 *
 * MODULE FEUILLE, SANS LE RÉFÉRENTIEL : les widgets du tableau de bord et le
 * calendrier sont rendus côté client, et aucun composant client n'importe le
 * référentiel entier. La liste des identifiants est donc écrite ICI, une
 * fois ; `initiative.test.ts` la tient égale, dans les deux sens, aux
 * obligations qui portent `initiative: "administration"`. Le champ reste la
 * déclaration (types.ts) ; la liste en est la projection client.
 *
 * `realisateurs` N'EST PAS TOUCHÉ : il reste `organisme_agree` sur ces lignes,
 * parce que l'enum Prisma `Realisateur` n'a pas de valeur « commission de
 * sécurité » et que la colonne `Verification.realisateurRequis` la recopie. Le
 * marqueur décide de ce qui s'AFFICHE (`libelleRealisateurs`).
 */

/** Qui déclenche l'acte, quand ce n'est pas l'exploitant. Une seule valeur. */
export type InitiativeObligation = "administration";

/**
 * Les obligations qui portent `initiative: "administration"`. Projection
 * client du champ — voir l'en-tête.
 */
export const OBLIGATIONS_A_L_INITIATIVE_DE_L_ADMINISTRATION: ReadonlySet<string> =
  new Set([
    "incendie-erp-5-visite-commission",
    "incendie-erp-visite-commission-cat1-2-triennale",
    "incendie-erp-visite-commission-cat1-2-quinquennale",
    "incendie-erp-visite-commission-cat3-triennale",
    "incendie-erp-visite-commission-cat3-quinquennale",
    "incendie-erp-visite-commission-cat4-triennale",
    "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale",
    "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale",
    "incendie-erp-visite-commission-cat4-quinquennale",
  ]);

/** La phrase, écrite une fois pour toutes les surfaces. */
export const MENTION_POUR_INFORMATION =
  "Pour information — visite à l'initiative de l'administration";

/** Le libellé court d'une pastille. */
export const LIBELLE_POUR_INFORMATION = "Pour information";

/** Le réalisateur affiché, à la place de « Organisme agréé ». */
export const REALISATEUR_POUR_INFORMATION = "Commission de sécurité";

/** LA fonction : l'obligation est-elle « pour information » ? */
export function estPourInformation(o: { initiative?: InitiativeObligation }): boolean {
  return o.initiative === "administration";
}

/**
 * La même question, posée sur une LIGNE (`Verification`) par son
 * `obligationId` — sans charger le référentiel. Une ligne née d'une
 * prescription sur mesure (`prescription:<id>`) n'y est jamais.
 */
export function estLignePourInformation(v: { obligationId?: string | null }): boolean {
  return (
    typeof v.obligationId === "string" &&
    OBLIGATIONS_A_L_INITIATIVE_DE_L_ADMINISTRATION.has(v.obligationId)
  );
}

/**
 * Les réalisateurs à AFFICHER pour une ligne : « Commission de sécurité » sur
 * une ligne pour information, sinon les libellés reçus.
 */
export function libelleRealisateurs(
  v: { obligationId?: string | null },
  libelles: readonly string[],
): string[] {
  return estLignePourInformation(v) ? [REALISATEUR_POUR_INFORMATION] : [...libelles];
}
