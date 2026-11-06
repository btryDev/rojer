import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));
const { etatStripe } = vi.hoisted(() => ({ etatStripe: vi.fn() }));
vi.mock("@/lib/stripe/config", () => ({ etatStripe }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
}));

import type { Db } from "@/lib/auth/compte";
import { aDejaPaye, exigerSignatureDEssai, exigerUnPaiement, PAGE_S_ABONNER } from "./validation";

const db = (debutPayantLe: Date | null, signatures = 0) =>
  ({
    abonnement: { findUnique: vi.fn(async () => ({ debutPayantLe, formule: "rojer_essentiel_mensuel", statut: "trialing", essaiUtiliseLe: null })) },
    consommationQuota: { count: vi.fn(async () => signatures) },
  }) as unknown as Db;

function lancer(oui = true) {
  vi.stubEnv("ABONNEMENT_EXIGE", oui ? "oui" : "non");
  etatStripe.mockReturnValue({ active: true, mode: "test" });
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("valider = s'abonner (ADR-053 § 15)", () => {
  it("avant le lancement de l'offre, tout le monde valide", async () => {
    lancer(false);
    expect(await aDejaPaye(db(null), "c1")).toBe(true);
  });

  it("le premier paiement CONFIRMÉ ouvre les gestes ; un simple essai ou un impayé, non", async () => {
    lancer();
    expect(await aDejaPaye(db(new Date("2026-01-01")), "c1")).toBe(true);
    expect(await aDejaPaye(db(null), "c1")).toBe(false);
    await expect(exigerUnPaiement(db(null), "c1")).rejects.toThrow(`REDIRECT ${PAGE_S_ABONNER}`);
    await exigerUnPaiement(db(new Date("2026-01-01")), "c1");
  });

  it("sans abonnement payé : une signature de test, et un lien seulement à soi-même", async () => {
    lancer();
    const SOI = "moi@exemple.fr";
    await exigerSignatureDEssai(db(null, 0), "c1", SOI);
    await exigerSignatureDEssai(db(null, 0), "c1", SOI, SOI);
    await expect(exigerSignatureDEssai(db(null, 0), "c1", SOI, "tiers@exemple.fr")).rejects.toThrow(`REDIRECT ${PAGE_S_ABONNER}`);
    await expect(exigerSignatureDEssai(db(null, 1), "c1", SOI)).rejects.toThrow(`REDIRECT ${PAGE_S_ABONNER}`);
    // Abonné : rien de tout cela.
    await exigerSignatureDEssai(db(new Date("2026-01-01"), 9), "c1", SOI, "tiers@exemple.fr");
  });
});

describe("les gestes qui demandent l'abonnement passent par la règle", () => {
  // Le corps de la fonction, et lui seul : un appel identique plus bas dans le
  // fichier ne doit pas faire passer un geste qui aurait perdu sa garde.
  const corpsDe = (source: string, fonction: string) => {
    const debut = source.indexOf(`export async function ${fonction}(`);
    if (debut < 0) return "";
    const fin = source.indexOf("\n}\n", debut);
    return source.slice(debut, fin < 0 ? undefined : fin);
  };
  const GESTES: [string, string, string][] = [
    ["src/lib/versions/actions.ts", "creerVersion", "await exigerUnPaiement(db, compte.compteId)"],
    ["src/lib/accessibilite/actions.ts", "publierRegistre", "await exigerUnPaiement(db, compte.compteId)"],
    ["src/app/api/etablissements/[id]/controle-zip/route.ts", "GET", "await exigerUnPaiement(db, compte.compteId)"],
    ["src/app/api/etablissements/[id]/registre/pdf/route.ts", "GET", "await exigerUnPaiement(db, compte.compteId)"],
    ["src/lib/signatures/actions.ts", "demanderSignature", "await exigerSignatureDEssai(db, compte.compteId, user.email, params.signataireEmail)"],
    ["src/lib/signatures/actions.ts", "signerEnCompteConnecte", "await exigerSignatureDEssai(db, compte.compteId, user.email)"],
    ["src/app/api/etablissements/[id]/dossier-conformite/pdf/route.ts", "GET", "projet: !(await aDejaPaye(db, compte.compteId))"],
  ];
  it.each(GESTES)("%s : %s", (fichier, fonction, appel) => {
    expect(corpsDe(readFileSync(join(process.cwd(), fichier), "utf8"), fonction)).toContain(appel);
  });
});
