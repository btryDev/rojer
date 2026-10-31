// Authentification OAuth 2.1 du serveur MCP distant — cf. ADR-013.
//
// Le pendant de `./acces-http`, dont il a vocation à prendre la place. Là où
// l'URL capacitaire portait un secret partagé figé dans l'environnement, ici
// c'est le porteur du jeton qui décide de la portée : chaque dirigeant lit
// son établissement, sans configuration par utilisateur.
//
// Supabase Auth tient le rôle de serveur d'autorisation (capacité OAuth 2.1,
// beta publique). Ce module n'émet rien et ne gère aucun compte : il vérifie
// un jeton et en déduit une portée. Conformément à ADR-005, il n'existe pas
// de second référentiel d'identité — le `sub` du jeton *est* l'UUID Supabase
// stocké dans `Entreprise.userId`.
//
// La chaîne de résolution part toujours du jeton, jamais d'une valeur
// choisie par le client :
//
//     jeton.sub → Entreprise.userId → Etablissement.id
//
// ~~`Entreprise.userId` est unique (ADR-005) : le premier maillon reste
// univoque~~ [2026-10-26 : un compte suit plusieurs entreprises, une par
// SIREN ; le premier maillon se lit en filtre — `entreprise: { userId }` —,
// et c'est toujours lui qui cloisonne]. Le second n'est pas univoque non plus. Depuis
// l'ADR-028 une entreprise porte autant d'établissements qu'elle en a, et la
// phrase qui tenait ici — « il n'y a qu'un chemin, donc rien à négocier » —
// est devenue fausse : elle décrivait une contrainte de base qui n'existe plus.
//
// **Le serveur ne choisit donc plus à la place du porteur.** Quand le compte
// porte plusieurs établissements, la requête doit en désigner un, par le
// paramètre `etablissement` de l'URL du serveur — la seule entrée dont un
// client MCP dispose, puisque la portée n'est et ne sera jamais un argument
// d'outil (cf. `./tools`, règle 1). À défaut de désignation, on répond en
// LISTANT ce que le porteur possède : c'est à lui de trancher, pas à nous.
// C'est l'amendement à l'ADR-013.
//
// Un identifiant désigné est revalidé contre la liste du porteur avant d'être
// servi. Il arrive du client : le lire sans le confronter à `Entreprise.userId`
// remplacerait le cloisonnement par une politesse.
//
// Ce qui n'est **pas** vérifié ici, et pourquoi : l'audience. Les jetons
// Supabase portent `aud: "authenticated"`, pas l'URL du serveur MCP. Un
// contrôle d'audience strict rejetterait donc tous les jetons légitimes. Cf.
// ADR-013 point 8 — un Custom Access Token Hook permettrait de le rétablir.

import { lireHotePublic, lireHotesAutorises } from "./hotes";
import type { ScopeMcp } from "./tools";

/** Chemin du point d'entrée MCP, sous lequel les clients postent. */
export const CHEMIN_MCP = "/api/mcp";

/**
 * Chemin des métadonnées de ressource protégée (RFC 9728).
 *
 * La forme est imposée : le suffixe est le chemin de la ressource, ajouté
 * *après* le segment `.well-known`. Un client qui ne trouve pas l'en-tête
 * `WWW-Authenticate` sonde cette URL avant la racine.
 */
export const CHEMIN_METADONNEES_RESSOURCE =
  `/.well-known/oauth-protected-resource${CHEMIN_MCP}` as const;

export type ConfigOauthMcp = {
  /** Émetteur Supabase — `https://<ref>.supabase.co/auth/v1`. */
  issuer: string;
  /**
   * Origine publique déclarée (`https://rojer.fr`), ou `null` si aucune ne
   * l'est. Quand elle est déclarée, elle prime : derrière un proxy, c'est la
   * seule source fiable de l'URL vue par le client.
   */
  origineDeclaree: string | null;
  hotesAutorises: string[];
  originesAutorisees: string[];
};

/**
 * Lit la configuration OAuth dans l'environnement.
 *
 * Rend `null` — plutôt que de lever — quand elle est incomplète : comme pour
 * l'accès par clé, un déploiement mal configuré doit se comporter comme une
 * route fermée, pas comme un service en panne.
 */
export function lireConfigOauthMcp(
  env: NodeJS.ProcessEnv = process.env,
): ConfigOauthMcp | null {
  const urlSupabase = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!urlSupabase) return null;

  const hote = lireHotePublic(env);
  const estLocal =
    !hote || hote.startsWith("localhost") || hote.startsWith("127.0.0.1");

  const hotesAutorises = lireHotesAutorises(env);

  return {
    issuer: `${urlSupabase}/auth/v1`,
    // La boucle locale n'est pas une origine publique : son port varie et
    // n'est pas déclaré ici. On la laisse à `origineEffective`, qui la lira
    // sur la requête — seul endroit où le port est connu.
    origineDeclaree: hote && !estLocal ? `https://${hote}` : null,
    hotesAutorises,
    originesAutorisees: hotesAutorises,
  };
}

