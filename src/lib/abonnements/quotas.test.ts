import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { etatStripe } = vi.hoisted(() => ({ etatStripe: vi.fn() }));
vi.mock("@/lib/stripe/config", () => ({ etatStripe }));
const m = vi.hoisted(() => ({ membres: [] as unknown[], invitations: [] as unknown[], journal: vi.fn() }));
// Le journal s'écrit par la voie des lots vérifiés (ADR-051) : on relève ce qu'elle reçoit.
vi.mock("@/lib/auth/portee/lot-verifie", () => ({ creerEnLotVerifie: m.journal }));
vi.mock("@/lib/auth/membres", () => ({
  membresDuCompte: async () => m.membres,
  invitationsDuCompte: async () => m.invitations,
}));

import type { PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import {
  creerSousPlafond,
  debutDeLAnnee,
  depassements,
  formuleDesPlafonds,
  limitesMembresDuPlugin,
  placesSousLePlafond,
  motifDuRefus,
  prendreQuota,
  RefusQuota,
  refusQuota,
} from "./quotas";

// Le client borné (et sa transaction), réduit à ce que la porte lit.
const PAYE_DEPUIS = new Date("2026-01-15T00:00:00Z");
function faux(formule: string | null, nombre: number, debutPayantLe: Date | null = PAYE_DEPUIS, statut = "active") {
  const compte = () => ({ count: vi.fn().mockResolvedValue(nombre) });
  const tx = {
    $queryRaw: vi.fn(),
    abonnement: { findUnique: vi.fn().mockResolvedValue(formule === null ? null : { formule, statut, debutPayantLe }) },
    etablissement: compte(),
    prestataire: compte(),
    equipement: compte(),
    prescriptionParticuliere: compte(),
    batiment: compte(),
    uniteTravail: compte(),
    consommationQuota: { count: vi.fn().mockResolvedValue(nombre) },
  };
  const db = { ...tx, $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)) };
  return { tx, db: db as unknown as Db, txc: tx as never };
}

