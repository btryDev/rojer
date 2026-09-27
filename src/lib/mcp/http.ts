// Serveur MCP en transport HTTP — les gardes, avant les outils.
//
// Le pendant distant de `scripts/mcp-server.ts`. Les outils ne changent pas
// (c'est ce pour quoi `./tools` a été écrit sans rien savoir du transport) ;
// ce qui change, c'est d'où vient la portée. En stdio elle était fixée au
// démarrage par une variable d'environnement, sur une machine où seul le
// propriétaire pouvait lancer le processus. Ici n'importe qui peut poster
// sur l'URL : la portée doit donc être **établie par la requête elle-même**,
// et refusée par défaut.
//
// Ce module ne décide pas *comment* on authentifie. Il pose les gardes de
// transport et délègue l'identification à `resoudreScope`, fourni par la
// route. Aujourd'hui c'est un secret dans l'URL ; demain ce sera un jeton
// OAuth vérifié — le SDK expose `requireBearerAuth` pour ça, et seul
// `resoudreScope` changera. Le reste de ce fichier, non.
//
// Deux gardes de transport, avant qu'une ligne du protocole ne soit lue :
//
//   1. **Host et Origin.** Sans cette validation, une page web visitée par
//      l'utilisateur peut faire parler son navigateur au serveur (attaque
//      par reliaison DNS). Le SDK fournit les deux contrôles et se déclare
//      explicitement « validation-free » : c'est à nous de les poser devant.
//   2. **Portée.** Pas de portée, pas de serveur : on ne construit jamais
//      d'instance sans savoir quel établissement elle a le droit de lire.

import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
  McpServer,
  SERVER_INFO_META_KEY,
  SUBSCRIPTION_ID_META_KEY,
} from "@modelcontextprotocol/server";
import {
  CONSIGNE_SERVEUR,
  ErreurOutilMcp,
  OUTILS_MCP,
  type ScopeMcp,
} from "./tools";

export const NOM_SERVEUR = "rojer";
export const VERSION_SERVEUR = "0.1.0";

/**
 * Ce que `resoudreScope` rend : servir, refuser, ou renvoyer une réponse que
 * le mécanisme d'authentification a construite lui-même.
 *
 * Ce troisième cas est né avec l'ADR-028. Un porteur OAuth qui possède
 * plusieurs établissements et n'en désigne aucun n'est pas refusé — son jeton
 * est valide — mais il n'est pas servi non plus : il doit choisir, et on lui
 * répond en listant. Ce transport-ci n'a pas à connaître ce cas ; il lui suffit
 * de laisser passer une réponse toute faite plutôt que d'imposer le binaire
 * « portée ou refus », qui aurait obligé à répondre `401` — et à faire boucler
 * le client sur une authentification qui réussit sans jamais rien débloquer.
 */
export type ResolutionPortee =
  | { statut: "ok"; scope: ScopeMcp }
  | { statut: "refus" }
  | { statut: "reponse"; reponse: Response };

export type OptionsServeurHttp = {
  /**
   * Établit la portée d'une requête. C'est le seul point d'authentification
   * du serveur.
   */
  resoudreScope: (request: Request) => Promise<ResolutionPortee>;
  /** Hôtes acceptés dans l'en-tête `Host` (le domaine de déploiement). */
  hotesAutorises: string[];
  /** Origines acceptées dans l'en-tête `Origin`. */
  originesAutorisees: string[];
  /**
   * Réponse rendue quand `resoudreScope` refuse. La forme du refus dépend du
   * mécanisme d'authentification, pas du transport : un secret dans l'URL se
   * refuse en `404` muet (cf. `./acces-http`), un jeton OAuth en `401`
   * désignant les métadonnées de ressource (cf. `./acces-oauth`).
   *
   * Par défaut, le `404` muet.
   */
  reponseRefus?: (request: Request) => Response;
};

/**
 * Construit le serveur servi pour **une** requête, avec sa portée déjà
 * résolue. Les outils reçoivent cette portée en argument : ils n'ont aucun
 * moyen d'en désigner une autre, et le client non plus — aucun schéma
 * d'entrée ne comporte d'identifiant d'établissement.
 */
