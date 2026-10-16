// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  SectionEquipementsSecurite,
  type LigneSecuriteAffichee,
} from "./SectionEquipementsSecurite";

// Ce que la section pose : le bouton dit ce que la ligne affiche (contrôle
// visuel E3), « Déclarer » mène à la ligne de l'obligation (E5), et le compte
// d'appareils est en chiffres tabulaires (charte).

afterEach(cleanup);

const commun = {
  fondement: null,
  aConfirmer: false,
} as const;

const alarme: LigneSecuriteAffichee = {
  ...commun,
  obligationId: "incendie-travail-alarme-sonore",
  libelle: "Système d'alarme sonore",
  cible: { kind: "categorie", categorie: "ALARME_INCENDIE" },
  etat: "pas_encore_declare",
  appareils: [],
  hrefAction: "/nouveau?categorie=ALARME_INCENDIE",
};

const secours: LigneSecuriteAffichee = {
  ...commun,
  obligationId: "secours-etablissement-materiel",
  libelle: "Matériel de premiers secours",
  cible: { kind: "etat_permanent" },
  etat: "ailleurs",
  appareils: [],
  hrefAction: "/e/etats-permanents#etat-secours-etablissement-materiel",
};

const dae: LigneSecuriteAffichee = {
  ...commun,
  obligationId: "dae-erp-detention",
  libelle: "Défibrillateur (DAE)",
  cible: { kind: "categorie", categorie: "DEFIBRILLATEUR" },
  etat: "declare",
  appareils: [
    { id: "a", libelle: "DAE accueil", signal: "1 à planifier", href: "/a" },
    { id: "b", libelle: "DAE salle", signal: null, href: "/b" },
  ],
  hrefAction: null,
};

describe("SectionEquipementsSecurite", () => {
  it("le bouton « Ajouter » reprend le libellé de la ligne, pas celui de la catégorie", () => {
    render(<SectionEquipementsSecurite lignes={[alarme]} />);
    const lien = screen.getByRole("link", { name: /Ajouter/ });
    expect(lien.textContent).toContain("système d'alarme sonore");
    expect(lien.textContent).not.toMatch(/SSI/);
    expect(lien.getAttribute("href")).toBe(alarme.hrefAction);
  });

  it("« Déclarer » mène à l'ancre de la ligne sur « Ce qui doit être en place »", () => {
    render(<SectionEquipementsSecurite lignes={[secours]} />);
    const lien = screen.getByRole("link", { name: /Déclarer/ });
    expect(lien.getAttribute("href")).toBe(secours.hrefAction);
  });

  it("une ligne déclarée liste ses appareils et compte en chiffres tabulaires", () => {
    const { container } = render(<SectionEquipementsSecurite lignes={[dae]} />);
    expect(screen.getByRole("link", { name: "DAE accueil" }).getAttribute("href")).toBe("/a");
    expect(container.querySelector(".tabular-nums")?.textContent).toBe("2");
  });
});
