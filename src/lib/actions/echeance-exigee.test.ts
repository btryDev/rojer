import { describe, expect, it } from "vitest";
import {
  SEUIL_CALENDRIER_ACTIONS,
  exigenceEcheanceActions,
} from "./echeance-exigee";

/** Entreprise et site égaux : la règle d'avant C37, où un seul nombre valait. */
const egaux = (n: number) => ({ entreprise: n, site: n });

describe("exigenceEcheanceActions", () => {
  it("n'impose rien sous le seuil de cinquante salariés", () => {
    // L. 4121-3-1 : en dessous, le texte exige seulement que la liste des
    // actions soit consignée au DUERP — ni date, ni délai, ni calendrier.
    const r = exigenceEcheanceActions(egaux(12));
    expect(r.exigee).toBe(false);
    expect(r.reference).toBeNull();
  });

  it("impose le calendrier à partir de cinquante salariés", () => {
    const r = exigenceEcheanceActions(egaux(50));
    expect(r.exigee).toBe(true);
    expect(r.reference).toBe("Art. L. 4121-3-1 CT");
  });

  it("place la bascule exactement au seuil", () => {
    expect(exigenceEcheanceActions(egaux(SEUIL_CALENDRIER_ACTIONS - 1)).exigee).toBe(
      false,
    );
    expect(exigenceEcheanceActions(egaux(SEUIL_CALENDRIER_ACTIONS)).exigee).toBe(true);
  });

  it("n'énonce jamais d'obligation quand il n'y en a pas", () => {
    // Le garde-fou produit : pas de conseil juridique automatisé. Sous le
    // seuil, la mention dit un fait d'outil, elle n'ordonne pas.
    const r = exigenceEcheanceActions(egaux(3));
    expect(r.mention).not.toMatch(/doit|devez|obligatoire/i);
  });

  it("cite le texte dès que l'obligation existe", () => {
    const r = exigenceEcheanceActions(egaux(120));
    expect(r.mention).toMatch(/doit/);
    expect(r.reference).toContain("L. 4121-3-1");
  });
});
