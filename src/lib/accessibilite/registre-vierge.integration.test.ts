// Le registre public d'accessibilité, créé sur un établissement VIERGE, contre
// un VRAI PostgreSQL migré — sans seed (c6, 2026-10-18).
//
// Le défaut : `obtenirOuCreer` créait la ligne sans `handicapsAccueillis`.
// La colonne est NOT NULL, et la migration `20260812000000` en avait retiré le
// DEFAULT au motif que « Prisma envoie toujours une valeur explicite pour un
// champ liste » — faux à la création quand le champ est omis : Prisma n'envoie
// rien, PostgreSQL met NULL et refuse. Le seed remplissait le champ ; un
// dirigeant qui ouvrait son registre pour la première fois tombait sur
// « Null constraint violation on the fields: (handicapsAccueillis) ».
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ACCESSIBILITE_INTEGRATION_URL`
// pointe une base LOCALE migrée et jetable (jamais Supabase ni la prod) :
//   ACCESSIBILITE_INTEGRATION_URL=postgresql://u:p@127.0.0.1:5440/<base> \
//     vitest run registre-vierge.integration
// Il crée une entreprise et un établissement à lui, et les efface.

import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const URL_BASE = process.env.ACCESSIBILITE_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

// Le vrai client borné (ADR-051), pas le remplacement de vitest.setup.ts : ce
// test tourne contre une vraie base, il éprouve aussi la borne.
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/portee/lot-verifie");
vi.mock("@/lib/auth/scope", async () => {
  const { clientBorne } = await vi.importActual<typeof import("@/lib/auth/portee/client")>(
    "@/lib/auth/portee/client",
  );
  const { prisma } = await import("@/lib/prisma");
  return {
    assertEtablissementOwnership: async () => undefined,
    // La garde rend le client borné au propriétaire de l'établissement.
    assertEtablissementDuCompte: async (etablissementId: string) => {
      const e = await prisma.etablissement.findUniqueOrThrow({
        where: { id: etablissementId },
        select: { entreprise: { select: { userId: true } } },
      });
      const userId = e.entreprise.userId!;
      return { user: { id: userId, email: null }, db: clientBorne({ type: "compte", userId }) };
    },
  };
});
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

describe.skipIf(!URL_BASE || !local)("registre d'accessibilité — établissement vierge, PostgreSQL réel", async () => {
  if (URL_BASE) {
    process.env.DATABASE_URL = URL_BASE;
    process.env.DIRECT_URL = URL_BASE;
  }
  const { prisma } = await import("@/lib/prisma");
  const { sauverSection1, publierRegistre } = await import("./actions");
  const marque = `test-integration-access-${Date.now()}`;
  const entrepriseIds: string[] = [];

  async function etablissementVierge() {
    const e = await prisma.entreprise.create({
      data: {
        // Un propriétaire, comme toute entreprise en production : la garde
        // rend le client borné à son compte.
        userId: randomUUID(),
        raisonSociale: marque,
        effectif: 3,
        adresse: "1 rue du Test, 75000 Paris",
        etablissements: {
          create: {
            raisonDisplay: marque,
            adresse: "1 rue du Test, 75000 Paris",
            codeNaf: "56.10A",
            effectifSurSite: 3,
          },
        },
      },
      include: { etablissements: true },
    });
    entrepriseIds.push(e.id);
    const etab = e.etablissements[0];
    // Vierge : aucun registre n'existe avant l'action.
    expect(await prisma.registreAccessibilite.count({ where: { etablissementId: etab.id } })).toBe(0);
    return etab.id;
  }

  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { id: { in: entrepriseIds } } });
    await prisma.$disconnect();
  });

  it("la première saisie de la section 1 crée le registre, sans handicap coché", async () => {
    const id = await etablissementVierge();
    const fd = new FormData();
    fd.set("prestationsFournies", "Restauration sur place");
    const r = await sauverSection1(id, { status: "idle" }, fd);
    expect(r).toEqual({ status: "success", section: 1 });
    const reg = await prisma.registreAccessibilite.findUniqueOrThrow({ where: { etablissementId: id } });
    expect(reg.handicapsAccueillis).toEqual([]);
  });

  it("publier d'emblée, sur un établissement vierge, ne lève pas", async () => {
    const id = await etablissementVierge();
    await expect(publierRegistre(id)).resolves.toBeDefined();
    expect(await prisma.registreAccessibilite.count({ where: { etablissementId: id } })).toBe(1);
  });
});

// Sans base : la garde qui tourne partout. Le schéma déclare le DEFAULT, et la
// DERNIÈRE migration qui touche au DEFAULT de la colonne le pose — une
// migration ultérieure qui le retirerait fait tomber ce test.
describe("registre d'accessibilité — le DEFAULT de handicapsAccueillis tient (sans base)", () => {
  it("le schéma Prisma déclare `@default([])`", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toMatch(/^\s*handicapsAccueillis\s+HandicapAccessible\[\]\s+@default\(\[\]\)/m);
  });

  it("la dernière migration qui touche ce DEFAULT le pose, elle ne le retire pas", () => {
    const dossier = join(process.cwd(), "prisma/migrations");
    const touches = readdirSync(dossier)
      .filter((d) => !d.endsWith(".toml"))
      .sort()
      .flatMap((d) => {
        const sql = readFileSync(join(dossier, d, "migration.sql"), "utf8").replace(/--[^\n]*/g, "");
        const m = /"handicapsAccueillis"\s+(SET|DROP)\s+DEFAULT/.exec(sql);
        return m ? [{ d, geste: m[1] }] : [];
      });
    // Borne basse : le retrait du 2026-08-12 est bien lu.
    expect(touches.some((t) => t.geste === "DROP")).toBe(true);
    expect(touches.at(-1)?.geste).toBe("SET");
  });
});
