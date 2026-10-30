// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { flushSync } from "react-dom";

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
 *
 * [2026-10-17 : l'invariant ne suffisait pas. Contrôle de l'accueil dans
 * Chrome (c6) : un seul clic sur « Suivant » à l'étape 2 créait l'espace — au
 * moment de la soumission, l'état est DÉJÀ à l'étape 3, la garde la laisse
 * passer. Le mécanisme est désormais reproduit ici (`flushSync` entre
 * l'écouteur de React et l'activation, describe « un clic sur Suivant… ») et
 * corrigé à la cause : deux `key`, deux nœuds.]
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
}));

import { WizardShell } from "./WizardShell";
import { CHAMP_TEMOIN_TYPES_ERP_AUTRES } from "@/lib/etablissements/types-erp-affiches";
import {
  PHRASE_REFUS_ENFANTS,
  PHRASE_REFUS_J,
  PHRASE_REFUS_SPECIAUX,
  PHRASE_REFUS_U,
} from "@/lib/etablissements/types-refuses";

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
  saisir(/^SIRET/, "12002701600357");
  saisir(/Numéro et rue/, "12 rue des Halles");
  saisir(/Code postal/, "75011");
  saisir(/^Ville/, "Paris");
  saisir(/Code NAF/, "56.10A");
  saisir(/Travailleurs dans l'établissement/, "8");
  saisir(/Salariés de l'entreprise/, "8");
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
    const { container } = render(<WizardShell entreprisesConnues={[]} />);
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
    const { container } = render(<WizardShell entreprisesConnues={[]} />);
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
    const { container } = render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    // Aucune réponse de régime n'est présélectionnée (2026-09-27, A2) : on
    // répond « non » aux trois, comme un bureau.
    for (const id of ["estERP-non", "estIGH-non", "estHabitation-non"]) {
      (document.getElementById(id) as HTMLButtonElement).click();
      await souffler();
    }
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    expect(screen.getByRole("button", { name: /Créer l'établissement/ })).toBeTruthy();

    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await souffler();

    expect(appels).toEqual(["creation"]);
  });
});

describe("un clic sur « Suivant » à l'étape 2 ne crée rien, même rendu avant l'activation", () => {
  // Contrôle de l'accueil sur l'autre Mac (2026-10-17, c6) : dans Chrome, UN
  // clic sur « Suivant → » à l'étape 2 affichait l'étape 3 ET lançait
  // `finaliserOnboarding` — « Création en cours… », puis la redirection, sans
  // que « Créer mon espace » ait jamais été cliqué. Le défaut est antérieur au
  // lot 3 : main porte le même formulaire et la même garde.
  //
  // La séquence du navigateur : le gestionnaire React tourne, la pile JS se
  // vide, React rend l'étape 3 (le bouton de droite devient `type="submit"`,
  // la garde `onSubmit` lit déjà `etapeIdx === 2`), PUIS l'activation du
  // bouton cliqué soumet. `element.click()` depuis un script ne vide pas la
  // pile ; on la reproduit en forçant le rendu par `flushSync` dans un
  // écouteur placé APRÈS celui de React (document, phase de bouillonnement).
  //
  // Éprouvé en cassant : les `key` des deux boutons retirées (le même nœud DOM
  // change de type) — rouge, `appels` vaut ["creation"].
  it("le rendu de l'étape 3 s'intercale avant l'activation : aucune création", async () => {
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    for (const id of ["estERP-non", "estIGH-non", "estHabitation-non"]) {
      (document.getElementById(id) as HTMLButtonElement).click();
      await souffler();
    }

    const rendreAvantActivation = () => flushSync(() => {});
    document.addEventListener("click", rendreAvantActivation);
    try {
      screen.getByRole("button", { name: /Suivant/ }).click();
      await souffler();
    } finally {
      document.removeEventListener("click", rendreAvantActivation);
    }

    // L'étape 3 est affichée, et rien n'est parti.
    expect(screen.getByRole("button", { name: /Créer l'établissement/ })).toBeTruthy();
    expect(appels).toEqual([]);
  });
});

describe("le refus de périmètre ferme la porte avant le clic", () => {
  it("cinquante et un salariés : « Suivant » est désactivé", async () => {
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    saisir(/Travailleurs dans l'établissement/, "51");
    await souffler();

    const suivant = screen.getByRole("button", {
      name: /Suivant/,
    }) as HTMLButtonElement;
    expect(suivant.disabled).toBe(true);
  });

  it("cinquante salariés : elle reste ouverte", async () => {
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    saisir(/Travailleurs dans l'établissement/, "50");
    await souffler();

    expect(
      (screen.getByRole("button", { name: /Suivant/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("un champ oublié, lui, laisse le bouton actif — c'est le clic qui l'apprend", async () => {
    // La couche voisine : si le bouton se désactivait à la moindre erreur,
    // l'utilisateur n'aurait plus aucun moyen d'apprendre ce qui manque.
    render(<WizardShell entreprisesConnues={[]} />);
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
    render(<WizardShell entreprisesConnues={[]} />);
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
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    saisir(/Travailleurs dans l'établissement/, "51");
    await souffler();

    const champ = screen.getByLabelText(/Travailleurs dans l'établissement/);
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
 * La sortie de l'écran. `/onboarding` ne porte pas le header global (`LayoutAvecEnTete`)
 * et la barre de compte n'existe qu'une fois un établissement créé : cet écran
 * est le seul à porter la déconnexion pour un compte qui n'a pas encore de
 * dossier. Et la confirmation de « Quitter » ne peut pas être une boîte native
 * — un navigateur à qui l'on a coché « empêcher cette page d'ouvrir d'autres
 * boîtes de dialogue » fait rendre `false` à `confirm()` sans rien afficher,
 * ce qui rend le bouton inerte pour le reste de la visite.
 */
describe("on peut sortir de la mise en place", () => {
  it("sans rien avoir saisi, « Quitter » s'en va sans poser de question", async () => {
    render(<WizardShell email="paul@exemple.fr" entreprisesConnues={[]} />);
    screen.getByRole("button", { name: "Quitter" }).click();
    await souffler();

    expect(navigations).toEqual(["/"]);
  });

  it("une saisie commencée : la question est posée DANS la page, et elle mène dehors", async () => {
    render(<WizardShell email="paul@exemple.fr" entreprisesConnues={[]} />);
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
    render(<WizardShell email="paul@exemple.fr" entreprisesConnues={[]} />);
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

  it("la déconnexion est atteignable depuis l'écran", () => {
    render(<WizardShell email="paul@exemple.fr" entreprisesConnues={[]} />);

    // Un POST vers la route de déconnexion (ADR-052, lot 3a), qui vide aussi
    // le navigateur (`Clear-Site-Data`).
    const formulaire = screen.getAllByRole("button", { name: /Déconnexion/ })[0].closest("form");
    expect(formulaire?.getAttribute("action")).toBe("/auth/deconnexion");
    expect(formulaire?.getAttribute("method")).toBe("post");
  });
});

describe("la question des locaux à sommeil au parcours (2026-09-09)", () => {
  /** Amène le wizard à l'étape 2, ERP coché, sur le type demandé. */
  async function allerEtape2AvecType(type: string) {
    render(<WizardShell entreprisesConnues={[]} />);
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
    render(<WizardShell entreprisesConnues={[]} />);
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

describe("plusieurs types d'ERP au parcours (ADR-045, lot 3)", () => {
  // La majorité ne voit qu'un lien replié ; un restaurant qui exploite un
  // hôtel coche O, et la question du sommeil lui est posée. Éprouvé en
  // ouvrant le lien par défaut et en lisant le sommeil sur le premier type
  // seul : rouge.
  async function allerEtape2AvecType(type: string) {
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    screen.getAllByRole("button", { name: /^Oui$/ })[0].click();
    await souffler();
    choisir(/Type d'ERP/, type);
    await souffler();
  }
  const caseO = () =>
    screen.getByRole("checkbox", { name: /^O · Hôtel/ }) as HTMLInputElement;

  it("un lien replié, rien de coché, et rien de posté hors le témoin", async () => {
    await allerEtape2AvecType("N");
    expect(document.querySelector("details")!.open).toBe(false);
    expect(document.querySelectorAll('input[type="hidden"][name="typesErpAutres"]').length).toBe(0);
    expect(document.querySelector(`input[type="hidden"][name="${CHAMP_TEMOIN_TYPES_ERP_AUTRES}"]`)).not.toBeNull();
  });

  it("cocher O pose la question du sommeil à un restaurant, et poste le type", async () => {
    await allerEtape2AvecType("N");
    expect(screen.queryByLabelText(/Hébergement du public pour la nuit/)).toBeNull();
    caseO().click();
    await souffler();
    expect(screen.getByLabelText(/Hébergement du public pour la nuit/)).toBeTruthy();
    expect(
      [...document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="typesErpAutres"]')].map((i) => i.value),
    ).toEqual(["O"]);
  });

  it("échanger le premier type avec un autre garde les deux (revue du lot 3, C3)", async () => {
    await allerEtape2AvecType("N");
    caseO().click();
    await souffler();
    choisir(/Type d'ERP/, "O");
    await souffler();
    expect(
      [...document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="typesErpAutres"]')].map((i) => i.value),
    ).toEqual(["N"]);
  });

  const postes = () =>
    [...document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="typesErpAutres"]')].map((i) => i.value);

  it("N, O coché, puis O, puis N : N + O — l'aller-retour ne perd rien", async () => {
    await allerEtape2AvecType("N");
    caseO().click();
    await souffler();
    choisir(/Type d'ERP/, "O");
    await souffler();
    choisir(/Type d'ERP/, "N");
    await souffler();
    expect(postes()).toEqual(["O"]);
  });

  it("N, O coché, puis M, puis O : O + M, panneau ouvert", async () => {
    await allerEtape2AvecType("N");
    caseO().click();
    await souffler();
    choisir(/Type d'ERP/, "M");
    await souffler();
    choisir(/Type d'ERP/, "O");
    await souffler();
    expect(postes()).toEqual(["M"]);
    expect(document.querySelector("details")!.open).toBe(true);
  });

  it("décocher O retire la question et la réponse", async () => {
    await allerEtape2AvecType("N");
    caseO().click();
    await souffler();
    choisir(/Hébergement du public pour la nuit/, "oui");
    await souffler();
    caseO().click();
    await souffler();
    expect(screen.queryByLabelText(/Hébergement du public pour la nuit/)).toBeNull();
    expect(document.querySelector('input[type="hidden"][name="comporteLocauxSommeilPublic"]')).toBeNull();
  });
});

describe("la question du nombre de personnes au parcours (2026-09-20)", () => {
  const LIBELLE = /Personnes pouvant se trouver habituellement/;
  const champPoste = () =>
    document.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="personnesPresentesHabituellement"]',
    );

  /** Étape 2, ERP coché, restaurant, sur la catégorie demandée (effectif 8). */
  async function allerEtape2EnCategorie(categorie: string) {
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    screen.getAllByRole("button", { name: /^Oui$/ })[0].click();
    await souffler();
    choisir(/Type d'ERP/, "N");
    choisir(/Catégorie d'ERP/, categorie);
    await souffler();
  }

  it("est posée au restaurant de 5ᵉ catégorie, et pas à celui de 3ᵉ", async () => {
    await allerEtape2EnCategorie("N5");
    expect(screen.getByLabelText(LIBELLE)).toBeTruthy();
    choisir(/Catégorie d'ERP/, "N3");
    await souffler();
    expect(screen.queryByLabelText(LIBELLE)).toBeNull();
  });

  // [2026-10-27 : le nombre est facultatif — seule une saisie fausse retient.]
  it("« Suivant » retient une saisie fausse, et le refus est rendu AU champ", async () => {
    await allerEtape2EnCategorie("N5");
    saisir(LIBELLE, "0");
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    expect(screen.getByLabelText(LIBELLE).getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByText(/Indiquez combien de personnes/)).toBeTruthy();
  });

  it("le nombre n'est POSTÉ que tant que la question est à l'écran", async () => {
    // Un nombre saisi puis rendu sans objet reste dans l'état ; s'il partait,
    // le serveur le refuserait — à raison — sur un champ que plus rien ne
    // montre. C'est la garde de `ChampsCaches`.
    await allerEtape2EnCategorie("N5");
    saisir(LIBELLE, "40");
    await souffler();
    expect(champPoste()?.value).toBe("40");
    choisir(/Catégorie d'ERP/, "N3");
    await souffler();
    expect(champPoste()).toBeNull();
  });

  it("depuis l'étape 1, le rail mène à l'étape qui refuse au lieu de ne rien montrer", async () => {
    await allerEtape2EnCategorie("N5");
    saisir(LIBELLE, "0");
    await souffler();
    screen.getByRole("button", { name: /Précédent|Retour/ }).click();
    await souffler();
    expect(screen.queryByLabelText(LIBELLE)).toBeNull();
    // Le rail, vers l'étape 3 : l'étape 2 refuse (nombre faux).
    screen.getByRole("button", { name: /Résumé/ }).click();
    await souffler();
    expect(screen.getByLabelText(LIBELLE).getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
});

describe("aucune réponse de régime présélectionnée (2026-09-27, A2)", () => {
  it("à l'étape 2, aucun bouton Oui/Non n'est actif, et « Suivant » retient au champ ERP", async () => {
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    for (const b of [
      ...screen.getAllByRole("button", { name: /^Oui$/ }),
      ...screen.getAllByRole("button", { name: /^Non$/ }),
    ]) {
      expect(b.getAttribute("aria-pressed")).toBe("false");
    }
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    expect(screen.getByText(/votre établissement reçoit-il du public/)).toBeTruthy();
  });
});

describe("filtre à l'accueil — le refus s'écrit dans le vrai parcours (revue du 2026-10-17)", () => {
  // Le défaut relevé par la revue : `validerTypologie` rendait un refus de
  // périmètre, « Suivant » se grisait, et la phrase ne s'affichait jamais —
  // `blocage` n'était posé qu'au clic, que le bouton désactivé empêche. Il
  // valait déjà pour l'ERP en IGH.
  async function etape2ERP() {
    render(<WizardShell entreprisesConnues={[]} />);
    remplirEtape1();
    await souffler();
    screen.getByRole("button", { name: /Suivant/ }).click();
    await souffler();
    screen.getAllByRole("button", { name: /^Oui$/ })[0].click();
    await souffler();
  }
  const suivantDesactive = () =>
    (screen.getByRole("button", { name: /Suivant/ }) as HTMLButtonElement).disabled;

  it.each([
    ["J", PHRASE_REFUS_J],
    ["U", PHRASE_REFUS_U],
    ["CTS", PHRASE_REFUS_SPECIAUX],
  ])("type %s : la phrase de refus est visible, sans catégorie choisie, et « Suivant » est grisé", async (t, phrase) => {
    await etape2ERP();
    choisir(/Type d'ERP/, t);
    await souffler();
    expect(document.body.textContent).toContain(phrase);
    expect(suivantDesactive()).toBe(true);
  });

  it("R qui accueille des enfants : la phrase de refus est visible", async () => {
    await etape2ERP();
    choisir(/Type d'ERP/, "R");
    await souffler();
    choisir(/Accueil d'enfants/, "oui");
    await souffler();
    expect(document.body.textContent).toContain(PHRASE_REFUS_ENFANTS);
    expect(suivantDesactive()).toBe(true);
  });

  it("ERP en IGH : la phrase de refus est visible", async () => {
    await etape2ERP();
    choisir(/Type d'ERP/, "N");
    await souffler();
    choisir(/Catégorie d'ERP/, "N5");
    await souffler();
    // La seconde carte « Oui » est celle de l'IGH.
    screen.getAllByRole("button", { name: /^Oui$/ })[1].click();
    await souffler();
    expect(document.body.textContent).toMatch(/relève du règlement de sécurité des IGH, que Rojer ne couvre pas/);
  });

  it("le champ caché de l'accueil d'enfants disparaît quand R sort de la saisie", async () => {
    await etape2ERP();
    choisir(/Type d'ERP/, "R");
    await souffler();
    choisir(/Accueil d'enfants/, "non");
    await souffler();
    const cache = () => document.querySelector('input[type="hidden"][name="accueilEnfants"]');
    expect((cache() as HTMLInputElement | null)?.value).toBe("non");
    choisir(/Type d'ERP/, "N");
    await souffler();
    expect(cache()).toBeNull();
  });
});

describe("un nouvel établissement d'une entreprise déjà suivie (2026-10-26)", () => {
  const CONNUES = [{ siren: "120027016", raisonSociale: "SARL Le Comptoir", effectif: 13 }];
  const champ = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;

  it("le SIRET d'un SIREN connu reprend la raison sociale et l'effectif, en lecture seule", async () => {
    render(<WizardShell entreprisesConnues={CONNUES} />);
    expect(screen.queryByLabelText(/Nom de l'établissement/)).toBeNull();

    saisir(/^SIRET/, "120 027 016 00357");
    await souffler();

    expect(champ(/Raison sociale/).value).toBe("SARL Le Comptoir");
    expect(champ(/Raison sociale/).readOnly).toBe(true);
    expect(champ(/Salariés de l'entreprise/).value).toBe("13");
    expect(champ(/Salariés de l'entreprise/).readOnly).toBe(true);
    // Deux établissements d'une même société : le nom d'usage les distingue.
    expect(screen.getByLabelText(/Nom de l'établissement/)).toBeTruthy();
  });

  it("corriger le SIRET vers un SIREN inconnu vide ce qui venait de l'autre société", async () => {
    render(<WizardShell entreprisesConnues={CONNUES} />);
    saisir(/^SIRET/, "12002701600357");
    await souffler();
    saisir(/^SIRET/, "35600000000048");
    await souffler();
    expect(champ(/Raison sociale/).value).toBe("");
    expect(champ(/Raison sociale/).readOnly).toBe(false);
    expect(champ(/Salariés de l'entreprise/).value).toBe("");
  });

  it("un SIREN inconnu laisse la saisie libre", async () => {
    render(<WizardShell entreprisesConnues={CONNUES} />);
    saisir(/^SIRET/, "35600000000048");
    await souffler();
    expect(champ(/Raison sociale/).readOnly).toBe(false);
    expect(screen.queryByLabelText(/Nom de l'établissement/)).toBeNull();
  });
});
