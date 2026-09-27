// La clé de service : nettoyée de ce qu'ajoute un copier-coller, jugée sur sa
// forme, décrite au journal sans jamais être dite (production, 2026-09-27 :
// « Invalid Compact JWS »).

import { describe, expect, it } from "vitest";
import { diagnostic, formeDeLaCle, nettoyer, refusDeLaCle } from "./cle-service";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (role: string) =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "supabase", ref: "projet", role })}.SIGNATURE_SECRETE_abc123`;

describe("nettoyer", () => {
  it.each([
    ["  abc  ", "abc"],
    ["abc\n", "abc"],
    ["\r\nabc\r\n", "abc"],
    ['"abc"', "abc"],
    ["'abc'", "abc"],
    ["“abc”", "abc"],
    ['  "abc"\n', "abc"],
    ['"\'abc\'"', "abc"],
  ])("%j → %j", (entree, sortie) => {
    expect(nettoyer(entree)).toBe(sortie);
  });
  it("ne touche pas l'intérieur", () => {
    expect(nettoyer("a b")).toBe("a b");
    expect(nettoyer(undefined)).toBe("");
  });
});

describe("formeDeLaCle", () => {
  it("un JWT service_role, avec son rôle lu dans la charge utile", () => {
    expect(formeDeLaCle(jwt("service_role"))).toMatchObject({ forme: "jwt", role: "service_role" });
  });
  it("la clé anon collée à la place : un JWT, rôle « anon »", () => {
    expect(formeDeLaCle(jwt("anon"))).toMatchObject({ forme: "jwt", role: "anon" });
  });
  it.each([
    ["sb_secret_abcdef", "sb_secret"],
    ["sb_publishable_abcdef", "sb_publishable"],
    [`${jwt("service_role")}\nextra`, "autre"],
    ["super-secret-jwt-token-with-at-least-32-characters", "autre"],
    ["", "vide"],
  ])("%j → %s", (cle, forme) => {
    expect(formeDeLaCle(cle).forme).toBe(forme);
  });
});

describe("diagnostic et refus : la forme, jamais la valeur", () => {
  it("n'écrit ni la clé, ni sa signature", () => {
    for (const cle of [jwt("service_role"), jwt("anon"), "sb_secret_TRES_SECRET", "autre-valeur-secrete"]) {
      const f = formeDeLaCle(cle);
      for (const texte of [diagnostic(f), refusDeLaCle(f) ?? ""]) {
        expect(texte).not.toContain(cle);
        expect(texte).not.toContain("SIGNATURE_SECRETE");
        expect(texte).not.toContain("TRES_SECRET");
        expect(texte).not.toContain("autre-valeur-secrete");
      }
      expect(diagnostic(f)).toMatch(new RegExp(`${cle.length} caractères`));
    }
  });

  it("accepte le seul JWT service_role", () => {
    expect(refusDeLaCle(formeDeLaCle(jwt("service_role")))).toBeNull();
  });

  it.each([jwt("anon"), "sb_secret_abc", "sb_publishable_abc", "n'importe quoi", ""])(
    "refuse %j, en demandant la clé service_role au format JWT",
    (cle) => {
      expect(refusDeLaCle(formeDeLaCle(cle))).toMatch(
        /utilisez la clé service_role au format JWT/,
      );
    },
  );
});
