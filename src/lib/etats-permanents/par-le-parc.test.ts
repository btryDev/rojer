// Les obligations de présence établies d'après le parc (ADR-057 § 4,
// décision de la propriétaire du 2026-11-06 : « d'après le parc »). Elles se
// voient sur la page Équipements, pas sur « Ce qui doit être en place » ; elles
// sont en place dès qu'un appareil de la catégorie est déclaré, et restent
// comptées au dossier (score, PDF). Une ancienne case cochée est ignorée.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { EQUIPEMENTS_DE_SECURITE } from "@/lib/equipements/equipements-securite";
import { etabliParLeParc, etatParLeParc, PRESENCE_PAR_LE_PARC } from "./par-le-parc";

const h = vi.hoisted(() => ({
  declarations: vi.fn(async () => [] as unknown[]),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    declarationEtatPermanent: { findMany: h.declarations },
    pieceEtatPermanent: { findMany: vi.fn(async () => []) },
    titreSalarie: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const { listerEtatsPermanents } = await import("./queries");
const { compteDeLaPage } = await import("./compte");
const { blocEtatsPermanents } = await import("@/lib/pdf/mentions-etats-permanents");

const DOTATION = "incendie-travail-extincteurs-dotation";
const NOW = new Date("2026-11-06T10:00:00Z");

// Un restaurant de 3ᵉ catégorie : la dotation, l'alarme sonore et le DAE
// s'appliquent tous trois.
const etab = {
  id: "etab-1",
  effectifSurSite: 8,
  effectifEntreprise: 8,
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "N",
  typesErpAutres: [],
  categorieErp: "N3",
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
} as unknown as Parameters<typeof listerEtatsPermanents>[0];

type Parc = Parameters<typeof listerEtatsPermanents>[1];
const appareil = (id: string, categorie: string) =>
  ({ id, libelle: id, categorie, caracteristiques: null }) as Parc[number];

beforeEach(() => {
  // Une case cochée d'avant, sur toutes les obligations : elle ne doit rien
  // changer aux lignes établies d'après le parc.
  h.declarations.mockImplementation(async () =>
    obligationsConformite.map(({ id: obligationId }) => ({
      obligationId,
      declareLe: new Date("2026-01-15T00:00:00Z"),
      note: null,
    })),
  );
});

describe("la table", () => {
  it("les trois obligations de présence de la page Équipements, et elles seules", () => {
    const deLaPage = Object.fromEntries(
      EQUIPEMENTS_DE_SECURITE.flatMap((e) =>
        e.cible.kind === "categorie" ? [[e.obligationId, e.cible.categorie]] : [],
      ),
    );
    expect(PRESENCE_PAR_LE_PARC).toEqual(deLaPage);
  });

  it("chaque obligation de la table existe au référentiel", () => {
    for (const id of Object.keys(PRESENCE_PAR_LE_PARC)) {
      expect(obligationsConformite.some((o) => o.id === id), id).toBe(true);
    }
  });

  it("le prédicat ne vaut qu'en mode « état »", () => {
    expect(etabliParLeParc({ id: DOTATION }, "etat")).toBe("EXTINCTEUR");
    expect(etabliParLeParc({ id: DOTATION }, "fait")).toBeNull();
    expect(etabliParLeParc({ id: "secours-etablissement-materiel" }, "etat")).toBeNull();
  });

  it("la phrase dit ce qui est déclaré, jamais que c'est en place", () => {
    expect(etatParLeParc("EXTINCTEUR", 0)).toMatchObject({ enPlace: false });
    expect(etatParLeParc("EXTINCTEUR", 2).phrase).toBe(
      "D'après le parc déclaré : 2 appareils « Extincteurs ».",
    );
  });
});

describe("la lecture de « Ce qui doit être en place »", () => {
  it("sans extincteur déclaré : la ligne n'est pas en place, la case cochée est ignorée", async () => {
    const d = await listerEtatsPermanents(etab, [], undefined, NOW);
    const ligne = d.parLeParc.find((l) => l.obligation.id === DOTATION)!;
    expect(ligne.parLeParc?.enPlace).toBe(false);
    expect(ligne.declareLe).toBeNull();
    expect(ligne.accepteUnFichier).toBe(false);
  });

  it("un extincteur déclaré la met en place", async () => {
    const d = await listerEtatsPermanents(etab, [appareil("e1", "EXTINCTEUR")], undefined, NOW);
    const ligne = d.parLeParc.find((l) => l.obligation.id === DOTATION)!;
    expect(ligne.parLeParc).toMatchObject({ enPlace: true, declares: 1 });
  });

  it("elle quitte les familles de l'écran, pas le dossier : comptée au total et au PDF", async () => {
    const d = await listerEtatsPermanents(etab, [appareil("e1", "EXTINCTEUR")], undefined, NOW);
    const deLEcran = d.familles.flatMap((f) => f.blocs.flatMap((b) => b.lignes));
    for (const id of Object.keys(PRESENCE_PAR_LE_PARC)) {
      expect(deLEcran.some((l) => l.obligation.id === id), id).toBe(false);
    }
    const parc = d.parLeParc.filter((l) => l.compteDansLEnTete);
    expect(parc.map((l) => l.obligation.id).sort()).toEqual(
      Object.keys(PRESENCE_PAR_LE_PARC).sort(),
    );
    // Le compteur de la page ne les porte pas ; le dossier, si.
    const page = compteDeLaPage(d);
    expect(page.total).toBe(d.total - parc.length - d.parLEquipe.filter((l) => l.compteDansLEnTete).length);
    // Le PDF les liste, avec la phrase du parc.
    const pdf = blocEtatsPermanents(d);
    const extincteurs = pdf.etats.find((l) => l.libelle === parc.find((x) => x.obligation.id === DOTATION)!.obligation.libelle);
    expect(extincteurs?.declaration).toBe("D'après le parc déclaré : 1 appareil « Extincteurs ».");
  });
});
