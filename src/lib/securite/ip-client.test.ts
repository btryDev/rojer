import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ipClient, ipPourLimite, reseauPourLimite } from "./ip-client";

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
// lecture directe d'un en-tête qui porte l'IP ailleurs que dans
// `src/lib/securite/ip-client.ts` refait ce trou. La garde vise la règle, pas
// une chaîne : les en-têtes d'IP connus, dans tout le code exécuté (`src/`,
// `scripts/`), quelle que soit l'extension.
describe("aucune lecture d'un en-tête d'IP hors de ip-client.ts", () => {
  it("le code ne relit pas ces en-têtes lui-même", () => {
    const depot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const SEUL_LECTEUR = join("src", "lib", "securite", "ip-client.ts");
    const ENTETES_IP = /x-forwarded-for|x-real-ip|cf-connecting-ip|true-client-ip|x-client-ip|["'`]forwarded["'`]/i;
    const fautifs: string[] = [];
    const parcourir = (dossier: string) => {
      for (const e of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, e.name);
        if (e.isDirectory()) {
          if (e.name !== "node_modules" && !e.name.startsWith(".")) parcourir(chemin);
        } else if (
          /\.(ts|tsx|js|mjs|cjs)$/.test(e.name) &&
          !/\.test\.(ts|tsx)$/.test(e.name) &&
          relative(depot, chemin) !== SEUL_LECTEUR &&
          ENTETES_IP.test(readFileSync(chemin, "utf8"))
        ) {
          fautifs.push(relative(depot, chemin));
        }
      }
    };
    parcourir(join(depot, "src"));
    parcourir(join(depot, "scripts"));
    expect(fautifs).toEqual([]);
  });
});

describe("clé réseau des limites de débit (audit du 2026-11-10)", () => {
  it("l'IPv4 reste telle quelle", () => {
    expect(reseauPourLimite("203.0.113.7")).toBe("203.0.113.7");
  });

  it("deux adresses du même /64 partagent un compteur ; un autre /64, non", () => {
    expect(reseauPourLimite("2001:db8:1:2::1")).toBe("2001:db8:1:2::/64");
    expect(reseauPourLimite("2001:db8:1:2:ffff:ffff:ffff:ffff")).toBe("2001:db8:1:2::/64");
    expect(reseauPourLimite("2001:db8:1:3::1")).toBe("2001:db8:1:3::/64");
  });

  it("une même adresse écrite autrement donne la même clé", () => {
    const attendu = "2001:db8:1:2::/64";
    expect(reseauPourLimite("2001:0DB8:0001:0002:0000:0000:0000:0001")).toBe(attendu);
    expect(reseauPourLimite("2001:db8:1:2:0:0:0:1")).toBe(attendu);
    expect(reseauPourLimite("2001:db8:1:2::1%eth0")).toBe(attendu);
  });

  it("les formes compressées en fin ; un préfixe nul n'est pas regroupé", () => {
    expect(reseauPourLimite("fe80::")).toBe("fe80:0:0:0::/64");
    expect(reseauPourLimite("::1")).toBe("::1");
    expect(reseauPourLimite("::2")).toBe("::2");
    expect(reseauPourLimite("::198.51.100.9")).not.toBe(reseauPourLimite("::198.51.100.10"));
  });

  it("l'IPv4 écrite en IPv6 est ramenée à l'IPv4 ; une IPv4 finale ailleurs reste une IPv6", () => {
    expect(reseauPourLimite("::ffff:198.51.100.9")).toBe("198.51.100.9");
    expect(reseauPourLimite("::FFFF:c633:6409")).toBe("198.51.100.9");
    expect(reseauPourLimite("64:ff9b::198.51.100.9")).toBe("64:ff9b:0:0::/64");
  });

  it("ipPourLimite lit la même dernière entrée que ipClient, sous sa clé réseau", () => {
    expect(ipPourLimite(entetes("forgé, 2001:db8:1:2::abcd"))).toBe("2001:db8:1:2::/64");
    expect(ipPourLimite(entetes("1.2.3.4, 198.51.100.9"))).toBe("198.51.100.9");
    expect(ipPourLimite(entetes())).toBeNull();
  });
});

/**
 * Une limite par IP se construit sur `ipPourLimite`, jamais sur `ipClient`
 * (audit du 2026-11-10) : sinon chaque IPv6 retrouve un compteur neuf par
 * requête. Exceptions nommées, avec leur motif.
 */
const LIMITES_SUR_ADRESSE_COMPLETE = new Map<string, string>([
  ["lib/mcp/http.ts", "clients MCP hébergés : réseaux de sortie partagés ; limite par portée après authentification"],
]);

describe("les limites par IP lisent la clé réseau", () => {
  it("tout module qui compte par IP passe par ipPourLimite, hors exceptions nommées", () => {
    const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const fichiers = (readdirSync(racine, { recursive: true }) as string[]).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    const fautifs: string[] = [];
    const exceptionsVues: string[] = [];
    for (const f of fichiers) {
      const texte = readFileSync(join(racine, f), "utf8");
      if (!/cleLimite\([^)]*"ip"/.test(texte)) continue;
      const nom = relative(racine, join(racine, f)).split("\\").join("/");
      if (LIMITES_SUR_ADRESSE_COMPLETE.has(nom)) {
        exceptionsVues.push(nom);
        continue;
      }
      if (/\bipClient\(/.test(texte) || !/\bipPourLimite\(/.test(texte)) fautifs.push(nom);
    }
    expect(fautifs).toEqual([]);
    expect(exceptionsVues.sort()).toEqual([...LIMITES_SUR_ADRESSE_COMPLETE.keys()].sort());
  });
});
