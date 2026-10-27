import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le CÂBLAGE de la source légionelles (2026-10-17, sous-lot F).
 *
 * `echeances.test.ts` défend la règle pure (`echeanceLegionelles` se tait
 * quand `suivieParLeCalendrier` est vrai). Ce fichier défend ce que la règle
 * ne voit pas : que la SOURCE lise bien les équipements de l'établissement et
 * passe la réponse. Sans lui, une source qui appellerait la règle avec `false`
 * en dur laisserait tous les tests verts et le calendrier montrerait deux
 * analyses pour un acte.
 *
 * Prisma est mocké : chaque lecture rend le vide (liste vide, `null`, 0), sauf
 * le carnet et le compte d'équipements, réglés par cas.
 */

// Le parc de l'établissement, tel que la base le rendrait. Le faux `count`
// APPLIQUE le filtre qu'on lui passe : le test juge un comportement — telle
// installation fait-elle taire le carnet ? — et non la forme de la requête.
// [2026-10-17, revue indépendante : le test de forme qui précédait avait figé
// l'oubli de `actif`.]
type Installation = { categorie: string; actif: boolean; estERP: boolean };

const { prismaMock, requireUserMock, carnetFindFirst, parc } = vi.hoisted(() => {
  const carnetFindFirst = vi.fn();
  const parc: { liste: Installation[] } = { liste: [] };
  const equipementCount = vi.fn(
    async ({ where }: { where: Record<string, unknown> }) => {
      const etab = (where.etablissement ?? {}) as { estERP?: boolean };
      return parc.liste.filter(
        (e) =>
          (where.categorie === undefined || e.categorie === where.categorie) &&
          (where.actif === undefined || e.actif === where.actif) &&
          (etab.estERP === undefined || e.estERP === etab.estERP),
      ).length;
    },
  );
  const vide = (methode: string) =>
    vi.fn(async () =>
      methode === "findMany" ? [] : methode === "count" ? 0 : null,
    );
  const modele = (surcharges: Record<string, unknown> = {}) =>
    new Proxy(surcharges, {
      get: (t, m: string) => (m in t ? t[m] : vide(m)),
    });
  const prismaMock = new Proxy(
    {
      carnetSanitaire: modele({ findFirst: carnetFindFirst }),
      equipement: modele({ count: equipementCount }),
      // Les comptages agrégés des modules (`comptesModulesDuRendu`, qui lit
      // aussi le carnet) passent par une requête brute : des comptes à zéro.
      $queryRaw: vi.fn(async () => [
        { total: BigInt(0), echus: BigInt(0), sansInspection: BigInt(0) },
      ]),
    } as Record<string, unknown>,
    { get: (t, m: string) => (m in t ? t[m] : modele()) },
  );
  return { prismaMock, requireUserMock: vi.fn(), carnetFindFirst, parc };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));

import { listerAutresEcheances } from "./echeances";

const ETAB = "etab-hotel";
const AUJOURDHUI = new Date("2026-10-17T10:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ id: "user-1" });
  carnetFindFirst.mockResolvedValue({
    analyses: [{ dateAnalyse: new Date("2026-03-01T00:00:00Z") }],
  });
});

const legionelles = (l: { id: string }[]) => l.filter((e) => e.id === "legionelles-analyse");

const ECS = "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC";
const rappels = async () => legionelles(await listerAutresEcheances(ETAB, AUJOURDHUI)).length;

describe("sourceLegionelles — muette quand l'installation est déclarée", () => {
  it("sans installation de la catégorie : l'échéance du carnet est là", async () => {
    parc.liste = [];
    expect(await rappels()).toBe(1);
  });

  it("ERP avec une installation active : rien, le référentiel porte l'analyse", async () => {
    parc.liste = [{ categorie: ECS, actif: true, estERP: true }];
    expect(await rappels()).toBe(0);
  });

  it("installation RETIRÉE du parc : le rappel du carnet revient", async () => {
    // Le moteur ne voit que les actifs : les lignes `ecs-*` ont disparu avec
    // l'installation. Le carnet doit reprendre le rappel, sinon plus rien.
    parc.liste = [{ categorie: ECS, actif: false, estERP: true }];
    expect(await rappels()).toBe(1);
  });

  it("hors ERP, même déclarée : le rappel du carnet reste", async () => {
    // Les lignes ne naissent qu'en ERP ; taire le carnet laisserait
    // l'établissement sans aucun rappel.
    parc.liste = [{ categorie: ECS, actif: true, estERP: false }];
    expect(await rappels()).toBe(1);
  });

  it("une autre catégorie ne fait rien taire", async () => {
    parc.liste = [{ categorie: "DEFIBRILLATEUR", actif: true, estERP: true }];
    expect(await rappels()).toBe(1);
  });
});