function construireServeur(scope: ScopeMcp): McpServer {
  const server = new McpServer(
    { name: NOM_SERVEUR, version: VERSION_SERVEUR },
    {
      instructions: CONSIGNE_SERVEUR,
      // ~~Le défaut du SDK, `listChanged: true`~~ (audit du 2026-09-27) : la
      // liste des outils est fixée au déploiement, et rien ici ne publie
      // jamais sur le bus d'événements. Annoncer le contraire invitait un
      // client 2026-07-28 à ouvrir un `subscriptions/listen` — un flux qui
      // attend des notifications qui ne viendront pas.
      capabilities: { tools: { listChanged: false } },
    },
  );

  for (const outil of OUTILS_MCP) {
    server.registerTool(
      outil.nom,
      {
        title: outil.titre,
        description: outil.description,
        inputSchema: outil.schema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      async (args: unknown) => {
        try {
          const texte = await outil.executer({ scope, now: new Date() }, args);
          return { content: [{ type: "text" as const, text: texte }] };
        } catch (erreur) {
          // Une erreur que l'outil destine au client (établissement
          // introuvable) : elle part telle quelle, marquée `isError` pour
          // que le modèle ne la lise pas comme un contenu de dossier. Une
          // ligne au journal, sans trace : ce n'est pas une panne.
          if (erreur instanceof ErreurOutilMcp) {
            console.warn(`[${NOM_SERVEUR}] ${outil.nom} : ${erreur.message}`);
            return {
              isError: true,
              content: [{ type: "text" as const, text: erreur.message }],
            };
          }
          // Le client reçoit un message court ; le détail reste dans les
          // journaux. Une trace d'exécution renvoyée à un client distant
          // renseigne sur la structure interne et peut porter des fragments
          // de requête.
          console.error(
            `[${NOM_SERVEUR}] échec de l'outil ${outil.nom} :`,
            erreur instanceof Error ? erreur.stack ?? erreur.message : erreur,
          );
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `L'outil ${outil.nom} n'a pas pu répondre.`,
              },
            ],
          };
        }
      },
    );
  }

  return server;
}

/**
 * Répond à un `subscriptions/listen` par un flux qui se termine aussitôt.
 *
 * POURQUOI. La révision 2026-07-28 fait porter les notifications de
 * changement par la réponse SSE d'un `subscriptions/listen`, qui « reste
 * ouverte jusqu'à ce que le client ou le serveur la ferme ». Le SDK la tient
 * ouverte indéfiniment (un commentaire `keepalive` toutes les 15 s). Sur une
 * fonction serverless, indéfiniment veut dire jusqu'au plafond de la
 * plateforme : c'était les 143 « Task timed out after 300 seconds » relevés
 * en production depuis le 2026-08-16, chacun gardant une instance — et sa
 * connexion à la base — pour rien : ce serveur n'émet aucune notification.
 *
 * CE QUE LA SPÉCIFICATION PERMET. « Subscriptions » § Cancellation : le
 * serveur peut mettre fin à un abonnement de lui-même ; il « SHOULD send a
 * successful `subscriptions/listen` response to signal a graceful end, then
 * close the stream ». L'accusé de réception « MUST » être le premier
 * message, et son filtre ne porte que ce que le serveur honore — ici rien
 * (`listChanged: false`, aucune ressource).
 *
 * ~~Relayer l'accusé en lisant le flux du SDK~~ (vérification du 2026-09-27,
 * R1) : la lecture dépendait de son découpage — un `\r\n`, ou un commentaire
 * `:` en tête, légaux tous deux en SSE, laissaient le flux ouvert ou
 * perdaient l'accusé. Le flux du SDK n'est plus lu : le SDK garde ses
 * validations (version, en-têtes, filtre — une erreur de sa part part telle
 * quelle, en JSON), puis son flux est annulé sans être lu, et la réponse est
 * écrite ici, avec l'`id` pris dans le corps de la requête. Même forme que
 * la fin gracieuse du SDK (`teardown(true)` de son routeur d'écoute).
 */
