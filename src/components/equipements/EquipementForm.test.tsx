// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  const regime = { estERP: true, typeErp: "M" as const, typesErpAutres: [], ssiCategorieAouB: null };
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

  const net = (t: string | null | undefined) => (t ?? "").replace(/\s+/g, " ").trim();

  // Revue du 2026-10-13 (C1) : des sous-chaînes isolées laissaient passer un
  // rythme rattaché à la mauvaise condition (« trois mois s'il est
  // motorisé… »). Chaque puce se vérifie en entier, rythme ET condition.
  // Éprouvé en remettant ce mutant. Les segments sont ceux de l'art. 23 et du
  // III de l'art. 20 (corpus `arrete-2004-03-01-levage.ts`) ; on ne compte
  // pas les puces, on exige que chacune de ces règles y soit, mot pour mot.
  it("levage : chaque rythme de l'art. 23 se lit avec sa condition entière", () => {
    const aide = rendre(LEVAGE).querySelector("#aide-reponses-exigees");
    expect(net(aide?.textContent)).toContain("(arrêté du 1er mars 2004, art. 23)");
    expect(net(aide?.textContent)).toContain("y compris pour un appareil déjà enregistré");
    const puces = [...(aide?.querySelectorAll("li") ?? [])].map((li) => net(li.textContent));
    for (const regle of [
      "tous les douze mois en principe ;",
      "tous les six mois s'il figure à la liste de l'art. 20-II ;",
      "tous les six mois s'il est manuel et n'est pas conçu spécialement pour lever des personnes (art. 20-III) ;",
      "tous les six mois s'il est motorisé et sert au transport de personnes ou à élever un poste de travail ;",
      "tous les trois mois s'il est manuel et sert à élever un poste de travail.",
    ]) {
      expect(puces, regle).toContain(regle);
    }
    // BORNE HAUTE (revue du 2026-10-13) : la boucle ci-dessus exige que
    // chaque règle soit là, elle ne voit pas une puce de trop qui dirait le
    // contraire. Deux rattachements que l'art. 23 et le III de l'art. 20
    // excluent, quelle que soit la puce qui les porterait : trois mois pour
    // un appareil motorisé (le b) ne vise que la force humaine), et six mois
    // pour un appareil manuel sans la réserve « non conçus spécialement pour
    // lever des personnes ». Éprouvé en ajoutant une puce
    // « tous les trois mois s'il est motorisé … ».
    for (const puce of puces) {
      if (puce.includes("trois mois")) expect(puce, puce).not.toContain("motorisé");
      if (puce.includes("six mois") && puce.includes("manuel")) {
        expect(puce, puce).toContain("n'est pas conçu spécialement pour lever des personnes");
      }
    }
  });

  // C2 : l'aide de la question « manuel » (7f8a6433) disait « six mois » sans
  // la condition de l'art. 20-III. Elle se corrige avec l'aide ci-dessus.
  it("levage : l'aide de la question « manuel » rend la condition de l'art. 20-III", () => {
    const aide = net(rendre(LEVAGE).querySelector("#estMuParForceHumaine-aide")?.textContent);
    expect(aide).toContain(
      "Si oui, la vérification générale a lieu tous les trois mois s'il sert à élever un poste de travail ; sinon, tous les six mois s'il n'est pas conçu spécialement pour lever des personnes (arrêté du 1er mars 2004, art. 20-III et 23).",
    );
  });

  it("une autre catégorie : aucune aide", () => {
    expect(rendre("EXTINCTEUR").querySelector("#aide-reponses-exigees")).toBeNull();
  });

  it("désenfumage d'un ERP N3, dont la réponse est exigée : pas l'aide du levage", () => {
    const n3 = { estERP: true, typeErp: "M" as const, typesErpAutres: [], categorieErp: "N3" as const, ssiCategorieAouB: null };
    // Le cas n'a de sens que si la question y est bien exigée.
    expect(questionsExigeesPour("DESENFUMAGE", n3)).toContain("estDesenfumageMecanique");
    expect(rendre("DESENFUMAGE", n3).querySelector("#aide-reponses-exigees")).toBeNull();
  });
});