function lancer(oui = true) {
  vi.stubEnv("ABONNEMENT_EXIGE", oui ? "oui" : "non");
  etatStripe.mockReturnValue({ active: true, mode: "test" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("formule des plafonds et motif du refus", () => {
  it("formule absente ou inconnue : la plus petite, et le journal le signale", () => {
    expect(formuleDesPlafonds("rojer_pro_annuel")).toBe("pro");
    expect(console.error).not.toHaveBeenCalled();
    for (const f of ["rojer_surmesure_annuel", "", null, undefined]) expect(formuleDesPlafonds(f), String(f)).toBe("essentiel");
    expect(console.error).toHaveBeenCalledTimes(4);
  });

  it("le motif nomme le plafond et la formule qui le lève", () => {
    expect(motifDuRefus({ formule: "essentiel", essai: null }, "etablissements")).toBe(
      "Votre formule Essentiel couvre 1 établissement : passez à Pro depuis la page Abonnement de votre compte.",
    );
    expect(motifDuRefus({ formule: "pro", essai: null }, "etablissements")).toBe(
      "Votre formule Pro couvre 5 établissements : au-delà, la formule Sur mesure s'établit sur devis.",
    );
    expect(motifDuRefus({ formule: "essentiel", essai: null }, "permisDeFeuParAn")).toBe(
      "Votre formule Essentiel couvre 10 permis de feu par an : passez à Pro depuis la page Abonnement de votre compte.",
    );
  });

  it("une formule inconnue au plafond ne se signale qu'une fois", async () => {
    lancer();
    await expect(prendreQuota(faux("rojer_surmesure_annuel", 1).txc, "c1", "etablissements")).rejects.toBeInstanceOf(RefusQuota);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

describe("debutDeLAnnee : l'année des plafonds annuels", () => {
  const ancre = new Date("2025-03-12T08:00:00Z");
  it("le dernier anniversaire du premier abonnement payant", () => {
    expect(debutDeLAnnee(ancre, new Date("2026-11-05T10:00:00Z"))).toEqual(new Date("2026-03-12T08:00:00Z"));
    expect(debutDeLAnnee(ancre, new Date("2026-03-12T07:59:59Z"))).toEqual(new Date("2025-03-12T08:00:00Z"));
    expect(debutDeLAnnee(ancre, new Date("2026-03-12T08:00:00Z"))).toEqual(new Date("2026-03-12T08:00:00Z"));
  });
  it("un 29 février tombe le 28 les années communes", () => {
    expect(debutDeLAnnee(new Date("2024-02-29T00:00:00Z"), new Date("2025-06-01T00:00:00Z"))).toEqual(new Date("2025-02-28T00:00:00Z"));
  });
  it("la première année part du début de l'essai, s'il la précède ; les suivantes, de l'anniversaire", () => {
    const essai = new Date("2025-02-10T08:00:00Z");
    expect(debutDeLAnnee(ancre, new Date("2025-06-01T00:00:00Z"), essai)).toEqual(essai);
    expect(debutDeLAnnee(ancre, new Date("2026-06-01T00:00:00Z"), essai)).toEqual(new Date("2026-03-12T08:00:00Z"));
  });
  it("un essai lointain ne remonte pas au-delà d'un an avant l'ancre", () => {
    expect(debutDeLAnnee(ancre, new Date("2025-06-01T00:00:00Z"), new Date("2024-01-10T00:00:00Z"))).toEqual(new Date("2024-03-12T08:00:00Z"));
  });
  it("sans ancre (essai, jamais payé) : les douze derniers mois", () => {
    expect(debutDeLAnnee(null, new Date("2026-11-05T10:00:00Z"))).toEqual(new Date("2025-11-05T10:00:00Z"));
  });
});

describe("prendreQuota", () => {
  it("offre non lancée : ni verrou ni lecture ; le journal annuel s'écrit quand même", async () => {
    lancer(false);
    const { tx, txc } = faux("rojer_essentiel_mensuel", 99);
    await prendreQuota(txc, "c1", "etablissements");
    await prendreQuota(txc, "c1", "permisDeFeuParAn");
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.abonnement.findUnique).not.toHaveBeenCalled();
    expect(m.journal).toHaveBeenCalledTimes(1);
    expect(m.journal).toHaveBeenCalledWith(tx, "ConsommationQuota", [{ compteId: "c1", quota: "permisDeFeuParAn" }]);
  });

  it("lancée : verrou du compte d'abord, puis le compte sous le plafond passe", async () => {
    lancer();
    const { tx, txc } = faux("rojer_essentiel_mensuel", 0);
    await prendreQuota(txc, "c1", "etablissements");
    const [sql, id] = tx.$queryRaw.mock.calls[0];
    expect(sql.join("?")).toMatch(/FROM "Compte" WHERE "id" = \?::uuid FOR NO KEY UPDATE/);
    expect(id).toBe("c1");
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.etablissement.count.mock.invocationCallOrder[0]);
    expect(tx.abonnement.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { compteId: "c1" } }));
    expect(m.journal).not.toHaveBeenCalled();
  });

  it("au plafond : refus, et rien n'est inscrit au journal", async () => {
    lancer();
    const { tx, txc } = faux("rojer_essentiel_mensuel", 10);
    await expect(prendreQuota(txc, "c1", "permisDeFeuParAn")).rejects.toBeInstanceOf(RefusQuota);
    expect(m.journal).not.toHaveBeenCalled();
  });

  it("par an : compté au journal depuis le dernier anniversaire du premier abonnement payant, puis inscrit", async () => {
    lancer();
    vi.useFakeTimers({ now: new Date("2026-11-05T10:00:00Z"), toFake: ["Date"] });
    const { tx, txc } = faux("rojer_essentiel_mensuel", 4, new Date("2025-03-12T08:00:00Z"));
    await prendreQuota(txc, "c1", "plansDePreventionParAn");
    expect(tx.consommationQuota.count).toHaveBeenCalledWith({
      where: { quota: "plansDePreventionParAn", consommeLe: { gte: new Date("2026-03-12T08:00:00Z") } },
    });
    expect(m.journal).toHaveBeenCalledWith(tx, "ConsommationQuota", [{ compteId: "c1", quota: "plansDePreventionParAn" }]);
    vi.useRealTimers();
  });

  it("formule inconnue ou absente : plafonds de la plus petite, pas d'illimité", async () => {
    lancer();
    for (const formule of ["rojer_surmesure_annuel", null]) {
      const { txc } = faux(formule, 1);
      // Sans ligne du tout, le compte n'a jamais payé : la limite de l'essai, la même.
      await expect(prendreQuota(txc, "c1", "etablissements"), String(formule)).rejects.toThrow(/1 établissement/);
    }
  });

  it("Pro : le plafond de Pro, compté puis inscrit", async () => {
    lancer();
    const sous = faux("rojer_pro_mensuel", 29);
    await prendreQuota(sous.txc, "c1", "permisDeFeuParAn");
    expect(m.journal).toHaveBeenCalled();
    await expect(prendreQuota(faux("rojer_pro_mensuel", 30).txc, "c1", "permisDeFeuParAn")).rejects.toThrow(
      "Votre formule Pro couvre 30 permis de feu par an : au-delà, la formule Sur mesure s'établit sur devis.",
    );
  });
});

describe("creerSousPlafond et refusQuota", () => {
  it("crée dans la transaction de la porte, ou rend le motif sans créer", async () => {
    lancer();
    const creer = vi.fn().mockResolvedValue({ id: "p1" });
    const sous = faux("rojer_essentiel_mensuel", 9);
    expect(await creerSousPlafond(sous.db, "c1", "prestataires", creer)).toEqual({ ok: true, valeur: { id: "p1" } });
    expect(creer).toHaveBeenCalledWith(sous.tx);

    creer.mockClear();
    const au = faux("rojer_essentiel_mensuel", 10);
    expect(await creerSousPlafond(au.db, "c1", "prestataires", creer)).toEqual({
      ok: false,
      motif: "Votre formule Essentiel couvre 10 prestataires : passez à Pro depuis la page Abonnement de votre compte.",
    });
    expect(creer).not.toHaveBeenCalled();
  });

  it("une autre erreur remonte telle quelle", async () => {
    lancer(false);
    const { db } = faux(null, 0);
    await expect(creerSousPlafond(db, "c1", "etablissements", () => Promise.reject(new Error("P2002")))).rejects.toThrow("P2002");
  });

  it("le pré-contrôle : rien avant le lancement, le motif au plafond", async () => {
    lancer(false);
    const avant = faux("rojer_essentiel_mensuel", 99);
    expect(await refusQuota(avant.db, "c1", "prestataires")).toBeNull();
    expect(avant.tx.abonnement.findUnique).not.toHaveBeenCalled();
    lancer();
    expect(await refusQuota(faux("rojer_essentiel_mensuel", 9).db, "c1", "prestataires")).toBeNull();
    expect(await refusQuota(faux("rojer_essentiel_mensuel", 10).db, "c1", "prestataires")).toMatch(/^Votre formule Essentiel couvre 10 prestataires/);
  });
});

describe("limitesMembresDuPlugin", () => {
  const brut = (formule: string | null, membres: number) =>
    ({
      abonnement: { findUnique: vi.fn().mockResolvedValue(formule === null ? null : { formule, statut: "active", debutPayantLe: PAYE_DEPUIS }) },
      membre: { count: vi.fn().mockResolvedValue(membres) },
    }) as unknown as PrismaClient;

  it("offre non lancée : la limite par défaut du plugin, sans lecture", async () => {
    lancer(false);
    const p = brut("rojer_essentiel_mensuel", 1);
    expect(await limitesMembresDuPlugin(p, "c1")).toEqual({ membres: 100, invitations: 100 });
    expect(p.abonnement.findUnique).not.toHaveBeenCalled();
  });

  it("Essentiel : un seul utilisateur, aucune invitation", async () => {
    lancer();
    expect(await limitesMembresDuPlugin(brut("rojer_essentiel_mensuel", 1), "c1")).toEqual({ membres: 1, invitations: 0 });
  });

  it("Pro : cinq, invitations en attente comprises ; au-delà, aucune", async () => {
    lancer();
    expect(await limitesMembresDuPlugin(brut("rojer_pro_annuel", 3), "c1")).toEqual({ membres: 5, invitations: 2 });
    expect(await limitesMembresDuPlugin(brut("rojer_pro_annuel", 7), "c1")).toEqual({ membres: 5, invitations: 0 });
  });
});

describe("depassements : ce qu'une baisse fait dépasser", () => {
  it("rien quand tout tient dans la formule visée", async () => {
    m.membres = [{}];
    m.invitations = [];
    expect(await depassements(faux("rojer_pro_annuel", 1).db, "c1", "rojer_essentiel_mensuel")).toEqual([]);
  });

  it("les stocks au-delà du plafond, invitations en attente comprises ; jamais les compteurs annuels", async () => {
    m.membres = [{}, {}];
    m.invitations = [{}];
    const { db, tx } = faux("rojer_pro_annuel", 12);
    expect(await depassements(db, "c1", "rojer_essentiel_mensuel")).toEqual([
      { quota: "etablissements", utilise: 12, plafond: 1 },
      { quota: "membres", utilise: 3, plafond: 1 },
      { quota: "prestataires", utilise: 12, plafond: 10 },
    ]);
    expect(tx.consommationQuota.count).not.toHaveBeenCalled();
  });
});

describe("l'essai gratuit : ses limites priment sur la formule essayée", () => {
  it("5 équipements, 1 zone, 1 prescription, 3 unités de travail hors transverses", async () => {
    lancer();
    const essai = (n: number) => faux("rojer_essentiel_mensuel", n, null, "trialing");
    await prendreQuota(essai(4).txc, "c1", "equipements");
    await expect(prendreQuota(essai(5).txc, "c1", "equipements")).rejects.toThrow(
      "L'essai gratuit couvre 5 équipements : choisissez votre formule depuis la page Abonnement de votre compte pour en ajouter.",
    );
    await expect(prendreQuota(essai(1).txc, "c1", "zones")).rejects.toThrow(/couvre 1 zone :/);
    await expect(prendreQuota(essai(1).txc, "c1", "prescriptions")).rejects.toThrow(/couvre 1 prescription particulière :/);
    const unites = essai(2);
    await prendreQuota(unites.txc, "c1", "unitesTravail");
    expect(unites.tx.uniteTravail.count).toHaveBeenCalledWith({ where: { estTransverse: false } });
  });

  it("un lot qui ne tient pas en entier est refusé en entier", async () => {
    lancer();
    await expect(prendreQuota(faux("rojer_essentiel_mensuel", 3, null, "trialing").txc, "c1", "equipements", 3)).rejects.toBeInstanceOf(RefusQuota);
    await prendreQuota(faux("rojer_essentiel_mensuel", 3, null, "trialing").txc, "c1", "equipements", 2);
  });

  it("hors essai, équipements, zones, prescriptions et unités sont sans limite (rien n'est compté)", async () => {
    lancer();
    const paye = faux("rojer_essentiel_mensuel", 10_000);
    for (const cle of ["equipements", "zones", "prescriptions", "unitesTravail"] as const) await prendreQuota(paye.txc, "c1", cle);
    for (const t of [paye.tx.equipement, paye.tx.batiment, paye.tx.prescriptionParticuliere, paye.tx.uniteTravail])
      expect(t.count).not.toHaveBeenCalled();
    expect(paye.tx.$queryRaw).not.toHaveBeenCalled();
  });

  it("pendant l'essai, un plafond de la formule garde le motif de la formule", async () => {
    lancer();
    await expect(prendreQuota(faux("rojer_essentiel_mensuel", 10, null, "trialing").txc, "c1", "permisDeFeuParAn")).rejects.toThrow(
      /^Votre formule Essentiel couvre 10 permis de feu par an/,
    );
  });

  it("places sous le plafond : ce qui reste, sous verrou ; sans limite hors essai", async () => {
    lancer();
    const essai = faux("rojer_essentiel_mensuel", 1, null, "trialing");
    expect(await placesSousLePlafond(essai.txc, "c1", "unitesTravail")).toBe(2);
    expect(essai.tx.$queryRaw).toHaveBeenCalled();
    expect(await placesSousLePlafond(faux("rojer_pro_annuel", 99).txc, "c1", "unitesTravail")).toBe(Infinity);
    lancer(false);
    expect(await placesSousLePlafond(essai.txc, "c1", "unitesTravail")).toBe(Infinity);
  });

  it("utilisateurs : un seul pendant l'essai, même sur Pro", async () => {
    lancer();
    const brut = { abonnement: { findUnique: vi.fn().mockResolvedValue({ formule: "rojer_pro_mensuel", statut: "trialing" }) }, membre: { count: vi.fn().mockResolvedValue(1) } };
    expect(await limitesMembresDuPlugin(brut as never, "c1")).toEqual({ membres: 1, invitations: 0 });
  });
});

describe("jamais payé : limites de l'essai, même hors essai", () => {
  it("premier paiement en échec à la fin de l'essai (past_due, sans ancre) : toujours 5 équipements", async () => {
    lancer();
    await expect(prendreQuota(faux("rojer_essentiel_mensuel", 5, null, "past_due").txc, "c1", "equipements")).rejects.toThrow(
      "Tant que votre premier paiement n'est pas confirmé, Rojer garde les limites de l'essai (5 équipements) : réglez votre abonnement depuis la page Abonnement de votre compte.",
    );
    await prendreQuota(faux("rojer_essentiel_mensuel", 5, PAYE_DEPUIS, "past_due").txc, "c1", "equipements");
  });
});
