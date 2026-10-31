/**
 * La page du carnet dit ce que Rojer fait selon que l'installation est
 * déclarée — et elle le LIT (2026-10-17, revue indépendante du sous-lot F).
 *
 * `textes.test.ts` tient les phrases ; ce fichier tient le BRANCHEMENT : un
 * `ceQueRojerFait(…, false)` écrit en dur dans la page laissait tous les tests
 * verts, et l'hôtel qui a déclaré son installation lisait l'invitation à la
 * déclarer. On rend la page, prédicat mocké, et on lit le texte rendu.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seulementSousUnLivreFerme } from "@/test/livre";

const suivie = vi.fn();
vi.mock("@/lib/carnet-sanitaire/suivi-calendrier", () => ({
  eauChaudeSuivieParLeCalendrier: (...a: unknown[]) => suivie(...a),
}));
const DB_DU_COMPTE = vi.hoisted(() => ({ nom: "client du compte" }));
vi.mock("@/lib/auth/scope", () => ({
  requireEtablissement: async (id: string) => ({
    user: { id: "u1" },
    db: DB_DU_COMPTE,
    etablissement: { id, estERP: true, raisonDisplay: "Hôtel du Port" },
  }),
}));
vi.mock("@/lib/carnet-sanitaire/queries", () => ({
  getCarnetSanitaire: async () => null,
}));
vi.mock("@/lib/batiments/queries", () => ({
  listerBatimentsDeLEtablissement: async () => [],
}));
// Le corps de « Pourquoi ce carnet » vit dans la modal du « ? » (2026-10-28),
// qui ne se rend qu'ouverte : ici on la rend ouverte, pour lire le texte.
vi.mock("@/components/ui-kit/AideEcran", () => ({
  AideEcran: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
// Les actions serveur : aucune n'est appelée au rendu, toutes sont des fonctions.
vi.mock("@/lib/carnet-sanitaire/actions", () =>
  new Proxy({} as Record<string, unknown>, {
    get: (_t, k) => (k === "then" ? undefined : vi.fn()),
    has: () => true,
  }),
);

import CarnetSanitairePage from "./page";

const rendre = async () =>
  renderToStaticMarkup(
    await CarnetSanitairePage({ params: Promise.resolve({ id: "etab-1" }) }),
  ).replace(/&#x27;|&#39;/g, "'");

beforeEach(() => suivie.mockReset());

describe("page du carnet — le texte suit l'installation déclarée", () => {
  it("installation déclarée : les deux lignes du calendrier, et ce qu'il faut y déposer", async () => {
    suivie.mockResolvedValue(true);
    const html = await rendre();
    expect(html).toContain("pour chaque installation déclarée");
    expect(html).toContain("sur la ligne de la température");
    expect(html).not.toContain("déclarez-la dans vos équipements");
    expect(html).toContain("c'est le cas que visent les articles 1er et 2");
    expect(html).not.toContain("Rojer ne sait pas si c'est votre cas");
  });

  it("sans installation : l'invitation à la déclarer, et l'échéance du module", async () => {
    suivie.mockResolvedValue(false);
    const html = await rendre();
    expect(html).toContain("déclarez-la dans vos équipements");
    expect(html).not.toContain("pour chaque installation déclarée");
    expect(html).toContain("Rojer ne sait pas si c'est votre cas");
  });

  it("le prédicat est lu dans le périmètre du compte", async () => {
    suivie.mockResolvedValue(false);
    await rendre();
    // Le client que rend la garde (ADR-051), puis la portée.
    expect(suivie).toHaveBeenCalledWith(DB_DU_COMPTE, {
      etablissementId: "etab-1",
      etablissement: { entreprise: { userId: "u1" } },
    });
  });
});

// Le livre est un `<details>` natif (2026-10-28) : le verbatim est dans le
// HTML, mais replié. On tient qu'il n'est lu nulle part HORS d'un livre fermé.
describe("page du carnet — le texte de l'arrêté reste sous son livre", () => {
  it("l'article 3 n'est pas lu tant que le livre n'est pas ouvert", async () => {
    suivie.mockResolvedValue(true);
    const html = await rendre();
    expect(
      seulementSousUnLivreFerme(html, "assure la traçabilité de cette surveillance"),
    ).toBe(true);
  });
});
