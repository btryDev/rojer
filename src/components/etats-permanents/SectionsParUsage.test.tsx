// @vitest-environment jsdom
//
// Le rendu par usage de « Ce qui doit être en place » (2026-10-17), sur des
// dossiers passés par la vraie lecture (`listerEtatsPermanents`) : l'ordre des
// titres est celui de `familles.ts`, une famille sans ligne n'a ni section ni
// ancre, et aucune carte ne porte un sur-titre qui répète le titre au-dessus.
// Aucune liste de libellés recopiée : l'attendu se lit dans `familles.ts`.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    declarationEtatPermanent: { findMany: vi.fn(async () => []) },
    titreSalarie: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const { listerEtatsPermanents } = await import("@/lib/etats-permanents/queries");
const { SectionsParUsage, SommaireParUsage } = await import("./SectionsParUsage");
const {
  GROUPE_REPLI,
  LIBELLE_GROUPE,
  LIBELLE_GROUPE_REPLI,
  LIBELLE_SOUS_CATEGORIE,
  ORDRE_GROUPES,
  ORDRE_SOUS_CATEGORIES,
} = await import("@/lib/etats-permanents/familles");
const { determineObligationsApplicables, projeterEtablissement } = await import(
  "@/lib/matching"
);

afterEach(cleanup);

type Etats = Awaited<ReturnType<typeof listerEtatsPermanents>>;

const base = {
  id: "etab-1",
  effectifSurSite: 6,
  effectifEntreprise: 6,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  typesErpAutres: [],
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
};

// Trois dossiers types : un bureau sans appareil, un restaurant de 5ᵉ
// catégorie avec son installation électrique, et un immeuble d'habitation
// sans employeur — celui-là laisse des familles vides, c'est lui qui éprouve
// leur absence.
const DOSSIERS = {
  bureau: { etab: base, equipements: [] },
  restaurant: {
    etab: {
      ...base,
      effectifSurSite: 8,
      effectifEntreprise: 8,
      estERP: true,
      typeErp: "N",
      categorieErp: "N5",
    },
    equipements: [
      { id: "eq-1", libelle: "TGBT", categorie: "INSTALLATION_ELECTRIQUE", caracteristiques: null },
    ],
  },
  habitation: {
    etab: {
      ...base,
      effectifSurSite: 0,
      effectifEntreprise: 0,
      estEtablissementTravail: false,
      estHabitation: true,
    },
    equipements: [],
  },
} as const;

async function lire(nom: keyof typeof DOSSIERS): Promise<Etats> {
  const { etab, equipements } = DOSSIERS[nom];
  return listerEtatsPermanents(
    etab as unknown as Parameters<typeof listerEtatsPermanents>[0],
    equipements as unknown as Parameters<typeof listerEtatsPermanents>[1],
  );
}

function rendre(d: Etats) {
  return render(
    <main>
      <SommaireParUsage familles={d.familles} />
      <SectionsParUsage
        familles={d.familles}
        rendreLigne={(l) => <li key={l.obligation.id}>{l.obligation.libelle}</li>}
      />
    </main>,
  );
}

