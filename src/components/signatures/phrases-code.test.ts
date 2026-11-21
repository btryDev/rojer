import { describe, expect, it } from "vitest";
import { phraseNouveauCode, phraseValiditeCode } from "./EtapesCodeSignature";
import { signataireAffiche } from "@/components/plan-prevention/FenetreSigner";

// Retours de test du 2026-11-21 : « Renvoyer un code dans 0:32 » se lisait
// comme une durée de validité ; l'adresse se répétait quand le compte n'a
// pas d'autre nom qu'elle.

describe("les phrases du code de signature", () => {
  it("le délai avant un nouveau code, en minutes et secondes", () => {
    expect(phraseNouveauCode(32)).toBe("Nouveau code possible dans 0:32");
    expect(phraseNouveauCode(65)).toBe("Nouveau code possible dans 1:05");
  });

  it("la fin de validité, à l'heure de Paris", () => {
    // 14 h 42 UTC en novembre = 15 h 42 à Paris.
    expect(phraseValiditeCode(new Date("2026-11-21T14:42:00Z"))).toBe("Code valable jusqu'à 15 h 42");
  });
});

describe("le signataire du récapitulatif", () => {
  it("« Nom <adresse> », ou l'adresse une seule fois", () => {
    expect(signataireAffiche({ nom: "Paloma Sanchez", email: "paloma@exemple.fr" })).toBe(
      "Paloma Sanchez <paloma@exemple.fr>",
    );
    expect(signataireAffiche({ nom: "paloma@exemple.fr", email: "paloma@exemple.fr" })).toBe("paloma@exemple.fr");
    expect(signataireAffiche({ nom: "", email: "paloma@exemple.fr" })).toBe("paloma@exemple.fr");
    expect(signataireAffiche({ nom: "Paloma", email: "" })).toBe("Paloma");
  });
});
