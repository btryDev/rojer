/**
 * Où vivent la fiche d'un contrôle et celle d'un point à corriger (ADR-048,
 * contrôle visuel du 2026-10-24). Le rail se déduit du CHEMIN
 * (`deduireActif`) : le contrôle d'un appareil et ses points vivent sous la
 * fiche de l'appareil, qui les centralise ; un contrôle d'ensemble, sous le
 * calendrier ; une mesure du DUERP, au plan d'actions. Les anciennes adresses
 * redirigent vers celles-ci (chaque fiche compare son chemin au sien).
 */

const base = (etablissementId: string) => `/etablissements/${etablissementId}`;

export function cheminControle(
  etablissementId: string,
  v: { id: string; equipementId: string | null },
): string {
  return v.equipementId
    ? `${base(etablissementId)}/equipements/${v.equipementId}/controles/${v.id}`
    : `${base(etablissementId)}/verifications/${v.id}`;
}

/**
 * L'appareil d'une action : celui de son contrôle, à défaut celui qu'un
 * contrôle d'ensemble a désigné. Nul pour une mesure du DUERP.
 */
export function appareilDeLAction(a: {
  verificationId: string | null;
  equipementId: string | null;
  verification?: { equipementId: string | null } | null;
}): string | null {
  if (a.verificationId === null) return null;
  return a.verification?.equipementId ?? a.equipementId ?? null;
}

export function cheminAction(
  etablissementId: string,
  a: { id: string; appareilId: string | null },
): string {
  return a.appareilId
    ? `${base(etablissementId)}/equipements/${a.appareilId}/points/${a.id}`
    : `${base(etablissementId)}/actions/${a.id}`;
}

/** Un chemin et les paramètres reçus, pour rediriger sans les perdre. */
export function avecParametres(
  chemin: string,
  parametres: Record<string, string | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(parametres)) if (v !== undefined) q.set(k, v);
  const s = q.toString();
  return s ? `${chemin}?${s}` : chemin;
}