describe.each(Object.keys(DOSSIERS) as (keyof typeof DOSSIERS)[])(
  "« Ce qui doit être en place », dossier %s",
  (nom) => {
    it("le dossier porte des états — sinon rien ne se contrôle", async () => {
      const d = await lire(nom);
      expect(d.familles.length).toBeGreaterThanOrEqual(2);
    });

    it("les h2 suivent l'ordre des familles, sans famille vide", async () => {
      const d = await lire(nom);
      const { container } = rendre(d);
      const h2 = [...container.querySelectorAll("section > div > h2")].map(
        (h) => h.textContent,
      );
      const presentes = ORDRE_GROUPES.filter((g) =>
        d.familles.some((f) => f.groupe === g && f.total > 0),
      );
      expect(h2).toEqual(presentes.map((g) => LIBELLE_GROUPE[g]));
      // Une famille sans ligne n'a ni section ni entrée au sommaire.
      for (const g of ORDRE_GROUPES.filter((x) => !presentes.includes(x))) {
        expect(container.querySelector(`#usage-${g}`)).toBeNull();
        expect(container.querySelector(`a[href="#usage-${g}"]`)).toBeNull();
      }
    });

    it("les h3 de chaque famille suivent l'ordre de ses sous-catégories", async () => {
      const d = await lire(nom);
      const { container } = rendre(d);
      for (const f of d.familles) {
        const section = container.querySelector(`#usage-${f.groupe}`)!;
        const h3 = [...section.querySelectorAll("h3")].map((h) => h.textContent);
        // Le repli n'a pas de sous-catégorie (`familles.ts`).
        const ordre = f.groupe === GROUPE_REPLI ? [] : ORDRE_SOUS_CATEGORIES[f.groupe];
        const attendu = ordre
          .filter((s) => f.blocs.some((b) => b.sous === s && b.lignes.length > 0))
          .map((s) => LIBELLE_SOUS_CATEGORIE[s]);
        expect(h3).toEqual(attendu);
        // Chaque bloc rendu porte au moins une ligne.
        for (const carte of section.querySelectorAll(".carte-board")) {
          expect(carte.querySelectorAll("li").length).toBeGreaterThan(0);
        }
      }
    });

    it("chaque ancre du sommaire vise une section présente, et chaque section a la sienne", async () => {
      const d = await lire(nom);
      const { container } = rendre(d);
      const nav = container.querySelector('nav[aria-label="Sommaire"]')!;
      const cibles = [...nav.querySelectorAll("a")].map((a) =>
        a.getAttribute("href")!.slice(1),
      );
      expect(cibles.length).toBe(d.familles.length);
      for (const id of cibles) {
        expect(container.querySelector(`section#${id}`), id).not.toBeNull();
      }
      const ids = [...container.querySelectorAll("section[id]")].map((s) => s.id);
      expect(ids).toEqual(cibles);
    });

    it("aucune carte ne porte un sur-titre qui répète le titre, ni deux niveaux de titrage", async () => {
      const d = await lire(nom);
      const { container } = rendre(d);
      for (const section of container.querySelectorAll("section")) {
        const h2 = section.querySelector("h2")!.textContent;
        for (const carte of section.querySelectorAll(".carte-board")) {
          expect(carte.querySelectorAll("h2")).toHaveLength(0);
          const h3 = carte.querySelectorAll("h3");
          expect(h3.length).toBeLessThanOrEqual(1);
          if (h3[0]) expect(h3[0].textContent).not.toBe(h2);
        }
      }
    });
  },
);

describe("les témoins", () => {
  it("un des dossiers types laisse une famille vide — sinon l'absence n'est jamais éprouvée", async () => {
    const d = await lire("habitation");
    const absentes = ORDRE_GROUPES.filter(
      (g) => !d.familles.some((f) => f.groupe === g),
    );
    expect(absentes.length).toBeGreaterThan(0);
    // Et une sous-catégorie vide, dans une famille présente.
    const incendie = d.familles.find((f) => f.groupe === "incendie_secours");
    expect(incendie?.blocs.length).toBeLessThan(
      ORDRE_SOUS_CATEGORIES.incendie_secours.length,
    );
  });
});

describe("le témoin : une famille sans sous-catégorie n'a pas de h3", () => {
  it("une carte, la famille entière, sans sur-titre", () => {
    const { container } = rendre({
      familles: [
        {
          groupe: "organisation",
          libelle: LIBELLE_GROUPE.organisation,
          enPlace: 0,
          total: 1,
          parLesTitres: { total: 0, enPlace: 0 },
          blocs: [
            {
              sous: null,
              libelle: null,
              enPlace: 0,
              total: 1,
              lignes: [{ obligation: { id: "o-1", libelle: "Une ligne" } }],
            },
          ],
        },
      ],
    } as unknown as Etats);
    expect(container.querySelectorAll(".carte-board")).toHaveLength(1);
    expect(container.querySelectorAll("h3")).toHaveLength(0);
    expect(container.querySelector("h2")?.textContent).toBe(LIBELLE_GROUPE.organisation);
  });
});

