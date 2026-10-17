// Le dossier remis à l'inspecteur ne peut plus dire l'habilitation « en
// place » à côté d'un titre expiré (audit du 2026-10-16).
//
// Le cas qui le montrait : la case cochée en janvier, le seul électricien
// habilité en juin 2022, son recyclage dû en juin 2025. L'écran et le PDF
// disaient « Les N états applicables sont tous déclarés en place », et la
// section des retards listait l'habilitation. Ce fichier pose ce dossier à la
// lecture unique (`listerEtatsPermanents`) puis au bloc du PDF.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";

const h = vi.hoisted(() => ({
  declarations: vi.fn(async () => [] as unknown[]),
  titres: vi.fn(async () => [] as unknown[]),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    declarationEtatPermanent: { findMany: h.declarations },
    titreSalarie: { findMany: h.titres },
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const { listerEtatsPermanents } = await import("./queries");
const { blocEtatsPermanents, phraseIndetermines } = await import(
  "@/lib/pdf/mentions-etats-permanents"
);

const HABILITATION = "elec-travail-habilitation-personnel";
const NOW = new Date("2026-10-16T10:00:00Z");

const etab = {
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
  operationsElectriques: true,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
} as unknown as Parameters<typeof listerEtatsPermanents>[0];
const installation = [
  { id: "eq-1", libelle: "TGBT", categorie: "INSTALLATION_ELECTRIQUE", caracteristiques: null },
] as unknown as Parameters<typeof listerEtatsPermanents>[1];

const titre = (iso: string) => ({
  obligationId: "elec-salarie-habilitation",
  delivreLe: new Date(`${iso}T00:00:00.000Z`),
  echeanceLe: null,
  salarie: { prenom: "Léa", nom: "Martin" },
});

beforeEach(() => {
  // La case cochée d'avant : une déclaration ancienne pour cette ligne ET pour
  // toutes les autres, pour que le compteur ne dépende que d'elle.
  h.declarations.mockImplementation(async () =>
    obligationsConformite.map(({ id: obligationId }) => ({
      obligationId,
      declareLe: new Date("2026-01-15T00:00:00Z"),
      note: null,
    })),
  );
});

async function dossier() {
  const d = await listerEtatsPermanents(etab, installation, undefined, NOW);
  const ligne = d.groupes.flatMap((g) => g.lignes).find((l) => l.obligation.id === HABILITATION);
  if (!ligne) throw new Error("l'habilitation ne s'applique plus à ce dossier");
  return { d, ligne };
}

describe("habilitation : l'état vient des titres, plus de la case", () => {
  it("titre expiré, case cochée : la ligne n'est PAS en place, et la case est ignorée", async () => {
    h.titres.mockResolvedValueOnce([titre("2022-06-01")]);
    const { d, ligne } = await dossier();
    expect(ligne.declareLe).toBeNull();
    expect(ligne.parLesTitres?.enPlace).toBe(false);
    expect(ligne.parLesTitres?.phrase).toContain("Léa Martin : échéance calculée dépassée");
    expect(d.enPlace).toBe(d.total - 1);
  });

  it("le PDF ne dit plus « tous déclarés en place », et la ligne dit d'où vient son état", async () => {
    h.titres.mockResolvedValueOnce([titre("2022-06-01")]);
    const { d } = await dossier();
    const bloc = blocEtatsPermanents(d);
    expect(bloc.compteur).not.toMatch(/tous déclarés en place/);
    const imprimee = bloc.etats.find(
      (l) => l.libelle === "Habilitation électrique du personnel opérant sur ou à proximité d'installations électriques",
    );
    // Sans nom : le document sort du produit (`docs/rgpd.md` § 6).
    expect(imprimee?.declaration).toMatch(
      /^Établi d'après les titres déclarés : 1 titre ; échéance calculée dépassée le 0?1\/06\/2025\.$/,
    );
  });

  it("aucun titre déclaré, case cochée : pas en place — le score ne peut plus conclure sans habilité", async () => {
    h.titres.mockResolvedValueOnce([]);
    const { d, ligne } = await dossier();
    expect(ligne.parLesTitres?.enPlace).toBe(false);
    expect(d.enPlace).toBe(d.total - 1);
  });

  it("contre-épreuve : un titre dont l'échéance n'est pas dépassée la met en place", async () => {
    h.titres.mockResolvedValueOnce([titre("2025-03-01")]);
    const { d, ligne } = await dossier();
    expect(ligne.parLesTitres?.enPlace).toBe(true);
    expect(d.enPlace).toBe(d.total);
    expect(ligne.parLesTitres?.phrase).toBe("Établi d'après les titres déclarés : 1 titre, aucune échéance dépassée.");
  });

  it("ne lit que les titres des personnes actives de CE dossier", async () => {
    h.titres.mockResolvedValueOnce([]);
    await dossier();
    expect(h.titres).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          salarie: expect.objectContaining({
            etablissementId: "etab-1",
            actif: true,
            etablissement: { entreprise: { userId: "user-1" } },
          }),
        }),
      }),
    );
  });
});

