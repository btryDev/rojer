// Préparation commune des tests (vitest.config.ts, `setupFiles`).
//
// Le client borné au compte (ADR-051, `src/lib/auth/portee/client.ts`) se
// fabrique à partir du client brut par `prisma.$extends`. Les tests des
// modules remplacent le client brut par une simulation qui n'a pas de
// `$extends` : ici, `clientBorne` rend directement ce client simulé. Ces
// tests vérifient la logique de leur module ; la borne elle-même est éprouvée
// à part, sans simulation (`portee/borne.test.ts`, fonctions pures) et contre
// un vrai PostgreSQL (`portee/client.integration.test.ts`), qui désactivent ces
// remplacements par `vi.unmock`. Ce que le vrai client refuserait et que ces
// tests ne verraient donc pas (un `createMany` direct) est tenu par une garde
// qui relit le code (`portee/usages.test.ts`).
//
// Hors de `src/` : la production n'en voit rien.

import { vi } from "vitest";

vi.mock("@/lib/auth/portee/client", async () => {
  const { prisma } = await import("@/lib/prisma");
  return { clientBorne: () => prisma };
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
