import { describe, expect, it } from "vitest";
import { TEXTE_L4121_2 } from "@/lib/pdf/mentions-l4121-2";
import { L4121_2_3, L4121_2_8 } from "./l4121-2-ordre";

describe("le 8° de L. 4121-2, écrit sans le corpus, reste celui du corpus", () => {
  it("il figure mot pour mot dans le verbatim consigné", () => {
    expect(TEXTE_L4121_2).toContain(`8° ${L4121_2_8}`);
    expect(TEXTE_L4121_2).toContain(`3° ${L4121_2_3}`);
  });
});
