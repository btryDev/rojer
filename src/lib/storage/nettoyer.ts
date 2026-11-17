/**
 * Une variable d'environnement telle qu'un copier-coller la laisse : blancs
 * aux bords, guillemets entourants (droits ou typographiques). Né le
 * 2026-09-27 pour la clé du stockage Supabase (« Invalid Compact JWS ») ;
 * [2026-11-17 : pilote Supabase retiré, la fonction sert le pilote s3.]
 */

/** Retire blancs aux bords et guillemets entourants — ce qu'ajoute un copier-coller. */
export function nettoyer(v: string | undefined): string {
  let s = (v ?? "").trim();
  for (;;) {
    const m = /^(["'“”«»‘’])([\s\S]*)(["'“”«»‘’])$/.exec(s);
    if (!m) break;
    s = m[2].trim();
  }
  return s;
}