/**
 * Origine sous laquelle le client a effectivement joint le serveur.
 *
 * L'origine déclarée prime : derrière un proxy, l'hôte de la requête est
 * celui du dernier saut, pas celui que le client a saisi. À défaut, on lit
 * les en-têtes de transfert puis, en dernier recours, l'URL de la requête —
 * c'est ce qui rend le développement local possible sans rien déclarer.
 */
export function origineEffective(
  config: ConfigOauthMcp | null,
  request: Request,
): string {
  if (config?.origineDeclaree) return config.origineDeclaree;

  const hote =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const schema =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");

  return hote ? `${schema}://${hote}` : new URL(request.url).origin;
}

/** URLs RFC 9728 de la ressource, pour l'origine effective de la requête. */
export function urlsRessource(
  config: ConfigOauthMcp | null,
  request: Request,
): { ressource: string; urlMetadonnees: string } {
  const origine = origineEffective(config, request);
  return {
    ressource: `${origine}${CHEMIN_MCP}`,
    urlMetadonnees: `${origine}${CHEMIN_METADONNEES_RESSOURCE}`,
  };
}

/**
 * Extrait le jeton porteur d'une requête.
 *
 * Seul le schéma `Bearer` est accepté, insensible à la casse comme l'exige
 * la RFC 6750. Un jeton passé en paramètre d'URL est **ignoré
 * volontairement** : la spécification MCP l'interdit explicitement, et
 * l'accepter « pour dépanner » recréerait le défaut que cette bascule
 * corrige.
 */
export function extraireJetonPorteur(request: Request): string | undefined {
  const brut = request.headers.get("authorization");
  if (!brut) return undefined;

  const [schema, ...reste] = brut.trim().split(/\s+/);
  if (schema?.toLowerCase() !== "bearer") return undefined;

  const jeton = reste.join(" ").trim();
  return jeton.length > 0 ? jeton : undefined;
}

/** Ce que le vérificateur doit rendre : les revendications, ou `null`. */
export type RevendicationsJeton = { sub?: unknown };

/**
 * Vérifie la signature et l'expiration d'un jeton, et rend ses
 * revendications. Injecté pour que la résolution de portée soit testable
 * sans réseau ni projet Supabase.
 */
export type VerificateurJeton = (
  jeton: string,
) => Promise<RevendicationsJeton | null>;

/** Un établissement du porteur, tel qu'on le lui présente pour qu'il choisisse. */
export type EtablissementDuPorteur = { id: string; nom: string };

/**
 * Recherche des établissements d'un utilisateur, injectée de même.
 *
 * Elle rend la LISTE, et c'est le cœur de l'amendement de l'ADR-028 : tant
 * qu'elle rendait un identifiant, elle choisissait — en s'appuyant sur une
 * contrainte de base qui n'existe plus. Une liste vide est un refus (compte
 * créé, onboarding non terminé), pas une erreur.
 */
export type ChercheurEtablissement = (
  userId: string,
) => Promise<EtablissementDuPorteur[]>;

/**
 * Ce que la résolution rend, et les trois seules issues possibles.
 *
 * `refus` et `choix_requis` sont distincts parce qu'ils appellent des réponses
 * HTTP différentes, et que les confondre casserait le client : `refus` produit
 * le `401` qui déclenche le flux OAuth, alors que `choix_requis` survient
 * **avec un jeton parfaitement valide**. Répondre `401` là ferait boucler le
 * client sur une authentification qui réussit et ne débloque rien.
 */
export type ResolutionScope =
  | { statut: "ok"; scope: ScopeMcp }
  | { statut: "refus" }
  | { statut: "choix_requis"; etablissements: EtablissementDuPorteur[] };

const REFUS = { statut: "refus" } as const;

/** Nom du paramètre d'URL par lequel un client désigne son établissement. */
export const PARAM_ETABLISSEMENT = "etablissement";

/**
 * Établit la portée d'une requête à partir de son jeton porteur.
 *
 * Refus par défaut. Les quatre causes de refus (pas de jeton, jeton invalide,
 * `sub` absent, porteur sans aucun établissement) restent volontairement
 * indistinguables de l'extérieur : elles produisent toutes le même `401`.
 *
 * S'y ajoute une cinquième issue, qui n'est pas un refus : le porteur a
 * plusieurs établissements et n'en a désigné aucun. Voir `ResolutionScope`.
 *
 * Un identifiant désigné qui n'appartient pas au porteur ne bascule PAS sur un
 * défaut — même quand le porteur n'en a qu'un seul, auquel cas servir « son »
 * établissement ignorerait silencieusement une demande explicite. Il redemande
 * un choix, en listant. C'est aussi ce qui rend inopérante la seule attaque que
 * ce paramètre ouvre : deviner l'identifiant d'un établissement d'autrui.
 */
