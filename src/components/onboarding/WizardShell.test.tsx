// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * Ce que le parcours de création ne doit PAS faire.
 *
 * Le point le plus cher est le premier : un formulaire qui couvre trois
 * étapes et ne se soumet qu'à la dernière. Le bouton de droite est le **même
 * nœud DOM** d'une étape à l'autre — React réconcilie par position, seul le
 * `type` du `<button>` change —, et l'« activation behavior » d'un bouton lit
 * son `type` APRÈS que les écouteurs de clic ont tourné. Vérifié en jsdom :
 *
 *   const b = document.createElement("button");   // type="button"
 *   b.addEventListener("click", () => { b.type = "submit"; });
 *   b.click();                                    // → le formulaire part
 *
 * Un clic sur « Suivant » à l'étape 2 laisse donc, sous le curseur, un bouton
 * « Créer mon espace » que le navigateur peut activer dans la foulée : étape 3
 * affichée, espace déjà en création, résumé jamais lu. C'est le symptôme
 * rapporté une fois par la vérification visuelle.
 *
 * Ce qui n'a PAS été établi : que le rendu React s'intercale bien avant
 * l'activation, dans un vrai navigateur. `element.click()` appelé depuis un
 * script ne vide jamais la pile JS, donc le point de contrôle des microtâches
 * — où React déverse ses mises à jour synchrones — ne tombe pas au milieu de
 * la propagation, et la séquence complète ne se reproduit pas ici. On ne
 * corrige donc pas un mécanisme supposé : on tient l'invariant, qui est vrai
 * quelle que soit la cause. Une soumission qui ne vient pas de l'étape 3 n'a
 * pas lieu — le test l'établit en provoquant la soumission directement.
 */

const appels: string[] = [];

vi.mock("@/lib/onboarding/actions", () => ({
  finaliserOnboarding: async () => {
    appels.push("creation");
    return { status: "idle" as const };
  },
}));
const navigations: string[] = [];
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: (href: string) => navigations.push(href) }),
}));
vi.mock("@/lib/auth/actions", () => ({
  signOutAction: async () => {
    appels.push("deconnexion");
  },
}));

import { WizardShell } from "./WizardShell";

afterEach(cleanup);
beforeEach(() => {
  appels.length = 0;
  navigations.length = 0;
  // jsdom n'a pas de mise en page, donc pas de `scrollIntoView`. Le bouchon
  // est ici et non dans le composant : amener le refus sous les yeux est le
  // comportement voulu, pas une précaution à rendre conditionnelle.
  Element.prototype.scrollIntoView = () => {};
});

