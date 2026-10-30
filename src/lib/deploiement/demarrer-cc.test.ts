/**
 * `scripts/demarrer-cc.sh` construit l'URL de la base chez Clever Cloud
 * (plan de bascule, § 5 bis). Ce qu'il garantit, et que ce test tient :
 * - l'URL vient de l'add-on, avec le pool ;
 * - jamais de connexion en clair, sauf vers l'hôte nommé par
 *   BASE_EN_CLAIR_HOTE — et pas un autre ;
 * - TLS vérifié contre le certificat fourni ;
 * - une URL qui porte déjà des paramètres est refusée (un `sslmode` hérité
 *   désactiverait la vérification sans bruit) ;
 * - le mot de passe ne s'affiche pas.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts/demarrer-cc.sh");
const ADDON = "postgresql://u:secret@bxyz-postgresql.services.clever-cloud.com:5432/bxyz";
const CA = "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----";

function lancer(env: Record<string, string>, mode = "verifier") {
  // Environnement vide : rien n'est hérité du poste, comme sur une instance neuve.
  const r = spawnSync("sh", [SCRIPT, mode], {
    // NODE_ENV : exigée par le type de Next, sans effet sur le script.
    env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", ...env },
    encoding: "utf8",
  });
  return { code: r.status, sortie: r.stdout.trim(), erreur: r.stderr };
}

describe("demarrer-cc.sh : l'URL de la base", () => {
  it("depuis l'add-on, avec le certificat : TLS vérifié, pool, mot de passe masqué", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-"));
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: CA, TMPDIR: dir });
    expect(r.code).toBe(0);
    expect(r.sortie).toBe(
      "postgresql://u:***@bxyz-postgresql.services.clever-cloud.com:5432/bxyz" +
        `?connection_limit=5&sslmode=require&sslcert=${dir}/rojer-base-ca.pem&sslaccept=strict`,
    );
    expect(r.sortie).not.toContain("secret");
    expect(readFileSync(join(dir, "rojer-base-ca.pem"), "utf8")).toBe(`${CA}\n`);
  });

  it("sans certificat, une base distante est refusée", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON });
    expect(r.code).toBe(1);
    expect(r.sortie).toBe("");
    expect(r.erreur).toMatch(/connexion en clair refusée/);
  });

  it("en clair seulement vers l'hôte nommé, et vers lui seul", () => {
    const local = lancer({ DATABASE_URL: "postgresql://r:r@db:5432/r", BASE_EN_CLAIR_HOTE: "db" });
    expect(local.code).toBe(0);
    expect(local.sortie).toBe("postgresql://r:***@db:5432/r?connection_limit=5&sslmode=disable");

    // Le nom d'un autre hôte n'ouvre pas la porte à l'add-on.
    const autre = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_EN_CLAIR_HOTE: "db" });
    expect(autre.code).toBe(1);
  });

  it("DATABASE_URL, si elle est posée, l'emporte sur l'add-on", () => {
    const r = lancer({
      DATABASE_URL: "postgresql://r:r@db:5432/r",
      POSTGRESQL_ADDON_URI: ADDON,
      BASE_EN_CLAIR_HOTE: "db",
    });
    expect(r.sortie).toMatch(/@db:5432\/r\?/);
  });

  it("une URL qui porte déjà des paramètres est refusée", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: `${ADDON}?sslmode=disable`, BASE_CA_PEM: CA });
    expect(r.code).toBe(1);
    expect(r.erreur).toMatch(/porte déjà des paramètres/);
  });

  it("le pool se règle par BASE_POOL", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: CA, BASE_POOL: "8" });
    expect(r.sortie).toMatch(/\?connection_limit=8&/);
  });

  it("sans aucune base, ni un mode inconnu, rien ne démarre", () => {
    expect(lancer({}).code).toBe(1);
    expect(lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: CA }, "n-importe").code).toBe(2);
  });
});
