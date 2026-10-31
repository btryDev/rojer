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
// `portee/usages.test.ts`), relayé par `creerEnLotVerifie` ci-dessous. Le
// client d'une `$transaction` interactive est vérifié de même.
//
// Hors de `src/` : la production n'en voit rien.

import { vi } from "vitest";

vi.mock("@/lib/auth/portee/client", async () => {
  const { prisma } = await import("@/lib/prisma");
  const { argumentsBornes, clesDuCompte, dansUnLot, noterVus } = await vi.importActual<
    typeof import("@/lib/auth/portee/borne")
  >(
    "@/lib/auth/portee/borne",
  );
  const { clientBorneSimule } = await import("@/test/client-borne-simule");
  return {
    clientBorne: (portee: { type: "compte"; userId: string }) =>
      clientBorneSimule(prisma as object, portee, argumentsBornes, "verifier"),
  };
});

// De même, `creerEnLotVerifie` (qui lit les parents par le client borné avant
// d'insérer) revient ici à un `createMany` sur le client simulé, dans un lot où
// les parents passent pour lus (la base n'est pas là). Le client simulé passe
// ce `createMany` par le vrai `argumentsBornes` : clé vers un modèle hors
// compte ou vers l'identité y tombe, comme en production. Le client doit être
// un client simulé borné (une garde simulée qui rendrait le client brut ferait
// tomber le test).
vi.mock("@/lib/auth/portee/lot-verifie", async () => {
  const { clesDuCompte, dansUnLot, noterVus } = await vi.importActual<typeof import("@/lib/auth/portee/borne")>(
    "@/lib/auth/portee/borne",
  );
  const { PORTEE_SIMULEE } = await import("@/test/client-borne-simule");
  return {
    creerEnLotVerifie: async (
      client: Record<string | symbol, unknown>,
      nom: string,
      lignes: object[],
      options: object = {},
    ) => {
      if (lignes.length === 0) return { count: 0 };
      const portee = client[PORTEE_SIMULEE] as { type: "compte"; userId: string } | undefined;
      if (!portee) throw new Error(`creerEnLotVerifie(${nom}) : client non borné (garde simulée au client brut ?)`);
      const delegue = client[nom.charAt(0).toLowerCase() + nom.slice(1)] as {
        createMany: (a: object) => unknown;
      };
      return dansUnLot(async () => {
        for (const { cle, cible } of clesDuCompte(nom)) {
          const ids = lignes.map((l) => (l as Record<string, unknown>)[cle]).filter((v) => v != null);
          noterVus(cible, portee, ids.map((id) => ({ id })));
        }
        return delegue.createMany({ data: lignes, ...options });
      });
    },
  };
});
