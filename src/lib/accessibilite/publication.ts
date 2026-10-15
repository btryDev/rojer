// Module pur, lu jusque dans le tableau de bord client (`dashboard/obligations`).
// `registreAuDossier`, qui lit l'adresse publique de l'application
// (`refusUrlPublique`, `lib/email`, serveur seulement), vit dans
// `registre-au-dossier.ts` depuis le 2026-10-14 (audit Next.js, M3).

/**
 * Le registre d'accessibilité est-il servi au public ? — LA règle, lue par
 * la page publique et son affiche (`getRegistrePublicParSlug`), le ZIP de
 * contrôle, « Préparer un contrôle » et la matrice du tableau de bord.
 *
 * Publié ET établissement ERP (2026-10-12, audit des modules). Un ERP
 * repassé non-ERP restait publié — la page n'offre plus le bouton de
 * retrait hors ERP —, la page publique lisait `publie` seul, et la matrice
 * peignait la ligne en vert quand la barre latérale la disait « non
 * applicable ». Rien n'est effacé : `publie` garde sa valeur, et le registre
 * revient en ligne si l'établissement redevient ERP.
 */
export function registreServiAuPublic(r: {
  publie: boolean;
  estERP: boolean;
}): boolean {
  return r.publie && r.estERP;
}