// 2026-10-14, décision de la propriétaire : la catégorie se cherche, par
// libellé et par synonymes, et la recherche trouve aussi les matériels que
// Rojer ne suit pas. Le choix part dans deux champs cachés ; la saisie, jamais.
describe("EquipementForm : la recherche de matériel (2026-10-14)", () => {
  const rendre = (valeursInitiales = {}) =>
    render(<EquipementForm action={action} libelleSubmit="Créer" valeursInitiales={valeursInitiales} />)
      .container;
  const champ = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  const cache = (c: HTMLElement, nom: string) =>
    c.querySelector<HTMLInputElement>(`input[type="hidden"][name="${nom}"]`)!.value;
  const chercher = (c: HTMLElement, saisie: string) =>
    fireEvent.change(champ(c), { target: { value: saisie } });
  // Les options de la liste seulement : les `<select>` des questions à trois
  // états en ont aussi.
  const listeOptions = () => within(screen.getByRole("listbox")).getAllByRole("option");
  const options = () => listeOptions().map((o) => o.textContent ?? "");

  it("un combobox accessible : rôle, liste contrôlée, état ouvert dit", () => {
    const c = rendre();
    const input = champ(c);
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    // Plus de `<select>` de catégories : le seul champ envoyé est caché.
    expect(c.querySelector('select[name="categorie"]')).toBeNull();
    chercher(c, "chambre froide");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox").id).toBe(input.getAttribute("aria-controls"));
    expect(options()).toEqual(["Installation frigorifique"]);
  });

  it("au clavier : flèche, Entrée choisit l'option active ; Échap referme sans rien changer", () => {
    const c = rendre({ categorie: "EXTINCTEUR" });
    chercher(c, "palan");
    fireEvent.keyDown(champ(c), { key: "Escape" });
    expect(cache(c, "categorie")).toBe("EXTINCTEUR");
    expect(champ(c).value).toBe("Extincteurs");
    chercher(c, "palan");
    expect(champ(c).getAttribute("aria-activedescendant")).toBe(listeOptions()[0].id);
    fireEvent.keyDown(champ(c), { key: "Enter" });
    expect(cache(c, "categorie")).toBe("EQUIPEMENT_LEVAGE");
    expect(cache(c, "materielNonCouvert")).toBe("");
  });

  it("un matériel non suivi : enregistré en AUTRE avec sa clé, l'encart dit ce que Rojer ne suit pas", () => {
    const c = rendre();
    chercher(c, "escabeau");
    expect(options()[0]).toMatch(/Échelle, escabeau ou marchepied/);
    fireEvent.mouseDown(listeOptions()[0]);
    expect(cache(c, "categorie")).toBe("AUTRE");
    expect(cache(c, "materielNonCouvert")).toBe("echelle");
    const aide = c.querySelector("#categorie-aide")!.textContent ?? "";
    expect(aide).toContain("Vous pouvez l'ajouter");
    expect(aide).toContain("Rojer ne suit pas l'usage des échelles");
  });

  it("la chaudière se trouve des deux côtés, et le matériel oriente vers l'installation de gaz", () => {
    const c = rendre();
    chercher(c, "chaudière");
    const libelles = options();
    expect(libelles.some((l) => l.startsWith("Installation de gaz"))).toBe(true);
    expect(libelles.some((l) => l.startsWith("Chaudière"))).toBe(true);
    fireEvent.mouseDown(listeOptions().find((o) => o.textContent?.startsWith("Chaudière"))!);
    expect(cache(c, "materielNonCouvert")).toBe("chaudiere");
    fireEvent.click(screen.getByRole("button", { name: /Déclarer plutôt : Installation de gaz/ }));
    expect(cache(c, "categorie")).toBe("INSTALLATION_GAZ");
    expect(cache(c, "materielNonCouvert")).toBe("");
    expect(c.querySelector("#categorie-aide")!.textContent).toContain("Rojer ne suit pas");
  });

  // Revue du lot, point 3 : les articles déplacés de la page « Ce que Rojer
  // ne couvre pas » restent NOMMÉS à l'écran. Test de rendu, pas de donnée.
  // Éprouvé en retirant `<ReferencesMateriel>` de l'encart.
  it("l'encart nomme les textes des articles déplacés : AS 10, R. 4323-63, R. 1321-60, arrêté du 10/09/2021", () => {
    const attendus: [string, string[]][] = [
      ["escalier_mecanique", ["art. AS 10"]],
      ["echelle", ["art. R. 4323-63"]],
      [
        "reservoir_eau",
        [
          "art. R. 1321-60",
          "Arrêté du 10 septembre 2021, art. 4",
          "Arrêté du 10 septembre 2021, art. 8",
          "Arrêté du 10 septembre 2021, art. 9",
          "Arrêté du 10 septembre 2021, art. 10",
          "Arrêté du 10 septembre 2021, art. 12",
        ],
      ],
    ];
    for (const [cle, textes] of attendus) {
      const c = rendre({ categorie: "AUTRE", materielNonCouvert: cle });
      const items = [...c.querySelectorAll("#categorie-aide li")].map((li) => li.textContent ?? "");
      for (const t of textes) expect(items.some((i) => i.includes(t)), `${cle} : ${t}`).toBe(true);
      cleanup();
    }
  });

  // Revue du lot, points 6 et 7. Éprouvés : `aria-controls` remis en
  // permanence, l'option « Autre » retirée du cas vide, `categorie-erreur`
  // retiré de `decritPar`.
  it("aria-controls ne vise la liste que liste ouverte", () => {
    const c = rendre();
    expect(champ(c).hasAttribute("aria-controls")).toBe(false);
    chercher(c, "extincteur");
    const id = champ(c).getAttribute("aria-controls");
    expect(id && document.getElementById(id)).toBeTruthy();
  });

  it("rien ne correspond : annoncé par une région live, et « Autre équipement » se choisit", () => {
    const c = rendre({ categorie: "EXTINCTEUR" });
    chercher(c, "zzz");
    expect(screen.getByRole("status").textContent).toMatch(/Rien ne correspond/);
    expect(options()).toEqual(["Autre équipement"]);
    fireEvent.keyDown(champ(c), { key: "Enter" });
    expect(cache(c, "categorie")).toBe("AUTRE");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("la liste suit le patron flottant du board, pas la surface creuse", () => {
    const c = rendre();
    chercher(c, "extincteur");
    const cls = screen.getByRole("listbox").className;
    expect(cls).toContain("rounded-[18px]");
    expect(cls).toContain("bg-[color:var(--board-card)]");
    expect(cls).not.toContain("board-slate-pale");
  });

  it("l'erreur de catégorie est reliée au champ par aria-describedby", async () => {
    const enErreur = async () => ({
      status: "error" as const,
      message: "Formulaire invalide",
      fieldErrors: { materielNonCouvert: ["Un matériel que Rojer ne suit pas s'enregistre en « Autre équipement »"] },
    });
    const { container } = render(
      <EquipementForm action={enErreur} libelleSubmit="Créer" valeursInitiales={{ categorie: "AUTRE" }} />,
    );
    fireEvent.submit(container.querySelector("form")!);
    await new Promise((r) => setTimeout(r, 30));
    const erreur = container.querySelector("#categorie-erreur");
    expect(erreur?.textContent).toMatch(/Autre équipement/);
    expect(champ(container).getAttribute("aria-describedby")?.split(" ")).toContain("categorie-erreur");
    expect(champ(container).getAttribute("aria-invalid")).toBe("true");
  });

  it("modifier un matériel non suivi : la clé revient, et choisir une catégorie l'efface", () => {
    const c = rendre({ categorie: "AUTRE", materielNonCouvert: "escalier_mecanique" });
    expect(cache(c, "materielNonCouvert")).toBe("escalier_mecanique");
    expect(champ(c).value).toBe("Escalier mécanique ou trottoir roulant");
    chercher(c, "ascenseur");
    fireEvent.mouseDown(listeOptions()[0]);
    expect(cache(c, "categorie")).toBe("ASCENSEUR");
    expect(cache(c, "materielNonCouvert")).toBe("");
  });
});

describe("EquipementForm : les exemples propres au défibrillateur (E4)", () => {
  it("un DAE prend ses exemples de libellé et de péremption, sans rythme de texte", () => {
    const { container } = render(
      <EquipementForm action={action} libelleSubmit="Créer" valeursInitiales={{ categorie: "DEFIBRILLATEUR" }} />,
    );
    expect(container.querySelector<HTMLInputElement>('input[name="libelle"]')!.placeholder).toBe(
      "Ex : DAE accueil, DAE salle",
    );
    const aide = container.querySelector("#datePeremption-aide")!.textContent!;
    expect(aide).toMatch(/électrodes ou la batterie/);
    expect(aide).not.toMatch(/harnais/);
  });

  it("une autre catégorie garde les exemples génériques", () => {
    const { container } = render(
      <EquipementForm action={action} libelleSubmit="Créer" valeursInitiales={{ categorie: "EXTINCTEUR" }} />,
    );
    expect(container.querySelector<HTMLInputElement>('input[name="libelle"]')!.placeholder).toMatch(/TGBT/);
  });
});
