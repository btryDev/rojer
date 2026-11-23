import "server-only";
// Qui appelle `/api/mcp`, et pour quel compte (ADR-062 § 4).
//
// Dans cet ordre, le premier échec arrête :
//   1. le jeton, vérifié LOCALEMENT par `requireMcpAuth` (signature contre le
//      JWKS en mémoire, émetteur, audience = l'URL du serveur, expiration,
//      `azp`, portée `rojer:lecture`) — sinon 401 avec le défi RFC 9728, ou
//      403 `insufficient_scope` ;
//   2. son en-tête porte `typ: "at+jwt"` : la 1.7 de Better Auth tient pour
//      jeton d'accès tout JWT signé par ses clés qui porte `azp` et une
//      audience admise ; l'en-tête, couvert par la signature déjà vérifiée,
//      départage ;
//   3. la personne est toujours membre du compte du jeton (`Membre`, comme
//      `requireCompte`) — sinon 401 : le jeton ne vaut plus rien ;
//   3 bis. [2026-11-23] le consentement qui a émis le jeton existe toujours
//      (client, personne, compte), et ne lui est pas postérieur — sinon 401.
//      « Retirer » coupe donc l'accès tout de suite : le JWT de quinze
//      minutes, vérifié en mémoire seule, survivait au retrait jusqu'à son
//      expiration (relevé depuis claude.ai en préproduction). Et un jeton émis
//      avant un retrait ne revit pas au rebranchement ;
//   4. la formule : lue ici, appliquée par les outils (`ouvert`), qui
//      répondent « réservé au Pro » — un refus HTTP laisserait l'assistant
//      devant une erreur de connexion muette.

import { requireMcpAuth } from "@better-auth/mcp";
import { auth } from "@/lib/auth/better-auth";
import { estRole } from "@/lib/auth/roles";
import { connecteurOuvert } from "@/lib/abonnements/connecteur";
import { prisma } from "@/lib/prisma";
import { CLAIM_COMPTE } from "./compte-oauth";
import { getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/server";
import { PORTEE_LECTURE } from "./oauth";

/** Les claims d'un jeton vérifié (`jose` n'est pas une dépendance directe). */
type JWTPayload = Record<string, unknown>;

/** La portée d'une requête servie : la personne, son compte, et si le connecteur y est ouvert. */
export type PorteurMcp = {
  userId: string;
  compteId: string;
  /** Le client OAuth (`azp`), pour les journaux. */
  clientId: string;
  /** Abonnement ouvert en formule Pro (`connecteurOuvert`). */
  ouvert: boolean;
};

export type ResolutionPorteur = { statut: "ok"; porteur: PorteurMcp } | { statut: "reponse"; reponse: Response };

/** L'en-tête d'un JWT compact, ou `null`. Lu APRÈS la vérification de la signature, qui le couvre. */
export function enteteJwt(jeton: string): { typ?: unknown } | null {
  const [entete] = jeton.split(".");
  if (!entete) return null;
  try {
    const json: unknown = JSON.parse(Buffer.from(entete, "base64url").toString("utf8"));
    return json && typeof json === "object" ? (json as { typ?: unknown }) : null;
  } catch {
    return null;
  }
}

/**
 * Le jeton de l'en-tête `Authorization`, ou `null`. `Bearer` ou `DPoP` :
 * `requireMcpAuth` a déjà vérifié le jeton, et la preuve DPoP s'il est lié.
 */
export function jetonPorteur(request: Request): string | null {
  const valeur = request.headers.get("authorization") ?? "";
  const m = /^(?:Bearer|DPoP)\s+([A-Za-z0-9\-._~+/]+=*)$/i.exec(valeur.trim());
  return m ? m[1] : null;
}

/**
 * Le consentement vaut-il pour ce jeton ? Il existe, il est daté, et le jeton
 * n'est pas plus ancien que lui. Sans marge : le fournisseur date le
 * consentement à la seconde entière (`new Date(iat * 1e3)`, oauth-provider
 * 1.7.27), comme l'`iat` du jeton, émis après lui — une seconde de marge
 * laissait revivre un jeton d'avant un retrait suivi d'un rebranchement dans
 * la seconde (relecture du 2026-11-23). Tout doute refuse : pas d'`iat`
 * lisible, pas de date de consentement.
 *
 * Suppose une seule horloge entre le consentement et le jeton : vrai tant que
 * l'application tourne sur une instance. Sur plusieurs, un écart d'horloge
 * refuserait un jeton tout neuf — à revoir avant de passer à l'échelle.
 */
export function consentementValable(consentement: { createdAt: Date | null } | null, iat: unknown): boolean {
  if (!consentement?.createdAt) return false;
  if (typeof iat !== "number" || !Number.isFinite(iat)) return false;
  return consentement.createdAt.getTime() <= iat * 1000;
}

/** Les claims utiles, ou `null` s'il en manque un. */
export function claimsDuPorteur(claims: JWTPayload): { userId: string; compteId: string; clientId: string } | null {
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  const compteId = typeof claims[CLAIM_COMPTE] === "string" ? (claims[CLAIM_COMPTE] as string) : null;
  const clientId = typeof claims.azp === "string" ? claims.azp : null;
  return userId && compteId && clientId ? { userId, compteId, clientId } : null;
}

/**
 * `error_description` du défi : RFC 6750 § 3 n'admet que l'ASCII imprimable,
 * sans `"` ni `\`. Accents retirés, le reste remplacé par une espace ; le
 * texte entier reste dans le corps JSON.
 */
export function descriptionDuDefi(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20\x21\x23-\x5B\x5D-\x7E]/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** 401 « jeton invalide » avec le défi qui relance l'autorisation (RFC 6750, RFC 9728). */
export function refusJetonInvalide(ressource: string, description: string): Response {
  const metadonnees = getOAuthProtectedResourceMetadataUrl(new URL(ressource));
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: description }, id: null }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "www-authenticate": `Bearer error="invalid_token", error_description="${descriptionDuDefi(description)}", resource_metadata="${metadonnees}"`,
      },
    },
  );
}

