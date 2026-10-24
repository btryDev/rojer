// @vitest-environment jsdom
//
// La vignette et la fiche de « Ce qui doit être en place » (2026-10-20). La
// vignette montre et ouvre ; la fiche pose la question, déclare par l'action
// serveur, et se parcourt avec Précédente / Suivante.

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  declarerEnPlace: vi.fn(async () => {}),
  retirerDeclaration: vi.fn(async () => {}),
}));
vi.mock("@/lib/etats-permanents/actions", () => actions);

import { LigneCompacte } from "./LigneCompacte";
import { RevueEnPlace, type FicheLigne } from "./RevueEnPlace";

afterEach(() => {
  cleanup();
  actions.declarerEnPlace.mockClear();
  actions.retirerDeclaration.mockClear();
});

beforeAll(() => {
  // jsdom ne connaît pas `showModal` / `close` : on les réduit à l'attribut.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const fiche = (id: string, question: string, extra: Partial<FicheLigne> = {}): FicheLigne => ({
  obligationId: id,
  libelle: `Libellé officiel ${id}`,
  question,
  surTitre: "Incendie et secours · Éteindre",
  illustration: "/illustrations/en-place/extincteur.png",
  fond: "#fbeae5",
  mode: "etat",
  declareLe: null,
  pieceAttendue: null,
  fondement: { reference: "R. 4227-29", href: null, extrait: "Le premier secours contre l'incendie…" },
  parLesTitres: null,
  aConfirmer: null,
  questionsSansReponse: null,
  ...extra,
});

const LIGNES = [
  fiche("o-1", "Avez-vous assez d'extincteurs pour vos locaux ?"),
  fiche("o-2", "Avez-vous une alarme sonore ?"),
];

const etatDe = (l: FicheLigne) => (l.declareLe === null ? ETAT_A : ETAT_ON);
const ETAT_A = "a-declarer" as const;
const ETAT_ON = "declare" as const;

function rendre(lignes = LIGNES, parcours = true) {
  return render(
    <RevueEnPlace etablissementId="etab-1" lignes={lignes} parcours={parcours}>
      <ul>
        {lignes.map((l) => (
          <LigneCompacte
            key={l.obligationId}
            obligationId={l.obligationId}
            ancre={`etat-${l.obligationId}`}
            libelle={l.libelle}
            illustration={l.illustration}
            fond={l.fond}
            etat={etatDe(l)}
            aConfirmer={false}
          />
        ))}
      </ul>
    </RevueEnPlace>,
  );
}

describe("la vignette", () => {
  it("dit son libellé et son état, jamais « conforme »", () => {
    const { container } = rendre();
    expect(container.textContent).toContain("Libellé officiel o-1");
    expect(container.textContent).toContain("À déclarer");
    expect(container.textContent?.toLowerCase()).not.toContain("conforme");
  });
});

describe("la fiche", () => {
  it("s'ouvre sur la question de la ligne, avec le libellé officiel et les trois réponses", () => {
    const { container, getAllByRole } = rendre();
    expect(container.querySelector("dialog h2")).toBeNull();
    fireEvent.click(getAllByRole("button", { name: /Libellé officiel o-1/ })[0]);
    const boite = container.querySelector("dialog")!;
    expect(boite.querySelector("h2")?.textContent).toBe(LIGNES[0].question);
    expect(boite.textContent).toContain("Libellé officiel o-1");
    for (const r of ["Oui, c'est en place", "Pas encore", "Je ne sais pas"]) expect(boite.textContent).toContain(r);
    expect(boite.textContent).toContain("Rojer ne la vérifie pas");
    expect(boite.textContent).toContain("1 / 2");
  });

  it("Suivante passe à la ligne d'après", () => {
    const { container, getAllByRole, getByRole } = rendre();
    fireEvent.click(getAllByRole("button", { name: /Libellé officiel o-1/ })[0]);
    fireEvent.click(getByRole("button", { name: /Suivante/, hidden: true }));
    expect(container.querySelector("dialog h2")?.textContent).toBe(LIGNES[1].question);
  });

  it("« Je ne sais pas » montre le texte, sans rien déclarer", () => {
    const { container, getAllByRole, getByRole } = rendre();
    fireEvent.click(getAllByRole("button", { name: /Libellé officiel o-1/ })[0]);
    fireEvent.click(getByRole("button", { name: /Je ne sais pas/, hidden: true }));
    expect(container.querySelector("dialog")!.textContent).toContain("Ce que dit le texte");
    expect(actions.declarerEnPlace).not.toHaveBeenCalled();
  });

  it("« Oui, c'est en place » déclare par l'action serveur", async () => {
    const { getAllByRole, getByRole } = rendre();
    fireEvent.click(getAllByRole("button", { name: /Libellé officiel o-1/ })[0]);
    fireEvent.click(getByRole("button", { name: /Oui, c'est en place/, hidden: true }));
    await waitFor(() => expect(actions.declarerEnPlace).toHaveBeenCalledWith("etab-1", "o-1"));
  });

  it("une ligne établie d'après les titres ne se déclare pas : elle mène à Équipe", () => {
    const lignes = [
      fiche("o-3", "Les salariés sont-ils habilités ?", {
        parLesTitres: { phrase: "Établi d'après les titres déclarés : 1 titre.", hrefEquipe: "/e/equipe", enPlace: true },
      }),
    ];
    const { container, getAllByRole } = rendre(lignes);
    fireEvent.click(getAllByRole("button", { name: /Libellé officiel o-3/ })[0]);
    const boite = container.querySelector("dialog")!;
    expect(boite.textContent).not.toContain("Oui, c'est en place");
    expect(boite.textContent).toContain("Voir les titres sur Équipe");
  });

  it("l'ancre de la ligne n'existe qu'une fois, fiche ouverte comprise", () => {
    const { container, getAllByRole } = rendre();
    fireEvent.click(getAllByRole("button", { name: /Libellé officiel o-1/ })[0]);
    expect(container.querySelectorAll("#etat-o-1")).toHaveLength(1);
  });

  it("sans parcours (« Évaluer les risques ») : ni Précédente, ni Suivante, ni « n / N », ni flèches", () => {
    const { getAllByRole, queryByRole, getByRole, queryByText } = rendre(LIGNES, false);
    fireEvent.click(getAllByRole("button", { name: /Libellé officiel o-1/ })[0]);
    expect(queryByRole("button", { name: /Suivante/, hidden: true })).toBeNull();
    expect(queryByRole("button", { name: /Précédente/, hidden: true })).toBeNull();
    expect(queryByText(/1 \/ 2/)).toBeNull();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(getByRole("heading", { name: /extincteurs/, hidden: true })).toBeTruthy();
  });
});
