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

/** Les demandes d'authentification que seule une connexion récente satisfait. */
const PROMPTS_DE_CONNEXION = new Set(["login", "create"]);

/**
 * La session a-t-elle été ouverte APRÈS que le fournisseur a signé la
 * demande (`ba_iat`, en millisecondes) ? C'est la règle du fournisseur
 * (`isSessionFreshForSignedQuery`) : seule une telle session satisfait
 * `prompt=login` ou un `max_age` dépassé.
 */
function sessionPosterieure(params: URLSearchParams, sessionCreeeLe: Date): boolean {
  const emise = Number(params.get("ba_iat"));
  return Number.isFinite(emise) && emise > 0 && sessionCreeeLe.getTime() >= emise;
}

/**
 * La requête d'autorisation à rejouer, une fois connecté, sans les
 * paramètres de signature. `prompt=login`, `prompt=create` et `max_age` —
 * qui ont fait passer le fournisseur par ici alors qu'une session existait —
 * ne se retirent que si la session est postérieure à la demande : les garder
 * ferait boucler, les retirer sur une vieille session sauterait la
 * reconnexion exigée. `null` : la demande exige une connexion que la session
 * ne satisfait pas (Claude n'envoie ni l'un ni l'autre).
 */
export function requeteARejouer(requeteSignee: string, sessionCreeeLe: Date): string | null {
  const params = new URLSearchParams(requeteSignee);
  const prompts = (params.get("prompt") ?? "").split(" ").filter(Boolean);
  const exigeConnexion = prompts.some((v) => PROMPTS_DE_CONNEXION.has(v)) || params.has("max_age");
  if (exigeConnexion && !sessionPosterieure(params, sessionCreeeLe)) return null;
  for (const p of PARAMETRES_DE_SIGNATURE) params.delete(p);
  const restants = prompts.filter((v) => !PROMPTS_DE_CONNEXION.has(v));
  if (restants.length) params.set("prompt", restants.join(" "));
  else params.delete("prompt");
  params.delete("max_age");
  return params.toString();
}
