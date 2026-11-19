import { describe, expect, it } from "vitest";
import { surUneLigne, texteSaisi } from "./texte";

describe("texteSaisi", () => {
  const schema = texteSaisi(10, "trop long");

  it("compte un saut de ligne pour un caractère, comme `maxLength`", () => {
    // 10 caractères dans le champ, 12 à l'envoi (deux `\r\n`).
    expect(schema.parse("abc\r\ndef\r\ngh")).toBe("abc\ndef\ngh");
  });

  it("retire les espaces de bord avant de compter", () => {
    expect(schema.parse("   0123456789   ")).toBe("0123456789");
  });

  it("refuse au-delà, avec le message donné", () => {
    expect(schema.safeParse("0123456789a").error?.issues[0]?.message).toBe("trop long");
  });
});

describe("surUneLigne", () => {
  it("ramène sauts de ligne et espaces répétés à une espace", () => {
    expect(surUneLigne(" Camille\r\n  Martin\t")).toBe("Camille Martin");
  });
});
