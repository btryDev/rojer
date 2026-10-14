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
    expect(typeof (await reserverPlaceExport(l))).toBe("function");
    const r = await reserverPlaceExport(l);
    expect(r).toBeInstanceOf(Response);
    const reponse = r as Response;
    expect(reponse.status).toBe(503);
    expect(reponse.headers.get("Retry-After")).toBe(String(REESSAYER_APRES_S));
    expect(reponse.headers.get("Cache-Control")).toBe("no-store");
  });

  it("EXPORTS_SIMULTANES : un entier ≥ 1, sinon le défaut", () => {
    expect(exportsSimultanes("3")).toBe(3);
    expect(exportsSimultanes("1")).toBe(1);
    for (const v of [undefined, "", "0", "-2", "1.5", "deux"]) {
      expect(exportsSimultanes(v)).toBe(EXPORTS_SIMULTANES_DEFAUT);
    }
  });
});
