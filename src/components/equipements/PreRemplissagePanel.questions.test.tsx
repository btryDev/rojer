// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

// L'action serveur est remplacée : on éprouve ce que le PANNEAU envoie. La
// porte du serveur est éprouvée dans `lib/equipements/actions.test.ts`.
const { creer } = vi.hoisted(() => ({
  creer: vi.fn(
    async (
      _id: string,
      entrees: unknown[],
    ): Promise<{ status: "success"; created: number } | { status: "error"; message: string }> => ({
      status: "success",
      created: entrees?.length ?? 0,
    }),
  ),
}));
vi.mock("@/lib/equipements/actions", () => ({
  creerEquipementsDepuisPreRemplissage: creer,
}));

const { PreRemplissagePanel, nomQuestionPanneau } = await import("./PreRemplissagePanel");
const { suggererEquipements } = await import("@/lib/equipements/pre-remplissage");
const { questionsExigeesParCategorie, questionsExigeesPour, REGIME_TRAVAIL } = await import(
  "@/lib/equipements/reponses-exigees"
);
type RegimeExigence = import("@/lib/equipements/reponses-exigees").RegimeExigence;

/**
 * Décision de la propriétaire du 2026-10-13 (option 2) : le panneau de
 * pré-remplissage pose, à côté de la case, les questions exigées des
 * catégories qu'il suggère — aujourd'hui le groupe électrogène d'une
 * installation électrique en ERP. Le commentaire de la reprise des suites du
 * lot 3 disait qu'il n'en suggérait aucune « (288 contextes) » ; le balayage
 * ci-dessous l'aurait démenti, et tient désormais que chaque question exigée
 * d'une catégorie suggérée est posée dans le panneau.
 */

afterEach(cleanup);
beforeEach(() => creer.mockClear());

const NAFS = [null, "56.10A", "47.11B", "47.61Z", "70.22Z", "55.10Z", "86.21Z"];
const REGIMES_ERP: RegimeExigence[] = (["N1", "N2", "N3", "N4", "N5"] as const).flatMap((c) =>
  [null, true, false].map((ssi) => ({ estERP: true, typeErp: "N", typesErpAutres: [], categorieErp: c, ssiCategorieAouB: ssi })),
);

describe("balayage : toute catégorie suggérée à question exigée a sa question dans le panneau", () => {
  it("sur tous les contextes et régimes essayés", () => {
    // Le moteur est appelé une fois par régime et par catégorie, pas par
    // contexte : le coût est là, pas dans le rendu.
    const carte = new Map<RegimeExigence, ReturnType<typeof questionsExigeesParCategorie>>();
    const exigees = new Map<string, readonly string[]>();
    const exigeesPour = (c: Parameters<typeof questionsExigeesPour>[0], r: RegimeExigence) => {
      const k = `${c}|${JSON.stringify(r)}`;
      if (!exigees.has(k)) exigees.set(k, questionsExigeesPour(c, r));
      return exigees.get(k)!;
    };
    const carteDe = (r: RegimeExigence) => {
      if (!carte.has(r)) carte.set(r, questionsExigeesParCategorie(r));
      return carte.get(r)!;
    };
    let posees = 0;
    const manquantes: string[] = [];
    for (const codeNaf of NAFS) {
      for (let f = 0; f < 16; f++) {
        const ctx = {
          codeNaf,
          estEtablissementTravail: Boolean(f & 1),
          estERP: Boolean(f & 2),
          estIGH: Boolean(f & 4),
          estHabitation: Boolean(f & 8), categorieErp: null,
        };
        const suggestions = suggererEquipements(ctx);
        if (suggestions.length === 0) continue;
        for (const regime of ctx.estERP ? REGIMES_ERP : [REGIME_TRAVAIL]) {
          const html = renderToStaticMarkup(
            <PreRemplissagePanel
              etablissementId="etab"
              suggestions={suggestions}
              questionsExigees={carteDe(regime)}
            />,
          );
          for (const s of suggestions) {
            for (const champ of exigeesPour(s.categorie, regime)) {
              if (html.includes(`name="${nomQuestionPanneau(s.categorie, champ as never)}"`)) posees++;
              else manquantes.push(`${JSON.stringify(ctx)} ${JSON.stringify(regime)} ${s.categorie}.${champ}`);
            }
          }
        }
      }
    }
    expect(manquantes.slice(0, 5), `${manquantes.length} question(s) non posée(s)`).toEqual([]);
    // Borne basse : le cas existe. C'est ce que le commentaire « aucune
    // catégorie à réponse exigée (288 contextes) » niait.
    expect(posees).toBeGreaterThan(0);
  });
});

const ELEC = {
  categorie: "INSTALLATION_ELECTRIQUE" as const,
  libelle: "Installation électrique principale",
  raison: "Vérification périodique",
};
const EXT = { categorie: "EXTINCTEUR" as const, libelle: "Extincteurs", raison: "Vérification annuelle" };
const ERP_N3: RegimeExigence = { estERP: true, typeErp: "N", typesErpAutres: [], categorieErp: "N3", ssiCategorieAouB: null };
const NOM = nomQuestionPanneau("INSTALLATION_ELECTRIQUE", "aGroupeElectrogene");

