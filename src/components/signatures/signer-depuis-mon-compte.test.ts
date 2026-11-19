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
  // [2026-11-19] La fiche du plan signe avec un code par e-mail : son câblage
  // est éprouvé plus bas ; le bouton sans code reste celui du permis de feu.
  it("la fiche du plan monte le panneau Signatures, dont la fenêtre signe avec le code", () => {
    expect(lire("src/app/etablissements/[id]/plan-prevention/[planId]/page.tsx")).toMatch(/<PanneauSignatures[\s\S]*?planId=\{plan\.id\}/);
    expect(lire("src/components/plan-prevention/PanneauSignatures.tsx")).toMatch(/<FenetreSigner[\s\S]*?planId=\{planId\}/);
    expect(lire("src/components/plan-prevention/FenetreSigner.tsx")).toMatch(/signerEtEnvoyerPlan\.bind\(null, planId\)/);
  });

  it.each([
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
