// Les comptages agrégés des modules (`comptesModulesDuRendu`, `count(*) FILTER`)
// contre un VRAI PostgreSQL : ils doivent rendre exactement ce que rendaient
// les `count` Prisma qu'ils remplacent (plan performance, lot 1).
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `MODULES_INTEGRATION_URL` pointe une
// base LOCALE migrée et semée (par ex. une base de mesure du plan performance) :
//   MODULES_INTEGRATION_URL=postgresql://duerp:<mdp>@localhost:5433/duerp_perf_gros \
//     pnpm exec vitest run comptes-modules.integration
// Il ajoute des permis et des plans `test-integration` à un dossier, et les efface.

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: session.userId, email: null }),
}));

const URL_BASE = process.env.MODULES_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("comptes des modules — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { comptesModulesDuRendu } = await import("./modules");
  const MARQUE = "test-integration-modules";
  const nettoyer = async () => {
    await prisma.permisFeu.deleteMany({ where: { lieu: MARQUE } });
    await prisma.planPrevention.deleteMany({ where: { lieux: MARQUE } });
  };
  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  /** Un jeu qui sépare chaque condition : ouvert/clos, échu/à venir, inspecté ou non. */
  async function semer(etablissementId: string) {
    await nettoyer();
    const hier = new Date(Date.now() - 2 * 86_400_000);
    const demain = new Date(Date.now() + 2 * 86_400_000);
    const plan = (n: number, statut: string, dateFin: Date, inspectionDate: Date | null) =>
      prisma.planPrevention.create({
        data: {
          etablissementId, numero: 9000 + n, entrepriseExterieureRaison: "EE", efChefNom: "C",
          efChefEmail: "c@exemple.invalid", efEffectifIntervenant: 1, euChefNom: "U",
          dateDebut: hier, dateFin, lieux: MARQUE, naturesTravaux: "T",
          statut: statut as never, inspectionDate,
        },
      });
    const permis = (n: number, statut: string, dateFin: Date) =>
      prisma.permisFeu.create({
        data: {
          etablissementId, numero: 9000 + n, prestataireRaison: "P", prestataireContact: "C",
          prestataireEmail: "p@exemple.invalid", donneurOrdreNom: "D", dateDebut: hier, dateFin,
          lieu: MARQUE, descriptionTravaux: "T", naturesTravaux: [], statut: statut as never,
        },
      });
    await plan(1, "brouillon", hier, null); // ouvert, échu, non inspecté
    await plan(2, "valide", demain, null); // ouvert, à venir, non inspecté
    await plan(3, "valide", hier, hier); // ouvert, échu, inspecté
    await permis(1, "valide", hier); // ouvert, échu
    await permis(2, "en_cours", demain); // ouvert, à venir
  }

  it("rend les mêmes nombres que les comptages Prisma, pour chaque dossier", async () => {
    const debut = new Date();
    const etabs = await prisma.etablissement.findMany({
      select: { id: true, entreprise: { select: { userId: true } } },
    });
    expect(etabs.length).toBeGreaterThan(0);
    await semer(etabs[0].id);
    const ouvertsPermis = ["brouillon", "attente_signatures", "valide", "en_cours"] as const;
    const ouvertsPlans = ["brouillon", "inspection_faite", "attente_signatures", "valide"] as const;
    for (const e of etabs) {
      session.userId = e.entreprise.userId ?? "";
      const c = await comptesModulesDuRendu(e.id, debut.getTime());
      const id = e.id;
      expect(c.permisFeu).toEqual({
        total: await prisma.permisFeu.count({ where: { etablissementId: id } }),
        echusNonClos: await prisma.permisFeu.count({
          where: { etablissementId: id, dateFin: { lt: debut }, statut: { in: [...ouvertsPermis] } },
        }),
      });
      expect(c.plansPrevention).toEqual({
        total: await prisma.planPrevention.count({ where: { etablissementId: id } }),
        sansInspection: await prisma.planPrevention.count({
          where: { etablissementId: id, statut: { in: [...ouvertsPlans] }, inspectionDate: null },
        }),
        echusNonClos: await prisma.planPrevention.count({
          where: { etablissementId: id, dateFin: { lt: debut }, statut: { in: [...ouvertsPlans] } },
        }),
      });
    }
  });

  it("un autre compte ne compte rien", async () => {
    const e = await prisma.etablissement.findFirstOrThrow({ select: { id: true } });
    session.userId = "00000000-0000-4000-8000-0000000000aa";
    const c = await comptesModulesDuRendu(e.id, Date.now());
    expect(c.permisFeu.total + c.plansPrevention.total).toBe(0);
    expect(c.carnet).toBeNull();
  });
});
