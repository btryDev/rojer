import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VISITES, cookieVisiteMasquee, fichiersVisite, type CleVisite } from "./visites";

describe("visites guidées", () => {
  it("chaque visite a ses trois fichiers dans public/", () => {
    for (const cle of Object.keys(VISITES) as CleVisite[]) {
      for (const f of Object.values(fichiersVisite(cle))) {
        expect(existsSync(path.join(process.cwd(), "public", f)), f).toBe(true);
      }
    }
  });

  it("un cookie par visite, nommé d'après la clé", () => {
    expect(cookieVisiteMasquee("equipements")).toBe("rojer-visite-masquee-equipements");
  });
});
