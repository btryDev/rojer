// Où renvoyer l'utilisateur après connexion ou confirmation d'adresse.
//
// La valeur vient de l'URL (`/login?next=…` ; ~~`/auth/callback?next=…`~~, retiré avec Supabase, ADR-052) : elle
// se forge et s'envoie par mail à n'importe qui. Suivie telle quelle, elle
// faisait de la page de connexion de Rojer un tremplin vers un site tiers,
// juste après que la victime a tapé son mot de passe (audit du 2026-10-13, C1
// et C2). Une seule règle, lue partout où `next` est lu : la page de
// connexion, l'action.

export const CHEMIN_DE_RETOUR_PAR_DEFAUT = "/entreprises";

// Origine fictive : sert seulement à vérifier que le chemin, résolu comme le
// ferait un navigateur, ne change pas d'hôte.
const ORIGINE_SONDE = "http://origine.invalid";

// Au-delà, ce n'est plus un chemin de l'application mais une charge.
const LONGUEUR_MAX = 2048;

function sortDeLOrigine(chemin: string): boolean {
  if (!chemin.startsWith("/") || chemin.startsWith("//")) return true;
  for (const c of chemin) {
    const code = c.charCodeAt(0);
    if (c === "\\" || code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Le chemin interne porté par `brut`, ou le défaut s'il pourrait sortir de
 * l'application : il doit commencer par un seul « / », ne contenir ni « \ »
 * (que les navigateurs lisent comme « / », d'où `/\evil.tld`), ni caractère de
 * contrôle (qu'ils suppriment, d'où `/\t/evil.tld`), et se résoudre sur la même
 * origine.
 *
 * Le contrôle porte sur la chaîne reçue ET sur le chemin résolu, qui est ce
 * qu'on renvoie : la résolution retire les segments point et FABRIQUE un « // »
 * absent de l'entrée (`/.//evil.tld` → `//evil.tld`, `/%2e%2e//evil.tld`
 * aussi) — revue du lot, 2026-10-13.
 */
export function cheminDeRetour(brut: unknown): string {
  if (typeof brut !== "string" || brut.length > LONGUEUR_MAX) {
    return CHEMIN_DE_RETOUR_PAR_DEFAUT;
  }
  if (sortDeLOrigine(brut)) return CHEMIN_DE_RETOUR_PAR_DEFAUT;
  const url = new URL(brut, ORIGINE_SONDE);
  if (url.origin !== ORIGINE_SONDE) return CHEMIN_DE_RETOUR_PAR_DEFAUT;
  const resolu = `${url.pathname}${url.search}${url.hash}`;
  if (resolu.length > LONGUEUR_MAX || sortDeLOrigine(resolu)) {
    return CHEMIN_DE_RETOUR_PAR_DEFAUT;
  }
  return resolu;
}
