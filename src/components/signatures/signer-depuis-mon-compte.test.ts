import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Le câblage de la signature depuis le compte (audit du 2026-10-12, constat 8 ;
 * 2026-11-21 : une seule voie, le code par e-mail et le consentement, pour
 * tous les objets signables). Le comportement serveur est éprouvé dans
 * `lib/signatures/code-compte.test.ts`.
 */
const lire = (chemin: string) => readFileSync(join(process.cwd(), chemin), "utf8");

describe("le dirigeant signe depuis son compte, avec un code, sur les deux fiches", () => {
  it("la fiche du plan monte le panneau Signatures, dont la fenêtre signe avec le code", () => {
    expect(lire("src/app/etablissements/[id]/plan-prevention/[planId]/page.tsx")).toMatch(/<PanneauSignatures[\s\S]*?planId=\{plan\.id\}/);
    expect(lire("src/components/plan-prevention/PanneauSignatures.tsx")).toMatch(/<FenetreSigner[\s\S]*?planId=\{planId\}/);
    expect(lire("src/components/plan-prevention/FenetreSigner.tsx")).toMatch(/signerEtEnvoyerPlan\.bind\(null, planId\)/);
  });

  it.each([
    ["src/app/etablissements/[id]/permis-feu/[permisFeuId]/page.tsx", "permis_feu"],
  ])("%s monte la fenêtre sur son objet", (chemin, objet) => {
    const source = lire(chemin);
    const montage = source.match(/<SignerDepuisMonCompte[\s\S]*?\/>/)?.[0] ?? "";
    expect(montage).toContain(`objetType="${objet}"`);
  });

  it("la fenêtre demande le code puis signe avec lui, et rien d'autre", () => {
    const source = lire("src/components/signatures/SignerDepuisMonCompte.tsx");
    expect(source).toMatch(/\(\) => demanderCodeSignatureDuCompte\(objet\)/);
    expect(source).toMatch(/signerDuCompteAvecCode\.bind\(null, objet\)/);
    // La case et le champ du code, communs aux deux fenêtres (2026-11-21).
    expect(source).toMatch(/<CaseConsentement[\s\S]*?<ChampCodeSignature/);
    expect(lire("src/components/signatures/EtapesCodeSignature.tsx")).toContain('name="consentement"');
    expect(source).not.toMatch(/signerEnCompteConnecte\(/);
  });
});
