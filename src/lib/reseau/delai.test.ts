import { describe, expect, it } from "vitest";
import { fetchAvecDelai } from "./delai";

// Un `fetch` qui ne répond jamais, sauf si on l'abandonne.
const muet: typeof fetch = (_e, init) =>
  new Promise((_, rejeter) => {
    init?.signal?.addEventListener("abort", () => rejeter(init.signal!.reason));
  });

describe("fetchAvecDelai", () => {
  it("abandonne un service muet au bout du délai", async () => {
    const debut = Date.now();
    await expect(fetchAvecDelai(50, muet)("https://exemple.test")).rejects.toMatchObject({
      name: "TimeoutError",
    });
    expect(Date.now() - debut).toBeLessThan(2000);
  });

  it("respecte l'abandon de l'appelant avant le délai", async () => {
    const appelant = new AbortController();
    const appel = fetchAvecDelai(10_000, muet)("https://exemple.test", {
      signal: appelant.signal,
    });
    appelant.abort(new Error("annulé par l'appelant"));
    await expect(appel).rejects.toThrow("annulé par l'appelant");
  });

  it("laisse passer une réponse rendue à temps, options conservées", async () => {
    let vu: RequestInit | undefined;
    const rapide: typeof fetch = async (_e, init) => {
      vu = init;
      return new Response("ok");
    };
    const r = await fetchAvecDelai(1000, rapide)("https://exemple.test", { method: "POST" });
    expect(await r.text()).toBe("ok");
    expect(vu?.method).toBe("POST");
    expect(vu?.signal).toBeInstanceOf(AbortSignal);
  });
});
