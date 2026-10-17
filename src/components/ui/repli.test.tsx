// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AutresTypesErp } from "@/components/etablissements/AutresTypesErp";
import { FicheJournal } from "@/components/registre/FicheJournal";

// Le lien qui ouvre un `<details>` : contrôle visuel du lot 3 (ADR-045,
// 2026-10-17). jsdom ne mesure rien ; ce test garde les classes qui donnent la
// mesure, sur les deux écrans qui portaient la même chaîne recopiée.
//
// Éprouvé en cassant : `min-h-6` retiré, `[&::-webkit-details-marker]:hidden`
// retiré, le chevron rendu sans sa boîte carrée, et FicheJournal remis à son
// ancienne chaîne — chacun rougit ici.

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });

const summaries = () => [
  render(<AutresTypesErp typeErp="N" valeurs={[]} onChange={() => {}} />).container.querySelector("summary")!,
  render(<FicheJournal colonnes={[]} lignes={[]} action={action as never} />).container.querySelector("summary")!,
];

describe("le lien d'un repli", () => {
  it("offre une cible de 24 px de haut (WCAG 2.5.8) sans grossir le texte", () => {
    for (const s of summaries()) {
      expect(s.className.split(/\s+/)).toContain("min-h-6");
      expect(s.className).toContain("text-[12.5px]");
    }
  });

  it("masque le triangle de Safari, que list-none ne retire pas", () => {
    for (const s of summaries()) {
      expect(s.className.split(/\s+/)).toContain("[&::-webkit-details-marker]:hidden");
    }
  });

  it("fait tourner le chevron dans une boîte carrée centrée, sans déborder", () => {
    for (const s of summaries()) {
      const chevron = s.querySelector("span[aria-hidden]")!;
      const classes = chevron.className.split(/\s+/);
      expect(classes).toEqual(expect.arrayContaining(["size-4", "flex-none", "justify-center", "group-open:rotate-90"]));
    }
  });
});
