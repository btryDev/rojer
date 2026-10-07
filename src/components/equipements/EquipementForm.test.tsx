// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { EquipementForm } from "./EquipementForm";
import {
  CATEGORIES_A_REPONSE_EXIGEE,
  questionsExigeesParCategorie,
  questionsExigeesPour,
} from "@/lib/equipements/reponses-exigees";
import { questionsTriEtatPour } from "@/lib/equipements/schema";

// D29 (a), à l'écran : une question exigée n'offre pas « Je ne sais pas
// encore », n'a aucune réponse présélectionnée, et le navigateur la réclame.
// Les autres questions de la catégorie gardent leurs trois états. La porte qui
// tient vraiment est au serveur (`actions.test.ts`) ; celle-ci dit la même
// chose au dirigeant avant qu'il n'envoie. Éprouvé en rendant `exigee` à faux.

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });
const LEVAGE = CATEGORIES_A_REPONSE_EXIGEE[0];

describe("EquipementForm : les questions exigées (D29 (a))", () => {
  it("appareil neuf : exigées sans « Je ne sais pas encore », sans présélection, requises ; les autres, à trois états", () => {
    const { container } = render(
      <EquipementForm
        action={action}
        libelleSubmit="Créer"
        valeursInitiales={{ categorie: LEVAGE }}
        questionsExigees={questionsExigeesParCategorie()}
      />,
    );
    const exigees = questionsExigeesPour(LEVAGE);
    for (const { champ } of questionsTriEtatPour(LEVAGE)) {
      const select = container.querySelector<HTMLSelectElement>(`select[name="${champ}"]`)!;
      expect(select, champ).not.toBeNull();
      const libelles = [...select.options].map((o) => o.textContent);
      if (exigees.includes(champ)) {
        expect(select.required, champ).toBe(true);
        expect(libelles, champ).not.toContain("Je ne sais pas encore");
        expect(select.value, champ).toBe("");
      } else {
        expect(select.required, champ).toBe(false);
        expect(libelles, champ).toContain("Je ne sais pas encore");
      }
    }
  });

  it("appareil ancien déjà répondu : la réponse revient présélectionnée", () => {
    const [champ] = questionsExigeesPour(LEVAGE);
    const { container } = render(
      <EquipementForm
        action={action}
        libelleSubmit="Enregistrer"
        valeursInitiales={{ categorie: LEVAGE, [champ]: false }}
        questionsExigees={questionsExigeesParCategorie()}
      />,
    );
    expect(container.querySelector<HTMLSelectElement>(`select[name="${champ}"]`)!.value).toBe("non");
  });
});

describe("EquipementForm : la question du SSI A ou B suit le désenfumage mécanique (DF 10 § 3)", () => {
  // Revue du 2026-10-07. La triennale exige les deux installations : tant que
  // le désenfumage n'est pas déclaré mécanique, la question du SSI ne décide
  // de rien et n'est pas posée. Sa valeur part en champ caché : le serveur
  // l'accepte toujours. Éprouvé en rendant la question inconditionnelle.
  const SSI = "etablissementASsiCategorieAouB";
  const MECA = "estDesenfumageMecanique";

  it("masquée tant que « mécanique » ne vaut pas « oui », montrée après", () => {
    const { container } = render(
      <EquipementForm
        action={action}
        libelleSubmit="Créer"
        estERP
        valeursInitiales={{ categorie: "DESENFUMAGE", [SSI]: false }}
      />,
    );
    expect(container.querySelector(`select[name="${SSI}"]`)).toBeNull();
    const cache = container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${SSI}"]`);
    expect(cache?.value).toBe("non");
    fireEvent.change(container.querySelector<HTMLSelectElement>(`select[name="${MECA}"]`)!, {
      target: { value: "oui" },
    });
    expect(container.querySelector(`select[name="${SSI}"]`)).not.toBeNull();
    expect(container.querySelector(`input[type="hidden"][name="${SSI}"]`)).toBeNull();
  });

  it("masquée APRÈS une réponse : c'est la réponse choisie qui part, pas la valeur initiale", () => {
    // Revue finale du 2026-10-07 (C62). Le champ caché renvoyait
    // `valeursInitiales` : mécanique « oui », SSI « non », puis mécanique
    // « je ne sais pas » — et le « non » qu'on venait de donner était perdu.
    const { container } = render(
      <EquipementForm
        action={action}
        libelleSubmit="Créer"
        estERP
        valeursInitiales={{ categorie: "DESENFUMAGE" }}
      />,
    );
    const choisir = (champ: string, value: string) =>
      fireEvent.change(container.querySelector<HTMLSelectElement>(`select[name="${champ}"]`)!, {
        target: { value },
      });
    choisir(MECA, "oui");
    choisir(SSI, "non");
    choisir(MECA, "");
    expect(container.querySelector(`select[name="${SSI}"]`)).toBeNull();
    const envoye = new FormData(container.querySelector("form")!);
    expect(envoye.get(SSI)).toBe("non");
    // Et la question, reposée, la montre toujours.
    choisir(MECA, "oui");
    expect(container.querySelector<HTMLSelectElement>(`select[name="${SSI}"]`)!.value).toBe("non");
  });

  it("déjà « oui » : posée d'emblée", () => {
    const { container } = render(
      <EquipementForm
        action={action}
        libelleSubmit="Enregistrer"
        estERP
        valeursInitiales={{ categorie: "DESENFUMAGE", [MECA]: true }}
      />,
    );
    expect(container.querySelector(`select[name="${SSI}"]`)).not.toBeNull();
  });
});
