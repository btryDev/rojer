import { describe, expect, it } from "vitest";
import { contexteFondementDe, fondementDe } from "./fondement";
import { projeterEtablissement } from "@/lib/matching/projection";
import { obligationParId } from "@/lib/referentiels/conformite";

// Revue du 2026-10-16 (retouches de la PR #43) : `ContexteFondement` est
// marqué, et seul `contexteFondementDe` le fabrique. Les `@ts-expect-error`
// ci-dessous SONT la garantie : si la marque disparaît, ces trois appels
// redeviennent valides, la directive n'a plus d'erreur à couvrir, et
// `tsc --noEmit` échoue (« Unused '@ts-expect-error' directive »). Vitest ne
// vérifie pas les types : la garde vit dans tsc, la CI la lance.
//
// Les trois formes visées, relevées par la revue :
//  1. la projection de l'établissement, qui garde un type périmé hors ERP ;
//  2. un objet littéral recopié champ à champ ;
//  3. l'établissement lui-même.
describe("le contexte du fondement ne se fabrique que par contexteFondementDe", () => {
  const o = obligationParId("dae-erp-detention")!;
  type Source = Parameters<typeof projeterEtablissement>[0];
  const etab = { estERP: false, typeErp: "N", categorieErp: "N3" } as unknown as Source;

  it("refuse la projection, un littéral et l'établissement (vérifié par tsc)", () => {
    // Jamais exécutée : seul tsc la lit. Le moteur n'a rien à calculer ici.
    const jamaisAppelee = () => {
      const projete = projeterEtablissement(etab);
      // @ts-expect-error — la projection n'est pas un contexte (type périmé hors ERP)
      fondementDe(o, projete);
      // @ts-expect-error — un littéral recopié n'est pas un contexte
      fondementDe(o, { typeErp: "N", categorieErp: "N3" });
      // @ts-expect-error — l'établissement n'est pas un contexte
      fondementDe(o, etab);
    };
    expect(typeof jamaisAppelee).toBe("function");
  });

  it("le contexte fabriqué annule le type hors ERP", () => {
    expect(contexteFondementDe({ estERP: false, typeErp: "N", categorieErp: "N3" })).toEqual({
      typeErp: null,
      categorieErp: null,
    });
  });
});
