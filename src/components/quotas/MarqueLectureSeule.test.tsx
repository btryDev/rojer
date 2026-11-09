// @vitest-environment jsdom
// La marque de lecture seule ne se pose QUE pour un membre en lecture (ADR-054
// § 4) : posée à tort, elle masquerait toute la saisie d'un propriétaire ou
// d'un membre, sans qu'aucune autre garde ne tombe. Et ce qu'elle rend inerte
// l'est aussi au clavier et au clic programmé (`InerteAuClavier`).

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ role: null as string | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/compte", () => ({
  getOptionalCompte: async () => (h.role ? { compte: { compteId: "c", role: h.role } } : null),
}));

const { MarqueLectureSeule } = await import("./MarqueLectureSeule");
const { InerteAuClavier } = await import("./InerteAuClavier");

afterEach(cleanup);

describe("MarqueLectureSeule", () => {
  it.each([["owner"], ["member"], [null]])("rôle %s : aucune marque", async (role) => {
    h.role = role;
    expect(await MarqueLectureSeule()).toBeNull();
  });

  it("rôle lecture : la marque est rendue", async () => {
    h.role = "lecture";
    const { container } = render(<>{await MarqueLectureSeule()}</>);
    expect(container.querySelector("[data-lecture-seule]")).not.toBeNull();
  });
});

describe("InerteAuClavier", () => {
  it("un clic dans l'inerte n'arrive pas ; hors de l'inerte, si", () => {
    const inerte = vi.fn();
    const libre = vi.fn();
    render(
      <>
        <InerteAuClavier />
        <div data-ecriture-inerte>
          <button onClick={inerte}>Oui</button>
        </div>
        <button onClick={libre}>Ouvrir</button>
      </>,
    );
    fireEvent.click(screen.getByText("Oui"));
    fireEvent.click(screen.getByText("Ouvrir"));
    expect(inerte).not.toHaveBeenCalled();
    expect(libre).toHaveBeenCalledOnce();
  });

  it("les contrôles inertes sont annoncés indisponibles, même ajoutés après coup", async () => {
    const { rerender } = render(
      <>
        <InerteAuClavier />
        <div data-ecriture-inerte>
          <button>Oui</button>
        </div>
        <button>Ouvrir</button>
      </>,
    );
    expect(screen.getByText("Oui").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Ouvrir").hasAttribute("aria-disabled")).toBe(false);
    rerender(
      <>
        <InerteAuClavier />
        <div data-ecriture-inerte>
          <button>Oui</button>
          <button>Non</button>
        </div>
        <button>Ouvrir</button>
      </>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText("Non").getAttribute("aria-disabled")).toBe("true");
  });

  it("un contrôle qui porte lui-même la marque (Oui / Non) est annoncé ; le composant retiré, l'annonce part", () => {
    const page = (lectureSeule: boolean) => (
      <>
        {lectureSeule && <InerteAuClavier />}
        <button data-ecriture-inerte>Oui</button>
        <button aria-disabled="true">Déjà indisponible</button>
      </>
    );
    const { rerender } = render(page(true));
    expect(screen.getByText("Oui").getAttribute("aria-disabled")).toBe("true");
    rerender(page(false)); // le rôle a changé, la page reste
    expect(screen.getByText("Oui").hasAttribute("aria-disabled")).toBe(false);
    // Ce que le composant n'a pas posé reste.
    expect(screen.getByText("Déjà indisponible").getAttribute("aria-disabled")).toBe("true");
  });

  it("le focus ne reste pas dans l'inerte", () => {
    render(
      <>
        <InerteAuClavier />
        <div data-ecriture-inerte>
          <input aria-label="enregistré" />
        </div>
      </>,
    );
    const champ = screen.getByLabelText("enregistré");
    champ.focus();
    expect(document.activeElement).not.toBe(champ);
  });
});
