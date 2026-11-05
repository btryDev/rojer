// Le gel (ADR-053 § 14) relit le code : le refus vit dans le client borné de
// la SESSION, le SQL brut d'une saisie le demande explicitement, et ce qui y
// échappe est une liste fermée, chacune avec son motif.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sansCommentairesNiChaines } from "@/lib/auth/tenancy-sonde";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}
const TEXTES = new Map(fichiers(join(DEPOT, "src")).map((f) => [relative(DEPOT, f), readFileSync(f, "utf8")]));
const code = (f: string) => sansCommentairesNiChaines(TEXTES.get(f) ?? "");

/** Ce qui échappe au gel, liste FERMÉE : la portée ne le porte pas, ou le client est brut. */
const HORS_GEL: Record<string, string> = {
  "src/lib/auth/compte-hors-session.ts":
    "accès sans session (signature d'un tiers, dépôt d'un rapport par jeton, MCP en lecture, webhook Stripe) : une preuve réglementaire d'un tiers n'est pas une saisie du titulaire",
  "src/lib/calendrier/actions.ts": "régénération du calendrier par le client brut : elle suit le dossier, ce n'est pas une saisie",
};

/** Les modules qui écrivent en SQL brut (`$executeRaw`), et ce qui les garde. */
const SQL_BRUT_ECRIT: Record<string, string> = {
  "src/lib/registre/actions.ts": "refuserSiGele dans `preparer`, avant l'UPDATE",
  "src/lib/duerps/ecrire-reponse-fermee.ts": "aide : chacun de ses appelants appelle refuserSiGele",
  "src/lib/securite/limite-debit.ts": "compteurs techniques, hors de tout compte",
  "src/lib/auth/portee/client.ts": "l'extension (lecture seule)",
};

describe("le gel (ADR-053 § 14)", () => {
  it("l'extension vérifie le gel avant chaque opération, avec la portée", () => {
    expect(code("src/lib/auth/portee/client.ts")).toMatch(
      /\$allOperations\(\{[^}]*\}\)\s*\{\s*if \(portee\.geles\) await verifierGel\(base, model, operation, args, portee\.geles\);/,
    );
  });

  it("seule la session pose le gel sur la portée ; ce qui y échappe est nommé", () => {
    const posent = [...TEXTES.keys()].filter((f) => /clientBorne(Sur)?\([^)]*geles/.test(code(f)));
    expect(posent).toEqual(["src/lib/auth/compte.ts"]);
    for (const f of Object.keys(HORS_GEL)) expect(TEXTES.has(f), f).toBe(true);
    expect(code("src/lib/auth/compte-hors-session.ts")).not.toMatch(/geles/);
  });

  it("chaque écriture en SQL brut est nommée, et celles d'une saisie demandent le gel", () => {
    const ecrivent = [...TEXTES.keys()].filter((f) => /\$executeRaw/.test(code(f)));
    expect(ecrivent.sort()).toEqual(Object.keys(SQL_BRUT_ECRIT).sort());
    expect(code("src/lib/registre/actions.ts")).toMatch(/refuserSiGele\(/);
    const appelants = [...TEXTES.keys()].filter((f) => /\becrireReponseFermee\(/.test(code(f)) && !f.endsWith("ecrire-reponse-fermee.ts"));
    expect(appelants.length).toBeGreaterThan(0);
    for (const f of appelants) expect(code(f), f).toMatch(/refuserSiGele\(/);
  });
});
