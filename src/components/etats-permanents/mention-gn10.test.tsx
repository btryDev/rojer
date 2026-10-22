// @vitest-environment jsdom
//
// Contrôle visuel de c6 (2026-10-17) : la phrase GN 10 était dans la
// description, que l'écran « Ce qui doit être en place » n'affiche pas. Une
// ligne qui cite GN 10 le dit désormais sous son article. Chaîne entière : le
// référentiel (`porteGn10`), la lecture de l'écran (`listerEtatsPermanents` →
// `fondementDe`), puis le rendu de la fiche (`versFiche` → `RevueEnPlace`,
// 2026-10-21 : la fiche a remplacé `LigneEtat` sur l'écran).

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/lib/prisma", () => ({
  prisma: { declarationEtatPermanent: { findMany: vi.fn(async () => []) } },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/etats-permanents/actions", () => ({
  declarerEnPlace: vi.fn(),
  retirerDeclaration: vi.fn(),
}));

const { listerEtatsPermanents } = await import("@/lib/etats-permanents/queries");
const { versFiche } = await import("@/lib/etats-permanents/vers-fiche");
const { rendreFicheOuverte } = await import("@/test/fiche-ouverte");
const { obligationsConformite } = await import("@/lib/referentiels/conformite");
const { fondementDe } = await import("@/lib/etats-permanents/fondement");
const { porteGn10, MENTION_GN_10, MENTION_GN_10_COURTE, GESTE_GN_10, CITATION_GN_10 } = await import(
  "@/lib/referentiels/conformite/texte-gn10"
);

afterEach(cleanup);

function erp(categorieErp: string, typeErp = "N", comporteLocauxSommeilPublic: boolean | null = null) {
  return {
    id: "etab-1",
    effectifSurSite: 8,
    effectifEntreprise: 8,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp,
    typesErpAutres: [],
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB: null,
  } as never;
}

async function lignes(e: never) {
  const d = await listerEtatsPermanents(e, []);
  return [...d.familles.flatMap((f) => f.blocs.flatMap((b) => b.lignes)), ...d.faits];
}

function rendre(l: Awaited<ReturnType<typeof lignes>>[number]) {
  const r = rendreFicheOuverte(
    versFiche(l, { etablissementId: "etab-1", entrepriseId: "ent-1" }),
  );
  return { ...r, container: r.boite };
}

describe("GN 10 à l'écran — une ligne qui le cite le dit", () => {
  it("toute obligation qui porte GN 10 a un fondement marqué, et seulement elle", () => {
    for (const o of obligationsConformite) {
      expect(fondementDe(o)?.gn10 === true, o.id).toBe(porteGn10(o));
    }
  });

  it("borne haute : porteGn10 est faux sur les lignes que GN 10 maintient, et sur une échéance", () => {
    // Relecture de c6 (2026-10-17) : le test précédent prend porteGn10 pour
    // référence ; une détection élargie (« livre II ») y restait verte.
    const parId = new Map(obligationsConformite.map((o) => [o.id, o] as const));
    for (const id of [
      "incendie-erp-ssi-contrat-entretien",
      "incendie-erp-eclairage-securite-notice-registre",
      "porte-auto-erp-contrat-entretien",
      "incendie-erp-avis-controle-affiche",
      "incendie-erp-5-sommeil-avis-controle-affiche",
      "incendie-erp-extincteurs-annuelle",
    ]) {
      const o = parId.get(id);
      expect(o, id).toBeDefined();
      expect(porteGn10(o!), id).toBe(false);
    }
  });

  it("borne basse : les lignes anciennes et nouvelles sont vues", () => {
    const ids = obligationsConformite.filter(porteGn10).map((o) => o.id);
    for (const id of [
      "incendie-erp-5-consignes-affichees", // PE 27, 5ᵉ, ancienne
      "incendie-erp-personnel-designe-moyens-secours", // titre II, 14/10
      "incendie-erp-plan-intervention-entrees", // titre Ier, sous-lot C
      "cuisson-erp-consignes-arret-urgence", // hors incendie.ts
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  it("à l'écran d'un restaurant de 3ᵉ, d'un restaurant de 5ᵉ et d'un hôtel de 5ᵉ : chaque ligne qui porte GN 10 affiche la mention, les autres non", async () => {
    let vues = 0;
    for (const e of [erp("N3"), erp("N5"), erp("N5", "O", true)]) {
      for (const l of await lignes(e)) {
        const { container, unmount } = rendre(l);
        const texte = container.textContent ?? "";
        const affiche = texte.includes(MENTION_GN_10_COURTE);
        // Replié, la phrase longue n'est PAS sur la ligne (décision de c6 :
        // onze fois la même phrase sur un N3, c'était trop de texte).
        expect(texte.includes(MENTION_GN_10), l.obligation.id).toBe(false);
        expect(affiche, l.obligation.id).toBe(porteGn10(l.obligation));
        if (affiche) vues += 1;
        unmount();
      }
    }
    expect(vues).toBeGreaterThanOrEqual(8);
  });

  it("la pastille GN 10 déplie la phrase longue, le texte entier, puis le geste", async () => {
    const l = (await lignes(erp("N3"))).find(
      (x) => x.obligation.id === "incendie-erp-plan-intervention-entrees",
    )!;
    const { getByRole, container } = rendre(l);
    // Le nom accessible ne répète pas la référence : « GN 10 », pas « GN 10 : GN 10 ».
    const livre = getByRole("button", { name: "GN 10", hidden: true });
    fireEvent.click(livre);
    const t = container.textContent ?? "";
    // Au dépli : la phrase longue, puis le verbatim, puis le geste.
    const [i, j, k] = [t.indexOf(MENTION_GN_10), t.indexOf(CITATION_GN_10), t.indexOf(GESTE_GN_10)];
    expect(i).toBeGreaterThanOrEqual(0);
    expect(j).toBeGreaterThan(i);
    expect(k).toBeGreaterThan(j);
  });
});
