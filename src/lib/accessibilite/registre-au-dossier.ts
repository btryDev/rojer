import { refusUrlPublique } from "@/lib/email";
import { registreServiAuPublic } from "./publication";

// Sorti de `publication.ts` le 2026-10-14 (audit Next.js, M3) : la règle lit
// l'adresse publique de l'application, qui ne vit que côté serveur
// (`lib/email`, `server-only`), et `publication.ts` est tiré par le tableau
// de bord client.

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
