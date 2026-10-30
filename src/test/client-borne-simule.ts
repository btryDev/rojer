// Le client borné au compte, simulé sur le client simulé d'un test (ADR-051).
//
// `vitest.setup.ts` remplace `clientBorne` par le client simulé tel quel : la
// borne n'y est pas posée. C'est juste pour les tests qui éprouvent la logique
// d'un module ; ce ne l'est plus pour un test d'ISOLATION, depuis que les
// modules migrés ne portent plus le prédicat écrit à la main (lot 2b,
// 2026-10-30) : c'est l'extension qui borne, et un test qui ne la poserait
// pas éprouverait un client que la production n'emploie pas.
//
// Ce simulateur pose les VRAIS arguments bornés (`argumentsBornes`, la
// fonction même de l'extension) avant de passer la main au client simulé.
// Il ne simule ni `$transaction`, ni les refus d'exécution du vrai client
// (`portee/usages.test.ts`, `portee/client.integration.test.ts`).

// `argumentsBornes` est REÇU, pas importé : les rouages du client borné ne
// s'importent que des modules nommés (`portee/imports.test.ts`), et ce fichier
// n'en est pas un. Le test qui s'en sert l'importe lui-même (les tests sont
// hors de cette garde).

type Portee = { type: "compte"; userId: string };
type Modele = Record<string, unknown>;
type ArgumentsBornes = (nom: string, operation: string, args: unknown, portee: Portee) => object;

export function clientBorneSimule<T extends object>(
  brut: T,
  portee: Portee,
  argumentsBornes: ArgumentsBornes,
): T {
  return new Proxy(brut, {
    get(cible, cle) {
      const valeur = Reflect.get(cible, cle) as unknown;
      if (typeof cle !== "string" || cle.startsWith("$") || valeur === null || typeof valeur !== "object") {
        return valeur;
      }
      const nom = cle.charAt(0).toUpperCase() + cle.slice(1);
      return new Proxy(valeur as Modele, {
        get(modele, operation) {
          const f = Reflect.get(modele, operation) as unknown;
          if (typeof operation !== "string" || typeof f !== "function") return f;
          return (args?: unknown) => f.call(modele, argumentsBornes(nom, operation, args ?? {}, portee));
        },
      });
    },
  });
}