function reponseEcouteTerminee(id: string | number, source: Response): Response {
  // Annulé sans être lu : désabonne le SDK et arrête son minuteur.
  void source.body?.cancel().catch(() => {});

  const trame = (message: unknown) =>
    `event: message\ndata: ${JSON.stringify(message)}\n\n`;
  const accuse = {
    jsonrpc: "2.0",
    method: "notifications/subscriptions/acknowledged",
    params: {
      notifications: {},
      _meta: { [SUBSCRIPTION_ID_META_KEY]: id },
    },
  };
  const complete = {
    jsonrpc: "2.0",
    id,
    result: {
      resultType: "complete",
      _meta: {
        [SUBSCRIPTION_ID_META_KEY]: id,
        [SERVER_INFO_META_KEY]: { name: NOM_SERVEUR, version: VERSION_SERVEUR },
      },
    },
  };

  return new Response(trame(accuse) + trame(complete), {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

/** L'`id` JSON-RPC d'un corps de requête, s'il est une chaîne ou un nombre. */
async function idDeRequete(request: Request): Promise<string | number | null> {
  try {
    const corps: unknown = await request.json();
    const id =
      corps && typeof corps === "object" && !Array.isArray(corps)
        ? (corps as { id?: unknown }).id
        : undefined;
    return typeof id === "string" || typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

const estFluxSse = (reponse: Response) =>
  (reponse.headers.get("content-type") ?? "").startsWith("text/event-stream");

/** Refus par défaut, volontairement muet — cf. `servir`. */
const refusMuet = () =>
  new Response(JSON.stringify({ error: "not_found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });

/**
 * Rend le gestionnaire `fetch` à monter dans une route Next.
 *
 * L'ordre des gardes est significatif : aucune des étapes suivantes ne doit
 * s'exécuter pour une requête qu'on aurait dû rejeter d'emblée.
 */
export function creerHandlerMcpHttp(options: OptionsServeurHttp) {
  // Une seule instance de handler, un serveur neuf par requête : deux
  // sessions concurrentes ne peuvent pas se voir.
  const handler = createMcpHandler(async (ctx) => {
    const scope = ctx.authInfo?.extra?.scope as ScopeMcp | undefined;
    if (!scope) {
      // Ne devrait pas arriver — `servir` refuse avant d'appeler le
      // handler. Filet de sécurité : jamais de serveur sans portée.
      throw new Error("portée absente pour une requête acceptée");
    }
    return construireServeur(scope);
  });

  async function servir(request: Request): Promise<Response> {
    const rejete =
      hostHeaderValidationResponse(request, options.hotesAutorises) ??
      originValidationResponse(request, options.originesAutorisees);
    if (rejete) return rejete;

    const resolution = await options.resoudreScope(request);
    if (resolution.statut === "refus") {
      return (options.reponseRefus ?? refusMuet)(request);
    }
    if (resolution.statut === "reponse") return resolution.reponse;

    const scope = resolution.scope;

    // Lu AVANT l'appel : le SDK consomme le corps. L'en-tête est exigé par
    // la révision 2026-07-28 et confronté au corps par le SDK, qui rejette
    // toute discordance — il ne peut donc pas déguiser un autre échange.
    const estEcoute =
      request.headers.get("mcp-method") === "subscriptions/listen";
    // Copie du corps pour en lire l'`id` sans priver le SDK du sien.
    const idEcoute = estEcoute ? await idDeRequete(request.clone()) : null;

    const reponse = await handler.fetch(request, {
      authInfo: {
        // Le SDK exige la forme d'un jeton vérifié ; on la remplit avec ce
        // que l'on sait réellement. `extra.scope` est ce que lit le factory.
        token: "",
        clientId: NOM_SERVEUR,
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + 300,
        extra: { scope },
      },
    });

    // Le SDK a accepté l'écoute (il répond en flux) : on n'en lit rien, on
    // répond et on ferme. S'il l'a refusée, son erreur JSON part telle quelle.
    if (estEcoute && estFluxSse(reponse)) {
      if (idEcoute !== null) return reponseEcouteTerminee(idEcoute, reponse);
      // Accepté sans `id` lisible : ne devrait pas arriver (le SDK exige une
      // requête). On ne garde pas pour autant un flux ouvert.
      void reponse.body?.cancel().catch(() => {});
      return new Response(null, { status: 500 });
    }
    return reponse;
  }

  return { servir, fermer: () => handler.close() };
}
