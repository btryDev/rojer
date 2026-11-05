import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { etatStripe } = vi.hoisted(() => ({ etatStripe: vi.fn() }));
vi.mock("@/lib/stripe/config", () => ({ etatStripe }));

import type { PrismaClient } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import {
  creerSousPlafond,
  formuleDesPlafonds,
  limitesMembresDuPlugin,
  motifDuRefus,
  prendreQuota,
  RefusQuota,
  refusQuota,
} from "./quotas";

// Le client borné (et sa transaction), réduit à ce que la porte lit.
function faux(formule: string | null, nombre: number) {
  const tx = {
    $queryRaw: vi.fn(),
    abonnement: { findUnique: vi.fn().mockResolvedValue(formule === null ? null : { formule }) },
    etablissement: { count: vi.fn().mockResolvedValue(nombre) },
    prestataire: { count: vi.fn().mockResolvedValue(nombre) },
    consommationQuota: { count: vi.fn().mockResolvedValue(nombre), create: vi.fn() },
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
    expect(motifDuRefus("essentiel", "etablissements")).toBe(
      "Votre formule Essentiel couvre 1 établissement : passez à Pro depuis la page Abonnement de votre compte.",
    );
    expect(motifDuRefus("pro", "etablissements")).toBe(
      "Votre formule Pro couvre 5 établissements : au-delà, la formule Sur mesure s'établit sur devis.",
    );
    expect(motifDuRefus("essentiel", "permisDeFeuParAn")).toBe(
      "Votre formule Essentiel couvre 10 permis de feu sur douze mois : passez à Pro depuis la page Abonnement de votre compte.",
    );
  });

  it("une formule inconnue au plafond ne se signale qu'une fois", async () => {
    lancer();
    await expect(prendreQuota(faux("rojer_surmesure_annuel", 1).txc, "c1", "etablissements")).rejects.toBeInstanceOf(RefusQuota);
    expect(console.error).toHaveBeenCalledTimes(1);
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
    expect(tx.consommationQuota.create).toHaveBeenCalledTimes(1);
    expect(tx.consommationQuota.create).toHaveBeenCalledWith({ data: { compteId: "c1", quota: "permisDeFeuParAn" } });
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
    expect(tx.consommationQuota.create).not.toHaveBeenCalled();
  });

  it("au plafond : refus, et rien n'est inscrit au journal", async () => {
    lancer();
    const { tx, txc } = faux("rojer_essentiel_mensuel", 10);
    await expect(prendreQuota(txc, "c1", "permisDeFeuParAn")).rejects.toBeInstanceOf(RefusQuota);
    expect(tx.consommationQuota.create).not.toHaveBeenCalled();
  });

  it("par an : compté au journal sur douze mois, puis inscrit", async () => {
    lancer();
    vi.useFakeTimers({ now: new Date("2026-11-05T10:00:00Z"), toFake: ["Date"] });
    const { tx, txc } = faux("rojer_essentiel_mensuel", 4);
    await prendreQuota(txc, "c1", "plansDePreventionParAn");
    expect(tx.consommationQuota.count).toHaveBeenCalledWith({
      where: { quota: "plansDePreventionParAn", consommeLe: { gt: new Date("2025-11-05T10:00:00Z") } },
    });
    expect(tx.consommationQuota.create).toHaveBeenCalledWith({ data: { compteId: "c1", quota: "plansDePreventionParAn" } });
    vi.useRealTimers();
  });

  it("formule inconnue ou absente : plafonds de la plus petite, pas d'illimité", async () => {
    lancer();
    for (const formule of ["rojer_surmesure_annuel", null]) {
      const { txc } = faux(formule, 1);
      await expect(prendreQuota(txc, "c1", "etablissements"), String(formule)).rejects.toThrow(/Essentiel couvre 1 établissement/);
    }
  });

  it("Pro : sans limite de permis de feu, rien n'est compté mais tout est inscrit", async () => {
    lancer();
    const { tx, txc } = faux("rojer_pro_mensuel", 10_000);
    await prendreQuota(txc, "c1", "permisDeFeuParAn");
    expect(tx.consommationQuota.count).not.toHaveBeenCalled();
    expect(tx.consommationQuota.create).toHaveBeenCalled();
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
      abonnement: { findUnique: vi.fn().mockResolvedValue(formule === null ? null : { formule }) },
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