/**
 * Résout le porteur d'une requête sur `/api/mcp`. `ressource` est l'URL
 * exacte du serveur (l'audience attendue).
 */
export async function resoudrePorteur(request: Request, ressource: string): Promise<ResolutionPorteur> {
  // 1. Le jeton. `requireMcpAuth` est une enveloppe : on capture les claims
  // vérifiés, et toute autre réponse (401, 403) part telle quelle. Sur une
  // copie : la requête d'origine garde son corps pour le SDK.
  let claims: JWTPayload | null = null as JWTPayload | null;
  const verdict = await requireMcpAuth(
    // Le type attendu ne lit que `options`, `baseURL` et `getPlugin` ; il
    // bute sur `verification: { modelName }` (type « faible » de la 1.7.27).
    auth as unknown as Parameters<typeof requireMcpAuth>[0],
    async (_r, c) => {
      claims = c as JWTPayload;
      return new Response(null, { status: 204 });
    },
    { resource: ressource, requiredScopes: [PORTEE_LECTURE] },
  )(request.clone());
  if (!claims) return { statut: "reponse", reponse: verdict };

  // 2. Un jeton d'ACCÈS, pas un autre JWT signé par les mêmes clés.
  const jeton = jetonPorteur(request);
  if (!jeton || enteteJwt(jeton)?.typ !== "at+jwt") {
    return { statut: "reponse", reponse: refusJetonInvalide(ressource, "Ce jeton n'est pas un jeton d'accès.") };
  }
  const lus = claimsDuPorteur(claims);
  if (!lus) return { statut: "reponse", reponse: refusJetonInvalide(ressource, "Jeton incomplet.") };

  // 3, 3 bis et 4. L'appartenance, le consentement et l'abonnement du
  // compte, lus en parallèle : un aller-retour par requête (une lecture
  // imbriquée en ferait trois en série, Prisma sans jointures). Le compte et
  // le client viennent du jeton vérifié.
  const [membre, consentement, abonnement] = await Promise.all([
    prisma.membre.findUnique({
      where: { compteId_userId: { compteId: lus.compteId, userId: lus.userId } },
      select: { role: true },
    }),
    // Le fournisseur n'en garde qu'un par client, personne et compte (il met
    // à jour l'existant) ; le tri ne sert que si cela changeait. Un client
    // dispensé de consentement (`skipConsent`, qu'aucun n'a : la DCR
    // l'interdit) serait refusé ici.
    prisma.oauthConsent.findFirst({
      where: { clientId: lus.clientId, userId: lus.userId, referenceId: lus.compteId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.abonnement.findUnique({ where: { compteId: lus.compteId }, select: { statut: true, formule: true } }),
  ]);
  if (!membre || !estRole(membre.role)) {
    return {
      statut: "reponse",
      reponse: refusJetonInvalide(ressource, "Vous n'êtes plus membre du compte de cette connexion."),
    };
  }
  if (!consentementValable(consentement, claims.iat)) {
    return {
      statut: "reponse",
      reponse: refusJetonInvalide(ressource, "L'accès de cet assistant a été retiré : reconnectez-le depuis l'assistant."),
    };
  }
  return {
    statut: "ok",
    porteur: { ...lus, ouvert: connecteurOuvert(abonnement) },
  };
}
