import type { MetadataRoute } from "next";
import { PAGES_LEGALES } from "@/components/landing/pages-legales";
import { OUVERT_AUX_MOTEURS } from "@/lib/indexation";
import { OUVERT_AU_PUBLIC } from "@/lib/ouverture";
import { adressePubliqueOuNull } from "@/lib/url-publique";

/**
 * `sitemap.xml` (2026-11-23, décision de la propriétaire : la page publique
 * part en ligne et doit être trouvée). Les pages publiques qui ont quelque
 * chose à dire à un moteur : l'accueil, la page d'attente, les conditions
 * générales et les pages légales — les mêmes que `RACINES_INDEXABLES`
 * (`robots.ts`), sans `/login` ni `/signup`, des portes sans contenu.
 *
 * Vide tant que le site est fermé aux moteurs, ou que l'adresse publique est
 * inconnue : jamais un `localhost` dans un plan servi.
 */
export const PAGES_DU_PLAN: readonly string[] = [
  "/",
  // La page d'attente, tant que les inscriptions sont fermées seulement.
  ...(OUVERT_AU_PUBLIC ? [] : ["/bientot"]),
  "/conditions",
  ...PAGES_LEGALES.map((p) => `/legal/${p.slug}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = adressePubliqueOuNull();
  if (!OUVERT_AUX_MOTEURS || !base || !process.env.PUBLIC_APP_URL) return [];
  return PAGES_DU_PLAN.map((chemin) => ({
    url: chemin === "/" ? base : `${base}${chemin}`,
    changeFrequency: chemin === "/" ? "weekly" : "monthly",
    priority: chemin === "/" ? 1 : 0.5,
  }));
}
