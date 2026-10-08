/**
 * Ce qu'on dit d'une obligation que Rojer ne suit plus, quand quelque chose la
 * vise encore — une prescription particulière, typiquement (revue du
 * 2026-10-07, correction 11).
 *
 * Jusqu'ici une prescription qui renforçait une obligation retirée du
 * référentiel était écartée avec « l'obligation ciblée ne s'applique pas (ou
 * plus) à votre établissement » : c'est faux dans le sens qui coûte. Le texte
 * s'applique peut-être toujours — c'est Rojer qui a cessé de le suivre
 * (`OBLIGATIONS_RETIREES`), et le dirigeant qui détient un acte doit pouvoir
 * le reporter en obligation sur mesure. La page affichait en outre l'id brut.
 *
 * Le motif d'`OBLIGATIONS_RETIREES` est écrit pour le relecteur (décisions,
 * annotations, renvois de code) : il n'est pas affiché tel quel. On en dit la
 * date de retrait et, s'il y en a un, l'absorbant.
 */

import { OBLIGATIONS_RETIREES, obligationParId } from "@/lib/referentiels/conformite";

/** La date de retrait que le motif écrit (« Retirée le 2026-10-07 »), sinon `null`. */
function dateDeRetrait(motif: string): string | null {
  return /Retirée? le (\d{4}-\d{2}-\d{2})/.exec(motif)?.[1] ?? null;
}

/**
 * La raison affichée quand une prescription vise une obligation retirée, ou
 * `null` si l'id n'est pas au registre des retraits.
 */
export function raisonObligationRetiree(obligationId: string): string | null {
  const r = OBLIGATIONS_RETIREES[obligationId];
  if (!r) return null;
  const date = dateDeRetrait(r.motif);
  const absorbant = r.absorbePar ? obligationParId(r.absorbePar) : undefined;
  const pourquoi = [
    date ? `retirée du référentiel le ${date}` : "retirée du référentiel",
    absorbant ? `reprise par « ${absorbant.libelle} »` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `Rojer ne suit plus cette obligation (${pourquoi}) : la prescription n'a rien à renforcer. Si l'acte vous impose ce contrôle, enregistrez-le comme obligation propre à votre établissement (obligation sur mesure).`;
}

/**
 * Un libellé lisible pour une obligation retirée : le dernier libellé connu
 * (celui que portaient ses lignes de suivi), sinon l'objet que le motif nomme
 * en tête quand il en nomme un (« Déclaration et contrôle de mise en service
 * (arrêté du 20 novembre 2017, art. 7 à 11) »), sinon l'identifiant.
 */
export function libelleObligationRetiree(
  obligationId: string,
  dernierLibelleConnu?: string | null,
): string {
  if (dernierLibelleConnu) return dernierLibelleConnu;
  const motif = OBLIGATIONS_RETIREES[obligationId]?.motif;
  if (motif && !/^Retirée?\b/.test(motif)) {
    const tete = motif.split(/\.\s+(?=Retirée?\b)| — /)[0].trim();
    if (tete) return tete;
  }
  return obligationId;
}
