import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ rappels: vi.fn() }));
vi.mock("@/lib/abonnements/rappels", () => ({ rappelerLaVeilleDeLaFinDEssai: m.rappels }));

import { appelAutorise, secretDesTaches } from "./quotidiennes";
import { POST } from "@/app/api/taches/quotidiennes/route";

const SECRET = "s".repeat(40);
const appel = (entete?: string) =>
  POST(new Request("https://rojer.test/api/taches/quotidiennes", { method: "POST", headers: entete ? { authorization: entete } : {} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  m.rappels.mockResolvedValue({ envoyes: 2, echecs: 0 });
});

describe("tâches quotidiennes", () => {
  it("le secret : absent ou vide = aucun ; espaces retirés", () => {
    expect(secretDesTaches({})).toBeNull();
    expect(secretDesTaches({ TACHES_SECRET: "  " })).toBeNull();
    expect(secretDesTaches({ TACHES_SECRET: ` ${SECRET} ` })).toBe(SECRET);
  });

  it("seul « Bearer <secret> » exact est autorisé", () => {
    expect(appelAutorise(`Bearer ${SECRET}`, SECRET)).toBe(true);
    for (const faux of [null, "", SECRET, `Bearer ${SECRET}x`, `bearer ${SECRET}`, `Bearer ${SECRET.slice(1)}`]) {
      expect(appelAutorise(faux, SECRET)).toBe(false);
    }
  });

  it("route sans secret configuré : 404, rien n'est lancé", async () => {
    vi.stubEnv("TACHES_SECRET", "");
    expect((await appel(`Bearer ${SECRET}`)).status).toBe(404);
    expect(m.rappels).not.toHaveBeenCalled();
  });

  it("route au mauvais secret : 401 ; au bon : les tâches tournent et rendent leur bilan", async () => {
    vi.stubEnv("TACHES_SECRET", SECRET);
    expect((await appel("Bearer autre")).status).toBe(401);
    expect(m.rappels).not.toHaveBeenCalled();
    const ok = await appel(`Bearer ${SECRET}`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(await ok.json()).toEqual({ rappelsVeilleFinEssai: { envoyes: 2, echecs: 0 } });
  });
});
