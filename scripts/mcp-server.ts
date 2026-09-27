#!/usr/bin/env tsx
//
// Serveur MCP local de Rojer — **lecture seule, portée unique, stdio**.
//
// Il permet de consulter un dossier Rojer depuis un client MCP (Claude
// Desktop, Claude Code) sans exposer quoi que ce soit sur le réseau : le
// client lance ce processus et lui parle par son entrée/sortie standard.
// Rien n'écoute, il n'y a pas de port, et le serveur meurt avec le client.
//
// Ce que ce serveur n'est pas : un accès multi-utilisateurs. La portée est
// fixée **au démarrage** par `MCP_ETABLISSEMENT_ID` et vaut pour toute la
// session ; elle n'est jamais négociée avec le client. Servir plusieurs
// utilisateurs demanderait un transport HTTP et une authentification par
// jeton (OAuth 2.1) — c'est précisément pour rendre ce passage possible sans
// réécriture que les outils vivent dans `@/lib/mcp/tools` et reçoivent leur
// portée en argument, plutôt que de la lire eux-mêmes dans l'environnement.
//
// Deux contraintes du transport stdio gouvernent ce fichier :
//
//   - **stdout appartient au protocole.** Toute trace part sur stderr. C'est
//     aussi la raison pour laquelle `@/lib/mcp/prisma` instancie son propre
//     client plutôt que le singleton de l'application, qui journalise ses
//     requêtes sur la sortie standard en développement.
//   - **Une erreur ne doit pas fuir.** Les exceptions sont renvoyées au
//     client comme résultat d'outil en erreur, avec un message court : pas
//     de pile d'appels, pas d'URL de connexion.
//
// Rattachement à un client :
//   MCP_ETABLISSEMENT_ID=<id> pnpm mcp

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import {
  CONSIGNE_SERVEUR,
  ErreurOutilMcp,
  OUTILS_MCP,
  type ScopeMcp,
} from "@/lib/mcp/tools";
import { prismaMcp } from "@/lib/mcp/prisma";

const NOM_SERVEUR = "rojer-demo";
const VERSION_SERVEUR = "0.1.0";

/** Journalisation — **stderr uniquement**, cf. en-tête. */
function trace(message: string): void {
  console.error(`[${NOM_SERVEUR}] ${message}`);
}

/**
 * Portée de la session, lue une fois au démarrage.
 *
 * Aucune valeur par défaut : un serveur qui démarrerait sans portée devrait
 * choisir entre ne rien servir et tout servir, et la seconde option n'est
 * pas une option pour un dossier de conformité. On refuse de démarrer.
 */
function lireScope(): ScopeMcp {
  const etablissementId = process.env.MCP_ETABLISSEMENT_ID?.trim();

  if (!etablissementId) {
    trace(
      "MCP_ETABLISSEMENT_ID est absent. Ce serveur ne démarre pas sans " +
        "l'identifiant de l'établissement à servir — il n'expose jamais " +
        "l'ensemble de la base. L'identifiant se trouve dans l'URL du " +
        "tableau de bord (/etablissements/<id>) et sur la page « Connecter ».",
    );
    process.exit(1);
  }

  return { etablissementId };
}

async function main(): Promise<void> {
  const scope = lireScope();

  // Vérification au démarrage plutôt qu'au premier appel d'outil : un
  // identifiant erroné doit se voir tout de suite, pas se manifester en
  // pleine conversation par trois outils qui répondent « introuvable ».
  const etablissement = await prismaMcp.etablissement.findUnique({
    where: { id: scope.etablissementId },
    select: { raisonDisplay: true },
  });

  if (!etablissement) {
    trace(
      `Aucun établissement ne porte l'identifiant « ${scope.etablissementId} ». ` +
        "Vérifiez MCP_ETABLISSEMENT_ID et la base pointée par DATABASE_URL.",
    );
    process.exit(1);
  }

  const server = new McpServer(
    { name: NOM_SERVEUR, version: VERSION_SERVEUR },
    { instructions: CONSIGNE_SERVEUR },
  );

  for (const outil of OUTILS_MCP) {
    server.registerTool(
      outil.nom,
      {
        title: outil.titre,
        description: outil.description,
        inputSchema: outil.schema,
        annotations: {
          // Le serveur ne comporte aucune écriture : le client peut
          // l'annoncer comme tel et se dispenser de demander confirmation.
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      async (args: unknown) => {
        try {
          const texte = await outil.executer(
            { scope, now: new Date() },
            args,
          );
          return { content: [{ type: "text" as const, text: texte }] };
        } catch (erreur) {
          // Même contrat que le transport HTTP (`@/lib/mcp/http`) : une
          // erreur destinée au client part avec son texte.
          if (erreur instanceof ErreurOutilMcp) {
            trace(`${outil.nom} : ${erreur.message}`);
            return {
              isError: true,
              content: [{ type: "text" as const, text: erreur.message }],
            };
          }
          // Message court côté client, détail complet côté opérateur : la
          // pile d'appels et l'URL de connexion n'ont rien à faire dans une
          // conversation.
          trace(
            `échec de l'outil ${outil.nom} : ${
              erreur instanceof Error ? erreur.stack ?? erreur.message : String(erreur)
            }`,
          );
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `L'outil ${outil.nom} n'a pas pu répondre. Détail dans les journaux du serveur.`,
              },
            ],
          };
        }
      },
    );
  }

  await server.connect(new StdioServerTransport());
  trace(
    `prêt — ${OUTILS_MCP.length} outils en lecture seule sur « ${etablissement.raisonDisplay} ».`,
  );
}

async function arreter(code: number): Promise<never> {
  await prismaMcp.$disconnect().catch(() => {});
  process.exit(code);
}

process.on("SIGINT", () => void arreter(0));
process.on("SIGTERM", () => void arreter(0));

main().catch(async (erreur) => {
  trace(
    `démarrage impossible : ${
      erreur instanceof Error ? erreur.stack ?? erreur.message : String(erreur)
    }`,
  );
  await arreter(1);
});
