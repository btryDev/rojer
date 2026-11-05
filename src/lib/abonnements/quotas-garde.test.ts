// Toute création d'un modèle plafonné passe par la porte des plafonds
// (ADR-053 § 14) : `prendreQuota`, ou `creerSousPlafond` qui l'appelle, dans
// la transaction qui crée. La garde relit le code, comme celle du SQL brut :
// une création ajoutée demain ailleurs, ou hors de la transaction, la fait
// échouer.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sansCommentairesNiChaines } from "@/lib/auth/tenancy-sonde";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Chaque module qui crée un élément plafonné, et le plafond qu'il prend. */
const CREATIONS: Record<string, { modele: string; cle: string }> = {
  "src/lib/onboarding/actions.ts": { modele: "etablissement", cle: "etablissements" },
  "src/lib/prestataires/actions.ts": { modele: "prestataire", cle: "prestataires" },
  "src/lib/permis-feu/actions.ts": { modele: "permisFeu", cle: "permisDeFeuParAn" },
  "src/lib/plan-prevention/actions.ts": { modele: "planPrevention", cle: "plansDePreventionParAn" },
};

// Création directe d'un modèle plafonné, ou imbriquée depuis un parent
// (`etablissements: { create … }`). Accès par crochets compris.
const CREATION_DIRECTE = /\.\s*(etablissement|prestataire|permisFeu|planPrevention)\s*\.\s*(create|createMany|createManyAndReturn|upsert)\b/g;
const CREATION_IMBRIQUEE = /\b(etablissements|prestataires|permisFeu|plansPrevention)\s*:\s*\{\s*(create|createMany|connectOrCreate)\b/;

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

const TEXTES = new Map(
  fichiers(join(DEPOT, "src")).map((f) => {
    const brut = readFileSync(f, "utf8");
    return [relative(DEPOT, f), { brut, code: sansCommentairesNiChaines(brut) }] as const;
  }),
);

describe("plafonds : une seule porte (ADR-053 § 14)", () => {
  it("seuls les modules nommés créent un élément plafonné", () => {
    const directe = new RegExp(CREATION_DIRECTE.source);
    const createurs = [...TEXTES].filter(([, t]) => directe.test(t.code) || CREATION_IMBRIQUEE.test(t.code)).map(([f]) => f);
    expect(createurs.sort()).toEqual(Object.keys(CREATIONS).sort());
  });

  it("chaque création se fait sur la transaction, et le module prend le plafond qui lui revient", () => {
    for (const [fichier, { modele, cle }] of Object.entries(CREATIONS)) {
      const t = TEXTES.get(fichier)!;
      const creations = [...t.code.matchAll(CREATION_DIRECTE)];
      expect(creations.length, fichier).toBeGreaterThan(0);
      for (const m of creations) {
        expect(m[1], fichier).toBe(modele);
        // Le client juste avant le modèle : `tx`, la transaction de la porte.
        expect(t.code.slice(Math.max(0, m.index - 3), m.index), fichier).toMatch(/\Wtx$/);
      }
      expect(t.brut, fichier).toMatch(new RegExp(`(prendreQuota|creerSousPlafond)\\([^;]*?"${cle}"`));
    }
  });

  it("les utilisateurs : les deux limites du plugin lisent le plafond", () => {
    const code = TEXTES.get("src/lib/auth/better-auth.ts")!.brut;
    expect(code).toMatch(/invitationLimit:[\s\S]{0,200}limitesMembresDuPlugin\([\s\S]{0,40}\)\)\.invitations/);
    expect(code).toMatch(/membershipLimit:[\s\S]{0,200}limitesMembresDuPlugin\([\s\S]{0,40}\)\)\.membres/);
  });
});
