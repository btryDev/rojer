import { afterEach, describe, expect, it, vi } from "vitest";
import {
  creerLimiteur,
  exportsSimultanes,
  EXPORTS_SIMULTANES_DEFAUT,
  reserverPlaceExport,
  REESSAYER_APRES_S,
} from "./limite";

const options = { simultanes: 2, enAttenteMax: 1, attenteMaxMs: 1_000 };

afterEach(() => vi.useRealTimers());

describe("le limiteur des exports", () => {
  it("sert jusqu'à la limite, met en file au-delà, puis refuse quand la file est pleine", async () => {
    const l = creerLimiteur(options);
    const a = await l.reserver();
    const b = await l.reserver();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(l.etat()).toEqual({ actifs: 2, enAttente: 0 });

    let cServi = false;
    const c = l.reserver().then((x) => ((cServi = x !== null), x));
    await Promise.resolve();
    expect(l.etat()).toEqual({ actifs: 2, enAttente: 1 });
    expect(cServi).toBe(false);

    // La file (1) est pleine : refus immédiat, sans attendre.
    expect(await l.reserver()).toBeNull();

    a!();
    const liberC = await c;
    expect(cServi).toBe(true);
    // La place est passée de main en main : jamais plus de deux actifs.
    expect(l.etat()).toEqual({ actifs: 2, enAttente: 0 });

    b!();
    liberC!();
    expect(l.etat()).toEqual({ actifs: 0, enAttente: 0 });
  });

  it("une libération répétée ne rend pas deux places", async () => {
    const l = creerLimiteur(options);
    const a = await l.reserver();
    a!();
    a!();
    expect(l.etat().actifs).toBe(0);
    await l.reserver();
    await l.reserver();
    a!();
    expect(l.etat().actifs).toBe(2);
  });

  it("une attente trop longue est refusée et quitte la file", async () => {
    vi.useFakeTimers();
    const l = creerLimiteur(options);
    await l.reserver();
    await l.reserver();
    const c = l.reserver();
    expect(l.etat().enAttente).toBe(1);
    await vi.advanceTimersByTimeAsync(options.attenteMaxMs);
    expect(await c).toBeNull();
    expect(l.etat()).toEqual({ actifs: 2, enAttente: 0 });
  });

  it("une file pleine répond 503 avec Retry-After, sans cache", async () => {
    const l = creerLimiteur({ simultanes: 1, enAttenteMax: 0, attenteMaxMs: 1 });
    expect(typeof (await reserverPlaceExport("etab-1", l))).toBe("function");
    const r = await reserverPlaceExport("etab-1", l);
    expect(r).toBeInstanceOf(Response);
    const reponse = r as Response;
    expect(reponse.status).toBe(503);
    expect(reponse.headers.get("Retry-After")).toBe(String(REESSAYER_APRES_S));
    expect(reponse.headers.get("Cache-Control")).toBe("no-store");
  });

  it("EXPORTS_SIMULTANES : absente, le défaut ; un entier ≥ 1 ; sinon une erreur", () => {
    expect(exportsSimultanes("3")).toBe(3);
    expect(exportsSimultanes(" 2 ")).toBe(2);
    for (const v of [undefined, "", "  "]) {
      expect(exportsSimultanes(v)).toBe(EXPORTS_SIMULTANES_DEFAUT);
    }
    for (const v of ["0", "-2", "1.5", "3.0", "1e1", "deux"]) {
      expect(() => exportsSimultanes(v)).toThrow(/EXPORTS_SIMULTANES/);
    }
  });
});

describe("la part d'un demandeur (audit du 2026-11-10)", () => {
  it("un demandeur ne tient que sa part ; les autres passent", async () => {
    const l = creerLimiteur({ simultanes: 1, enAttenteMax: 8, attenteMaxMs: 1_000, parDemandeurMax: 2 });
    const a1 = await l.reserver("A");
    const a2 = l.reserver("A");
    await Promise.resolve();
    expect(await l.reserver("A")).toBeNull();
    expect(l.etat()).toEqual({ actifs: 1, enAttente: 1 });
    const b = l.reserver("B");
    await Promise.resolve();
    expect(l.etat()).toEqual({ actifs: 1, enAttente: 2 });
    a1!();
    const a2Servi = await a2;
    expect(a2Servi).not.toBeNull();
    // A a rendu une place : il peut en reprendre une.
    const a3 = l.reserver("A");
    await Promise.resolve();
    expect(l.etat().enAttente).toBe(2);
    a2Servi!();
    (await b)!();
    (await a3)!();
    expect(l.etat()).toEqual({ actifs: 0, enAttente: 0 });
  });

  it("une attente expirée rend la part du demandeur", async () => {
    vi.useFakeTimers();
    const l = creerLimiteur({ simultanes: 1, enAttenteMax: 8, attenteMaxMs: 1_000, parDemandeurMax: 2 });
    const tenue = await l.reserver("X");
    const attend = l.reserver("A");
    const attend2 = l.reserver("A");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await attend).toBeNull();
    expect(await attend2).toBeNull();
    const reprise = l.reserver("A");
    await Promise.resolve();
    expect(l.etat().enAttente).toBe(1);
    tenue!();
    (await reprise)!();
  });

  it("sans clé, pas de part", async () => {
    const l = creerLimiteur({ simultanes: 1, enAttenteMax: 8, attenteMaxMs: 1_000, parDemandeurMax: 1 });
    const x = await l.reserver();
    const y = l.reserver();
    await Promise.resolve();
    expect(l.etat()).toEqual({ actifs: 1, enAttente: 1 });
    x!();
    (await y)!();
  });
});

describe("réservation d'une place d'export par un utilisateur", () => {
  it("sa part atteinte : 429 qui parle de ses exports ; un autre utilisateur passe", async () => {
    const l = creerLimiteur({ simultanes: 1, enAttenteMax: 8, attenteMaxMs: 1_000, parDemandeurMax: 2 });
    const a1 = await reserverPlaceExport("u-a", l);
    const a2 = reserverPlaceExport("u-a", l);
    await Promise.resolve();
    const refus = await reserverPlaceExport("u-a", l);
    expect(refus).toBeInstanceOf(Response);
    expect((refus as Response).status).toBe(429);
    expect(await (refus as Response).text()).toMatch(/Vos exports précédents/);
    const b = reserverPlaceExport("u-b", l);
    await Promise.resolve();
    expect(l.etat()).toEqual({ actifs: 1, enAttente: 2 });
    (a1 as () => void)();
    ((await a2) as () => void)();
    ((await b) as () => void)();
  });
});