/** Saisit dans un champ contrôlé par React, comme le ferait une frappe. */
function saisir(label: RegExp | string, valeur: string) {
  const el = screen.getByLabelText(label) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(el, valeur);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function remplirEtape1() {
  saisir(/Raison sociale/, "Bistrot du marché");
  saisir(/Numéro et rue/, "12 rue des Halles");
  saisir(/Code postal/, "75011");
  saisir(/^Ville/, "Paris");
  saisir(/Code NAF/, "56.10A");
  saisir(/Effectif travailleur/, "8");
}

/** Choisit dans un `<select>` contrôlé par React, comme le ferait un clic. */
function choisir(label: RegExp | string, valeur: string) {
  const el = screen.getByLabelText(label) as HTMLSelectElement;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  )!.set!;
  setter.call(el, valeur);
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const souffler = () => new Promise((r) => setTimeout(r, 30));

describe("le formulaire ne se soumet qu'à la dernière étape", () => {
  it("une soumission provoquée à l'étape 1 ne crée rien", async () => {
    const { container } = render(<WizardShell />);
    const form = container.querySelector("form")!;

    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await souffler();

    expect(appels).toEqual([]);
    // Et on est toujours à l'étape 1 : rien n'a bougé sous l'utilisateur.
    expect(screen.getByText(/Décrivez votre établissement/)).toBeTruthy();
  });

  it("une soumission provoquée à l'étape 2 ne crée rien", async () => {
    const { container } = render(<WizardShell />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    expect(screen.getByText(/Quelques questions/)).toBeTruthy();

    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await souffler();

    expect(appels).toEqual([]);
  });

  it("la même soumission, à l'étape 3, crée l'espace", async () => {
    // La borne haute du même garde-fou : sans elle, le test passerait aussi
    // sur un formulaire qui ne se soumet jamais.
    const { container } = render(<WizardShell />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    expect(screen.getByRole("button", { name: /Créer mon espace/ })).toBeTruthy();

    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await souffler();

    expect(appels).toEqual(["creation"]);
  });
});

describe("le refus de périmètre ferme la porte avant le clic", () => {
  it("cinquante et un salariés : « Suivant » est désactivé", async () => {
    render(<WizardShell />);
    remplirEtape1();
    saisir(/Effectif travailleur/, "51");
    await souffler();

    const suivant = screen.getByRole("button", {
      name: /Suivant/,
    }) as HTMLButtonElement;
    expect(suivant.disabled).toBe(true);
  });

  it("cinquante salariés : elle reste ouverte", async () => {
    render(<WizardShell />);
    remplirEtape1();
    saisir(/Effectif travailleur/, "50");
    await souffler();

    expect(
      (screen.getByRole("button", { name: /Suivant/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("un champ oublié, lui, laisse le bouton actif — c'est le clic qui l'apprend", async () => {
    // La couche voisine : si le bouton se désactivait à la moindre erreur,
    // l'utilisateur n'aurait plus aucun moyen d'apprendre ce qui manque.
    render(<WizardShell />);
    await souffler();

    const suivant = screen.getByRole("button", {
      name: /Suivant/,
    }) as HTMLButtonElement;
    expect(suivant.disabled).toBe(false);

    suivant.click();
    await souffler();
    expect(screen.getByText(/Indiquez la raison sociale/)).toBeTruthy();
  });
});

describe("le refus se rend au champ qu'il vise", () => {
  it("étape 2 : « Précisez le type de votre ERP » est rendu au champ", async () => {
    render(<WizardShell />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();

    // « Oui » à l'ERP, sans choisir de type.
    const cartes = screen.getAllByRole("button", { name: "Oui" });
    cartes[0].click();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();

    const message = screen.getByText(/Précisez le type de votre ERP/);
    const select = screen.getByLabelText("Type d'ERP");
    // Le message vit dans le même bloc que le champ, pas en pied de colonne.
    expect(select.parentElement!.contains(message)).toBe(true);
  });
});

describe("le refus de périmètre est aussi lisible sans le voir", () => {
  it("le champ chaîne son aide ET le refus, pas l'un des deux", async () => {
    // La règle du kit (charte § 4) : `aria-describedby` chaîne l'aide et
    // l'erreur. Le refus vivant hors de `ChampBoard`, la chaîne est écrite à
    // la main — et une chaîne écrite à la main est exactement celle qui perd
    // une moitié.
    render(<WizardShell />);
    remplirEtape1();
    saisir(/Effectif travailleur/, "51");
    await souffler();

    const champ = screen.getByLabelText(/Effectif travailleur/);
    const decrit = champ.getAttribute("aria-describedby") ?? "";
    expect(decrit.split(" ")).toContain("effectifSurSite-aide");
    expect(decrit.split(" ")).toContain("effectifSurSite-refus");
    // Et les deux cibles existent vraiment : un `aria-describedby` qui
    // pointe dans le vide ne dit rien du tout.
    for (const id of decrit.split(" ")) {
      expect(document.getElementById(id), id).toBeTruthy();
    }
  });
});

/**
 * La sortie de l'écran. `/onboarding` masque le header global (`AppHeaderGate`)
 * et la barre de compte n'existe qu'une fois un établissement créé : cet écran
 * est le seul à porter la déconnexion pour un compte qui n'a pas encore de
 * dossier. Et la confirmation de « Quitter » ne peut pas être une boîte native
 * — un navigateur à qui l'on a coché « empêcher cette page d'ouvrir d'autres
 * boîtes de dialogue » fait rendre `false` à `confirm()` sans rien afficher,
 * ce qui rend le bouton inerte pour le reste de la visite.
 */
describe("on peut sortir de la mise en place", () => {
  it("sans rien avoir saisi, « Quitter » s'en va sans poser de question", async () => {
    render(<WizardShell email="paul@exemple.fr" />);
    screen.getByRole("button", { name: "Quitter" }).click();
    await souffler();

    expect(navigations).toEqual(["/"]);
  });

  it("une saisie commencée : la question est posée DANS la page, et elle mène dehors", async () => {
    render(<WizardShell email="paul@exemple.fr" />);
    remplirEtape1();
    await souffler();

    screen.getByRole("button", { name: "Quitter" }).click();
    await souffler();

    // Rien n'a bougé, et la question est un nœud du document — pas une boîte
    // native que le navigateur peut avoir désactivée.
    expect(navigations).toEqual([]);
    const question = screen.getByRole("alertdialog");
    expect(question.textContent).toMatch(/Quitter la mise en place/);

    screen.getByRole("button", { name: /Quitter sans enregistrer/ }).click();
    await souffler();
    expect(navigations).toEqual(["/"]);
  });

  it("« Reprendre la saisie » referme la question et ne navigue pas", async () => {
    // La borne basse : sans elle, un panneau qui navigue toujours passerait.
    render(<WizardShell email="paul@exemple.fr" />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: "Quitter" }).click();
    await souffler();

    screen.getByRole("button", { name: /Reprendre la saisie/ }).click();
    await souffler();

    expect(navigations).toEqual([]);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    // La saisie est toujours là : on n'a pas remis le questionnaire à zéro.
    expect(
      (screen.getByLabelText(/Raison sociale/) as HTMLInputElement).value,
    ).toBe("Bistrot du marché");
  });

  it("la déconnexion est atteignable depuis l'écran", async () => {
    render(<WizardShell email="paul@exemple.fr" />);

    screen.getAllByRole("button", { name: /Déconnexion/ })[0].click();
    await souffler();

    expect(appels).toEqual(["deconnexion"]);
  });
});

describe("la question des locaux à sommeil au parcours (2026-09-09)", () => {
  /** Amène le wizard à l'étape 2, ERP coché, sur le type demandé. */
  async function allerEtape2AvecType(type: string) {
    render(<WizardShell />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    // Trois cartes portent un « Oui » à cette étape — ERP, IGH, habitation.
    // La première est celle de l'ERP, et c'est la seule qui nous intéresse.
    screen.getAllByRole("button", { name: /^Oui$/ })[0].click();
    await souffler();
    choisir(/Type d'ERP/, type);
    await souffler();
  }

  it("n'est pas posée avant qu'un type soit choisi", () => {
    // Elle a besoin de la réponse au type pour savoir si elle doit exister :
    // c'est la seule question du parcours dont la PRÉSENCE dépend d'une autre.
    render(<WizardShell />);
    expect(
      screen.queryByLabelText(/Hébergement du public pour la nuit/),
    ).toBeNull();
  });

  it("est posée à l'hôtel", async () => {
    await allerEtape2AvecType("O");
    expect(
      screen.getByLabelText(/Hébergement du public pour la nuit/),
    ).toBeTruthy();
  });

  it("n'est pas posée au restaurant", async () => {
    // La borne du 2026-09-09 : quatre types, et le type N n'en est pas.
    await allerEtape2AvecType("N");
    expect(
      screen.queryByLabelText(/Hébergement du public pour la nuit/),
    ).toBeNull();
  });

  it("la réponse part avec la question quand le type change", async () => {
    // SANS CE NETTOYAGE, un « oui » donné en type O survivrait au passage en
    // type N : le champ disparaît de l'écran, la valeur reste dans l'état, et
    // le formulaire posterait une déclaration que plus personne ne voit — que
    // le schéma refuserait, en bloquant la création sur un champ invisible.
    await allerEtape2AvecType("O");
    choisir(/Hébergement du public pour la nuit/, "oui");
    await souffler();
    choisir(/Type d'ERP/, "N");
    await souffler();
    choisir(/Type d'ERP/, "O");
    await souffler();

    const select = screen.getByLabelText(
      /Hébergement du public pour la nuit/,
    ) as HTMLSelectElement;
    expect(select.value).toBe("");
  });
});
