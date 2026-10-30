import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ipClient } from "./ip-client";

const entetes = (xff?: string) => new Headers(xff === undefined ? {} : { "x-forwarded-for": xff });

describe("ipClient", () => {
  it("lit l'unique entrée posée par la plateforme (Vercel)", () => {
    expect(ipClient(entetes("203.0.113.7"))).toBe("203.0.113.7");
    expect(ipClient(entetes("2001:db8::1"))).toBe("2001:db8::1");
  });

  it("lit la DERNIÈRE entrée : celles de gauche viennent du client", () => {
    // Un attaquant qui envoie son propre X-Forwarded-For ne choisit que la
    // partie gauche : le répartiteur ajoute l'adresse qu'il voit à droite.
    expect(ipClient(entetes("1.2.3.4, 198.51.100.9"))).toBe("198.51.100.9");
    expect(ipClient(entetes("forgé,  198.51.100.9 "))).toBe("198.51.100.9");
  });

  it("rend null sans en-tête ou sur une valeur qui n'est pas une IP", () => {
    expect(ipClient(entetes())).toBeNull();
    expect(ipClient(entetes(""))).toBeNull();
    expect(ipClient(entetes("1.2.3.4, pas-une-ip"))).toBeNull();
  });
});

// Un seul lecteur de l'IP (ASVS B17, 2026-10-30) : la preuve de signature lisait
// la PREMIÈRE entrée de `X-Forwarded-For`, celle qu'écrit le client. Toute
// lecture directe de l'en-tête ailleurs que dans `ip-client.ts` refait ce trou.
describe("aucune lecture de X-Forwarded-For hors de ip-client.ts", () => {
  it("le code ne relit pas l'en-tête lui-même", () => {
    const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const fautifs: string[] = [];
    const parcourir = (dossier: string) => {
      for (const e of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, e.name);
        if (e.isDirectory()) parcourir(chemin);
        else if (
          /\.(ts|tsx)$/.test(e.name) &&
          !/\.test\.tsx?$/.test(e.name) &&
          e.name !== "ip-client.ts" &&
          /x-forwarded-for/i.test(readFileSync(chemin, "utf8"))
        ) {
          fautifs.push(relative(racine, chemin));
        }
      }
    };
    parcourir(racine);
    expect(fautifs).toEqual([]);
  });
});
