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

const { prismaMock, requireUserMock, carnetFindFirst, equipementCount } = vi.hoisted(() => {
  const carnetFindFirst = vi.fn();
  const equipementCount = vi.fn();
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
    } as Record<string, unknown>,
    { get: (t, m: string) => (m in t ? t[m] : modele()) },
  );
  return { prismaMock, requireUserMock: vi.fn(), carnetFindFirst, equipementCount };
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

describe("sourceLegionelles — muette quand l'installation est déclarée", () => {
  it("sans installation de la catégorie : l'échéance du carnet est là", async () => {
    equipementCount.mockResolvedValue(0);
    expect(legionelles(await listerAutresEcheances(ETAB, AUJOURDHUI))).toHaveLength(1);
  });

  it("avec une installation de la catégorie : rien, le référentiel porte l'analyse", async () => {
    equipementCount.mockResolvedValue(1);
    expect(legionelles(await listerAutresEcheances(ETAB, AUJOURDHUI))).toHaveLength(0);
  });

  it("le compte lit la catégorie dans le périmètre du compte, en ERP seulement", async () => {
    equipementCount.mockResolvedValue(0);
    await listerAutresEcheances(ETAB, AUJOURDHUI);
    expect(equipementCount).toHaveBeenCalledWith({
      where: {
        etablissementId: ETAB,
        // ERP seulement : hors ERP, les lignes du référentiel ne naissent pas,
        // et taire le carnet laisserait l'établissement sans aucun rappel.
        etablissement: { entreprise: { userId: "user-1" }, estERP: true },
        categorie: "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC",
      },
    });
  });
});
