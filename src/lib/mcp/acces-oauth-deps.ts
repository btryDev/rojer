import "server-only";
// Câblage concret de l'accès OAuth — cf. ADR-013.
//
// `./acces-oauth` décide *quand* refuser ; ce module fournit les deux
// dépendances qu'il consomme, et rien d'autre. La séparation n'est pas
// cosmétique : elle permet de tester la logique de refus sans réseau, sans
// base et sans projet Supabase.
//
// Ces fonctions ne vivent pas dans `./queries` à dessein. Ce fichier-là pose
// comme invariant que toute lecture porte un `etablissementId` en premier
// paramètre — c'est ce qui garantit qu'aucune requête ne s'exécute hors
// portée. La recherche ci-dessous fait l'inverse : elle *établit* la portée.
// L'y ranger reviendrait à créer la seule exception à la règle, dans le
// fichier dont la règle est la raison d'être.

import { createClient } from "@supabase/supabase-js";
import { fetchAvecDelai } from "@/lib/reseau/delai";
import { clientDuCompteVerifie } from "@/lib/auth/compte-hors-session";
import type { ChercheurEtablissement, VerificateurJeton } from "./acces-oauth";

/** Délai maximal d'un appel de vérification de jeton à Supabase Auth (M9). */
export const DELAI_VERIFICATION_MS = 10_000;

/**
 * Vérificateur de jetons adossé au projet Supabase.
 *
 * `getClaims` valide la signature contre le JWKS du projet et contrôle
 * l'expiration. Avec des clés asymétriques (RS256/ES256) la vérification est
 * locale ; en HS256 la méthode retombe sur un aller-retour réseau par
 * requête — d'où le prérequis de bascule en asymétrique posé par ADR-013.
 *
 * Le client est créé sans stockage de session : ce processus ne se connecte
 * au nom de personne, il ne fait que vérifier des jetons présentés par
 * d'autres. Persister une session ici mélangerait l'identité du serveur avec
 * celle de ses appelants.
 */
export function creerVerificateurSupabase(
  env: NodeJS.ProcessEnv = process.env,
): VerificateurJeton | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const cle = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !cle) return null;

  const supabase = createClient(url, cle, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    // Lecture du JWKS (et, en HS256, aller-retour par jeton) : un Supabase
    // muet ne doit pas tenir la requête MCP ouverte jusqu'à `maxDuration`.
    // Un abandon rend une erreur, donc un refus (401) — audit Next.js M9.
    global: { fetch: fetchAvecDelai(DELAI_VERIFICATION_MS) },
  });

  return async (jeton) => {
    const { data, error } = await supabase.auth.getClaims(jeton);
    if (error || !data?.claims) return null;
    return data.claims;
  };
}

/**
 * Résout les établissements d'un utilisateur Supabase.
 *
 * ~~`Entreprise.userId` est unique (ADR-005) : le `findUnique` reste juste, et
 * c'est ce maillon-là qui cloisonne — un porteur ne peut voir que le contenu de
 * SON entreprise, quelle que soit la suite.~~ [2026-10-26 : un compte porte
 * plusieurs entreprises (une par SIREN). Le maillon qui cloisonne est le même,
 * `entreprise.userId`, lu en filtre et non plus en clé unique.]
 *
 * Ce qui a changé le 2026-09-01 (ADR-028) : la relation `etablissements` peut
 * en porter plusieurs. Cette fonction rendait auparavant
 * `etablissements[0].id` — le seul `[0]` du code de production — et le
 * commentaire au-dessus le déclarait sûr en invoquant un `@unique` qui n'existe
 * plus. Une ligne comme celle-là ne devient pas fausse bruyamment : elle aurait
 * simplement servi le plus ancien des établissements du porteur, toujours le
 * même, sans que rien ne l'indique. Elle rend donc la liste, et le choix
 * remonte à qui a le droit de le faire.
 *
 * Une liste vide vaut pour un utilisateur sans entreprise comme pour une
 * entreprise sans établissement — compte créé, onboarding non terminé. C'est un
 * refus, pas une erreur.
 *
 * L'ordre est celui de la création, comme partout ailleurs dans le produit
 * (`listerEtablissementsDuCompte`, `getOptionalUserEtablissement`) : un
 * ordre stable, sinon la liste rendue à un porteur qui doit choisir changerait
 * d'un appel à l'autre.
 */
export const chercherEtablissementDeUtilisateur: ChercheurEtablissement =
  async (userId) => {
    // Tous les établissements du porteur, quelle que soit l'entreprise qui
    // les porte : un compte en suit plusieurs depuis le 2026-10-26.
    // Le client borné au compte du porteur, dont l'identité vient du jeton
    // OAuth vérifié (ADR-051). Module voué à disparaître à la bascule (cc).
    const db = clientDuCompteVerifie(userId);
    const etablissements = await db.etablissement.findMany({
      where: { entreprise: { userId } },
      select: { id: true, raisonDisplay: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return etablissements.map((e) => ({ id: e.id, nom: e.raisonDisplay }));
  };
