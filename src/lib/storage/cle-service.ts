/**
 * La clé de service Supabase telle qu'elle arrive dans l'environnement — et
 * ce qu'on peut en dire SANS la dire (2026-09-27, `lot/stockage-supabase-suite`).
 *
 * L'INCIDENT QUI FAIT CE MODULE. En production, le premier dépôt a échoué deux
 * fois : « Invalid Compact JWS ». C'est la réponse de Storage quand l'en-tête
 * `Authorization: Bearer …` ne porte pas un JWT bien formé : une clé collée
 * avec un espace, un retour à la ligne ou des guillemets ; une clé d'un autre
 * format ; ou autre chose qu'une clé (le « JWT secret » du projet).
 *
 * Deux parades :
 * - `nettoyer` retire ce qu'un copier-coller ajoute : blancs aux bords,
 *   guillemets entourants (droits ou typographiques) ;
 * - `diagnostic` dit la FORME de la clé — JWT à trois segments et son rôle,
 *   `sb_secret_…`, `sb_publishable_…`, autre — et sa longueur. Jamais sa
 *   valeur, jamais sa signature : le rôle vient de la charge utile du JWT,
 *   qui n'est pas secrète (elle se décode sans clé), et c'est lui qui dit si
 *   l'on a collé la clé `anon` au lieu de `service_role`.
 *
 * LES CLÉS `sb_secret_…` SONT REFUSÉES, et c'est une décision documentée, pas
 * un oubli. La documentation de Supabase (« API keys », relue le 2026-09-27) :
 * « Publishable and secret keys are short strings, not JWTs » ; « Send
 * publishable and secret keys on the `apikey` header, not on `Authorization:
 * Bearer` ». Or supabase-js 2.104.0 (version du lockfile) pose la clé sur LES
 * DEUX en-têtes (`fetchWithAuth` : `Authorization: Bearer ${clé}`), et la
 * documentation ne dit rien de Storage avec ces clés. Plutôt que de laisser
 * partir « Invalid Compact JWS », le pilote demande la clé `service_role` au
 * format JWT (« Legacy API keys » dans le tableau de bord), que la même
 * documentation garde valide : « Both key systems work at the same time ».
 */

export type FormeCle =
  | { forme: "jwt"; role: string | null; longueur: number }
  | { forme: "sb_secret" | "sb_publishable" | "autre" | "vide"; longueur: number };

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

const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function formeDeLaCle(cle: string): FormeCle {
  const longueur = cle.length;
  if (longueur === 0) return { forme: "vide", longueur };
  if (cle.startsWith("sb_secret_")) return { forme: "sb_secret", longueur };
  if (cle.startsWith("sb_publishable_")) return { forme: "sb_publishable", longueur };
  if (JWT.test(cle)) {
    let role: string | null = null;
    try {
      const charge = JSON.parse(Buffer.from(cle.split(".")[1], "base64url").toString("utf8"));
      role = typeof charge?.role === "string" ? charge.role : null;
    } catch {
      role = null;
    }
    return { forme: "jwt", role, longueur };
  }
  return { forme: "autre", longueur };
}

/** Ce qui s'écrit au journal : la forme, le rôle d'un JWT, la longueur. Jamais la valeur. */
export function diagnostic(f: FormeCle): string {
  const quoi =
    f.forme === "jwt"
      ? `JWT à trois segments, rôle « ${f.role ?? "illisible"} »`
      : f.forme === "sb_secret"
        ? "clé secrète au nouveau format (sb_secret_…)"
        : f.forme === "sb_publishable"
          ? "clé publique au nouveau format (sb_publishable_…)"
          : f.forme === "vide"
            ? "vide"
            : "ni un JWT ni une clé sb_… (espace, retour à la ligne ou guillemet intérieurs ? autre valeur collée ?)";
  return `${quoi}, ${f.longueur} caractères`;
}

/** Le motif de refus d'une clé, ou `null` si c'est bien une clé `service_role` au format JWT. */
export function refusDeLaCle(f: FormeCle): string | null {
  if (f.forme === "jwt" && f.role === "service_role") return null;
  return (
    `SUPABASE_SERVICE_ROLE_KEY n'est pas utilisable (${diagnostic(f)}) : ` +
    "utilisez la clé service_role au format JWT (eyJ…, tableau de bord Supabase → " +
    "Settings → API Keys → Legacy API keys → service_role)."
  );
}
