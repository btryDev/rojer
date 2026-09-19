import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";

/**
 * `xlsx` ne vient pas du registre npm : SheetJS n'y publie plus depuis la
 * 0.18.5, qui porte deux failles (CVE-2023-30533, pollution de prototype,
 * corrigée en 0.19.3 ; CVE-2024-22363, ReDoS, corrigée en 0.20.2). La version
 * corrigée est prise sur `cdn.sheetjs.com`, la distribution de l'éditeur.
 *
 * Pour un tarball distant, pnpm n'écrit AUCUNE empreinte dans le lockfile :
 * sans celle qu'on y a ajoutée à la main, le CDN pourrait servir n'importe
 * quel contenu sous la même URL et l'installation l'accepterait. Avec elle,
 * `pnpm install --frozen-lockfile` échoue (ERR_PNPM_TARBALL_INTEGRITY) —
 * éprouvé le 2026-09-19 en y mettant une empreinte fausse.
 *
 * Ce test tient les deux choses qu'une remise à jour maladroite perdrait :
 * l'empreinte (un `pnpm add <url>` peut réécrire l'entrée sans elle) et la
 * version (un retour au `^0.18.5` du registre repasserait sous les failles).
 */
describe("dépendance xlsx", () => {
  it("la version chargée est postérieure aux deux correctifs", () => {
    const [maj, min, patch] = XLSX.version.split(".").map(Number);
    expect(maj).toBe(0);
    expect(min * 1000 + patch).toBeGreaterThanOrEqual(20 * 1000 + 2);
  });

  it("le lockfile épingle l'empreinte du tarball SheetJS", () => {
    const lock = readFileSync(join(process.cwd(), "pnpm-lock.yaml"), "utf8");
    const resolution = lock
      .split("\n")
      .find(
        (l) =>
          l.includes("resolution:") && l.includes("cdn.sheetjs.com/xlsx-"),
      );
    expect(resolution).toBeDefined();
    expect(resolution).toMatch(/integrity: sha512-[A-Za-z0-9+/=]{80,}/);
  });
});