describe("les comptes ne disent pas « déclaré » de ce que l'employeur n'a pas déclaré (revue du 2026-10-16)", () => {
  it("PDF, tout en place : la ligne établie d'après les titres est comptée à part", async () => {
    h.titres.mockResolvedValueOnce([titre("2025-03-01")]);
    const { d } = await dossier();
    expect(d.parLesTitres).toEqual({ total: 1, enPlace: 1 });
    const bloc = blocEtatsPermanents(d);
    expect(bloc.compteur).toBe(
      `Les ${d.total} états applicables sont tous en place : ${d.total - 1} déclarés par l'employeur, 1 établi d'après les titres qu'il a déclarés.`,
    );
    expect(bloc.chapeau).toContain("« établie d'après les titres déclarés » ne se déclare pas");
    expect(bloc.nonEnPlaceParLesTitres).toBe(0);
  });

  it("PDF, page de garde : une échéance dépassée n'est pas « sans déclaration, rien constaté »", async () => {
    h.titres.mockResolvedValueOnce([titre("2022-06-01")]);
    const { d } = await dossier();
    const bloc = blocEtatsPermanents(d);
    expect(bloc.nonEnPlaceParLesTitres).toBe(1);
    const garde = phraseIndetermines(d.total - d.enPlace, bloc.nonEnPlaceParLesTitres);
    expect(garde).toContain("Un état établi d'après les titres déclarés n'est pas en place");
    expect(garde).not.toMatch(/ne porte pas encore de déclaration|rien constaté/);
  });

  it("contre-épreuve : sans ligne établie d'après les titres, le chapeau n'en parle pas", () => {
    const bloc = blocEtatsPermanents({
      groupes: [],
      faits: [],
      enPlace: 0,
      total: 0,
      parLesTitres: { total: 0, enPlace: 0 },
      faitsDates: 0,
      faitsDatesRenseignes: 0,
    });
    expect(bloc.chapeau ?? "").not.toContain("titres déclarés");
  });
});

describe("RGPD : ce qui sort du produit ne nomme personne (docs/rgpd.md § 6, revue du 2026-10-16)", () => {
  // L'écran nomme — l'employeur lit sa propre équipe. Le dossier de
  // conformité et l'export contrôle, remis à un tiers, ne nomment personne :
  // ils impriment `blocEtatsPermanents`, et rien d'autre de cette ligne.
  it("ni prénom ni nom dans le bloc imprimé, quel que soit l'état des titres", async () => {
    for (const lot of [[titre("2022-06-01")], [titre("2025-03-01")], [titre("2022-06-01"), titre("2025-03-01")]]) {
      h.titres.mockResolvedValueOnce(lot);
      const { d, ligne } = await dossier();
      // L'écran, lui, nomme : la contre-épreuve que le nom existe bien en amont.
      if (lot.some((t) => t.delivreLe.getUTCFullYear() === 2022)) {
        expect(ligne.parLesTitres?.phrase).toContain("Léa Martin");
      }
      const imprime = JSON.stringify(blocEtatsPermanents(d));
      expect(imprime).not.toMatch(/Léa|Martin/);
    }
  });
});
