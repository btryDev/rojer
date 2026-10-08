// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MentionRythmeRetenu } from "./MentionRythmeRetenu";
import { PastilleFiche } from "@/components/ui-kit/fiche/PastilleFiche";

afterEach(cleanup);

const DEFAUT = {
  motif: "defaut_annuel" as const,
  court: "Rythme retenu par défaut",
  long: "Le texte dit « périodicité appropriée » ; rythme retenu par défaut : annuel.",
};

describe("MentionRythmeRetenu (ADR-039)", () => {
  it("montre le court, et met la phrase entière dans le title ET pour les lecteurs d'écran", () => {
    const { container } = render(<MentionRythmeRetenu mention={DEFAUT} />);
    const el = container.querySelector("span")!;
    expect(el.getAttribute("title")).toBe(DEFAUT.long);
    expect(el.textContent).toContain(DEFAUT.court);
    expect(container.querySelector(".sr-only")?.textContent).toBe(DEFAUT.long);
  });

  it("ne rend rien sans mention", () => {
    expect(render(<MentionRythmeRetenu mention={null} />).container.innerHTML).toBe("");
  });

  it("ne porte ni le champ ni l'encre d'une pastille d'état du calendrier", () => {
    const classes = (c: HTMLElement) => [...c.querySelector("span")!.classList];
    const mention = classes(render(<MentionRythmeRetenu mention={DEFAUT} />).container);
    for (const ton of ["retard", "proche", "fait", "bleu", "neutre"] as const) {
      const pastille = classes(render(<PastilleFiche ton={ton}>x</PastilleFiche>).container);
      const commun = mention.filter(
        (k) => (k.startsWith("bg-") || k.startsWith("text-[color:")) && pastille.includes(k),
      );
      expect(commun, ton).toEqual([]);
    }
  });
});
