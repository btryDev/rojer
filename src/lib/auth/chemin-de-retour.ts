// Où renvoyer l'utilisateur après connexion ou confirmation d'adresse.
//
// La valeur vient de l'URL (`/login?next=…`, `/auth/callback?next=…`) : elle
// se forge et s'envoie par mail à n'importe qui. Suivie telle quelle, elle
// faisait de la page de connexion de Rojer un tremplin vers un site tiers,
// juste après que la victime a tapé son mot de passe (audit du 2026-10-13, C1
// et C2). Une seule règle, lue partout où `next` est lu : la page de
// connexion, l'action, le callback.

export const CHEMIN_DE_RETOUR_PAR_DEFAUT = "/entreprises";

// Origine fictive : sert seulement à vérifier que le chemin, résolu comme le
// ferait un navigateur, ne change pas d'hôte.
const ORIGINE_SONDE = "http://origine.invalid";

/**
 * Le chemin interne porté par `brut`, ou le défaut s'il pourrait sortir de
 * l'application : il doit commencer par un seul « / », ne contenir ni « \ »
 * (que les navigateurs lisent comme « / », d'où `/\evil.tld`), ni caractère de
 * contrôle (qu'ils suppriment, d'où `/\t/evil.tld`), et se résoudre sur la même
 * origine.
 */
export function cheminDeRetour(brut: unknown): string {
  if (typeof brut !== "string") return CHEMIN_DE_RETOUR_PAR_DEFAUT;
  if (!brut.startsWith("/") || brut.startsWith("//")) {
    return CHEMIN_DE_RETOUR_PAR_DEFAUT;
  }
  for (const c of brut) {
    const code = c.charCodeAt(0);
    if (c === "\\" || code < 0x20 || code === 0x7f) {
      return CHEMIN_DE_RETOUR_PAR_DEFAUT;
    }
  }
  const url = new URL(brut, ORIGINE_SONDE);
  if (url.origin !== ORIGINE_SONDE) return CHEMIN_DE_RETOUR_PAR_DEFAUT;
  return `${url.pathname}${url.search}${url.hash}`;
}
