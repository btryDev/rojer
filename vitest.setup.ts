// Préparation commune des tests (vitest.config.ts, `setupFiles`).
//
// Le client borné au compte (ADR-051, `src/lib/auth/portee/client.ts`) se
// fabrique à partir du client brut par `prisma.$extends`. Les tests des
// modules remplacent le client brut par une simulation qui n'a pas de
// `$extends` : ici, `clientBorne` rend directement ce client simulé. Ces
// tests vérifient la logique de leur module ; la borne elle-même est éprouvée
// à part, sans simulation (`portee/borne.test.ts`, fonctions pures) et contre
// un vrai PostgreSQL (`portee/client.integration.test.ts`), qui désactivent ce
// remplacement par `vi.unmock`.
//
// Hors de `src/` : la production n'en voit rien.

import { vi } from "vitest";

vi.mock("@/lib/auth/portee/client", async () => {
  const { prisma } = await import("@/lib/prisma");
  return { clientBorne: () => prisma };
});
