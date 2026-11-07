import { describe, expect, it } from "vitest";
import { sensDuChangement } from "./changement";

describe("sensDuChangement", () => {
  it("la formule d'abord, puis le rythme", () => {
    expect(sensDuChangement("rojer_essentiel_mensuel", "rojer_pro_mensuel")).toBe("montee");
    expect(sensDuChangement("rojer_essentiel_mensuel", "rojer_essentiel_annuel")).toBe("montee");
    expect(sensDuChangement("rojer_essentiel_annuel", "rojer_pro_mensuel")).toBe("montee");
    expect(sensDuChangement("rojer_pro_mensuel", "rojer_essentiel_annuel")).toBe("baisse");
    expect(sensDuChangement("rojer_pro_annuel", "rojer_pro_mensuel")).toBe("baisse");
    expect(sensDuChangement("rojer_pro_annuel", "rojer_pro_annuel")).toBe("identique");
  });

  it("une clé inconnue : pas de sens", () => {
    expect(sensDuChangement(null, "rojer_pro_mensuel")).toBeNull();
    expect(sensDuChangement("rojer_pro_mensuel", "rojer_surmesure_mensuel")).toBeNull();
  });
});
