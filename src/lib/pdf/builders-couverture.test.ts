import { beforeEach, describe, expect, it, vi } from "vitest";

// D2 (a) : le dossier PDF transmet au score les questions de couverture du
// dossier. Contre-lecture du lot 3 : ce maillon n'était tenu par aucun test —
// `builders.ts` pouvait passer `{ indeterminations: 0 }` sans qu'un seul test
// rougisse. Les lectures sont simulées ; le builder et le score sont réels.
// Éprouvé en remettant `{ indeterminations: 0 }` dans le builder.

const h = vi.hoisted(() => ({
  indeterminations: [] as Array<{ axe: string; motif: string; quoiFaire: string }>,
}));

const etab = {
  id: "etab-1",
  raisonDisplay: "Bistrot",
  adresse: "1 rue",
  effectifSurSite: 3,
  codeNaf: "56.10A",
  estERP: false,
  estIGH: false,
  estHabitation: false,
  estEtablissementTravail: true,
  entreprise: { raisonSociale: "SARL", siret: "1", effectif: 3, codeNaf: "56.10A" },
  _count: { batiments: 1 },
  duerps: [],
};

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { etablissement: { findFirst: async () => etab } } }));
vi.mock("@/lib/actions/queries", async (orig) => ({
  ...(await orig<typeof import("@/lib/actions/queries")>()),
  compterActions: async () => ({ totalACouvrir: 0, enRetard: 0, ouvertes: 0, enCours: 0, leveesRecemment: 0 }),
  listerActions: async () => [],
}));
vi.mock("@/lib/rapports/queries", async (orig) => ({
  ...(await orig<typeof import("@/lib/rapports/queries")>()),
  listerRapportsDeLEtablissement: async () => [],
}));
vi.mock("@/lib/calendrier/queries", async (orig) => ({
  ...(await orig<typeof import("@/lib/calendrier/queries")>()),
  listerVerifications: async () => [],
}));
vi.mock("@/lib/perimetre/faits", () => ({
  couvertureDuDossier: async () => ({ manques: [], indeterminations: h.indeterminations }),
}));
vi.mock("@/lib/etats-permanents/queries", async (orig) => ({
  ...(await orig<typeof import("@/lib/etats-permanents/queries")>()),
  etatsPermanentsDuDossier: async () => ({ groupes: [], faits: [], total: 0, enPlace: 0 }),
}));
vi.mock("@/lib/calendrier/fraicheur", async (orig) => ({
  ...(await orig<typeof import("@/lib/calendrier/fraicheur")>()),
  fraicheurCalendrier: async () => ({ etat: "jamais_genere" }),
}));
vi.mock("@/lib/etablissements/marques-a-confirmer", () => ({
  marquesAConfirmerDuDossier: async () => ({ parObligation: new Map(), entrepriseId: null, questions: [] }),
}));

const { construireDossierConformiteData } = await import("./builders");

beforeEach(() => {
  h.indeterminations = [];
});

describe("dossier PDF : le score reçoit la couverture (D2 (a))", () => {
  it("une question ouverte empêche « satisfaisante » ; sans question, rien ne change", async () => {
    const sans = await construireDossierConformiteData("etab-1");
    h.indeterminations = [{ axe: "categorie_erp", motif: "m", quoiFaire: "q" }];
    const avec = await construireDossierConformiteData("etab-1");
    expect(sans?.score.indeterminationsCouverture).toBe(0);
    expect(avec?.score.indeterminationsCouverture).toBe(1);
    expect(avec?.score.niveau).not.toBe(sans?.score.niveau);
  });
});
