// Reprise d'une autorisation OAuth après la connexion (ADR-062 § 7), sans
// dépendance : `/oauth/reprendre` la lit.
//
// Le fournisseur envoie la personne non connectée sur sa `loginPage` avec la
// requête d'autorisation SIGNÉE (`sig`, `exp`, `ba_*`). On ne passe pas par
// la reprise automatique du plugin, accrochée à la réponse de la connexion :
// elle ne survit pas au détour par la double authentification. On renvoie
// plutôt vers `/login` avec cette page en `next`, et, une fois la session
// posée, on rejoue la requête d'autorisation d'origine — que le fournisseur
// revérifie entièrement (client, adresse de retour, PKCE, ressource).

/** Paramètres de signature ajoutés par le fournisseur, à retirer avant de rejouer. */
const PARAMETRES_DE_SIGNATURE = ["sig", "exp", "ba_iat", "ba_pl"];

/**
 * La requête d'autorisation à rejouer, une fois connecté : sans les
 * paramètres de signature, sans `prompt=login` (la connexion vient d'avoir
 * lieu : le garder ferait boucler) ni `max_age` (même raison — Claude n'en
 * envoie pas).
 */
export function requeteARejouer(requeteSignee: string): string {
  const params = new URLSearchParams(requeteSignee);
  for (const p of PARAMETRES_DE_SIGNATURE) params.delete(p);
  const prompt = (params.get("prompt") ?? "").split(" ").filter((v) => v && v !== "login");
  if (prompt.length) params.set("prompt", prompt.join(" "));
  else params.delete("prompt");
  params.delete("max_age");
  return params.toString();
}
