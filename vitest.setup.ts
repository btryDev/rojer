// Préparation commune des tests (vitest.config.ts, `setupFiles`).
//
// Le client borné au compte (ADR-051, `src/lib/auth/portee/client.ts`) se
// fabrique à partir du client brut par `prisma.$extends`. Les tests des
// modules remplacent le client brut par une simulation qui n'a pas de
// `$extends` : ici, `clientBorne` rend directement ce client simulé. Ces
// tests vérifient la logique de leur module ; la borne elle-même est éprouvée
// à part, sans simulation (`portee/borne.test.ts`, fonctions pures) et contre
// un vrai PostgreSQL (`portee/client.integration.test.ts`), qui désactivent ces
// remplacements par `vi.unmock`.
//
// Le client simulé n'est pas pour autant laissé passer tout : chaque appel
// passe d'abord par le VRAI `argumentsBornes`, pour ses refus — `cursor`,
// écriture imbriquée non servie, `include` d'un modèle hors compte, clé et
// relation données ensemble, opération non servie (revue du 2026-10-31). Le
// mock reçoit les arguments d'ORIGINE : les assertions des tests sur ce qu'un
// module envoie restent vraies. Échappent à cette vérification : `createMany`
// (le relevé des parents vus n'existe que sous le vrai client ; tenu par
// `portee/usages.test.ts`) et le client d'une `$transaction` simulée.
//
// Hors de `src/` : la production n'en voit rien.

import { vi } from "vitest";

vi.mock("@/lib/auth/portee/client", async () => {
  const { prisma } = await import("@/lib/prisma");
  const { argumentsBornes } = await vi.importActual<typeof import("@/lib/auth/portee/borne")>(
    "@/lib/auth/portee/borne",
  );
  const valider = (portee: { type: "compte"; userId: string }) =>
    new Proxy(prisma as object, {
      get(cible, cle) {
        const valeur = Reflect.get(cible, cle) as unknown;
        if (typeof cle !== "string" || cle.startsWith("$") || valeur === null || typeof valeur !== "object") {
          return valeur;
        }
        const nom = cle.charAt(0).toUpperCase() + cle.slice(1);
        return new Proxy(valeur, {
          get(modele, operation) {
            const f = Reflect.get(modele, operation) as unknown;
            if (typeof operation !== "string" || typeof f !== "function" || operation === "createMany") return f;
            return (args?: unknown, ...reste: unknown[]) => {
              let copie: unknown = args ?? {};
              try {
                copie = structuredClone(copie);
              } catch {
                // Un argument non clonable (fonction simulée) : vérifié tel quel.
              }
              argumentsBornes(nom, operation, copie, portee);
              return f.call(modele, args, ...reste);
            };
          },
        });
      },
    });
  return { clientBorne: valider };
});

// De même, `creerEnLotVerifie` (qui lit les parents par le client borné avant
// d'insérer) revient ici à un `createMany` sur le client simulé.
vi.mock("@/lib/auth/portee/lot-verifie", () => ({
  creerEnLotVerifie: (
    client: Record<string, { createMany: (a: object) => unknown }>,
    nom: string,
    lignes: object[],
    options: object = {},
  ) => client[nom.charAt(0).toLowerCase() + nom.slice(1)].createMany({ data: lignes, ...options }),
}));
