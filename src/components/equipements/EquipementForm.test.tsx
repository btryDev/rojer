// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
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