describe("le repli : une ligne de l'écran sans rangement (2026-10-17, revue indépendante)", () => {
  // `listerEtatsPermanents` levait sur une telle ligne, et le score du tableau
  // de bord, le PDF et le widget passent par elle. L'oubli fait échouer
  // `familles.test.ts` ; ici, on éprouve la ceinture : la ligne s'affiche en
  // dernier dans « Autres obligations », rien ne lève, les comptes tiennent.
  async function avecUneLigneNonRangee() {
    const { etab } = DOSSIERS.bureau;
    const source = etab as unknown as Parameters<typeof listerEtatsPermanents>[0];
    const applicables = determineObligationsApplicables(
      projeterEtablissement(source),
      [],
    );
    const temoin = await listerEtatsPermanents(source, [], applicables);
    // La première ligne « en place » du premier bloc : une ligne de l'écran.
    const visee = temoin.familles[0].blocs[0].lignes[0].obligation.id;
    const fixture = applicables.map((a) =>
      a.obligation.id === visee
        ? { ...a, obligation: { ...a.obligation, usageEcran: null } }
        : a,
    ) as typeof applicables;
    const d = await listerEtatsPermanents(source, [], fixture);
    return { temoin, d, visee };
  }

  it("la ligne va dans « Autres obligations », en dernier, et rien ne lève", async () => {
    const { d, visee } = await avecUneLigneNonRangee();
    const derniere = d.familles.at(-1)!;
    expect(derniere.groupe).toBe(GROUPE_REPLI);
    expect(derniere.libelle).toBe(LIBELLE_GROUPE_REPLI);
    expect(derniere.blocs).toHaveLength(1);
    expect(derniere.blocs[0].sous).toBeNull();
    // `toContain`, pas `toEqual` : si le référentiel porte déjà un oubli, le
    // repli le recueille aussi, et ce test doit rester vert — c'est
    // `familles.test.ts` qui rougit.
    expect(derniere.blocs[0].lignes.map((l) => l.obligation.id)).toContain(visee);
    // Et nulle part ailleurs.
    const ailleurs = d.familles
      .slice(0, -1)
      .flatMap((f) => f.blocs.flatMap((b) => b.lignes))
      .filter((l) => l.obligation.id === visee);
    expect(ailleurs).toEqual([]);
  });

  it("le compteur est juste : rien de caché, rien de compté deux fois", async () => {
    const { temoin, d } = await avecUneLigneNonRangee();
    expect(d.total).toBe(temoin.total);
    expect(d.enPlace).toBe(temoin.enPlace);
    expect(d.familles.reduce((n, f) => n + f.total, 0)).toBe(d.total);
    const repliTemoin =
      temoin.familles.find((f) => f.groupe === GROUPE_REPLI)?.total ?? 0;
    expect(d.familles.at(-1)!.total).toBe(repliTemoin + 1);
  });

  it("l'écran rend le repli comme une famille sans sous-catégorie, sommaire compris", async () => {
    const { d } = await avecUneLigneNonRangee();
    const { container } = rendre(d);
    const h2 = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(h2.at(-1)).toBe(LIBELLE_GROUPE_REPLI);
    const section = container.querySelector(`#usage-${GROUPE_REPLI}`)!;
    expect(section).not.toBeNull();
    expect(section.querySelectorAll("h3")).toHaveLength(0);
    const liens = [...container.querySelectorAll("nav a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(liens.at(-1)).toBe(`#usage-${GROUPE_REPLI}`);
  });
});
