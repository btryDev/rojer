// Point d'entrée HTTP du serveur MCP, authentifié en OAuth 2.1 — ADR-013.
//
// Le pendant de `./[cle]/route.ts`, dont il a vocation à prendre la place.
// La différence tient en une ligne : la portée vient du jeton porteur, donc
// de l'identité du dirigeant, et non plus d'un secret partagé figé dans
// l'environnement du déploiement.
//
// Le refus est ici un `401` porteur d'un en-tête `WWW-Authenticate` — et non
// le `404` muet de la route à clé. Les deux choix sont cohérents avec leur
// mécanisme : là-bas le secret était dans l'URL, et distinguer « mauvaise
// clé » de « route inconnue » aurait confirmé qu'il y avait quelque chose à
// trouver. Ici l'existence du serveur n'est pas un secret — c'est même ce
// qu'il faut annoncer pour que le client sache où aller s'authentifier.
//
// Le protocole utilise POST pour les échanges, GET pour les flux d'événements
// et DELETE pour la fin de session : les trois pointent sur le même
// gestionnaire, qui route lui-même selon la méthode.

import {
  lireConfigOauthMcp,
  reponseAuthentificationRequise,
  reponseChoixEtablissementRequis,
  resoudreScopeDepuisJeton,
} from "@/lib/mcp/acces-oauth";
import {
  chercherEtablissementDeUtilisateur,
  creerVerificateurSupabase,
} from "@/lib/mcp/acces-oauth-deps";
import { creerHandlerMcpHttp } from "@/lib/mcp/http";

// Le serveur lit la base à chaque appel d'outil, et la portée dépend du
// porteur : une réponse mise en cache serait une fuite entre utilisateurs.
export const dynamic = "force-dynamic";

// Plafond d'exécution (audit du 2026-09-27). Aucun échange de ce serveur ne
// dure plus de quelques secondes : des lectures bornées à un établissement.
// Sans plafond déclaré, la plateforme applique le sien — 300 s —, et c'est
// ce qu'ont duré les 143 flux `subscriptions/listen` restés ouverts. La
// cause est corrigée dans `@/lib/mcp/http` ; ce plafond borne ce qu'on n'a
// pas prévu.
export const maxDuration = 60;

const config = lireConfigOauthMcp();
const verifier = creerVerificateurSupabase();

const handler = creerHandlerMcpHttp({
  hotesAutorises: config?.hotesAutorises ?? [],
  originesAutorisees: config?.originesAutorisees ?? [],
  // C'est ce 401 qui déclenche le flux OAuth côté client : un refus muet
  // laisserait l'utilisateur devant une erreur, sans bouton « Connecter ».
  reponseRefus: (request) => reponseAuthentificationRequise(config, request),
  resoudreScope: async (request) => {
    // Sans configuration ni vérificateur, aucune requête n'est servie : on
    // ne devine pas une identité, on refuse.
    if (!config || !verifier) return { statut: "refus" };

    const resolution = await resoudreScopeDepuisJeton(request, {
      verifier,
      chercherEtablissement: chercherEtablissementDeUtilisateur,
    });

    // Le porteur a plusieurs établissements et n'en a désigné aucun (ADR-028).
    // La liste part ici et nulle part ailleurs : elle ne sort qu'une fois le
    // jeton vérifié, et ne contient que ce que son porteur possède déjà.
    if (resolution.statut === "choix_requis") {
      return {
        statut: "reponse",
        reponse: reponseChoixEtablissementRequis(
          request,
          resolution.etablissements,
        ),
      };
    }

    return resolution;
  },
});

export const POST = (request: Request) => handler.servir(request);
export const GET = (request: Request) => handler.servir(request);
export const DELETE = (request: Request) => handler.servir(request);