function panneau(regime: RegimeExigence) {
  return render(
    <PreRemplissagePanel
      etablissementId="etab"
      suggestions={[ELEC, EXT]}
      questionsExigees={questionsExigeesParCategorie(regime)}
    />,
  );
}

describe("le panneau en ERP : la question du groupe électrogène, au format du formulaire", () => {
  it("oui / non, sans « Je ne sais pas encore », sans présélection, requise", () => {
    const { container } = panneau(ERP_N3);
    const select = container.querySelector<HTMLSelectElement>(`select[name="${NOM}"]`)!;
    expect(select).not.toBeNull();
    expect(select.required).toBe(true);
    expect(select.value).toBe("");
    expect([...select.options].map((o) => o.textContent)).not.toContain("Je ne sais pas encore");
  });

  it("sans réponse : l'envoi est refusé, rien n'est appelé", async () => {
    const { container, findByRole } = panneau(ERP_N3);
    fireEvent.submit(container.querySelector("form")!);
    expect((await findByRole("alert")).textContent).toContain("Répondez oui ou non");
    expect(creer).not.toHaveBeenCalled();
  });

  it("« Oui » : envoyé avec `aGroupeElectrogene: true`, l'extincteur sans caractéristiques", async () => {
    const { container } = panneau(ERP_N3);
    fireEvent.change(container.querySelector(`select[name="${NOM}"]`)!, { target: { value: "oui" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(creer).toHaveBeenCalled());
    expect(creer.mock.calls[0][1]).toEqual([
      { categorie: "INSTALLATION_ELECTRIQUE", libelle: ELEC.libelle, caracteristiques: { aGroupeElectrogene: true } },
      { categorie: "EXTINCTEUR", libelle: EXT.libelle },
    ]);
  });

  it("« Non » : envoyé avec `aGroupeElectrogene: false`", async () => {
    const { container } = panneau(ERP_N3);
    fireEvent.change(container.querySelector(`select[name="${NOM}"]`)!, { target: { value: "non" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(creer).toHaveBeenCalled());
    expect(creer.mock.calls[0][1]).toContainEqual({
      categorie: "INSTALLATION_ELECTRIQUE",
      libelle: ELEC.libelle,
      caracteristiques: { aGroupeElectrogene: false },
    });
  });

  it("case décochée : la question n'est plus requise, et l'installation n'est pas envoyée", async () => {
    const { container } = panneau(ERP_N3);
    fireEvent.click(container.querySelector<HTMLInputElement>("#pre-INSTALLATION_ELECTRIQUE")!);
    expect(container.querySelector<HTMLSelectElement>(`select[name="${NOM}"]`)!.required).toBe(false);
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(creer).toHaveBeenCalled());
    expect(creer.mock.calls[0][1]).toEqual([{ categorie: "EXTINCTEUR", libelle: EXT.libelle }]);
  });
});

describe("hors ERP : pas de question", () => {
  it("aucune question posée, l'installation envoyée sans caractéristiques", async () => {
    const { container } = panneau(REGIME_TRAVAIL);
    expect(container.querySelector("select")).toBeNull();
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(creer).toHaveBeenCalled());
    expect(creer.mock.calls[0][1]).toEqual([
      { categorie: "INSTALLATION_ELECTRIQUE", libelle: ELEC.libelle },
      { categorie: "EXTINCTEUR", libelle: EXT.libelle },
    ]);
  });
});

describe("accessibilité du panneau (revue du 2026-10-13)", () => {
  it("la question est dans un groupe nommé par la catégorie", () => {
    panneau(ERP_N3);
    const groupe = screen.getByRole("group", { name: "Installation électrique" });
    expect(groupe.querySelector(`select[name="${NOM}"]`)).not.toBeNull();
  });

  it("l'astérisque est expliqué ; hors ERP, sans question, il ne l'est pas", () => {
    const { container, unmount } = panneau(ERP_N3);
    expect(container.textContent).toContain("* réponse requise");
    unmount();
    expect(panneau(REGIME_TRAVAIL).container.textContent).not.toContain("réponse requise");
  });

  it("sans réponse : le champ est invalide et son message lui est lié", async () => {
    const { container, findByRole } = panneau(ERP_N3);
    const select = container.querySelector<HTMLSelectElement>(`select[name="${NOM}"]`)!;
    expect(select.getAttribute("aria-invalid")).toBe("false");
    fireEvent.submit(container.querySelector("form")!);
    await findByRole("alert");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    const ids = select.getAttribute("aria-describedby")!.split(" ");
    const lie = ids.map((id) => container.ownerDocument.getElementById(id)?.textContent ?? "");
    expect(lie).toContain("Répondez oui ou non.");
  });

  it("un refus du serveur est RETOURNÉ et affiché tel quel", async () => {
    creer.mockResolvedValueOnce({ status: "error", message: "Libellé refusé : motif serveur." });
    const { container, findByRole } = panneau(REGIME_TRAVAIL);
    fireEvent.submit(container.querySelector("form")!);
    expect((await findByRole("alert")).textContent).toBe("Libellé refusé : motif serveur.");
    expect(container.textContent).not.toContain("ajouté");
  });
});
