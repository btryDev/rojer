// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  SectionEquipementsSecurite,
  type LigneSecuriteAffichee,
} from "./SectionEquipementsSecurite";

// Ce que la section pose : le bouton dit ce que la ligne affiche (contrôle
// visuel E3), « Déclarer » mène à la ligne de l'obligation (E5), et les
// appareils déclarés se montrent dans les cartes du parc (2026-10-24).

afterEach(cleanup);

const commun = {
  fondement: null,
  aConfirmer: false as const,
  periodicites: [] as LigneSecuriteAffichee["periodicites"],
};

const appareil = (id: string, libelle: string, href: string) => ({
  id,
  libelle,
  lieu: null,
  resume: { etat: "aPlanifier" as const, signaux: [], aConfirmer: [] },
  horsReferentiel: null,
  href,
});

const alarme: LigneSecuriteAffichee = {
  ...commun,
  obligationId: "incendie-travail-alarme-sonore",
  libelle: "Système d'alarme sonore",
  cible: { kind: "categorie", categorie: "ALARME_INCENDIE" },
  etat: "pas_encore_declare",
  appareils: [],
  hrefAction: "/nouveau?categorie=ALARME_INCENDIE",
  hrefAjouter: "/nouveau?categorie=ALARME_INCENDIE",
};

const secours: LigneSecuriteAffichee = {
  ...commun,
  obligationId: "secours-etablissement-materiel",
  libelle: "Matériel de premiers secours",
  cible: { kind: "etat_permanent" },
  etat: "ailleurs",
  appareils: [],
  hrefAction: "/e/etats-permanents#etat-secours-etablissement-materiel",
  hrefAjouter: null,
};

const dae: LigneSecuriteAffichee = {
  ...commun,
  obligationId: "dae-erp-detention",
  libelle: "Défibrillateur (DAE)",
  cible: { kind: "categorie", categorie: "DEFIBRILLATEUR" },
  etat: "declare",
  appareils: [appareil("a", "DAE accueil", "/a"), appareil("b", "DAE salle", "/b")],
  hrefAction: null,
  hrefAjouter: "/nouveau?categorie=DEFIBRILLATEUR",
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

  it("une ligne déclarée montre ses appareils en cartes, comme le parc (2026-10-24)", () => {
    render(<SectionEquipementsSecurite lignes={[dae]} />);
    expect(screen.getByRole("link", { name: /DAE accueil/ }).getAttribute("href")).toBe("/a");
    expect(screen.getByText(/2 équipements/)).toBeTruthy();
  });
});
