import { refusUrlPublique } from "@/lib/email";

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

/**
 * Le registre part-il au dossier de contrôle ? — LA règle du ZIP (pièce
 * `05`) et de « Préparer un contrôle », qui l'annonce (relecture
 * indépendante du 2026-10-12). La page disait « Publié et consultable en
 * ligne » quand le ZIP écartait la pièce faute d'adresse publique en
 * production ; et le README disait « registre non publié » d'un registre
 * publié dont l'établissement n'est plus un ERP.
 *
 * Dans l'ordre : pas un ERP → non applicable ; non publié ; publié mais sans
 * adresse publique de l'application (`refusUrlPublique`) → non joint.
 */
export type RegistreAuDossier =
  | { joint: true }
  | { joint: false; raison: "non_erp" | "non_publie" | "adresse_absente" };

export function registreAuDossier(r: {
  publie: boolean;
  estERP: boolean;
}): RegistreAuDossier {
  if (!r.estERP) return { joint: false, raison: "non_erp" };
  if (!registreServiAuPublic(r)) return { joint: false, raison: "non_publie" };
  if (refusUrlPublique()) return { joint: false, raison: "adresse_absente" };
  return { joint: true };
}
