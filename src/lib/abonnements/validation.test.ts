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
import { aDejaPaye, exigerUnPaiement, PAGE_S_ABONNER, signatureDEssaiDisponible } from "./validation";

const db = (debutPayantLe: Date | null, signatures = 0) =>
  ({
    abonnement: { findUnique: vi.fn(async () => ({ debutPayantLe })) },
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

  it("une seule signature de test : la première du compte", async () => {
    expect(await signatureDEssaiDisponible(db(null, 0))).toBe(true);
    expect(await signatureDEssaiDisponible(db(null, 1))).toBe(false);
  });
});

describe("les gestes qui demandent l'abonnement passent par la règle", () => {
  const GESTES: [string, RegExp][] = [
    ["src/lib/versions/actions.ts", /export async function creerVersion\([\s\S]*?await exigerUnPaiement\(db, compte\.compteId\)/],
    ["src/lib/accessibilite/actions.ts", /export async function publierRegistre\([\s\S]*?await exigerUnPaiement\(db, compte\.compteId\)/],
    ["src/app/api/etablissements/[id]/controle-zip/route.ts", /export async function GET\([\s\S]*?await exigerUnPaiement\(db, compte\.compteId\)/],
    ["src/app/api/etablissements/[id]/registre/pdf/route.ts", /export async function GET\([\s\S]*?await exigerUnPaiement\(db, compte\.compteId\)/],
    ["src/lib/signatures/actions.ts", /export async function demanderSignature\([\s\S]*?aDejaPaye\(db, compte\.compteId\)[\s\S]*?signatureDEssaiDisponible\(db\)[\s\S]*?redirect\(PAGE_S_ABONNER\)/],
    ["src/lib/signatures/actions.ts", /export async function signerEnCompteConnecte\([\s\S]*?aDejaPaye\(db, compte\.compteId\)[\s\S]*?signatureDEssaiDisponible\(db\)[\s\S]*?redirect\(PAGE_S_ABONNER\)/],
    ["src/app/api/etablissements/[id]/dossier-conformite/pdf/route.ts", /projet: !\(await aDejaPaye\(db, compte\.compteId\)\)/],
  ];
  it.each(GESTES)("%s", (fichier, motif) => {
    expect(readFileSync(join(process.cwd(), fichier), "utf8")).toMatch(motif);
  });
});
