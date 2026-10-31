// Le client borné au compte, simulé sur le client simulé d'un test (ADR-051).
//
// `vitest.setup.ts` remplace `clientBorne` par ce simulateur en mode
// `verifier` : les refus de la borne s'y lèvent, mais la borne n'est pas posée
// sur ce que reçoit le client simulé. C'est juste pour les tests qui éprouvent
// la logique d'un module ; ce ne l'est plus pour un test d'ISOLATION, depuis que les
// modules migrés ne portent plus le prédicat écrit à la main (lot 2b,
// 2026-10-30) : c'est l'extension qui borne, et un test qui ne la poserait
// pas éprouverait un client que la production n'emploie pas.
//
// En mode `borner`, ce simulateur pose les VRAIS arguments bornés
// (`argumentsBornes`, la fonction même de l'extension) avant de passer la main
// au client simulé.
// Le client d'une `$transaction` interactive est simulé de même : ce que le
// rappel écrit par `tx` est vérifié comme le reste (seconde lecture du
// 2026-10-31). Il ne simule pas les refus d'exécution du vrai client
// (`portee/usages.test.ts`, `portee/client.integration.test.ts`).

// `argumentsBornes` est REÇU, pas importé : les rouages du client borné ne
// s'importent que des modules nommés (`portee/imports.test.ts`), et ce fichier
// n'en est pas un. Le test qui s'en sert l'importe lui-même (les tests sont
// hors de cette garde).

type Portee = { type: "compte"; userId: string };
type Modele = Record<string, unknown>;
type ArgumentsBornes = (nom: string, operation: string, args: unknown, portee: Portee) => object;

/** La portée d'un client simulé : `creerEnLotVerifie` simulé la relit (`vitest.setup.ts`). */
export const PORTEE_SIMULEE = Symbol("portee-simulee");

/**
 * `borner` (défaut) : le client simulé reçoit les arguments BORNÉS — pour un
 * test d'isolation, qui éprouve la borne.
 * `verifier` : les arguments passent par `argumentsBornes` pour ses REFUS
 * seuls, et le client simulé reçoit ceux d'origine — les assertions d'un test
 * de module sur ce qu'il envoie restent vraies (`vitest.setup.ts`). `createMany`
 * aussi : hors d'un lot (`creerEnLotVerifie`), il est refusé comme en
 * production (seconde lecture de #142).
 */
export function clientBorneSimule<T extends object>(
  brut: T,
  portee: Portee,
  argumentsBornes: ArgumentsBornes,
  mode: "borner" | "verifier" = "borner",
): T {
  return new Proxy(brut, {
    get(cible, cle) {
      if (cle === PORTEE_SIMULEE) return portee;
      const valeur = Reflect.get(cible, cle) as unknown;
      if (cle === "$transaction" && typeof valeur === "function") {
        return (ops: unknown, ...reste: unknown[]) =>
          valeur.call(
            cible,
            typeof ops === "function"
              ? (tx: object) => ops(clientBorneSimule(tx, portee, argumentsBornes, mode))
              : ops,
            ...reste,
          );
      }
      if (typeof cle !== "string" || cle.startsWith("$") || valeur === null || typeof valeur !== "object") {
        return valeur;
      }
      const nom = cle.charAt(0).toUpperCase() + cle.slice(1);
      return new Proxy(valeur as Modele, {
        get(modele, operation) {
          const f = Reflect.get(modele, operation) as unknown;
          if (typeof operation !== "string" || typeof f !== "function") return f;
          if (mode === "borner") {
            return (args?: unknown) => f.call(modele, argumentsBornes(nom, operation, args ?? {}, portee));
          }
          return (args?: unknown, ...reste: unknown[]) => {
            argumentsBornes(nom, operation, copie(args ?? {}), portee);
            return f.call(modele, args, ...reste);
          };
        },
      });
    },
  });
}

/** Une copie, pour que la vérification ne touche pas ce que le test inspecte. */
function copie(v: unknown): unknown {
  try {
    return structuredClone(v);
  } catch {
    return v; // non clonable (fonction simulée) : vérifié tel quel
  }
}
