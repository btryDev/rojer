import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Le câblage de la signature depuis le compte (audit du 2026-10-12, constat 8).
 * `signerEnCompteConnecte` était gardée et testée côté serveur, et AUCUN écran
 * ne l'appelait : c'est le câblage qui manquait, c'est lui qu'on garde. Le
 * comportement serveur (partie forcée, pas de double signature) est éprouvé
 * dans `lib/signatures/cycle-signatures.test.ts`.
 */
const lire = (chemin: string) => readFileSync(join(process.cwd(), chemin), "utf8");

describe("le dirigeant signe depuis son compte, sur les deux fiches", () => {
  it.each([
    ["src/app/etablissements/[id]/plan-prevention/[planId]/page.tsx", "plan_prevention"],
    ["src/app/etablissements/[id]/permis-feu/[permisFeuId]/page.tsx", "permis_feu"],
  ])("%s monte le bouton sur son objet", (chemin, objet) => {
    const source = lire(chemin);
    const montage = source.match(/<SignerDepuisMonCompte[\s\S]*?\/>/)?.[0] ?? "";
    expect(montage).toContain(`objetType="${objet}"`);
  });

  it("le bouton appelle l'action serveur gardée, et aucune autre", () => {
    const source = lire("src/components/signatures/SignerDepuisMonCompte.tsx");
    expect(source).toMatch(/await signerEnCompteConnecte\(\{ etablissementId, objetType, objetId \}\)/);
  });
});
