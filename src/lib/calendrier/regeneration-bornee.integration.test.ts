// La régénération du calendrier contre un VRAI PostgreSQL migré (ADR-051,
// conception du calendrier, 2026-10-30) : en session, la passe lit par le
// client borné au compte, et sa porte refuse toute clé que la lecture de CET
// établissement n'a pas rendue.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe une
// base LOCALE migrée et jetable. Il crée ses entreprises sous des comptes à lui
// et les efface ; il ne vide rien.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/portee/lot-verifie");
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// La garde rend le client borné au compte que le test désigne : celui du
// propriétaire, ou — pour simuler une garde fautive — celui d'un autre compte.
const garde = vi.hoisted(() => ({ compte: null as string | null }));
vi.mock("@/lib/auth/scope", async () => {
  const { clientBorne } = await vi.importActual<typeof import("@/lib/auth/portee/client")>(
    "@/lib/auth/portee/client",
  );
  return {
    assertEtablissementDuCompte: async () => ({
      user: { id: garde.compte!, email: null },
      db: clientBorne({ type: "compte", userId: garde.compte! }),
    }),
  };
});

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("régénération du calendrier — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { clientBorne } = await import("@/lib/auth/portee/client");
  const { regenererSansInvalider } = await import("./actions");
  const { lireEntrees, planifier } = await import("./passe");
  const { clesDuPlanDansLaLecture } = await import("./cles-du-plan");

  const A = randomUUID();
  const B = randomUUID();
  const entreprises: string[] = [];

  async function etablissement(entrepriseId: string, nom: string) {
    const etab = await prisma.etablissement.create({
      data: { entrepriseId, raisonDisplay: nom, adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 },
    });
    const bat = await prisma.batiment.create({ data: { etablissementId: etab.id, nom: "Principal" } });
    const equip = await prisma.equipement.create({
      data: { etablissementId: etab.id, batimentId: bat.id, categorie: "INSTALLATION_ELECTRIQUE", libelle: "TGBT" },
    });
    return { etab, equip };
  }

  let e1: Awaited<ReturnType<typeof etablissement>>;
  let e2: Awaited<ReturnType<typeof etablissement>>;

  beforeAll(async () => {
    const ent = await prisma.entreprise.create({
      data: { userId: A, raisonSociale: "A", effectif: 5, adresse: "1 rue" },
    });
    entreprises.push(ent.id);
    // Deux établissements du MÊME compte : la borne au compte ne les sépare
    // pas, la porte si.
    e1 = await etablissement(ent.id, "A1");
    e2 = await etablissement(ent.id, "A2");
  });
  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { id: { in: entreprises } } });
    await prisma.$disconnect();
  });

  const lignes = (etablissementId: string) => prisma.verification.count({ where: { etablissementId } });

  it("le propriétaire régénère : des lignes, toutes sur des équipements de CET établissement", async () => {
    garde.compte = A;
    await regenererSansInvalider(e1.etab.id);
    const v = await prisma.verification.findMany({
      where: { etablissementId: e1.etab.id },
      select: { equipementId: true },
    });
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((l) => l.equipementId === e1.equip.id)).toBe(true);
    expect(v.some((l) => l.equipementId === e2.equip.id)).toBe(false);
  });

  it("une garde fautive qui rend le client d'un autre compte : rien n'est lu, rien n'est écrit", async () => {
    garde.compte = B;
    const avant = await lignes(e2.etab.id);
    await expect(regenererSansInvalider(e2.etab.id)).rejects.toThrow(/introuvable/);
    expect(await lignes(e2.etab.id)).toBe(avant);
  });

  it("sur la lecture bornée réelle, un équipement de l'autre établissement du compte est refusé", async () => {
    const lecture = await lireEntrees(clientBorne({ type: "compte", userId: A }), e1.etab.id);
    const plan = planifier(lecture, new Date());
    expect(() => clesDuPlanDansLaLecture(plan, lecture)).not.toThrow();
    const modele = plan.aCreer[0] ?? { equipementId: null, salarieId: null, prescriptionId: null };
    const injecte = { ...plan, aCreer: [{ ...modele, equipementId: e2.equip.id }] } as typeof plan;
    expect(() => clesDuPlanDansLaLecture(injecte, lecture)).toThrow(/Régénération refusée/);
  });
});
