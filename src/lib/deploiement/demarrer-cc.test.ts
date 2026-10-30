/**
 * `scripts/demarrer-cc.sh` construit l'URL de la base chez Clever Cloud
 * (plan de bascule, § 5 bis). Ce qu'il garantit, et que ce test tient :
 * - l'URL vient de l'add-on, qui l'emporte sur une DATABASE_URL héritée ;
 * - jamais de connexion en clair, sauf vers l'hôte nommé par
 *   BASE_EN_CLAIR_HOTE — et pas un autre ;
 * - TLS vérifié contre le certificat fourni, refusé s'il n'en a pas la forme ;
 * - une URL littérale (`$VAR` non développé) ou déjà paramétrée est refusée
 *   (un `sslmode` hérité désactiverait la vérification sans bruit) ;
 * - le mot de passe ne s'affiche pas.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts/demarrer-cc.sh");
const ADDON = "postgresql://u:secret@bxyz-postgresql.services.clever-cloud.com:5432/bxyz";
const CA = "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----";

function lancer(env: Record<string, string>, mode = "verifier") {
  // Environnement vide : rien n'est hérité du poste, comme sur une instance
  // neuve. Un dossier temporaire propre à chaque appel : rien n'est écrit
  // dans le /tmp partagé. NODE_ENV : exigée par le type de Next, sans effet.
  const dossier = mkdtempSync(join(tmpdir(), "cc-"));
  const r = spawnSync("sh", [SCRIPT, mode], {
    env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", TMPDIR: dossier, ...env },
    encoding: "utf8",
  });
  return { code: r.status, sortie: r.stdout.trim(), erreur: r.stderr, dossier };
}

describe("demarrer-cc.sh : l'URL de la base", () => {
  it("depuis l'add-on, avec le certificat : TLS vérifié, pool, mot de passe masqué", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: CA });
    expect(r.code).toBe(0);
    const m = r.sortie.match(
      /^postgresql:\/\/u:\*\*\*@bxyz-postgresql\.services\.clever-cloud\.com:5432\/bxyz\?connection_limit=5&sslmode=require&sslcert=(.+)&sslaccept=strict$/,
    );
    expect(m).not.toBeNull();
    expect(r.sortie).not.toContain("secret");
    expect(readFileSync(m![1], "utf8")).toBe(`${CA}\n`);
    expect(readdirSync(r.dossier)).toHaveLength(1);
  });

  it("un certificat écrit sur une ligne, « \\n » littéraux, est rendu en PEM", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: CA.replaceAll("\n", "\\n") });
    expect(r.code).toBe(0);
    const chemin = r.sortie.match(/sslcert=([^&]+)/)![1];
    expect(readFileSync(chemin, "utf8")).toBe(`${CA}\n`);
  });

  it("un certificat qui n'en a pas la forme est refusé", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: "pas un certificat" });
    expect(r.code).toBe(1);
    expect(r.erreur).toMatch(/forme d'un certificat PEM/);
  });

  it("sans certificat, une base distante est refusée", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON });
    expect(r.code).toBe(1);
    expect(r.sortie).toBe("");
    expect(r.erreur).toMatch(/connexion en clair refusée/);
  });

  it("en clair seulement vers l'hôte nommé, et vers lui seul", () => {
    const local = lancer({ POSTGRESQL_ADDON_URI: "postgresql://r:r@db:5432/r", BASE_EN_CLAIR_HOTE: "db" });
    expect(local.code).toBe(0);
    expect(local.sortie).toBe("postgresql://r:***@db:5432/r?connection_limit=5&sslmode=disable");

    // Le nom d'un autre hôte n'ouvre pas la porte à l'add-on.
    const autre = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_EN_CLAIR_HOTE: "db" });
    expect(autre.code).toBe(1);
  });

  it("l'add-on l'emporte sur une DATABASE_URL héritée", () => {
    const r = lancer({
      POSTGRESQL_ADDON_URI: "postgresql://r:r@db:5432/r",
      DATABASE_URL: "postgresql://dev:dev@localhost:5433/duerp",
      BASE_EN_CLAIR_HOTE: "db",
    });
    expect(r.code).toBe(0);
    expect(r.sortie).toMatch(/^postgresql:\/\/r:\*\*\*@db:5432\/r\?/);
    expect(r.sortie).not.toContain("localhost");
  });

  it("sans add-on, DATABASE_URL sert", () => {
    const r = lancer({ DATABASE_URL: "postgresql://r:r@db:5432/r", BASE_EN_CLAIR_HOTE: "db" });
    expect(r.code).toBe(0);
    expect(r.sortie).toMatch(/@db:5432\/r\?/);
  });

  it("une URL restée littérale ou déjà paramétrée est refusée", () => {
    const litterale = lancer({ DATABASE_URL: "$POSTGRESQL_ADDON_URI", BASE_CA_PEM: CA });
    expect(litterale.code).toBe(1);
    expect(litterale.erreur).toMatch(/ne commence pas par postgresql/);

    const parametree = lancer({ POSTGRESQL_ADDON_URI: `${ADDON}?sslmode=disable`, BASE_CA_PEM: CA });
    expect(parametree.code).toBe(1);
    expect(parametree.erreur).toMatch(/porte déjà des paramètres/);
  });

  it("le pool se règle par BASE_POOL", () => {
    const r = lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: CA, BASE_POOL: "8" });
    expect(r.code).toBe(0);
    expect(r.sortie).toMatch(/\?connection_limit=8&/);
  });

  it("sans aucune base, ni un mode inconnu, rien ne démarre", () => {
    expect(lancer({}).code).toBe(1);
    expect(lancer({ POSTGRESQL_ADDON_URI: ADDON, BASE_CA_PEM: CA }, "n-importe").code).toBe(2);
  });
});
