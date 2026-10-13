// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { EquipementForm } from "./EquipementForm";
import {
  CATEGORIES_A_REPONSE_EXIGEE,
  REGIME_TRAVAIL,
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
        questionsExigees={questionsExigeesParCategorie(REGIME_TRAVAIL)}
      />,
    );
    const exigees = questionsExigeesPour(LEVAGE, REGIME_TRAVAIL);
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
    const [champ] = questionsExigeesPour(LEVAGE, REGIME_TRAVAIL);
    const { container } = render(
      <EquipementForm
        action={action}
        libelleSubmit="Enregistrer"
        valeursInitiales={{ categorie: LEVAGE, [champ]: false }}
        questionsExigees={questionsExigeesParCategorie(REGIME_TRAVAIL)}
      />,
    );
    expect(container.querySelector<HTMLSelectElement>(`select[name="${champ}"]`)!.value).toBe("non");
  });
});

// ~~« EquipementForm : la question du SSI A ou B suit le désenfumage mécanique
// (DF 10 § 3) »~~ — 2026-10-12 : la question est passée sur la fiche de
// l'établissement (décision de la propriétaire du 2026-10-08). Les deux tests
// qui la montraient après « mécanique : Oui » et gardaient sa valeur en champ
// caché (C62) n'ont plus d'objet ; celui-ci tient qu'elle ne revient pas.
describe("EquipementForm : le désenfumage ne pose plus la question du SSI A ou B (DF 10 § 3)", () => {
  it("ni question, ni champ caché, quelle que soit la réponse « mécanique »", () => {
    const { container } = render(
      <EquipementForm
        action={action}
        libelleSubmit="Créer"
        estERP
        valeursInitiales={{ categorie: "DESENFUMAGE", estDesenfumageMecanique: true }}
      />,
    );
    expect(container.querySelector('select[name="estDesenfumageMecanique"]')).not.toBeNull();
    expect(container.querySelector('[name="etablissementASsiCategorieAouB"]')).toBeNull();
  });
});

describe("EquipementForm : « désenfumage mécanique » exigé en ERP des quatre premières catégories (décision du 2026-10-08)", () => {
  const regime = { estERP: true, typeErp: "M" as const, ssiCategorieAouB: null };
  it("N2 : pas de « Je ne sais pas encore », champ requis ; N5 : trois états", () => {
    const rendre = (categorieErp: "N2" | "N5") =>
      render(
        <EquipementForm
          action={action}
          libelleSubmit="Créer"
          estERP
          valeursInitiales={{ categorie: "DESENFUMAGE" }}
          questionsExigees={questionsExigeesParCategorie({ ...regime, categorieErp })}
        />,
      ).container.querySelector<HTMLSelectElement>('select[name="estDesenfumageMecanique"]')!;
    const n2 = rendre("N2");
    expect(n2.required).toBe(true);
    expect([...n2.options].map((o) => o.textContent)).not.toContain("Je ne sais pas encore");
    cleanup();
    const n5 = rendre("N5");
    expect(n5.required).toBe(false);
  });
});

describe("EquipementForm : l'aide au-dessus des questions exigées du levage (reprise des suites du lot 3)", () => {
  // Un appareil ancien ne s'enregistre plus sans ces réponses : la fiche dit
  // pourquoi, avec les rythmes de l'art. 23 et les mots « manuel » /
  // « motorisé » du 2026-10-08. Éprouvé en retirant le paragraphe, puis en
  // retirant la garde sur la catégorie.
  const rendre = (categorie: string, regime = REGIME_TRAVAIL) =>
    render(
      <EquipementForm
        action={action}
        libelleSubmit="Enregistrer"
        estERP={regime.estERP}
        valeursInitiales={{ categorie: categorie as typeof LEVAGE }}
        questionsExigees={questionsExigeesParCategorie(regime)}
      />,
    ).container;

  it("levage : l'aide dit les trois rythmes de l'art. 23, avec « manuel » et « motorisé »", () => {
    const texte = rendre(LEVAGE).querySelector("#aide-reponses-exigees")?.textContent ?? "";
    for (const attendu of [
      "art. 23",
      "douze mois",
      "six mois",
      "trois mois",
      "manuel",
      "motorisé",
      "art. 20-II",
      "déjà enregistré",
    ]) {
      expect(texte, attendu).toContain(attendu);
    }
  });

  it("une autre catégorie : aucune aide", () => {
    expect(rendre("EXTINCTEUR").querySelector("#aide-reponses-exigees")).toBeNull();
  });

  it("désenfumage d'un ERP N3, dont la réponse est exigée : pas l'aide du levage", () => {
    const n3 = { estERP: true, typeErp: "M" as const, categorieErp: "N3" as const, ssiCategorieAouB: null };
    // Le cas n'a de sens que si la question y est bien exigée.
    expect(questionsExigeesPour("DESENFUMAGE", n3)).toContain("estDesenfumageMecanique");
    expect(rendre("DESENFUMAGE", n3).querySelector("#aide-reponses-exigees")).toBeNull();
  });
});