export async function resoudreScopeDepuisJeton(
  request: Request,
  deps: {
    verifier: VerificateurJeton;
    chercherEtablissement: ChercheurEtablissement;
  },
): Promise<ResolutionScope> {
  const jeton = extraireJetonPorteur(request);
  if (!jeton) return REFUS;

  let revendications: RevendicationsJeton | null;
  try {
    revendications = await deps.verifier(jeton);
  } catch {
    // Un vérificateur qui lève (réseau indisponible, JWKS injoignable) ne
    // doit pas produire un 500 : de l'extérieur, c'est un refus.
    return REFUS;
  }

  const sub = revendications?.sub;
  if (typeof sub !== "string" || sub.length === 0) return REFUS;

  const etablissements = await deps.chercherEtablissement(sub);
  if (etablissements.length === 0) return REFUS;

  const designe = new URL(request.url).searchParams
    .get(PARAM_ETABLISSEMENT)
    ?.trim();

  if (designe) {
    const cible = etablissements.find((e) => e.id === designe);
    return cible
      ? { statut: "ok", scope: { etablissementId: cible.id, userId: sub } }
      : { statut: "choix_requis", etablissements };
  }

  // Un seul établissement : il n'y a rien à désambiguïser, et exiger un
  // paramètre casserait tous les connecteurs déjà configurés.
  if (etablissements.length === 1) {
    return { statut: "ok", scope: { etablissementId: etablissements[0].id, userId: sub } };
  }

  return { statut: "choix_requis", etablissements };
}

/**
 * Réponse rendue quand le porteur doit désigner son établissement.
 *
 * `400`, et surtout pas `401` : le jeton est valide, l'authentification n'a
 * rien à rejouer. Le corps porte la liste et l'URL à utiliser — sans elle, le
 * message dirait « choisissez » sans dire parmi quoi ni comment, ce qui est une
 * autre façon de ne pas répondre.
 */
export function reponseChoixEtablissementRequis(
  request: Request,
  etablissements: EtablissementDuPorteur[],
): Response {
  const url = new URL(request.url);
  url.search = "";

  return new Response(
    JSON.stringify({
      error: "etablissement_a_designer",
      error_description:
        `Ce compte porte ${etablissements.length} établissements. ` +
        `Ajoutez « ?${PARAM_ETABLISSEMENT}=<identifiant> » à l'URL du serveur ` +
        "pour désigner celui à consulter.",
      etablissements,
      exemple: `${url.toString()}?${PARAM_ETABLISSEMENT}=${etablissements[0]?.id ?? ""}`,
    }),
    { status: 400, headers: { "content-type": "application/json" } },
  );
}

/**
 * Construit la réponse de refus.
 *
 * C'est cette réponse qui déclenche le flux OAuth côté client : un `401`
 * porteur d'un en-tête `WWW-Authenticate` désignant les métadonnées de la
 * ressource. Une erreur d'outil renvoyée dans un `200` ne le déclencherait
 * pas — le client l'afficherait comme un échec et ne proposerait jamais de
 * se connecter.
 *
 * Le paramètre `scope` est omis : le serveur est en lecture seule et ne
 * distingue pas de portées applicatives. À défaut, le client demandera les
 * scopes annoncés par les métadonnées.
 */
export function reponseAuthentificationRequise(
  config: ConfigOauthMcp | null,
  request: Request,
): Response {
  const entetes: Record<string, string> = {
    "content-type": "application/json",
  };

  if (config) {
    const { urlMetadonnees } = urlsRessource(config, request);
    entetes["www-authenticate"] =
      `Bearer error="invalid_token", ` +
      `error_description="Jeton absent ou invalide", ` +
      `resource_metadata="${urlMetadonnees}"`;
  }

  return new Response(
    JSON.stringify({
      error: "invalid_token",
      error_description: "Authentification requise pour ce serveur MCP.",
    }),
    { status: 401, headers: entetes },
  );
}

/**
 * Document de métadonnées de ressource protégée (RFC 9728).
 *
 * `resource` doit correspondre **exactement** à l'URL que l'utilisateur
 * saisit côté client, chemin compris : un client qui constate un écart
 * refuse le document. `authorization_servers` ne comporte qu'une entrée —
 * les clients ne garantissent pas d'essayer les suivantes.
 */
export function metadonneesRessourceProtegee(
  config: ConfigOauthMcp,
  request: Request,
) {
  return {
    resource: urlsRessource(config, request).ressource,
    authorization_servers: [config.issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "email"],
  };
}
